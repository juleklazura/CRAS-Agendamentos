// Rotas para sistema de logs e auditoria
// Permite consulta e criação de registros de auditoria
// Sistema registra ações importantes para rastreabilidade e compliance
import express from 'express';
import { createLog, getLogs } from '../controllers/logController.js';
import { auth, authorize } from '../middlewares/auth.js';
import { validateQueryIds } from '../middlewares/validateId.js';

const router = express.Router();

// POST /api/logs - Criar novo registro de log
// Restrito a admin — os controllers internos usam prisma.log.create() diretamente
router.post('/', auth, authorize(['admin']), createLog);

// GET /api/logs - Consultar logs com filtros baseados no perfil do usuário
// validateQueryIds garante que ?cras= e ?user= são CUIDs válidos antes da query
router.get('/', auth, authorize(['admin', 'entrevistador', 'recepcao']), validateQueryIds(['cras', 'user']), getLogs);

export default router;
