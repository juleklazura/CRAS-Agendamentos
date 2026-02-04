// Rotas para gerenciamento de usuários
// Define endpoints para CRUD de usuários com controle rigoroso de permissões
// Sistema de três níveis: admin, entrevistador, recepcao
import express from 'express';
import { createUser, getUsers, updateUser, deleteUser, getEntrevistadoresByCras } from '../controllers/userController.js';
import { auth, authorize } from '../middlewares/auth.js';
import { validateObjectId } from '../middlewares/validateObjectId.js';

const router = express.Router();

// GET /api/users - Listar usuários (acessível para todos os usuários autenticados)
// Usado para dropdowns de seleção e listagens gerais
// Filtros aplicados no controller baseados no perfil do usuário
router.get('/', auth, getUsers);

// GET /api/users/entrevistadores/cras/:crasId - Buscar entrevistadores por CRAS específico
// Usado pela recepção para filtrar apenas entrevistadores do próprio CRAS
// Facilita criação de agendamentos com escopo restrito
// 🔒 SEGURANÇA: Validação de ObjectId no parâmetro
router.get('/entrevistadores/cras/:crasId', auth, validateObjectId('crasId'), authorize(['recepcao', 'admin']), getEntrevistadoresByCras);

// Rotas restritas apenas para administradores
// Operações de criação, edição e exclusão são privilégios administrativos

// POST /api/users - Criar novo usuário no sistema
// Body: { name, email, matricula, password, role, cras? }
// Cria usuários com validação de dados únicos (email, matrícula)
router.post('/', auth, authorize(['admin']), createUser);

// PUT /api/users/:id - Editar usuário existente
// Permite alterar dados pessoais, papel e vinculação a CRAS
// Body: { name?, email?, matricula?, password?, role?, cras? }
// 🔒 SEGURANÇA: Validação de ObjectId no parâmetro
router.put('/:id', auth, validateObjectId('id'), authorize(['admin']), updateUser);

// DELETE /api/users/:id - Excluir usuário do sistema
// Remove usuário permanentemente - deve validar dependências
// Verifica se não há agendamentos ou logs vinculados antes de excluir
router.delete('/:id', auth, validateObjectId('id'), authorize(['admin']), deleteUser);

export default router;
