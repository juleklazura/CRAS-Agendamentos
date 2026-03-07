// Rotas para gerenciamento de bloqueios de horário
// Permite que APENAS ENTREVISTADORES bloqueiem seus próprios horários
// Bloqueios impedem que agendamentos sejam criados para determinados horários
import express from 'express';
import { createBlockedSlot, getBlockedSlots, deleteBlockedSlot } from '../controllers/blockedSlotController.js';
import { auth, authorize } from '../middlewares/auth.js';
import { validateId, validateQueryIds } from '../middlewares/validateId.js';

const router = express.Router();

// POST /api/blocked-slots - Criar novo bloqueio de horário
// APENAS entrevistadores podem bloquear seus próprios horários
// Body: { data, motivo, observacoes? }
router.post('/', auth, authorize(['entrevistador', 'admin']), createBlockedSlot);

// GET /api/blocked-slots - Listar bloqueios conforme permissões do usuário
// Admin vê todos, entrevistador vê apenas os seus, recepção vê os do CRAS (somente leitura)
// Query params: ?entrevistador=id&data=yyyy-mm-dd
// 🔒 SEGURANÇA: Validação de IDs nos filtros
router.get('/', auth, validateQueryIds(['entrevistador', 'cras']), authorize(['entrevistador', 'recepcao', 'admin']), getBlockedSlots);

// DELETE /api/blocked-slots/:id - Remover bloqueio de horário
// APENAS entrevistadores podem desbloquear seus próprios horários
// Admin também pode remover qualquer bloqueio
router.delete('/:id', auth, validateId('id'), authorize(['entrevistador', 'admin']), deleteBlockedSlot);

export default router;
