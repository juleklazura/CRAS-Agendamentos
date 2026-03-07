// =============================================================================
// 🏗️ CAMADA DE SERVIÇO — LÓGICA DE NEGÓCIO DE AGENDAMENTOS
// =============================================================================
// Separa a lógica de negócio do controller, facilitando manutenção,
// reutilização e testabilidade. O controller apenas orquestra
// request/response; toda lógica de domínio fica aqui.

import prisma from '../utils/prisma.js';
import EncryptionService from '../utils/encryption.js';
import { validarCPF, validarTelefone } from '../utils/validators.js';
import { parseDate, isWeekend, formatDateTime, now } from '../utils/timezone.js';
import cache from '../utils/cache.js';
import logger from '../utils/logger.js';
import { BusinessError } from './userService.js';
import { motivoToEnum, convertAppointmentMotivo } from '../constants/motivos.js';

// =============================================================================
// INCLUDE OBJECTS (Prisma equivalente ao populate)
// =============================================================================

const INCLUDE_DEFAULT = {
  entrevistador: { select: { id: true, name: true, matricula: true } },
  cras: { select: { id: true, nome: true, endereco: true, telefone: true } },
  createdBy: { select: { id: true, name: true, matricula: true } },
};

const INCLUDE_FULL = {
  ...INCLUDE_DEFAULT,
  updatedBy: { select: { id: true, name: true, matricula: true } },
};

const INCLUDE_LIST = {
  entrevistador: { select: { id: true, name: true, matricula: true } },
  cras: { select: { id: true, nome: true } },
};

// =============================================================================
// HELPERS INTERNOS
// =============================================================================

/** Tamanhos de página permitidos. */
const ALLOWED_PAGE_SIZES = [10, 20, 50, 100];

/**
 * Descriptografa campos LGPD de um agendamento (objeto Prisma).
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
 * Processa um agendamento para retorno ao frontend:
 * descriptografa campos LGPD e converte enum de motivo → label.
 */
const processAppointment = (doc) => {
  if (!doc) return doc;
  return convertAppointmentMotivo(decryptFields(doc));
};

/**
 * Criptografa campos sensíveis para persistência.
 */
const encryptField = (value) => (value ? EncryptionService.encrypt(value) : value);

/**
 * Verifica se o usuário tem permissão para operar no agendamento.
 */
const checkOwnership = async (appointment, actor, action) => {
  if (actor.role === 'admin') return;

  if (actor.role === 'entrevistador') {
    if (appointment.entrevistadorId !== actor.id) {
      throw new BusinessError(
        `Você não tem permissão para ${action} este agendamento`,
        403,
        'FORBIDDEN'
      );
    }
    return;
  }

  if (actor.role === 'recepcao') {
    const entrevistador = await prisma.user.findUnique({
      where: { id: appointment.entrevistadorId },
      select: { id: true, crasId: true },
    });
    if (!entrevistador || entrevistador.crasId !== actor.cras) {
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
 */
const findOrFail = async (id, include = null) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    ...(include && { include }),
  });
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
 */
export const createAppointment = async (data, actor) => {
  const {
    entrevistador, cras, pessoa, cpf, telefone1, telefone2,
    motivo, data: dataAgendamento, status, observacoes,
  } = data;

  // --- Validações de obrigatoriedade ---
  if (!entrevistador) throw new BusinessError('Entrevistador é obrigatório');
  if (!cras) throw new BusinessError('CRAS é obrigatório');
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

  // --- Verificar slot disponível (proteção contra race condition) ---
  const existingSlot = await prisma.appointment.findFirst({
    where: {
      entrevistadorId: entrevistador,
      data: new Date(dataAgendamento),
      status: 'agendado',
    },
  });
  if (existingSlot) {
    const dataFormatada = formatDateTime(dataAgendamento);
    throw new BusinessError(
      `Este horário (${dataFormatada}) já está ocupado para este entrevistador. Por favor, escolha outro horário.`,
      409,
      'SLOT_TAKEN'
    );
  }

  // --- Persistência com campos criptografados ---
  const appointment = await prisma.appointment.create({
    data: {
      entrevistadorId: entrevistador,
      crasId: cras,
      pessoa: encryptField(pessoa),
      cpf: encryptField(cpf),
      cpfHash: EncryptionService.hash(cpf),
      telefone1: encryptField(telefone1),
      telefone2: encryptField(telefone2),
      motivo: motivoToEnum(motivo),
      data: new Date(dataAgendamento),
      status: status || 'agendado',
      observacoes,
      createdById: actor.id,
    },
    include: INCLUDE_DEFAULT,
  });

  // --- Log de auditoria ---
  await prisma.log.create({
    data: {
      userId: actor.id,
      crasId: cras,
      action: 'criar_agendamento',
      details: `Agendamento #${appointment.id} criado para ${formatDateTime(dataAgendamento)} - Motivo: ${motivo}`,
    },
  });

  // --- Invalidar cache ---
  cache.invalidateAppointments(cras, entrevistador);

  return processAppointment(appointment);
};

// =============================================================================
// LISTAGEM COM BUSCA, FILTROS E PAGINAÇÃO
// =============================================================================

/**
 * Lista agendamentos com filtro por role, busca em campos criptografados,
 * paginação e ordenação.
 */
export const getAppointments = async (queryParams, actor) => {
  const where = {};

  // --- Filtros de segurança por role ---
  if (actor.role === 'entrevistador') {
    where.entrevistadorId = actor.id;
  } else if (actor.role === 'recepcao') {
    const ids = await _getEntrevistadorIdsByCras(actor.cras);
    if (ids.length === 0) return _emptyPage();
    where.entrevistadorId = { in: ids };
  } else if (actor.role === 'admin') {
    if (queryParams.cras) {
      const ids = await _getEntrevistadorIdsByCras(queryParams.cras);
      if (ids.length === 0) return _emptyPage();
      where.entrevistadorId = { in: ids };
    }
    if (queryParams.entrevistador) {
      where.entrevistadorId = queryParams.entrevistador;
    }
  }

  // --- Filtro por data (dia completo) ---
  if (queryParams.data) {
    try {
      const [ano, mes, dia] = queryParams.data.split('-').map(Number);
      where.data = {
        gte: new Date(ano, mes - 1, dia, 0, 0, 0, 0),
        lte: new Date(ano, mes - 1, dia, 23, 59, 59, 999),
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
  const orderBy = _buildOrderBy(queryParams.sortBy, queryParams.order);

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
  if (searchTerm) {
    // Busca textual: precisa descriptografar todos para filtrar em memória
    let results = await prisma.appointment.findMany({
      where,
      include: INCLUDE_LIST,
      orderBy,
    });

    results = results.map(processAppointment);
    results = _filterBySearch(results, searchTerm);

    const total = results.length;
    results = results.slice(skip, skip + pageSize);

    return {
      results,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasNextPage: (page + 1) * pageSize < total,
      hasPrevPage: page > 0,
    };
  }

  // Sem busca: paginação no banco
  const [rawResults, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: INCLUDE_LIST,
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.appointment.count({ where }),
  ]);

  const results = rawResults.map(processAppointment);

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
 */
export const updateAppointment = async (id, body, actor) => {
  const existing = await findOrFail(id);
  await checkOwnership(existing, actor, 'editar');

  // Whitelist e mapeamento de campos
  const data = {};
  if (body.entrevistador !== undefined) data.entrevistadorId = body.entrevistador;
  if (body.cras !== undefined) data.crasId = body.cras;
  if (body.pessoa !== undefined) data.pessoa = encryptField(body.pessoa);
  if (body.cpf !== undefined) {
    data.cpf = encryptField(body.cpf);
    data.cpfHash = EncryptionService.hash(body.cpf);
  }
  if (body.telefone1 !== undefined) data.telefone1 = encryptField(body.telefone1);
  if (body.telefone2 !== undefined) data.telefone2 = body.telefone2 ? encryptField(body.telefone2) : null;
  if (body.motivo !== undefined) data.motivo = motivoToEnum(body.motivo);
  if (body.data !== undefined) data.data = new Date(body.data);
  if (body.status !== undefined) data.status = body.status;
  if (body.observacoes !== undefined) data.observacoes = body.observacoes;

  data.updatedById = actor.id;
  data.updatedAt = now();

  const updated = await prisma.appointment.update({
    where: { id },
    data,
    include: INCLUDE_FULL,
  });

  const result = processAppointment(updated);

  // Log de auditoria
  await prisma.log.create({
    data: {
      userId: actor.id,
      crasId: updated.crasId,
      action: 'editar_agendamento',
      details: `Agendamento #${updated.id} editado em ${formatDateTime(updated.data)}`,
    },
  });

  cache.invalidateAppointments(updated.crasId, updated.entrevistadorId);

  return result;
};

// =============================================================================
// EXCLUSÃO
// =============================================================================

/**
 * Remove um agendamento e registra log de auditoria.
 */
export const deleteAppointment = async (id, actor) => {
  const appointment = await findOrFail(id, { cras: { select: { id: true, nome: true } } });
  await checkOwnership(appointment, actor, 'excluir');

  await prisma.appointment.delete({ where: { id } });

  await prisma.log.create({
    data: {
      userId: actor.id,
      crasId: appointment.crasId,
      action: 'excluir_agendamento',
      details: `Agendamento #${id} excluído (data: ${formatDateTime(appointment.data)})`,
    },
  });

  cache.invalidateAppointments(appointment.crasId, appointment.entrevistadorId);
};

// =============================================================================
// CONFIRMAR / REMOVER PRESENÇA
// =============================================================================

/**
 * Confirma presença — muda status para 'realizado'.
 */
export const confirmPresence = async (id, actor) => {
  const existing = await findOrFail(id);
  await checkOwnership(existing, actor, 'confirmar presença em');

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: 'realizado', updatedById: actor.id, updatedAt: now() },
    include: INCLUDE_FULL,
  });

  cache.invalidateAppointments(updated.crasId, updated.entrevistadorId);

  return processAppointment(updated);
};

/**
 * Remove confirmação de presença — volta status para 'agendado'.
 */
export const removePresenceConfirmation = async (id, actor) => {
  const existing = await findOrFail(id);
  await checkOwnership(existing, actor, 'remover confirmação de');

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: 'agendado', updatedById: actor.id, updatedAt: now() },
    include: INCLUDE_FULL,
  });

  cache.invalidateAppointments(updated.crasId, updated.entrevistadorId);

  return processAppointment(updated);
};

// =============================================================================
// FUNÇÕES AUXILIARES PRIVADAS
// =============================================================================

/** Busca IDs de entrevistadores de um CRAS (com cache de 5 minutos). */
const _getEntrevistadorIdsByCras = async (crasId) => {
  const cacheKey = `entrevistadores:ids:cras:${crasId}`;
  return cache.cached(cacheKey, async () => {
    const users = await prisma.user.findMany({
      where: { crasId, role: 'entrevistador' },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }, 300);
};

/** Retorna objeto vazio de paginação. */
const _emptyPage = () => ({
  results: [], total: 0, page: 0, pageSize: 50,
  totalPages: 0, hasNextPage: false, hasPrevPage: false,
});

/** Constrói orderBy para Prisma a partir dos query params. */
const _buildOrderBy = (sortBy, order) => {
  const dir = order === 'desc' ? 'desc' : 'asc';
  if (!sortBy) return { data: 'asc' };

  if (sortBy === 'cras') return { cras: { nome: dir } };
  if (sortBy === 'entrevistador') return { entrevistador: { name: dir } };

  return { [sortBy]: dir };
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
