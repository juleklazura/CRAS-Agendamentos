// Rotas para gerenciamento de usuários
// Define endpoints para CRUD de usuários com controle de permissões
import express from 'express';
import { createUser, getUsers, updateUser, deleteUser, getEntrevistadoresByCras } from '../controllers/userController.js';
import { auth, authorize } from '../middlewares/auth.js';

const router = express.Router();

// GET /api/users - Listar usuários (acessível para todos os usuários autenticados)
router.get('/', auth, getUsers);

// GET /api/users/entrevistadores/cras/:crasId - Buscar entrevistadores por CRAS
// Usado pela recepção para filtrar entrevistadores do próprio CRAS
router.get('/entrevistadores/cras/:crasId', auth, authorize(['recepcao', 'admin']), getEntrevistadoresByCras);

// Rotas restritas apenas para administradores
// POST /api/users - Criar novo usuário
router.post('/', auth, authorize(['admin']), createUser);

// PUT /api/users/:id - Editar usuário existente
router.put('/:id', auth, authorize(['admin']), updateUser);

// DELETE /api/users/:id - Excluir usuário
router.delete('/:id', auth, authorize(['admin']), deleteUser);

export default router;
