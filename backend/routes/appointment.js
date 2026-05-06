// Rotas para gerenciamento de agendamentos
// Define endpoints para CRUD completo de agendamentos com controle de permissões
// Cada rota possui middleware de autenticação e autorização específicos
import express from 'express';
import { createAppointment, getAppointments, updateAppointment, deleteAppointment, confirmPresence, removePresenceConfirmation, getAppointmentsByCpf } from '../controllers/appointmentController.js';
import { auth, authorize } from '../middlewares/auth.js';
import { validateId, validateQueryIds } from '../middlewares/validateId.js';
import { createAppointmentLimiter, deleteLimiter, cpfSearchLimiter } from '../middlewares/rateLimiters.js';
import { validate, createAppointmentSchema, updateAppointmentSchema } from '../validators/appointmentValidator.js';

const router = express.Router();

// POST /api/appointments - Criar novo agendamento
// Permite entrevistador, recepção e admin criarem agendamentos
// Body: { entrevistador, cras, pessoa, cpf, telefone1, telefone2?, motivo, data, observacoes? }
router.post('/', auth, authorize(['entrevistador', 'recepcao', 'admin']), createAppointmentLimiter, validate(createAppointmentSchema), createAppointment);

// GET /api/appointments - Listar agendamentos com filtros
// Admin vê todos, entrevistador vê apenas os seus, recepção vê os do CRAS
// Valida IDs nos query params antes da query
router.get('/', auth, validateQueryIds(['cras', 'entrevistador']), getAppointments);

// GET /api/appointments/by-cpf - Buscar agendamentos por CPF do titular
// LGPD: acesso restrito por role; toda consulta gera log de auditoria.
// Rate limit estrito para prevenir enumeração de dados pessoais.
router.get('/by-cpf', auth, authorize(['entrevistador', 'recepcao', 'admin']), cpfSearchLimiter, getAppointmentsByCpf);

// PATCH /api/appointments/:id/confirm - Confirmar presença (status → 'realizado')
router.patch('/:id/confirm', auth, validateId('id'), authorize(['entrevistador', 'recepcao', 'admin']), confirmPresence);

// PATCH /api/appointments/:id/unconfirm - Reverter confirmação de presença (status → 'agendado')
router.patch('/:id/unconfirm', auth, validateId('id'), authorize(['entrevistador', 'recepcao', 'admin']), removePresenceConfirmation);

// PATCH /api/appointments/:id - Atualização parcial (ex: apenas status)
router.patch('/:id', auth, validateId('id'), authorize(['entrevistador', 'recepcao', 'admin']), validate(updateAppointmentSchema), updateAppointment);

// PUT /api/appointments/:id - Editar agendamento completo
router.put('/:id', auth, validateId('id'), authorize(['entrevistador', 'recepcao', 'admin']), validate(updateAppointmentSchema), updateAppointment);

// DELETE /api/appointments/:id - Excluir agendamento
// Remove o agendamento do sistema completamente
// Validações de permissão aplicadas no controller
router.delete('/:id', auth, validateId('id'), authorize(['entrevistador', 'recepcao', 'admin']), deleteLimiter, deleteAppointment);

export default router;
