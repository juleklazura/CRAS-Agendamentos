// Rotas para gerenciamento de agendamentos
// Define endpoints para CRUD completo de agendamentos com controle de permissões
import express from 'express';
import { createAppointment, getAppointments, updateAppointment, deleteAppointment, confirmPresence, removePresenceConfirmation } from '../controllers/appointmentController.js';
import { auth, authorize } from '../middlewares/auth.js';

const router = express.Router();

// POST /api/appointments - Criar novo agendamento
// Permite entrevistador, recepção e admin criarem agendamentos
router.post('/', auth, authorize(['entrevistador', 'recepcao', 'admin']), createAppointment);

// GET /api/appointments - Listar agendamentos com filtros
// Admin vê todos, entrevistador vê os seus, recepção vê os do CRAS
router.get('/', auth, getAppointments);

// PATCH /api/appointments/:id/confirm - Confirmar presença no agendamento
// Muda status para 'realizado'
router.patch('/:id/confirm', auth, authorize(['entrevistador', 'recepcao', 'admin']), confirmPresence);

// PATCH /api/appointments/:id/unconfirm - Remover confirmação de presença
// Volta status para 'agendado'
router.patch('/:id/unconfirm', auth, authorize(['entrevistador', 'recepcao', 'admin']), removePresenceConfirmation);

// PUT /api/appointments/:id - Editar agendamento existente
router.put('/:id', auth, authorize(['entrevistador', 'recepcao', 'admin']), updateAppointment);

// DELETE /api/appointments/:id - Excluir agendamento
router.delete('/:id', auth, authorize(['entrevistador', 'recepcao', 'admin']), deleteAppointment);

export default router;
