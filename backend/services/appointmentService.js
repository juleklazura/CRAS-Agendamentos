// =============================================================================
// 🏗️ CAMADA DE SERVIÇO — LÓGICA DE NEGÓCIO DE AGENDAMENTOS
// =============================================================================
// Separa a lógica de negócio do controller, facilitando manutenção,
// reutilização e testabilidade. O controller apenas orquestra
// request/response; toda lógica de domínio fica aqui.

import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import Log from '../models/Log.js';
import EncryptionService from '../utils/encryption.js';
import { validarCPF, validarTelefone } from '../utils/validators.js';
import { parseDate, isWeekend, formatDateTime, now } from '../utils/timezone.js';
import cache from '../utils/cache.js';
import logger from '../utils/logger.js';
import { BusinessError } from './userService.js';
import {
  APPOINTMENT_POPULATE,
  APPOINTMENT_POPULATE_FULL,
  APPOINTMENT_POPULATE_LIST,
} from '../constants/populate.js';

// =============================================================================
// HELPERS INTERNOS
// =============================================================================

/** Campos permitidos para atualização (whitelist). */
const ALLOWED_UPDATE_FIELDS = [
  'entrevistador', 'cras', 'pessoa', 'cpf', 'telefone1', 'telefone2',
  'motivo', 'data', 'status', 'observacoes',
];

/** Campos selecionados na listagem (evita carregar campos desnecessários). */
const LIST_SELECT = 'entrevistador cras pessoa cpf telefone1 telefone2 motivo data status observacoes createdAt';

/** Tamanhos de página permitidos. */
const ALLOWED_PAGE_SIZES = [10, 20, 50, 100];

/**
 * Descriptografa campos LGPD de um agendamento (objeto lean).
 * @param {Object} doc - Documento lean do Mongoose
 * @returns {Object} Documento com campos decriptados
 */
const decryptFields = (doc) => {
  const fieldsToDecrypt = ['pessoa', 'cpf', 'telefone1', 'telefone2'];
  const decrypted = { ...doc };
  for (const field of fieldsToDecrypt) {
    if (decrypted[field] && EncryptionService.isEncrypted(decrypted[field])) {
      decrypted[field] = EncryptionService.decrypt(decrypted[field]);
    }
  }
  return decrypted;
};

/**
 * Verifica se o usuário tem permissão para operar no agendamento.
 *
 * @param {Object} appointment - Agendamento do banco (com entrevistador como ObjectId)
 * @param {Object} actor - Usuário logado { id, role, cras }
 * @param {string} action - Descrição da ação (para mensagens de erro)
 * @throws {BusinessError} Se não autorizado (403)
 */
const checkOwnership = async (appointment, actor, action) => {
  if (actor.role === 'admin') return; // Admin acessa tudo

  if (actor.role === 'entrevistador') {
    if (appointment.entrevistador.toString() !== actor.id) {
      throw new BusinessError(
        `Você não tem permissão para ${action} este agendamento`,
        403,
        'FORBIDDEN'
      );
    }
    return;
  }

  if (actor.role === 'recepcao') {
    const entrevistador = await User.findById(appointment.entrevistador).select('_id cras');
    if (!entrevistador || entrevistador.cras.toString() !== actor.cras?.toString()) {
      throw new BusinessError(
        `Você não tem permissão para ${action} agendamentos de outro CRAS`,
        403,
        'FORBIDDEN_CROSS_CRAS'
      );
    }
  }
};

/**
 * Busca um agendamento por ID e lança 404 se não encontrado.
 *
 * @param {string} id - ID do agendamento
 * @param {Array} [populateSpec] - Populate opcional
 * @returns {Object} Agendamento encontrado
 * @throws {BusinessError} Se não encontrado (404)
 */
const findOrFail = async (id, populateSpec = null) => {
  let query = Appointment.findById(id);
  if (populateSpec) {
    for (const p of populateSpec) {
      query = query.populate(p.path, p.select);
    }
  }
  const appointment = await query;
  if (!appointment) {
    throw new BusinessError('Agendamento não encontrado', 404, 'NOT_FOUND');
  }
  return appointment;
};

// =============================================================================
// CRIAÇÃO
// =============================================================================

/**
 * Cria um novo agendamento com validações rigorosas.
 *
 * @param {Object} data - Campos do body validados
 * @param {Object} actor - Usuário logado { id, cras }
 * @returns {Object} Agendamento criado e populado (JSON)
 * @throws {BusinessError} Se validação falhar ou slot ocupado
 */
export const createAppointment = async (data, actor) => {
  const { entrevistador, cras, pessoa, cpf, telefone1, telefone2, motivo, data: dataAgendamento, status, observacoes } = data;

  // --- Validações de obrigatoriedade ---
  if (!entrevistador) throw new BusinessError('Entrevistador é obrigatório');
  if (!mongoose.Types.ObjectId.isValid(entrevistador)) throw new BusinessError('ID do entrevistador é inválido');
  if (!cras) throw new BusinessError('CRAS é obrigatório');
  if (!mongoose.Types.ObjectId.isValid(cras)) throw new BusinessError('ID do CRAS é inválido');
  if (!pessoa) throw new BusinessError('Nome da pessoa é obrigatório');
  if (!cpf) throw new BusinessError('CPF é obrigatório');
  if (!validarCPF(cpf)) throw new BusinessError('CPF inválido. Verifique os dígitos e tente novamente.');
  if (!telefone1) throw new BusinessError('Telefone é obrigatório');
  if (!validarTelefone(telefone1)) throw new BusinessError('Telefone inválido. Use o formato (XX) XXXXX-XXXX');
  if (telefone2 && !validarTelefone(telefone2)) throw new BusinessError('Telefone 2 inválido. Use o formato (XX) XXXXX-XXXX');
  if (!motivo) throw new BusinessError('Motivo é obrigatório');
  if (!dataAgendamento) throw new BusinessError('Data é obrigatória');

  // --- Regra de negócio: sem fins de semana ---
  if (isWeekend(parseDate(dataAgendamento))) {
    throw new BusinessError('Não é permitido agendar para sábado ou domingo.');
  }

  // --- Persistência com proteção contra race condition ---
  let appointment;
  try {
    appointment = new Appointment({
      entrevistador, cras, pessoa, cpf, telefone1, telefone2,
      motivo, data: dataAgendamento, status, observacoes,
      createdBy: actor.id,
    });
    await appointment.save();
  } catch (dbError) {
    if (dbError.code === 11000 || dbError.name === 'MongoServerError') {
      const dataFormatada = formatDateTime(dataAgendamento);
      throw new BusinessError(
        `Este horário (${dataFormatada}) já está ocupado para este entrevistador. Por favor, escolha outro horário.`,
        409,
        'SLOT_TAKEN'
      );
    }
    throw dbError;
  }

  // --- Populate para retorno ---
  const populated = await Appointment.findById(appointment._id)
    .populate(APPOINTMENT_POPULATE[0].path, APPOINTMENT_POPULATE[0].select)
    .populate(APPOINTMENT_POPULATE[1].path, APPOINTMENT_POPULATE[1].select)
    .populate(APPOINTMENT_POPULATE[2].path, APPOINTMENT_POPULATE[2].select);

  // --- Log de auditoria ---
  await Log.create({
    user: actor.id,
    cras,
    action: 'criar_agendamento',
    details: `Agendamento criado para ${pessoa} em ${formatDateTime(dataAgendamento)} - Motivo: ${motivo}`,
  });

  // --- Invalidar cache ---
  cache.invalidateAppointments(cras, entrevistador);

  return populated.toJSON();
};

// =============================================================================
// LISTAGEM COM BUSCA, FILTROS E PAGINAÇÃO
// =============================================================================

/**
 * Lista agendamentos com filtro por role, busca em campos criptografados,
 * paginação e ordenação.
 *
 * @param {Object} queryParams - Query string da requisição
 * @param {Object} actor - Usuário logado { id, role, cras }
 * @returns {Object} { results, total, page, pageSize, totalPages, hasNextPage, hasPrevPage }
 */
export const getAppointments = async (queryParams, actor) => {
  const filter = {};

  // --- Filtros de segurança por role ---
  if (actor.role === 'entrevistador') {
    filter.entrevistador = actor.id;
  } else if (actor.role === 'recepcao') {
    const ids = await _getEntrevistadorIdsByCras(actor.cras);
    if (ids.length === 0) return _emptyPage();
    filter.entrevistador = { $in: ids };
  } else if (actor.role === 'admin') {
    if (queryParams.cras) {
      const ids = await _getEntrevistadorIdsByCras(queryParams.cras);
      if (ids.length === 0) return _emptyPage();
      filter.entrevistador = { $in: ids };
    }
    if (queryParams.entrevistador) {
      filter.entrevistador = queryParams.entrevistador;
    }
  }

  // --- Filtro por data (dia completo) ---
  if (queryParams.data) {
    try {
      const [ano, mes, dia] = queryParams.data.split('-').map(Number);
      filter.data = {
        $gte: new Date(ano, mes - 1, dia, 0, 0, 0, 0),
        $lte: new Date(ano, mes - 1, dia, 23, 59, 59, 999),
      };
    } catch {
      logger.warn('Data inválida fornecida no filtro:', queryParams.data);
    }
  }

  // --- Busca textual ---
  let searchTerm = null;
  if (queryParams.search) {
    const search = queryParams.search.trim();
    if (search.length > 100) return _emptyPage();
    searchTerm = search.toLowerCase();
  }

  // --- Ordenação ---
  const sort = _buildSort(queryParams.sortBy, queryParams.order);

  // --- Paginação ---
  const page = Math.max(0, parseInt(queryParams.page) || 0);
  let pageSize = parseInt(queryParams.pageSize) || 50;
  if (!ALLOWED_PAGE_SIZES.includes(pageSize)) {
    pageSize = ALLOWED_PAGE_SIZES.reduce((prev, curr) =>
      Math.abs(curr - pageSize) < Math.abs(prev - pageSize) ? curr : prev
    );
  }
  const skip = page * pageSize;

  // --- Query principal ---
  let query = Appointment.find(filter)
    .select(LIST_SELECT)
    .populate(APPOINTMENT_POPULATE_LIST[0].path, APPOINTMENT_POPULATE_LIST[0].select)
    .populate(APPOINTMENT_POPULATE_LIST[1].path, APPOINTMENT_POPULATE_LIST[1].select)
    .sort(sort);

  if (!searchTerm) query = query.skip(skip).limit(pageSize);
  query = query.lean();

  let results = await query.exec();

  // --- Decriptação em batch ---
  results = results.map(decryptFields);

  // --- Busca em memória (campos criptografados já decriptados) ---
  if (searchTerm) {
    results = _filterBySearch(results, searchTerm);
  }

  // --- Total ---
  const total = searchTerm
    ? results.length
    : await Appointment.countDocuments(filter);

  // --- Paginação em memória (quando há busca) ---
  if (searchTerm) {
    results = results.slice(skip, skip + pageSize);
  }

  // --- Ordenação de campos populados (limitação do MongoDB) ---
  if (queryParams.sortBy && ['cras', 'entrevistador'].includes(queryParams.sortBy)) {
    results = _sortByPopulatedField(results, queryParams.sortBy, queryParams.order);
  }

  return {
    results,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    hasNextPage: (page + 1) * pageSize < total,
    hasPrevPage: page > 0,
  };
};

// =============================================================================
// ATUALIZAÇÃO
// =============================================================================

/**
 * Atualiza campos de um agendamento existente.
 *
 * @param {string} id - ID do agendamento
 * @param {Object} body - Campos a atualizar (filtrados por whitelist)
 * @param {Object} actor - Usuário logado
 * @returns {Object} Agendamento atualizado, populado (JSON)
 * @throws {BusinessError} Se não encontrado ou não autorizado
 */
export const updateAppointment = async (id, body, actor) => {
  const existing = await findOrFail(id);
  await checkOwnership(existing, actor, 'editar');

  // Whitelist de campos
  const update = {};
  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (body[field] !== undefined) update[field] = body[field];
  }
  update.updatedBy = actor.id;
  update.updatedAt = now();

  await Appointment.findByIdAndUpdate(id, update, { new: true });

  // Populate completo para retorno
  const updated = await findOrFail(id, APPOINTMENT_POPULATE_FULL);

  // Log de auditoria
  await Log.create({
    user: actor.id,
    cras: updated.cras._id,
    action: 'editar_agendamento',
    details: `Agendamento editado para ${updated.pessoa} em ${formatDateTime(updated.data)}`,
  });

  cache.invalidateAppointments(updated.cras._id, updated.entrevistador._id);

  return updated.toJSON();
};

// =============================================================================
// EXCLUSÃO
// =============================================================================

/**
 * Remove um agendamento e registra log de auditoria.
 *
 * @param {string} id - ID do agendamento
 * @param {Object} actor - Usuário logado
 * @throws {BusinessError} Se não encontrado ou não autorizado
 */
export const deleteAppointment = async (id, actor) => {
  const appointment = await findOrFail(id, [{ path: 'cras', select: 'nome' }]);
  await checkOwnership(appointment, actor, 'excluir');

  const appointmentData = appointment.toJSON();

  await Appointment.findByIdAndDelete(id);

  await Log.create({
    user: actor.id,
    cras: appointmentData.cras._id,
    action: 'excluir_agendamento',
    details: `Agendamento excluído de ${appointmentData.pessoa} em ${formatDateTime(appointmentData.data)}`,
  });

  cache.invalidateAppointments(appointmentData.cras._id, appointment.entrevistador);
};

// =============================================================================
// CONFIRMAR / REMOVER PRESENÇA
// =============================================================================

/**
 * Confirma presença — muda status para 'realizado'.
 *
 * @param {string} id - ID do agendamento
 * @param {Object} actor - Usuário logado
 * @returns {Object} Agendamento atualizado (JSON)
 * @throws {BusinessError} Se não encontrado ou não autorizado
 */
export const confirmPresence = async (id, actor) => {
  const existing = await findOrFail(id);
  await checkOwnership(existing, actor, 'confirmar presença em');

  await Appointment.findByIdAndUpdate(id, {
    status: 'realizado',
    updatedBy: actor.id,
    updatedAt: now(),
  });

  const updated = await findOrFail(id, APPOINTMENT_POPULATE_FULL);
  cache.invalidateAppointments(updated.cras._id, updated.entrevistador._id);

  return updated.toJSON();
};

/**
 * Remove confirmação de presença — volta status para 'agendado'.
 *
 * @param {string} id - ID do agendamento
 * @param {Object} actor - Usuário logado
 * @returns {Object} Agendamento atualizado (JSON)
 * @throws {BusinessError} Se não encontrado ou não autorizado
 */
export const removePresenceConfirmation = async (id, actor) => {
  const existing = await findOrFail(id);
  await checkOwnership(existing, actor, 'remover confirmação de');

  await Appointment.findByIdAndUpdate(id, {
    status: 'agendado',
    updatedBy: actor.id,
    updatedAt: now(),
  });

  const updated = await findOrFail(id, APPOINTMENT_POPULATE_FULL);
  cache.invalidateAppointments(updated.cras._id, updated.entrevistador._id);

  return updated.toJSON();
};

// =============================================================================
// FUNÇÕES AUXILIARES PRIVADAS
// =============================================================================

/** Busca IDs de entrevistadores de um CRAS. */
const _getEntrevistadorIdsByCras = async (crasId) => {
  const users = await User.find({ cras: crasId, role: 'entrevistador' }).select('_id');
  return users.map((u) => u._id);
};

/** Retorna objeto vazio de paginação. */
const _emptyPage = () => ({
  results: [], total: 0, page: 0, pageSize: 50,
  totalPages: 0, hasNextPage: false, hasPrevPage: false,
});

/** Constrói objeto de sort a partir dos query params. */
const _buildSort = (sortBy, order) => {
  if (!sortBy) return { data: 1 };
  let field = sortBy;
  if (['cras', 'entrevistador', 'createdBy'].includes(field)) field += '.name';
  return { [field]: order === 'desc' ? -1 : 1 };
};

/**
 * Filtra resultados decriptados por termo de busca.
 * Suporta busca com e sem máscara para CPF e telefone.
 */
const _filterBySearch = (results, searchTerm) => {
  const termSemMascara = searchTerm.replace(/\D/g, '');
  return results.filter((doc) => {
    const pessoa = (doc.pessoa || '').toLowerCase();
    const cpf = (doc.cpf || '').replace(/\D/g, '');
    const cpfFormatado = (doc.cpf || '').toLowerCase();
    const tel1 = (doc.telefone1 || '').toLowerCase();
    const tel2 = (doc.telefone2 || '').toLowerCase();

    return (
      pessoa.includes(searchTerm) ||
      cpfFormatado.includes(searchTerm) ||
      (termSemMascara && cpf.includes(termSemMascara)) ||
      tel1.includes(searchTerm) ||
      (termSemMascara && tel1.replace(/\D/g, '').includes(termSemMascara)) ||
      tel2.includes(searchTerm) ||
      (termSemMascara && tel2.replace(/\D/g, '').includes(termSemMascara))
    );
  });
};

/** Ordena resultados por campo populado (ex: cras.nome, entrevistador.name). */
const _sortByPopulatedField = (results, field, order) => {
  const dir = order === 'desc' ? -1 : 1;
  return [...results].sort((a, b) => {
    const aName = (a[field]?.name || a[field]?.nome || '').toLowerCase();
    const bName = (b[field]?.name || b[field]?.nome || '').toLowerCase();
    if (aName < bName) return -1 * dir;
    if (aName > bName) return 1 * dir;
    return 0;
  });
};
