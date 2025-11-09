// Rotas para gerenciamento de agendamentos
// Define endpoints para CRUD completo de agendamentos com controle de permissões
// Cada rota possui middleware de autenticação e autorização específicos
import express from 'express';
import { createAppointment, getAppointments, updateAppointment, deleteAppointment, confirmPresence, removePresenceConfirmation } from '../controllers/appointmentController.js';
import { auth, authorize } from '../middlewares/auth.js';
import { createLimiter, deleteLimiter } from '../middlewares/rateLimiters.js';

const router = express.Router();

// POST /api/appointments - Criar novo agendamento
// Permite entrevistador, recepção e admin criarem agendamentos
// Body: { entrevistador, cras, pessoa, cpf, telefone1, telefone2?, motivo, data, observacoes? }
// 🔒 SEGURANÇA: Rate limiter - máximo 20 criações por hora
router.post('/', createLimiter, auth, authorize(['entrevistador', 'recepcao', 'admin']), createAppointment);

// GET /api/appointments - Listar agendamentos com filtros
// Admin vê todos, entrevistador vê apenas os seus, recepção vê os do CRAS
// Query params: ?entrevistador=id&cras=id&data=yyyy-mm-dd&status=agendado|realizado
router.get('/', auth, getAppointments);

// PATCH /api/appointments/:id/confirm - Confirmar presença no agendamento
// Muda status para 'realizado' indicando que a pessoa compareceu
// Usado pelos entrevistadores durante o atendimento
router.patch('/:id/confirm', auth, authorize(['entrevistador', 'recepcao', 'admin']), confirmPresence);

// PATCH /api/appointments/:id/unconfirm - Remover confirmação de presença
// Volta status para 'agendado' caso tenha sido marcado como realizado por engano
// Permite reverter a confirmação de presença
router.patch('/:id/unconfirm', auth, authorize(['entrevistador', 'recepcao', 'admin']), removePresenceConfirmation);

// PUT /api/appointments/:id - Editar agendamento existente
// Permite alterar dados do agendamento como nome, telefone, motivo, etc.
// Valida se o usuário tem permissão para editar o agendamento específico
router.put('/:id', auth, authorize(['entrevistador', 'recepcao', 'admin']), updateAppointment);

// DELETE /api/appointments/:id - Excluir agendamento
// Remove o agendamento do sistema completamente
// Validações de permissão aplicadas no controller
// 🔒 SEGURANÇA: Rate limiter - máximo 10 exclusões por hora
router.delete('/:id', deleteLimiter, auth, authorize(['entrevistador', 'recepcao', 'admin']), deleteAppointment);

export default router;
