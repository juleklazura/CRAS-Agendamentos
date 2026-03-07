import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';
import { apiSuccess, apiError } from '../utils/apiResponse.js';

// Controller para sistema de logs e auditoria

// Função para criar novo registro de log
export const createLog = async (req, res) => {
  try {
    const { action, details, cras } = req.body;

    const log = await prisma.log.create({
      data: {
        userId: req.user.id,
        crasId: cras || null,
        action,
        details,
      },
    });

    apiSuccess(res, log, 201);
  } catch (_) {
    apiError(res, 'Erro ao criar log');
  }
};

// Função para consultar logs com filtros por perfil de usuário
export const getLogs = async (req, res) => {
  try {
    const where = {};

    // Aplica filtros baseados no perfil do usuário
    if (req.user.role === 'entrevistador') {
      where.userId = req.user.id;
    } else if (req.user.role === 'recepcao') {
      where.crasId = req.user.cras;
    } else if (req.query.cras) {
      where.crasId = req.query.cras;
    }

    const logs = await prisma.log.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, role: true, matricula: true, crasId: true } },
        cras: true,
      },
      orderBy: { date: 'desc' },
    });

    apiSuccess(res, logs);
  } catch (_) {
    apiError(res, 'Erro ao buscar logs', 500);
  }
};
