// Rotas para sistema de logs e auditoria
// Permite consulta e criação de registros de auditoria
import express from 'express';
import { createLog, getLogs } from '../controllers/logController.js';
import { auth, authorize } from '../middlewares/auth.js';

const router = express.Router();

// POST /api/logs - Criar novo registro de log
// Qualquer usuário autenticado pode criar logs
router.post('/', auth, createLog);

// GET /api/logs - Consultar logs com filtros por perfil
// Entrevistadores veem apenas seus logs, recepção vê logs do CRAS, admin vê todos
router.get('/', auth, authorize(['admin', 'entrevistador', 'recepcao']), getLogs);

export default router;
