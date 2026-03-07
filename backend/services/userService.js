// =============================================================================
// 🏗️ CAMADA DE SERVIÇO - LÓGICA DE NEGÓCIO DE USUÁRIOS
// =============================================================================
// Separa a lógica de negócio do controller, facilitando manutenção,
// reutilização e testabilidade. O controller apenas orquestra
// request/response; toda lógica de domínio fica aqui.

import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma.js';
import cache from '../utils/cache.js';
import logger from '../utils/logger.js';
import { getDefaultAgenda } from '../config/agendaDefaults.js';

// Custo do bcrypt para hash de senhas (12 = ~250ms, bom equilíbrio segurança/performance)
const BCRYPT_COST = 12;

/**
 * Erro personalizado para regras de negócio.
 * Carrega statusCode para o controller retornar o HTTP status correto.
 */
export class BusinessError extends Error {
  constructor(message, statusCode = 400, code = null) {
    super(message);
    this.name = 'BusinessError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

// =============================================================================
// CRIAÇÃO DE USUÁRIO
// =============================================================================

/**
 * Cria um novo usuário no sistema.
 */
export const createUser = async (data, actor) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const { name, password, role, matricula, cras } = data;

      // Verificar unicidade da matrícula
      const existing = await tx.user.findUnique({ where: { matricula } });
      if (existing) {
        throw new BusinessError('Já existe um usuário com esta matrícula', 409);
      }

      // Hash seguro da senha
      const hashedPassword = await bcrypt.hash(password, BCRYPT_COST);

      // Montar dados do usuário
      const userData = { name, password: hashedPassword, role, matricula };
      if (role !== 'admin') {
        userData.crasId = cras;
      }
      if (role === 'entrevistador') {
        const defaults = getDefaultAgenda();
        userData.horariosDisponiveis = defaults.horariosDisponiveis;
        userData.diasAtendimento = defaults.diasAtendimento;
      }

      // Criar usuário dentro da transação
      const user = await tx.user.create({
        data: userData,
        omit: { password: true },
        include: { cras: true },
      });

      // Registrar ação em log (mesma transação = atomicidade garantida)
      await tx.log.create({
        data: {
          userId: actor.id,
          crasId: actor.cras || null,
          action: 'criar_usuario',
          details: `Usuário criado: ${name} (${role}) - Matrícula: ${matricula}`,
        },
      });

      return user;
    });

    // Invalidar cache APÓS commit bem-sucedido
    cache.invalidateUsers();

    return result;
  } catch (err) {
    // Tratar erro de unique constraint do PostgreSQL (matrícula)
    if (err.code === 'P2002') {
      throw new BusinessError('Já existe um usuário com esta matrícula', 409);
    }
    if (err instanceof BusinessError) throw err;

    logger.error('Erro ao criar usuário (service):', err);
    throw err;
  }
};

// =============================================================================
// LISTAGEM DE USUÁRIOS
// =============================================================================

/**
 * Lista usuários com controle de permissões baseado no role do solicitante.
 */
export const getUsers = async (role) => {
  const cacheKey = `users:all:role:${role}`;

  return cache.cached(cacheKey, async () => {
    const where = role !== 'admin' ? { role: 'entrevistador' } : {};
    return prisma.user.findMany({
      where,
      omit: { password: true },
      include: { cras: true },
    });
  });
};

/**
 * Lista todos os entrevistadores do sistema.
 */
export const getEntrevistadores = async () => {
  const cacheKey = 'users:entrevistadores';

  return cache.cached(cacheKey, async () => {
    return prisma.user.findMany({
      where: { role: 'entrevistador' },
      omit: { password: true },
    });
  });
};

/**
 * Lista entrevistadores de um CRAS específico.
 */
export const getEntrevistadoresByCras = async (crasId) => {
  const cacheKey = `users:entrevistadores:cras:${crasId}`;

  return cache.cached(cacheKey, async () => {
    return prisma.user.findMany({
      where: { role: 'entrevistador', crasId },
      omit: { password: true },
      include: { cras: true },
    });
  });
};

// =============================================================================
// ATUALIZAÇÃO DE USUÁRIO
// =============================================================================

/**
 * Atualiza dados de um usuário existente.
 */
export const updateUser = async (id, data, actor) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const { name, password, role, cras, matricula, agenda } = data;

      // Impedir que admin altere o próprio role
      if (role && actor.id === id && role !== actor.role) {
        throw new BusinessError(
          'Você não pode alterar seu próprio perfil de acesso',
          403
        );
      }

      // Se matrícula está sendo alterada, verificar unicidade
      if (matricula) {
        const existing = await tx.user.findFirst({
          where: { matricula, id: { not: id } },
        });
        if (existing) {
          throw new BusinessError('Já existe um usuário com esta matrícula', 409);
        }
      }

      // Montar objeto de atualização
      const update = {};
      if (name !== undefined) update.name = name;
      if (role !== undefined) update.role = role;
      if (matricula !== undefined) update.matricula = matricula;

      if (role === 'admin') {
        update.crasId = null;
      } else if (cras !== undefined) {
        update.crasId = cras;
      }

      if (password) {
        update.password = await bcrypt.hash(password, BCRYPT_COST);
      }

      if (role === 'entrevistador' && agenda) {
        const defaults = getDefaultAgenda();
        update.horariosDisponiveis = agenda.horariosDisponiveis || defaults.horariosDisponiveis;
        update.diasAtendimento = agenda.diasAtendimento || defaults.diasAtendimento;
      }

      const user = await tx.user.update({
        where: { id },
        data: update,
        omit: { password: true },
        include: { cras: true },
      });

      // Log de auditoria dentro da mesma transação
      await tx.log.create({
        data: {
          userId: actor.id,
          crasId: actor.cras || null,
          action: 'editar_usuario',
          details: `Usuário editado: ${user.name} (${user.role}) - Matrícula: ${user.matricula || 'N/A'}`,
        },
      });

      return user;
    });

    cache.invalidateUsers();
    cache.invalidateUser(id);

    return result;
  } catch (err) {
    if (err.code === 'P2002') {
      throw new BusinessError('Matrícula já em uso por outro usuário', 409);
    }
    if (err.code === 'P2025') {
      throw new BusinessError('Usuário não encontrado', 404);
    }
    if (err instanceof BusinessError) throw err;

    logger.error('Erro ao atualizar usuário (service):', err);
    throw err;
  }
};

// =============================================================================
// EXCLUSÃO DE USUÁRIO
// =============================================================================

/**
 * Remove um usuário do sistema com todas as verificações de segurança.
 */
export const deleteUser = async (id, actor) => {
  try {
    await prisma.$transaction(async (tx) => {
      // Impedir auto-exclusão
      if (id === actor.id) {
        throw new BusinessError('Você não pode excluir a si mesmo', 400);
      }

      const user = await tx.user.findUnique({
        where: { id },
        omit: { password: true },
      });
      if (!user) {
        throw new BusinessError('Usuário não encontrado', 404);
      }

      // Impedir exclusão do último admin
      if (user.role === 'admin') {
        const adminCount = await tx.user.count({ where: { role: 'admin' } });
        if (adminCount <= 1) {
          throw new BusinessError(
            'Não é possível excluir o último administrador do sistema',
            400
          );
        }
      }

      // Verificar dependências de entrevistador
      if (user.role === 'entrevistador') {
        const agendamentosFuturos = await tx.appointment.count({
          where: {
            entrevistadorId: id,
            data: { gte: new Date() },
            status: 'agendado',
          },
        });

        if (agendamentosFuturos > 0) {
          throw new BusinessError(
            `Não é possível excluir: existem ${agendamentosFuturos} agendamento(s) futuro(s) vinculado(s) a este entrevistador. Reagende ou cancele-os antes de excluir.`,
            409,
            'USER_HAS_DEPENDENCIES'
          );
        }
      }

      await tx.user.delete({ where: { id } });

      // Log de auditoria atômico com a exclusão
      await tx.log.create({
        data: {
          userId: actor.id,
          crasId: actor.cras || null,
          action: 'excluir_usuario',
          details: `Usuário excluído: ${user.name} (${user.role}) - Matrícula: ${user.matricula || 'N/A'}`,
        },
      });
    });

    cache.invalidateUsers();
    cache.invalidateUser(id);

    return { message: 'Usuário removido' };
  } catch (err) {
    if (err instanceof BusinessError) throw err;

    logger.error('Erro ao remover usuário (service):', err);
    throw err;
  }
};
