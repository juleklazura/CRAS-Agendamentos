// Rotas para gerenciamento de agendamentos
// Define endpoints para CRUD completo de agendamentos com controle de permissões
// Cada rota possui middleware de autenticação e autorização específicos
import express from 'express';
import { createAppointment, getAppointments, updateAppointment, deleteAppointment, confirmPresence, removePresenceConfirmation } from '../controllers/appointmentController.js';
import { auth, authorize } from '../middlewares/auth.js';
import { validateObjectId, validateQueryObjectIds } from '../middlewares/validateObjectId.js';

const router = express.Router();

// POST /api/appointments - Criar novo agendamento
// Permite entrevistador, recepção e admin criarem agendamentos
// Body: { entrevistador, cras, pessoa, cpf, telefone1, telefone2?, motivo, data, observacoes? }
router.post('/', auth, authorize(['entrevistador', 'recepcao', 'admin']), createAppointment);

// GET /api/appointments - Listar agendamentos com filtros
// Admin vê todos, entrevistador vê apenas os seus, recepção vê os do CRAS
// Query params: ?entrevistador=id&cras=id&data=yyyy-mm-dd&status=agendado|realizado
// 🔒 SEGURANÇA: Validação de ObjectIds nos filtros
router.get('/', auth, validateQueryObjectIds(['cras', 'entrevistador']), getAppointments);

// PATCH /api/appointments/:id/confirm - Confirmar presença no agendamento
// Muda status para 'realizado' indicando que a pessoa compareceu
// Usado pelos entrevistadores durante o atendimento
// 🔒 SEGURANÇA: Validação de ObjectId no parâmetro
router.patch('/:id/confirm', auth, validateObjectId('id'), authorize(['entrevistador', 'recepcao', 'admin']), confirmPresence);

// PATCH /api/appointments/:id/unconfirm - Remover confirmação de presença
// Volta status para 'agendado' caso tenha sido marcado como realizado por engano
// Permite reverter a confirmação de presença
router.patch('/:id/unconfirm', auth, validateObjectId('id'), authorize(['entrevistador', 'recepcao', 'admin']), removePresenceConfirmation);

// PATCH /api/appointments/:id - Atualizar campos específicos do agendamento
// Permite atualização parcial (ex: apenas status)
router.patch('/:id', auth, validateObjectId('id'), authorize(['entrevistador', 'recepcao', 'admin']), updateAppointment);

// PUT /api/appointments/:id - Editar agendamento existente
// Permite alterar dados do agendamento como nome, telefone, motivo, etc.
// Valida se o usuário tem permissão para editar o agendamento específico
router.put('/:id', auth, validateObjectId('id'), authorize(['entrevistador', 'recepcao', 'admin']), updateAppointment);

// DELETE /api/appointments/:id - Excluir agendamento
// Remove o agendamento do sistema completamente
// Validações de permissão aplicadas no controller
router.delete('/:id', auth, validateObjectId('id'), authorize(['entrevistador', 'recepcao', 'admin']), deleteAppointment);

export default router;
