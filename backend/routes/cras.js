// Rotas para gerenciamento de unidades CRAS
// Define endpoints para CRUD de unidades com restrições de acesso
// Apenas admins podem criar/editar/excluir, mas todos podem consultar
import express from 'express';
import { createCras, getCras, getCrasById, updateCras, deleteCras } from '../controllers/crasController.js';
import { auth, authorize } from '../middlewares/auth.js';
import { createLimiter, deleteLimiter } from '../middlewares/rateLimiters.js';

const router = express.Router();

// POST /api/cras - Criar nova unidade CRAS (apenas admin)
// Body: { nome, endereco, telefone, responsavel?, observacoes? }
// Usado para cadastrar novas unidades CRAS no sistema
// 🔒 SEGURANÇA: Rate limiter - máximo 20 criações por hora
router.post('/', createLimiter, auth, authorize(['admin']), createCras);

// GET /api/cras - Listar todas as unidades CRAS
// Acessível para todos os usuários autenticados
// Necessário para dropdowns e seleções em outras telas
router.get('/', auth, getCras);

// GET /api/cras/:id - Buscar unidade CRAS específica por ID
// Retorna dados detalhados de uma unidade específica
// Usado para edição e visualização de detalhes
// 🔒 SEGURANÇA: Requer autenticação mas permite qualquer role
router.get('/:id', auth, getCrasById);

// PUT /api/cras/:id - Editar unidade CRAS existente (apenas admin)
// Permite atualizar informações da unidade como nome, endereço, etc.
// Body: { nome?, endereco?, telefone?, responsavel?, observacoes? }
router.put('/:id', auth, authorize(['admin']), updateCras);

// DELETE /api/cras/:id - Excluir unidade CRAS (apenas admin)
// Remove unidade do sistema - deve validar se não há dependências
// Verifica se existem usuários ou agendamentos vinculados antes de excluir
// 🔒 SEGURANÇA: Rate limiter - máximo 10 exclusões por hora
router.delete('/:id', deleteLimiter, auth, authorize(['admin']), deleteCras);

export default router;
