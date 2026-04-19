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

// Tamanhos de página permitidos para logs
const ALLOWED_PAGE_SIZES = [20, 50, 100, 200];
const DEFAULT_PAGE_SIZE = 50;

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

    // Paginação
    const page = Math.max(0, parseInt(req.query.page) || 0);
    let pageSize = parseInt(req.query.pageSize) || DEFAULT_PAGE_SIZE;
    if (!ALLOWED_PAGE_SIZES.includes(pageSize)) {
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
