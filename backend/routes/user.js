// Rotas para gerenciamento de usuários
// Define endpoints para CRUD de usuários com controle rigoroso de permissões
// Sistema de três níveis: admin, entrevistador, recepcao
import express from 'express';
import { createUser, getUsers, updateUser, deleteUser, getEntrevistadoresByCras } from '../controllers/userController.js';
import { auth, authorize } from '../middlewares/auth.js';
import { validateId } from '../middlewares/validateId.js';
import { validate, createUserSchema, updateUserSchema } from '../validators/userValidator.js';

const router = express.Router();

// GET /api/users - Listar usuários (acessível para todos os usuários autenticados)
// Usado para dropdowns de seleção e listagens gerais
// Filtros aplicados no controller baseados no perfil do usuário
router.get('/', auth, getUsers);

// GET /api/users/entrevistadores/cras/:crasId - Buscar entrevistadores por CRAS específico
// Usado pela recepção para filtrar apenas entrevistadores do próprio CRAS
// Facilita criação de agendamentos com escopo restrito
// 🔒 SEGURANÇA: Validação de ID no parâmetro
router.get('/entrevistadores/cras/:crasId', auth, validateId('crasId'), authorize(['recepcao', 'admin']), getEntrevistadoresByCras);

// Rotas restritas apenas para administradores
// Operações de criação, edição e exclusão são privilégios administrativos

// POST /api/users - Criar novo usuário no sistema
// Body: { name, matricula, password, role, cras? }
// Validação de dados via Joi middleware antes do controller
router.post('/', auth, authorize(['admin']), validate(createUserSchema), createUser);

// PUT /api/users/:id - Editar usuário existente
// Permite alterar dados pessoais, papel e vinculação a CRAS
// Body: { name?, matricula?, password?, role?, cras?, agenda? }
// 🔒 SEGURANÇA: Validação de ID + Validação Joi dos dados
router.put('/:id', auth, validateId('id'), authorize(['admin']), validate(updateUserSchema), updateUser);

// DELETE /api/users/:id - Excluir usuário do sistema
// Remove usuário permanentemente - valida dependências no service
// Verifica se não há agendamentos vinculados antes de excluir
router.delete('/:id', auth, validateId('id'), authorize(['admin']), deleteUser);

export default router;
