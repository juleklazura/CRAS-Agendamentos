// Rotas para gerenciamento de agendamentos
// Define endpoints para CRUD completo de agendamentos com controle de permissões por role.
//
// REGRA DE PRINCÍPIO DO MENOR PRIVILÉGIO:
//   - Operações de LEITURA (GET): admin, entrevistador, recepcao.
//   - Operações de ESCRITA (POST, PATCH, PUT, DELETE): entrevistador, recepcao APENAS.
//   - O administrador NÃO possui permissão para criar, editar, cancelar, confirmar
//     presença ou excluir agendamentos. Seu papel é gestão e auditoria.
//
// A restrição é aplicada em duas camadas (defesa em profundidade):
//   1. Middleware authorize() neste arquivo — rejeita admin nas rotas de escrita com HTTP 403.
//   2. Camada de serviço (appointmentService.js) — valida novamente o role do actor,
//      garantindo proteção mesmo que chamadas diretas à API contornem o roteador.
import express from 'express';
import { createAppointment, getAppointments, updateAppointment, deleteAppointment, confirmPresence, removePresenceConfirmation, getAppointmentsByCpf } from '../controllers/appointmentController.js';
import { auth, authorize } from '../middlewares/auth.js';
import { validateId, validateQueryIds } from '../middlewares/validateId.js';
import { createAppointmentLimiter, deleteLimiter, cpfSearchLimiter } from '../middlewares/rateLimiters.js';
import { validate, createAppointmentSchema, updateAppointmentSchema } from '../validators/appointmentValidator.js';

const router = express.Router();

// Roles operacionais: papéis com permissão para manipular agendamentos.
// Admin é deliberadamente excluído — ele gerencia o sistema, não a agenda.
const OPERATIONAL_ROLES = ['entrevistador', 'recepcao'];

// POST /api/appointments - Criar novo agendamento
// Restrito a entrevistador e recepção — admin não pode criar agendamentos em nome de terceiros.
// Body: { entrevistador, cras, pessoa, cpf, telefone1, telefone2?, motivo, data, observacoes? }
router.post('/', auth, authorize(OPERATIONAL_ROLES), createAppointmentLimiter, validate(createAppointmentSchema), createAppointment);

// GET /api/appointments - Listar agendamentos com filtros
// Admin vê todos (somente leitura), entrevistador vê apenas os seus, recepção vê os do CRAS.
// Valida IDs nos query params antes da query.
router.get('/', auth, validateQueryIds(['cras', 'entrevistador']), getAppointments);

// POST /api/appointments/by-cpf - Buscar agendamentos por CPF do titular
// LGPD: CPF no body (nunca em query string) — evita vazamento em access logs,
// CDN, histórico do navegador e APMs (vide LGPD Art. 46 + security review 2026-05-13).
// Rate limit estrito para prevenir enumeração de dados pessoais.
// Admin tem acesso de leitura para fins de auditoria e suporte.
router.post('/by-cpf', auth, authorize([...OPERATIONAL_ROLES, 'admin']), cpfSearchLimiter, getAppointmentsByCpf);

// PATCH /api/appointments/:id/confirm - Confirmar presença (status → 'realizado')
// Exclusivo para papéis operacionais — admin não confirma presença.
router.patch('/:id/confirm', auth, validateId('id'), authorize(OPERATIONAL_ROLES), confirmPresence);

// PATCH /api/appointments/:id/unconfirm - Reverter confirmação de presença (status → 'agendado')
// Exclusivo para papéis operacionais — admin não reverte confirmação de presença.
router.patch('/:id/unconfirm', auth, validateId('id'), authorize(OPERATIONAL_ROLES), removePresenceConfirmation);

// PATCH /api/appointments/:id - Atualização parcial (ex: apenas status)
// Exclusivo para papéis operacionais.
router.patch('/:id', auth, validateId('id'), authorize(OPERATIONAL_ROLES), validate(updateAppointmentSchema), updateAppointment);

// PUT /api/appointments/:id - Editar agendamento completo
// Exclusivo para papéis operacionais.
router.put('/:id', auth, validateId('id'), authorize(OPERATIONAL_ROLES), validate(updateAppointmentSchema), updateAppointment);

// DELETE /api/appointments/:id - Excluir agendamento
// Exclusivo para papéis operacionais. Validações de ownership aplicadas no service.
router.delete('/:id', auth, validateId('id'), authorize(OPERATIONAL_ROLES), deleteLimiter, deleteAppointment);

export default router;
