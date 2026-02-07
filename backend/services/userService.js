// =============================================================================
// 🏗️ CAMADA DE SERVIÇO - LÓGICA DE NEGÓCIO DE USUÁRIOS
// =============================================================================
// Separa a lógica de negócio do controller, facilitando manutenção,
// reutilização e testabilidade. O controller apenas orquestra
// request/response; toda lógica de domínio fica aqui.

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Log from '../models/Log.js';
import Appointment from '../models/Appointment.js';
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
 * 
 * @param {Object} data - Dados validados do usuário (name, password, role, matricula, cras?)
 * @param {Object} actor - Usuário que está realizando a ação (req.user)
 * @returns {Object} Usuário criado (sem senha), com CRAS populado
 * @throws {BusinessError} Se matrícula já existir ou regra de negócio violada
 */
export const createUser = async (data, actor) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, password, role, matricula, cras } = data;

    // Verificar unicidade da matrícula
    const existing = await User.findOne({ matricula }).session(session);
    if (existing) {
      throw new BusinessError('Já existe um usuário com esta matrícula', 409);
    }

    // Hash seguro da senha
    const hashedPassword = await bcrypt.hash(password, BCRYPT_COST);

    // Montar dados do usuário
    const userData = { name, password: hashedPassword, role, matricula };
    if (role !== 'admin') {
      userData.cras = cras;
    }
    if (role === 'entrevistador') {
      userData.agenda = getDefaultAgenda();
    }

    // Criar usuário dentro da transação
    const [user] = await User.create([userData], { session });

    // Registrar ação em log (mesma transação = atomicidade garantida)
    await Log.create([{
      user: actor.id,
      cras: actor.cras,
      action: 'criar_usuario',
      details: `Usuário criado: ${name} (${role}) - Matrícula: ${matricula}`,
    }], { session });

    await session.commitTransaction();

    // Invalidar cache APÓS commit bem-sucedido
    cache.invalidateUsers();

    // Retornar usuário sem senha, com CRAS populado
    await user.populate('cras');
    return user.toJSON();
  } catch (err) {
    await session.abortTransaction();

    // Tratar erro de duplicate key do MongoDB (matrícula única)
    if (err.code === 11000) {
      throw new BusinessError('Já existe um usuário com esta matrícula', 409);
    }

    // Re-lançar BusinessError sem empacotar
    if (err instanceof BusinessError) throw err;

    logger.error('Erro ao criar usuário (service):', err);
    throw err;
  } finally {
    session.endSession();
  }
};

// =============================================================================
// LISTAGEM DE USUÁRIOS
// =============================================================================

/**
 * Lista usuários com controle de permissões baseado no role do solicitante.
 * Admin vê todos; outros roles veem apenas entrevistadores.
 *
 * @param {string} role - Role do usuário solicitante
 * @returns {Array} Lista de usuários (sem senha)
 */
export const getUsers = async (role) => {
  const cacheKey = `users:all:role:${role}`;

  const fetchUsers = async () => {
    const query = role !== 'admin' ? { role: 'entrevistador' } : {};
    return User.find(query).select('-password').populate('cras');
  };

  return cache.cached(cacheKey, fetchUsers);
};

/**
 * Lista todos os entrevistadores do sistema.
 *
 * @returns {Array} Lista de entrevistadores (sem senha)
 */
export const getEntrevistadores = async () => {
  const cacheKey = 'users:entrevistadores';

  const fetchEntrevistadores = async () => {
    return User.find({ role: 'entrevistador' }).select('-password');
  };

  return cache.cached(cacheKey, fetchEntrevistadores);
};

/**
 * Lista entrevistadores de um CRAS específico.
 *
 * @param {string} crasId - ID do CRAS
 * @returns {Array} Entrevistadores do CRAS (sem senha)
 */
export const getEntrevistadoresByCras = async (crasId) => {
  const cacheKey = `users:entrevistadores:cras:${crasId}`;

  const fetchEntrevistadores = async () => {
    return User.find({ role: 'entrevistador', cras: crasId })
      .select('-password')
      .populate('cras');
  };

  return cache.cached(cacheKey, fetchEntrevistadores);
};

// =============================================================================
// ATUALIZAÇÃO DE USUÁRIO
// =============================================================================

/**
 * Atualiza dados de um usuário existente.
 *
 * @param {string} id - ID do usuário a ser atualizado
 * @param {Object} data - Dados validados para atualização
 * @param {Object} actor - Usuário que está realizando a ação (req.user)
 * @returns {Object} Usuário atualizado (sem senha)
 * @throws {BusinessError} Se usuário não encontrado ou regra violada
 */
export const updateUser = async (id, data, actor) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
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
      const existing = await User.findOne({ matricula, _id: { $ne: id } }).session(session);
      if (existing) {
        throw new BusinessError('Já existe um usuário com esta matrícula', 409);
      }
    }

    // Montar objeto de atualização
    const update = { name, role, matricula };

    if (role === 'admin') {
      update.cras = null;
    } else {
      update.cras = cras;
    }

    if (password) {
      update.password = await bcrypt.hash(password, BCRYPT_COST);
    }

    if (role === 'entrevistador' && agenda) {
      const defaults = getDefaultAgenda();
      update.agenda = {
        horariosDisponiveis: agenda.horariosDisponiveis || defaults.horariosDisponiveis,
        diasAtendimento: agenda.diasAtendimento || defaults.diasAtendimento,
      };
    }

    // Remover campos undefined para não sobrescrever com null
    Object.keys(update).forEach((key) => {
      if (update[key] === undefined) delete update[key];
    });

    const user = await User.findByIdAndUpdate(id, update, { new: true, session })
      .select('-password')
      .populate('cras');

    if (!user) {
      throw new BusinessError('Usuário não encontrado', 404);
    }

    // Log de auditoria dentro da mesma transação
    await Log.create([{
      user: actor.id,
      cras: actor.cras,
      action: 'editar_usuario',
      details: `Usuário editado: ${user.name} (${user.role}) - Matrícula: ${user.matricula || 'N/A'}`,
    }], { session });

    await session.commitTransaction();

    cache.invalidateUsers();

    return user;
  } catch (err) {
    await session.abortTransaction();

    if (err.code === 11000) {
      throw new BusinessError('Matrícula já em uso por outro usuário', 409);
    }
    if (err instanceof BusinessError) throw err;

    logger.error('Erro ao atualizar usuário (service):', err);
    throw err;
  } finally {
    session.endSession();
  }
};

// =============================================================================
// EXCLUSÃO DE USUÁRIO
// =============================================================================

/**
 * Remove um usuário do sistema com todas as verificações de segurança.
 *
 * @param {string} id - ID do usuário a ser excluído
 * @param {Object} actor - Usuário que está realizando a ação (req.user)
 * @returns {Object} Mensagem de sucesso
 * @throws {BusinessError} Se houver impedimentos para exclusão
 */
export const deleteUser = async (id, actor) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Impedir auto-exclusão
    if (id.toString() === actor.id.toString()) {
      throw new BusinessError('Você não pode excluir a si mesmo', 400);
    }

    const user = await User.findById(id).session(session);
    if (!user) {
      throw new BusinessError('Usuário não encontrado', 404);
    }

    // Impedir exclusão do último admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' }).session(session);
      if (adminCount <= 1) {
        throw new BusinessError(
          'Não é possível excluir o último administrador do sistema',
          400
        );
      }
    }

    // Verificar dependências de entrevistador
    if (user.role === 'entrevistador') {
      const agendamentosFuturos = await Appointment.countDocuments({
        entrevistador: id,
        data: { $gte: new Date() },
        status: 'agendado',
      }).session(session);

      if (agendamentosFuturos > 0) {
        throw new BusinessError(
          `Não é possível excluir: existem ${agendamentosFuturos} agendamento(s) futuro(s) vinculado(s) a este entrevistador. Reagende ou cancele-os antes de excluir.`,
          409,
          'USER_HAS_DEPENDENCIES'
        );
      }
    }

    await User.findByIdAndDelete(id, { session });

    // Log de auditoria atômico com a exclusão
    await Log.create([{
      user: actor.id,
      cras: actor.cras,
      action: 'excluir_usuario',
      details: `Usuário excluído: ${user.name} (${user.role}) - Matrícula: ${user.matricula || 'N/A'}`,
    }], { session });

    await session.commitTransaction();

    cache.invalidateUsers();

    return { message: 'Usuário removido' };
  } catch (err) {
    await session.abortTransaction();

    if (err instanceof BusinessError) throw err;

    logger.error('Erro ao remover usuário (service):', err);
    throw err;
  } finally {
    session.endSession();
  }
};
