import express from 'express';
import { createLog, getLogs } from '../controllers/logController.js';
import { auth, authorize } from '../middlewares/auth.js';
const router = express.Router();

router.post('/', auth, createLog);
router.get('/', auth, authorize(['admin', 'entrevistador']), getLogs);

export default router;
