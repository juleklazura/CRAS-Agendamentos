import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';
import { apiSuccess, apiError } from '../utils/apiResponse.js';

const ALLOWED_PAGE_SIZES = [10, 20, 50, 100, 200];
const DEFAULT_PAGE_SIZE = 20;

// Whitelist de ações válidas para o campo `action`.
// Impede persistência de strings arbitrárias na tabela de auditoria.
const ALLOWED_ACTIONS = [
  'login', 'logout', 'login_falha',
  'token_refresh',          // rotação de refresh token
  'criar_usuario', 'editar_usuario', 'excluir_usuario',
  'criar_agendamento', 'editar_agendamento', 'excluir_agendamento',
  'confirmar_presenca', 'remover_confirmacao', 'remover_confirmacao_presenca',
  'criar_cras', 'editar_cras', 'excluir_cras',
  'bloquear_horario', 'desbloquear_horario',
  'exportar_agendamentos',  // LGPD — rastreabilidade de exportações de dados pessoais
  'consulta_por_cpf',       // LGPD — rastreabilidade de acesso a dados pessoais
  'acesso_negado',          // auditoria de tentativas de escalonamento de privilégio
];

// POST /api/logs — Criar log via API (restrito a admin; services usam prisma.log.create() diretamente)
export const createLog = async (req, res) => {
  try {
    const { action, details, cras } = req.body;

    if (!action || !ALLOWED_ACTIONS.includes(action)) {
      return apiError(res, 'Ação inválida', 400);
    }

    if (details && details.length > 1000) {
      return apiError(res, 'Detalhes devem ter no máximo 1000 caracteres', 400);
    }

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

// GET /api/logs — Consultar logs com filtros baseados no perfil do usuário
export const getLogs = async (req, res) => {
  try {
    const where = {};

    // Escopo dos logs por role:
    // - entrevistador: apenas os próprios logs
    // - recepção: todos os logs do seu CRAS
    // - admin: todos os logs (com filtro opcional por CRAS via query)
    if (req.user.role === 'entrevistador') {
      where.userId = req.user.id;
    } else if (req.user.role === 'recepcao') {
      where.crasId = req.user.cras;
    } else if (req.query.cras) {
      where.crasId = req.query.cras;
    }

    const page = Math.max(0, parseInt(req.query.page) || 0);
    let pageSize = parseInt(req.query.pageSize) || DEFAULT_PAGE_SIZE;
    if (!ALLOWED_PAGE_SIZES.includes(pageSize)) {
      // Snap para o tamanho mais próximo da whitelist
      pageSize = ALLOWED_PAGE_SIZES.reduce((prev, curr) =>
        Math.abs(curr - pageSize) < Math.abs(prev - pageSize) ? curr : prev
      );
    }
    const skip = page * pageSize;

    const [logs, total] = await Promise.all([
      prisma.log.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, role: true, matricula: true, crasId: true } },
          cras: true,
        },
        orderBy: { date: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.log.count({ where }),
    ]);

    apiSuccess(res, {
      results: logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasNextPage: (page + 1) * pageSize < total,
      hasPrevPage: page > 0,
    });
  } catch (_) {
    apiError(res, 'Erro ao buscar logs', 500);
  }
};
