import express from 'express';
import { createBlockedSlot, getBlockedSlots, deleteBlockedSlot } from '../controllers/blockedSlotController.js';
import { auth, authorize } from '../middlewares/auth.js';
const router = express.Router();

// Apenas entrevistador pode manipular seus bloqueios
router.post('/', auth, authorize(['entrevistador', 'recepcao', 'admin']), createBlockedSlot);
router.get('/', auth, authorize(['entrevistador', 'recepcao', 'admin']), getBlockedSlots);
router.delete('/:id', auth, authorize(['entrevistador', 'recepcao', 'admin']), deleteBlockedSlot);

export default router;
