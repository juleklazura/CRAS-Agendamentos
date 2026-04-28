import express from 'express';
import { createCras, getCras, getCrasById, updateCras, deleteCras } from '../controllers/crasController.js';
import { auth, authorize } from '../middlewares/auth.js';
import { validateId } from '../middlewares/validateId.js';
import { validate, createCrasSchema, updateCrasSchema } from '../validators/crasValidator.js';

const router = express.Router();

// POST /api/cras - Criar nova unidade CRAS (apenas admin)
router.post('/', auth, authorize(['admin']), validate(createCrasSchema), createCras);

// GET /api/cras - Listar todas as unidades CRAS
router.get('/', auth, getCras);

// GET /api/cras/:id - Buscar unidade CRAS específica por ID
router.get('/:id', auth, validateId('id'), getCrasById);

// PUT /api/cras/:id - Editar unidade CRAS existente (apenas admin)
// 🔒 SEGURANÇA: Validação Joi (stripUnknown) previne mass-assignment
router.put('/:id', auth, validateId('id'), authorize(['admin']), validate(updateCrasSchema), updateCras);

// DELETE /api/cras/:id - Excluir unidade CRAS (apenas admin)
router.delete('/:id', auth, validateId('id'), authorize(['admin']), deleteCras);

export default router;
