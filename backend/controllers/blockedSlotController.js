import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';
import { formatDateTime, parseDate, isWeekend } from '../utils/timezone.js';
import { apiSuccess, apiMessage, apiError } from '../utils/apiResponse.js';

// Controller de bloqueios de horário.
// Entrevistadores bloqueiam slots próprios para impedir agendamentos naqueles horários.

// POST /api/blocked-slots — Cria bloqueio de horário (restrito a entrevistador)
export const createBlockedSlot = async (req, res) => {
  try {
    const { data, motivo } = req.body;

    // Validação de tamanho redundante: o schema Joi já aplica max(500),
    // mas mantida como segunda barreira no caso de body parcialmente validado.
    if (motivo && motivo.length > 500) {
      return apiError(res, 'Motivo deve ter no máximo 500 caracteres', 400);
    }

    const parsed = parseDate(data);
    if (!parsed || isNaN(parsed.getTime())) {
      return apiError(res, 'Data inválida', 400);
    }

    if (parsed < new Date()) {
      return apiError(res, 'Não é permitido bloquear horários no passado', 400);
    }

    if (isWeekend(parsed)) {
      return apiError(res, 'Não é permitido bloquear horários em fins de semana', 400);
    }

    const entrevistadorId = req.user.id;
    const crasId = req.user.cras;

    // Verifica se já existe bloqueio para o mesmo horário
    const exists = await prisma.blockedSlot.findFirst({
      where: { entrevistadorId, crasId, data: new Date(data) },
    });
    if (exists) {
      return apiError(res, 'Horário já bloqueado');
    }

    // Cria novo bloqueio
    const blocked = await prisma.blockedSlot.create({
      data: { entrevistadorId, crasId, data: new Date(data), motivo },
    });

    // Registra ação no sistema de auditoria
    await prisma.log.create({
      data: {
        userId: req.user.id,
        crasId,
        action: 'bloquear_horario',
        details: `Bloqueou o horário ${formatDateTime(data)} - Motivo: ${motivo}`,
      },
    });

    apiSuccess(res, blocked, 201);
  } catch (error) {
    logger.error('Erro ao bloquear horário:', error);
    apiError(res, 'Erro ao bloquear horário');
  }
};

// GET /api/blocked-slots — Lista bloqueios conforme permissões do usuário
export const getBlockedSlots = async (req, res) => {
  try {
    const where = {};

    // Controle de acesso por role e CRAS:
    // entrevistador → apenas os próprios; recepção → do CRAS (informando entrevistador); admin → todos.
    if (req.user.role === 'entrevistador') {
      where.entrevistadorId = req.user.id;
      where.crasId = req.user.cras;
    } else if (req.user.role === 'recepcao') {
      where.crasId = req.user.cras;

      if (req.query.entrevistador) {
        // Valida que o entrevistador informado pertence ao CRAS da recepção.
        // Sem essa verificação, a recepção poderia listar bloqueios de outro CRAS.
        const entrevistadorDoc = await prisma.user.findUnique({
          where: { id: req.query.entrevistador },
          select: { id: true, crasId: true },
        });
        if (!entrevistadorDoc || entrevistadorDoc.crasId !== req.user.cras) {
          return apiError(res, 'Você não tem permissão para ver bloqueios de outro CRAS', 403);
        }
        where.entrevistadorId = req.query.entrevistador;
      } else {
        return apiError(res, 'Entrevistador não informado');
      }
    } else if (req.user.role === 'admin') {
      if (!req.query.entrevistador) {
        return apiError(res, 'Entrevistador não informado');
      }
      where.entrevistadorId = req.query.entrevistador;
      if (req.query.cras) where.crasId = req.query.cras;
    }

    const slots = await prisma.blockedSlot.findMany({ where });

    apiSuccess(res, slots);
  } catch (error) {
    logger.error('Erro ao buscar bloqueios:', error);
    apiError(res, 'Erro ao buscar bloqueios', 500);
  }
};

// DELETE /api/blocked-slots/:id — Remove bloqueio (apenas o próprio entrevistador)
export const deleteBlockedSlot = async (req, res) => {
  try {
    const { id } = req.params;

    logger.debug('Tentando deletar bloqueio', { id, userId: req.user.id });

    // findFirst com entrevistadorId garante que o usuário só remove os próprios bloqueios.
    const slot = await prisma.blockedSlot.findFirst({ where: { id, entrevistadorId: req.user.id } });

    if (!slot) {
      logger.warn('Bloqueio não encontrado', { id, userId: req.user.id });
      return apiError(res, 'Bloqueio não encontrado', 404);
    }

    await prisma.blockedSlot.delete({ where: { id } });
    logger.info('Bloqueio removido com sucesso', { id, userId: req.user.id });

    // Log automático
    await prisma.log.create({
      data: {
        userId: req.user.id,
        crasId: slot.crasId,
        action: 'desbloquear_horario',
        details: `Desbloqueou o horário ${formatDateTime(slot.data)}`,
      },
    });

    apiMessage(res, 'Bloqueio removido');
  } catch (error) {
    logger.error('Erro ao remover bloqueio:', error);
    apiError(res, 'Erro ao remover bloqueio');
  }
};
