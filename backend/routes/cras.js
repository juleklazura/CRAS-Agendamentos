import express from 'express';
import { createCras, getCras, getCrasById, updateCras, deleteCras } from '../controllers/crasController.js';
import { auth, authorize } from '../middlewares/auth.js';
const router = express.Router();

router.post('/', auth, authorize(['admin']), createCras);
router.get('/', auth, getCras);
router.get('/:id', auth, getCrasById);
router.put('/:id', auth, authorize(['admin']), updateCras);
router.delete('/:id', auth, authorize(['admin']), deleteCras);

export default router;
