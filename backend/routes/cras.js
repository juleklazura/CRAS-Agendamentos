// Rotas para gerenciamento de unidades CRAS
// Define endpoints para CRUD de unidades com restrições de acesso
import express from 'express';
import { createCras, getCras, getCrasById, updateCras, deleteCras } from '../controllers/crasController.js';
import { auth, authorize } from '../middlewares/auth.js';

const router = express.Router();

// POST /api/cras - Criar nova unidade CRAS (apenas admin)
router.post('/', auth, authorize(['admin']), createCras);

// GET /api/cras - Listar todas as unidades CRAS
// Acessível para todos os usuários autenticados
router.get('/', auth, getCras);

// GET /api/cras/:id - Buscar unidade CRAS específica por ID
router.get('/:id', auth, getCrasById);

// PUT /api/cras/:id - Editar unidade CRAS (apenas admin)
router.put('/:id', auth, authorize(['admin']), updateCras);

// DELETE /api/cras/:id - Excluir unidade CRAS (apenas admin)
router.delete('/:id', auth, authorize(['admin']), deleteCras);

export default router;
