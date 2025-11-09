// Rotas para sistema de logs e auditoria
// Permite consulta e criação de registros de auditoria
// Sistema registra ações importantes para rastreabilidade e compliance
import express from 'express';
import { createLog, getLogs } from '../controllers/logController.js';
import { auth, authorize } from '../middlewares/auth.js';

const router = express.Router();

// POST /api/logs - Criar novo registro de log
// Qualquer usuário autenticado pode criar logs de suas ações
// Body: { action, details?, relatedData? }
// Usado automaticamente pelos controllers para registrar operações
router.post('/', auth, createLog);

// GET /api/logs - Consultar logs com filtros baseados no perfil do usuário
// Entrevistadores veem apenas seus próprios logs
// Recepção vê logs do CRAS onde trabalha
// Admin vê todos os logs do sistema
// Query params: ?action=tipo&startDate=yyyy-mm-dd&endDate=yyyy-mm-dd&user=id
router.get('/', auth, authorize(['admin', 'entrevistador', 'recepcao']), getLogs);

export default router;
