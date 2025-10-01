// Rotas para gerenciamento de bloqueios de horário
// Permite que entrevistadores e recepção bloqueiem horários específicos
import express from 'express';
import { createBlockedSlot, getBlockedSlots, deleteBlockedSlot } from '../controllers/blockedSlotController.js';
import { auth, authorize } from '../middlewares/auth.js';

const router = express.Router();

// POST /api/blocked-slots - Criar novo bloqueio de horário
// Entrevistadores podem bloquear apenas seus horários
// Recepção pode bloquear horários de qualquer entrevistador do CRAS
router.post('/', auth, authorize(['entrevistador', 'recepcao', 'admin']), createBlockedSlot);

// GET /api/blocked-slots - Listar bloqueios conforme permissões
router.get('/', auth, authorize(['entrevistador', 'recepcao', 'admin']), getBlockedSlots);

// DELETE /api/blocked-slots/:id - Remover bloqueio de horário
// Mesmas regras de permissão da criação
router.delete('/:id', auth, authorize(['entrevistador', 'recepcao', 'admin']), deleteBlockedSlot);

export default router;
