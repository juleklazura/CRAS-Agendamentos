import express from 'express';
import { createAppointment, getAppointments, updateAppointment, deleteAppointment, confirmPresence, removePresenceConfirmation } from '../controllers/appointmentController.js';
import { auth, authorize } from '../middlewares/auth.js';
const router = express.Router();

// Agendar (entrevistador e recepção do próprio CRAS)
router.post('/', auth, authorize(['entrevistador', 'recepcao', 'admin']), createAppointment);
// Listar (admin vê todos, entrevistador vê os seus, recepção vê do CRAS)
router.get('/', auth, getAppointments);
// Confirmar presença
router.patch('/:id/confirm', auth, authorize(['entrevistador', 'recepcao', 'admin']), confirmPresence);
// Remover confirmação de presença
router.patch('/:id/unconfirm', auth, authorize(['entrevistador', 'recepcao', 'admin']), removePresenceConfirmation);
// Editar
router.put('/:id', auth, authorize(['entrevistador', 'recepcao', 'admin']), updateAppointment);
// Remover
router.delete('/:id', auth, authorize(['entrevistador', 'recepcao', 'admin']), deleteAppointment);

export default router;
