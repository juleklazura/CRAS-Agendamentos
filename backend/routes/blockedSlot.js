// Rotas para gerenciamento de bloqueios de horário
// Permite que entrevistadores e recepção bloqueiem horários específicos
// Bloqueios impedem que agendamentos sejam criados para determinados horários
import express from 'express';
import { createBlockedSlot, getBlockedSlots, deleteBlockedSlot } from '../controllers/blockedSlotController.js';
import { auth, authorize } from '../middlewares/auth.js';
import { createLimiter, deleteLimiter } from '../middlewares/rateLimiters.js';

const router = express.Router();

// POST /api/blocked-slots - Criar novo bloqueio de horário
// Entrevistadores podem bloquear apenas seus próprios horários
// Recepção pode bloquear horários de qualquer entrevistador do CRAS
// Body: { entrevistador, data, motivo, observacoes? }
// 🔒 SEGURANÇA: Rate limiter - máximo 20 criações por hora
router.post('/', createLimiter, auth, authorize(['entrevistador', 'recepcao', 'admin']), createBlockedSlot);

// GET /api/blocked-slots - Listar bloqueios conforme permissões do usuário
// Admin vê todos, entrevistador vê apenas os seus, recepção vê os do CRAS
// Query params: ?entrevistador=id&data=yyyy-mm-dd
router.get('/', auth, authorize(['entrevistador', 'recepcao', 'admin']), getBlockedSlots);

// DELETE /api/blocked-slots/:id - Remover bloqueio de horário
// Mesmas regras de permissão da criação - apenas quem criou ou tem permissão pode remover
// Permite desbloqueio de horários que não são mais necessários
// 🔒 SEGURANÇA: Rate limiter - máximo 10 exclusões por hora
router.delete('/:id', deleteLimiter, auth, authorize(['entrevistador', 'recepcao', 'admin']), deleteBlockedSlot);

export default router;
