import prisma from '../utils/prisma.js';
import cache from '../utils/cache.js';
import logger from '../utils/logger.js';
import { apiSuccess, apiMessage, apiError } from '../utils/apiResponse.js';

// =============================================================================
// 📋 GERENCIAMENTO DE UNIDADES CRAS
// =============================================================================

// Criar novo CRAS (apenas admin)
export const createCras = async (req, res) => {
  try {
    const { nome, endereco, telefone } = req.body;

    const cras = await prisma.cras.create({
      data: { nome, endereco, telefone },
    });

    // Registrar log
    await prisma.log.create({
      data: {
        userId: req.user.id,
        crasId: cras.id,
        action: 'criar_cras',
        details: `CRAS criado: ${nome} - ${endereco}`,
      },
    });

    // Invalidar cache
    cache.invalidateCras();

    apiSuccess(res, cras, 201);
  } catch (error) {
    logger.error('Erro ao criar CRAS:', error);
    apiError(res, 'Erro ao criar CRAS');
  }
};

// Listar todos os CRAS
export const getCras = async (req, res) => {
  try {
    const cacheKey = 'cras:all';

    const fetchCras = async () => {
      return prisma.cras.findMany({ orderBy: { nome: 'asc' } });
    };

    const crasList = await cache.cached(cacheKey, fetchCras, 300);
    apiSuccess(res, crasList);
  } catch (error) {
    logger.error('Erro ao buscar CRAS:', error);
    apiError(res, 'Erro ao buscar CRAS', 500);
  }
};

// Buscar CRAS por ID
export const getCrasById = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `cras:${id}`;

    const fetchCras = async () => {
      return prisma.cras.findUnique({ where: { id } });
    };

    const cras = await cache.cached(cacheKey, fetchCras, 300);

    if (!cras) {
      return apiError(res, 'CRAS não encontrado', 404);
    }

    apiSuccess(res, cras);
  } catch (error) {
    logger.error('Erro ao buscar CRAS:', error);
    apiError(res, 'Erro ao buscar CRAS', 500);
  }
};

// Atualizar CRAS
export const updateCras = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, endereco, telefone } = req.body;

    const cras = await prisma.cras.update({
      where: { id },
      data: { nome, endereco, telefone },
    }).catch(() => null);

    if (!cras) {
      return apiError(res, 'CRAS não encontrado', 404);
    }

    // Registrar log
    await prisma.log.create({
      data: {
        userId: req.user.id,
        crasId: cras.id,
        action: 'editar_cras',
        details: `CRAS editado: ${cras.nome} - ${cras.endereco}`,
      },
    });

    // Invalidar cache
    cache.invalidateCras();

    apiSuccess(res, cras);
  } catch (error) {
    logger.error('Erro ao atualizar CRAS:', error);
    apiError(res, 'Erro ao atualizar CRAS');
  }
};

// Remover CRAS
export const deleteCras = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔒 SEGURANÇA: Verificar se o CRAS existe antes de tudo
    const cras = await prisma.cras.findUnique({ where: { id } });
    if (!cras) {
      return apiError(res, 'CRAS não encontrado', 404);
    }

    // 🔒 VERIFICAÇÃO DE DEPENDÊNCIAS: Não permitir exclusão se houver dados vinculados
    const [usuariosVinculados, agendamentosAtivos, bloqueiosAtivos] = await Promise.all([
      prisma.user.count({ where: { crasId: id } }),
      prisma.appointment.count({ where: { crasId: id, status: { in: ['agendado'] } } }),
      prisma.blockedSlot.count({ where: { crasId: id } }),
    ]);

    const dependencias = [];
    if (usuariosVinculados > 0) {
      dependencias.push(`${usuariosVinculados} usuário(s) vinculado(s)`);
    }
    if (agendamentosAtivos > 0) {
      dependencias.push(`${agendamentosAtivos} agendamento(s) ativo(s)`);
    }
    if (bloqueiosAtivos > 0) {
      dependencias.push(`${bloqueiosAtivos} bloqueio(s) de horário`);
    }

    if (dependencias.length > 0) {
      return apiError(
        res,
        `Não é possível excluir o CRAS "${cras.nome}". Existem: ${dependencias.join(', ')}. Remova as dependências antes de excluir.`,
        409,
        {
          code: 'CRAS_HAS_DEPENDENCIES',
          dependencias: {
            usuarios: usuariosVinculados,
            agendamentos: agendamentosAtivos,
            bloqueios: bloqueiosAtivos,
          },
        }
      );
    }

    await prisma.cras.delete({ where: { id } });

    // Registrar log
    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'excluir_cras',
        details: `CRAS excluído: ${cras.nome} - ${cras.endereco}`,
      },
    });

    // Invalidar cache
    cache.invalidateCras();

    apiMessage(res, 'CRAS removido com sucesso');
  } catch (error) {
    logger.error('Erro ao remover CRAS:', error);
    apiError(res, 'Erro ao remover CRAS');
  }
};
