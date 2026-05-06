// Rotas para gerenciamento de bloqueios de horário
// Permite que APENAS ENTREVISTADORES bloqueiem seus próprios horários
// Bloqueios impedem que agendamentos sejam criados para determinados horários
import express from 'express';
import { createBlockedSlot, getBlockedSlots, deleteBlockedSlot } from '../controllers/blockedSlotController.js';
import { auth, authorize } from '../middlewares/auth.js';
import { validateId, validateQueryIds } from '../middlewares/validateId.js';
import { validate } from '../validators/appointmentValidator.js';
import { createBlockedSlotSchema } from '../validators/blockedSlotValidator.js';

const router = express.Router();

// POST /api/blocked-slots - Criar novo bloqueio de horário (entrevistador)
// Joi (stripUnknown) valida tipos e remove campos extras antes do controller
router.post('/', auth, authorize(['entrevistador']), validate(createBlockedSlotSchema), createBlockedSlot);

// GET /api/blocked-slots - Listar bloqueios conforme permissões do usuário
// Valida IDs nos query params
router.get('/', auth, validateQueryIds(['entrevistador', 'cras']), authorize(['entrevistador', 'recepcao', 'admin']), getBlockedSlots);

// DELETE /api/blocked-slots/:id - Remover bloqueio de horário
// APENAS entrevistadores podem desbloquear seus próprios horários
router.delete('/:id', auth, validateId('id'), authorize(['entrevistador']), deleteBlockedSlot);

export default router;
