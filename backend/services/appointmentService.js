// Camada de serviço — lógica de negócio de agendamentos.
// Aqui ficam: regras RBAC, validações cross-field, criptografia de CPF e queries Prisma.
// O controller é apenas um adaptador HTTP; toda decisão de negócio passa por aqui.

import prisma from '../utils/prisma.js';
import pkg from '@prisma/client';
const { Prisma } = pkg;
import EncryptionService from '../utils/encryption.js';
import { validarCPF, validarTelefone } from '../utils/validators.js';
import { parseDate, isWeekend, formatDateTime, now } from '../utils/timezone.js';
import cache from '../utils/cache.js';
import logger from '../utils/logger.js';
import { BusinessError } from '../utils/errors.js';
import { motivoToEnum, convertAppointmentMotivo } from '../constants/motivos.js';

// =============================================================================
// INCLUDE OBJECTS (Prisma equivalente ao populate)
// =============================================================================

const INCLUDE_DEFAULT = {
  // `ativo` incluído para que o frontend sinalize entrevistadores desativados (LGPD — rastreabilidade).
  entrevistador: { select: { id: true, name: true, matricula: true, ativo: true } },
  cras: { select: { id: true, nome: true, endereco: true, telefone: true } },
  createdBy: { select: { id: true, name: true, matricula: true } },
};

const INCLUDE_FULL = {
  ...INCLUDE_DEFAULT,
  updatedBy: { select: { id: true, name: true, matricula: true } },
};

const INCLUDE_LIST = {
  // `ativo` incluído para que o frontend sinalize entrevistadores desativados (LGPD — rastreabilidade).
  entrevistador: { select: { id: true, name: true, matricula: true, ativo: true } },
  cras: { select: { id: true, nome: true } },
};

// =============================================================================
// HELPERS INTERNOS
// =============================================================================

/** Tamanhos de página permitidos. */
const ALLOWED_PAGE_SIZES = [10, 20, 50, 100];

/** Status permitidos para agendamentos. */
const STATUS_ALLOWED = ['agendado', 'realizado', 'ausente'];

/**
 * Descriptografa campos LGPD de um agendamento (objeto Prisma).
 */
const decryptFields = (doc) => {
  const fieldsToDecrypt = ['pessoa', 'cpf', 'telefone1', 'telefone2', 'observacoes'];
  const decrypted = { ...doc };
  for (const field of fieldsToDecrypt) {
    if (decrypted[field] && EncryptionService.isEncrypted(decrypted[field])) {
      decrypted[field] = EncryptionService.decrypt(decrypted[field]);
    }
  }
  return decrypted;
};

/**
 * Mascara CPF conforme LGPD — princípio da minimização de dados (Art. 6º, III).
 * Expõe apenas os dígitos centrais: ***.XXX.XXX-**
 * Suporta CPF com ou sem formatação ("12345678900" ou "123.456.789-00").
 */
const maskCpf = (cpf) => {
  if (!cpf) return cpf;
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return '***.***.***-**';
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
};

/**
 * Verifica se o actor tem acesso ao CPF completo.
 * Apenas 'admin' e 'entrevistador' (responsável pelo agendamento) podem ver o CPF inteiro.
 * Recepção recebe CPF mascarado.
 */
const canSeeCpf = (actor) => actor && actor.role !== 'recepcao';

/**
 * Processa um agendamento para retorno ao frontend:
 * descriptografa campos LGPD, converte enum de motivo → label e
 * aplica mascaramento de CPF conforme o papel do actor (LGPD).
 *
 * @param {object} doc   - Registro bruto do Prisma.
 * @param {object} actor - Usuário autenticado (id, role). Obrigatório para controle de CPF.
 */
const INTERNAL_FIELDS = ['cpfHash', 'createdById', 'updatedById'];

const processAppointment = (doc, actor) => {
  if (!doc) return doc;
  const processed = convertAppointmentMotivo(decryptFields(doc));
  for (const field of INTERNAL_FIELDS) delete processed[field];
  // LGPD — minimização de dados: recepção não tem necessidade legítima do CPF completo
  if (!canSeeCpf(actor)) {
    processed.cpf = maskCpf(processed.cpf);
  }
  return processed;
};

/**
 * Criptografa campos sensíveis para persistência.
 */
const encryptField = (value) => (value ? EncryptionService.encrypt(value) : value);

/**
 * Gera o hash do CPF sempre a partir de dígitos normalizados.
 * Garante consistência independente do formato recebido ("123.456.789-00" ou "12345678900").
 */
const hashCpf = (cpf) => EncryptionService.hash(cpf.replace(/\D/g, ''));

/**
 * Verifica se o usuário tem permissão para operar no agendamento.
 *
 * SEGURANÇA — Defesa em profundidade:
 * Esta função é a segunda camada de proteção. A primeira é o middleware authorize()
 * aplicado nas rotas, que bloqueia admin antes mesmo de o request chegar ao service.
 * Mesmo assim, admin é explicitamente bloqueado aqui para neutralizar qualquer
 * tentativa de bypass direto ao service (ex: chamada interna futura, testes mal-configurados).
 */
const checkOwnership = async (appointment, actor, action) => {
  // Admin não possui permissão operacional sobre agendamentos.
  // Este bloco funciona como segunda camada de defesa (belt-and-suspenders).
  if (actor.role === 'admin') {
    throw new BusinessError(
      'Administradores não têm permissão para realizar operações de agendamento',
      403,
      'ADMIN_OPERATION_FORBIDDEN'
    );
  }

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
    // appointment.crasId === entrevistador.crasId (FK garantida pelo schema)
    // Não é necessário buscar o entrevistador no banco: o crasId do agendamento
    // já identifica o CRAS ao qual ele pertence.
    if (appointment.crasId !== actor.cras) {
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
    ...(include
      ? { include }
      : { select: { id: true, entrevistadorId: true, crasId: true, data: true } }
    ),
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
  // SEGURANÇA — Defesa em profundidade: garante que admin nunca crie agendamentos,
  // mesmo que a restrição na rota seja contornada (ex: middleware removido acidentalmente).
  if (actor.role === 'admin') {
    throw new BusinessError(
      'Administradores não têm permissão para criar agendamentos',
      403,
      'ADMIN_OPERATION_FORBIDDEN'
    );
  }

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

  // --- Verificações de autorização (IDOR e cross-CRAS) ---
  // P6: Entrevistador só pode criar agendamentos para si mesmo
  if (actor.role === 'entrevistador' && entrevistador !== actor.id) {
    throw new BusinessError(
      'Entrevistadores só podem criar agendamentos para si mesmos',
      403,
      'FORBIDDEN'
    );
  }
  // P8: Recepção só pode criar agendamentos para entrevistadores do próprio CRAS
  if (actor.role === 'recepcao') {
    const entrevistadorRecord = await prisma.user.findUnique({
      where: { id: entrevistador },
      select: { crasId: true },
    });
    if (!entrevistadorRecord || entrevistadorRecord.crasId !== actor.cras) {
      throw new BusinessError(
        'Você só pode criar agendamentos para entrevistadores do seu CRAS',
        403,
        'FORBIDDEN_CROSS_CRAS'
      );
    }
  }

  // --- Validação de status ---
  if (status && !STATUS_ALLOWED.includes(status)) {
    throw new BusinessError(`Status inválido. Valores permitidos: ${STATUS_ALLOWED.join(', ')}`, 400, 'INVALID_STATUS');
  }

  // --- Regra de negócio: sem fins de semana ---
  if (isWeekend(parseDate(dataAgendamento))) {
    throw new BusinessError('Não é permitido agendar para sábado ou domingo.');
  }

  // --- Verificar slot disponível (check rápido antes do insert) ---
  const existingSlot = await prisma.appointment.findFirst({
    where: {
      entrevistadorId: entrevistador,
      data: new Date(dataAgendamento),
    },
    select: { id: true },
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
  let appointment;
  try {
    appointment = await prisma.appointment.create({
      data: {
        entrevistadorId: entrevistador,
        crasId: cras,
        pessoa: encryptField(pessoa),
        cpf: encryptField(cpf),
        cpfHash: hashCpf(cpf),
        telefone1: encryptField(telefone1),
        telefone2: encryptField(telefone2),
        motivo: motivoToEnum(motivo),
        data: new Date(dataAgendamento),
        status: status || 'agendado',
        observacoes: encryptField(observacoes),
        createdById: actor.id,
      },
      include: INCLUDE_DEFAULT,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const dataFormatada = formatDateTime(dataAgendamento);
      throw new BusinessError(
        `Este horário (${dataFormatada}) já está ocupado para este entrevistador. Por favor, escolha outro horário.`,
        409,
        'SLOT_TAKEN'
      );
    }
    throw error;
  }

  // --- Log de auditoria (fire-and-forget: não bloqueia a resposta) ---
  prisma.log.create({
    data: {
      userId: actor.id,
      crasId: cras,
      action: 'criar_agendamento',
      details: `Agendamento #${appointment.id} criado para ${formatDateTime(dataAgendamento)} - Motivo: ${motivo}`,
    },
  }).catch((err) => logger.error('Falha ao gravar log de auditoria (criar_agendamento)', { error: err.message, id: appointment.id }));

  // --- Invalidar cache ---
  cache.invalidateAppointments(cras, entrevistador);

  return processAppointment(appointment, actor);
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
    // Recepção só vê agendamentos de entrevistadores ATIVOS do seu CRAS.
    // Entrevistadores desativados não têm mais agenda operacional ativa.
    const ids = await _getEntrevistadorIdsByCras(actor.cras, true);
    if (ids.length === 0) return _emptyPage();
    where.entrevistadorId = { in: ids };
  } else if (actor.role === 'admin') {
    if (queryParams.cras) {
      // Admin precisa de visibilidade total para auditoria — inclui desativados.
      const ids = await _getEntrevistadorIdsByCras(queryParams.cras, false);
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
    // Busca textual: precisa descriptografar em memória para filtrar.
    // O limite é proporcional ao escopo do actor para reduzir consumo de CPU/RAM:
    //   - entrevistador: apenas a própria agenda (~1 ano útil ≈ 1500 slots)
    //   - recepcao/admin com cras: todos os entrevistadores do CRAS (~3000)
    //   - admin global: teto absoluto (~7200 ≈ 5 anos de agenda cheia)
    const SEARCH_MAX_ROWS =
      actor.role === 'entrevistador' ? 1500
      : where.entrevistadorId ? 3000
      : 7200;
    let results = await prisma.appointment.findMany({
      where,
      include: INCLUDE_LIST,
      orderBy,
      take: SEARCH_MAX_ROWS,
    });

    results = results.map((doc) => processAppointment(doc, actor));
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

  // Sem busca: paginação no banco.
  // Busca pageSize+1 para detectar próxima página sem query de count separada.
  const rawResults = await prisma.appointment.findMany({
    where,
    include: INCLUDE_LIST,
    orderBy,
    skip,
    take: pageSize + 1,
  });

  const hasNextPage = rawResults.length > pageSize;
  const sliced = hasNextPage ? rawResults.slice(0, pageSize) : rawResults;
  const results = sliced.map((doc) => processAppointment(doc, actor));

  // Count só é necessário quando há mais páginas além desta.
  // Se não há próxima página, o total exato é skip + tamanho da página atual.
  const total = hasNextPage
    ? await prisma.appointment.count({ where })
    : skip + sliced.length;

  return {
    results,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    hasNextPage,
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
  if (body.entrevistador !== undefined) {
    // Valida que o novo entrevistador pertence ao mesmo CRAS do agendamento.
    // Sem isso, a recepção do CRAS A poderia reatribuir agendamentos para entrevistadores do CRAS B.
    // Nota: admin nunca alcança este ponto — bloqueado em checkOwnership acima.
    const novoEntrevistador = await prisma.user.findUnique({
      where: { id: body.entrevistador },
      select: { crasId: true },
    });
    if (!novoEntrevistador || novoEntrevistador.crasId !== existing.crasId) {
      throw new BusinessError(
        'Não é permitido reatribuir agendamento para entrevistador de outro CRAS',
        403,
        'FORBIDDEN_CROSS_CRAS'
      );
    }
    data.entrevistadorId = body.entrevistador;
  }
  if (body.cras !== undefined) data.crasId = body.cras;
  if (body.pessoa !== undefined) data.pessoa = encryptField(body.pessoa);
  if (body.cpf !== undefined) {
    data.cpf = encryptField(body.cpf);
    data.cpfHash = hashCpf(body.cpf);
  }
  if (body.telefone1 !== undefined) data.telefone1 = encryptField(body.telefone1);
  if (body.telefone2 !== undefined) data.telefone2 = body.telefone2 ? encryptField(body.telefone2) : null;
  if (body.motivo !== undefined) data.motivo = motivoToEnum(body.motivo);
  if (body.data !== undefined) data.data = new Date(body.data);
  if (body.status !== undefined) {
    if (!STATUS_ALLOWED.includes(body.status)) {
      throw new BusinessError(`Status inválido. Valores permitidos: ${STATUS_ALLOWED.join(', ')}`, 400, 'INVALID_STATUS');
    }
    data.status = body.status;
  }
  if (body.observacoes !== undefined) data.observacoes = encryptField(body.observacoes);

  data.updatedById = actor.id;
  data.updatedAt = now();

  const updated = await prisma.appointment.update({
    where: { id },
    data,
    include: INCLUDE_FULL,
  });

  const result = processAppointment(updated, actor);

  prisma.log.create({
    data: {
      userId: actor.id,
      crasId: updated.crasId,
      action: 'editar_agendamento',
      details: `Agendamento #${updated.id} editado em ${formatDateTime(updated.data)}`,
    },
  }).catch((err) => logger.error('Falha ao gravar log de auditoria (editar_agendamento)', { error: err.message, id: updated.id }));

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
  // select mínimo: apenas campos necessários para ownership + cache invalidation
  const appointment = await findOrFail(id);
  await checkOwnership(appointment, actor, 'excluir');

  await prisma.appointment.delete({ where: { id } });

  prisma.log.create({
    data: {
      userId: actor.id,
      crasId: appointment.crasId,
      action: 'excluir_agendamento',
      details: `Agendamento #${id} excluído (data: ${formatDateTime(appointment.data)})`,
    },
  }).catch((err) => logger.error('Falha ao gravar log de auditoria (excluir_agendamento)', { error: err.message, id }));

  cache.invalidateAppointments(appointment.crasId, appointment.entrevistadorId);
};

// =============================================================================
// CONFIRMAR / REMOVER PRESENÇA
// =============================================================================

/**
 * Confirma presença — muda status para 'realizado'.
 * Ordem correta: findOrFail → checkOwnership → update
 * Garante que o ownership é verificado ANTES de qualquer escrita no banco.
 */
export const confirmPresence = async (id, actor) => {
  const existing = await findOrFail(id);
  await checkOwnership(existing, actor, 'confirmar presença em');

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: 'realizado', updatedById: actor.id, updatedAt: now() },
    include: INCLUDE_FULL,
  });

  prisma.log.create({
    data: {
      userId: actor.id,
      crasId: updated.crasId,
      action: 'confirmar_presenca',
      details: `Presença confirmada no agendamento #${id} (data: ${formatDateTime(updated.data)})`,
    },
  }).catch((err) => logger.error('Falha ao gravar log de auditoria (confirmar_presenca)', { error: err.message, id }));

  cache.invalidateAppointments(updated.crasId, updated.entrevistadorId);

  return processAppointment(updated, actor);
};

/**
 * Remove confirmação de presença — volta status para 'agendado'.
 * Ordem correta: findOrFail → checkOwnership → update
 * Garante que o ownership é verificado ANTES de qualquer escrita no banco.
 */
export const removePresenceConfirmation = async (id, actor) => {
  const existing = await findOrFail(id);
  await checkOwnership(existing, actor, 'remover confirmação de');

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: 'agendado', updatedById: actor.id, updatedAt: now() },
    include: INCLUDE_FULL,
  });

  prisma.log.create({
    data: {
      userId: actor.id,
      crasId: updated.crasId,
      action: 'remover_confirmacao_presenca',
      details: `Confirmação de presença removida do agendamento #${id} (data: ${formatDateTime(updated.data)})`,
    },
  }).catch((err) => logger.error('Falha ao gravar log de auditoria (remover_confirmacao_presenca)', { error: err.message, id }));

  cache.invalidateAppointments(updated.crasId, updated.entrevistadorId);

  return processAppointment(updated, actor);
};

// =============================================================================
// BUSCA POR CPF (LGPD)
// =============================================================================

/**
 * Busca agendamentos pelo CPF do titular, respeitando as diretrizes da LGPD:
 *
 *  - Finalidade limitada: acesso restrito a papéis autorizados.
 *  - Minimização de dados: usa apenas o hash do CPF para a query, sem
 *    descriptografar registros em massa.
 *  - Controle de acesso: entrevistador vê apenas os seus; recepção, apenas
 *    os do seu CRAS; admin vê todos.
 *  - Rastreabilidade: toda consulta gera um log de auditoria imutável.
 *  - Proteção contra enumeração: rate limiter aplicado na camada de rota.
 *
 * @param {string} cpf   - CPF digitado pelo operador (com ou sem máscara).
 * @param {object} actor - Usuário autenticado (id, role, cras).
 */
export const getAppointmentsByCpf = async (cpf, actor) => {
  // --- Validação de entrada ---
  if (!cpf || typeof cpf !== 'string') {
    throw new BusinessError('CPF é obrigatório', 400, 'MISSING_CPF');
  }
  if (!validarCPF(cpf)) {
    throw new BusinessError('CPF inválido. Verifique os dígitos e tente novamente.', 400, 'INVALID_CPF');
  }

  // --- Normalização: dígitos apenas, garantindo hash único e consistente ---
  const where = { cpfHash: hashCpf(cpf) };

  if (actor.role === 'entrevistador') {
    where.entrevistadorId = actor.id;
  } else if (actor.role === 'recepcao') {
    // LGPD (Art. 9º, § 3º — titular tem direito ao histórico completo):
    // A busca por CPF abrange entrevistadores desativados para preservar o
    // histórico de atendimentos do cidadão. Diferente da listagem operacional
    // (que filtra apenas ativos), aqui o dado pertence ao cidadão, não ao
    // entrevistador. Ocultar registros violaria o direito de acesso do titular.
    const ids = await _getEntrevistadorIdsByCras(actor.cras, false);
    if (ids.length === 0) {
      await _logCpfSearch(actor, 0);
      return [];
    }
    where.entrevistadorId = { in: ids };
  }
  // admin: sem filtro adicional

  // --- Query usando índice cpfHash (nunca percorre a tabela inteira) ---
  const appointments = await prisma.appointment.findMany({
    where,
    include: INCLUDE_LIST,
    orderBy: { data: 'desc' },
    take: 50, // teto de registros para minimizar exposição de dados
  });

  // --- Log de auditoria obrigatório (LGPD — rastreabilidade) ---
  await _logCpfSearch(actor, appointments.length);

  return appointments.map((doc) => processAppointment(doc, actor));
};

/** Registra auditoria de consulta por CPF sem armazenar o CPF em si. */
const _logCpfSearch = async (actor, resultCount) => {
  await prisma.log.create({
    data: {
      userId: actor.id,
      crasId: actor.cras || null,
      action: 'consulta_por_cpf',
      details: `Consulta de agendamentos por CPF — ${resultCount} resultado(s) encontrado(s)`,
    },
  });
};

// =============================================================================
// FUNÇÕES AUXILIARES PRIVADAS
// =============================================================================

/**
 * Busca IDs de entrevistadores de um CRAS (com cache de 5 minutos).
 *
 * @param {string}  crasId      - ID do CRAS
 * @param {boolean} apenasAtivos - true  → somente entrevistadores ativos (padrão, uso operacional)
 *                                 false → todos, incluindo desativados (admin/histórico LGPD)
 *
 * Chave de cache prefixada com `users:` para ser invalidada automaticamente
 * por `cache.invalidateUsers()` quando um usuário é desativado.
 */
const _getEntrevistadorIdsByCras = async (crasId, apenasAtivos = true) => {
  const cacheKey = `users:entrevistadores:ids:cras:${crasId}:ativo:${apenasAtivos}`;
  return cache.cached(cacheKey, async () => {
    const where = { crasId, role: 'entrevistador' };
    if (apenasAtivos) where.ativo = true;
    const users = await prisma.user.findMany({ where, select: { id: true } });
    return users.map((u) => u.id);
  }, 300);
};

/** Retorna objeto vazio de paginação. */
const _emptyPage = () => ({
  results: [], total: 0, page: 0, pageSize: 50,
  totalPages: 0, hasNextPage: false, hasPrevPage: false,
});

/** Campos permitidos para ordenação (whitelist). */
const SORTABLE_FIELDS = ['data', 'status', 'motivo', 'createdAt'];

/** Constrói orderBy para Prisma a partir dos query params. */
const _buildOrderBy = (sortBy, order) => {
  const dir = order === 'desc' ? 'desc' : 'asc';
  if (!sortBy) return { data: 'asc' };

  if (sortBy === 'cras') return { cras: { nome: dir } };
  if (sortBy === 'entrevistador') return { entrevistador: { name: dir } };

  if (!SORTABLE_FIELDS.includes(sortBy)) return { data: 'asc' };
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
