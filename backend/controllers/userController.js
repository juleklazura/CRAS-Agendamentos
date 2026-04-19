// =============================================================================
// 🎮 CONTROLLER DE USUÁRIOS - CAMADA DE ORQUESTRAÇÃO
// =============================================================================
// Responsável APENAS por: receber request → delegar ao service → enviar response.
// Toda lógica de negócio fica em services/userService.js.
// Validação de dados fica em validators/userValidator.js.

import * as userService from '../services/userService.js';
import { apiSuccess, apiMessage, handleControllerError } from '../utils/apiResponse.js';

// POST /api/users — Criar novo usuário (admin)
export const createUser = async (req, res) => {
  try {
    // Body já validado e sanitizado pelo middleware Joi (validate)
    const user = await userService.createUser(req.body, req.user);
    apiSuccess(res, user, 201);
  } catch (err) {
    handleControllerError(res, err, 'Erro ao criar usuário');
  }
};

// GET /api/users — Listar usuários com controle de acesso
export const getUsers = async (req, res) => {
  try {
    const users = await userService.getUsers(req.user.role);
    apiSuccess(res, users);
  } catch (err) {
    handleControllerError(res, err, 'Erro ao buscar usuários');
  }
};

// GET /api/users/entrevistadores — Listar entrevistadores (todos autenticados)
export const getEntrevistadores = async (_req, res) => {
  try {
    const users = await userService.getEntrevistadores();
    apiSuccess(res, users);
  } catch (err) {
    handleControllerError(res, err, 'Erro ao buscar entrevistadores');
  }
};

// GET /api/users/entrevistadores/cras/:crasId — Entrevistadores por CRAS
export const getEntrevistadoresByCras = async (req, res) => {
  try {
    const entrevistadores = await userService.getEntrevistadoresByCras(req.params.crasId);
    apiSuccess(res, entrevistadores);
  } catch (err) {
    handleControllerError(res, err, 'Erro ao buscar entrevistadores');
  }
};

// PUT /api/users/:id — Editar usuário (admin)
export const updateUser = async (req, res) => {
  try {
    // Body já validado e sanitizado pelo middleware Joi (validate)
    const user = await userService.updateUser(req.params.id, req.body, req.user);
    apiSuccess(res, user);
  } catch (err) {
    handleControllerError(res, err, 'Erro ao atualizar usuário');
  }
};

// DELETE /api/users/:id — Remover usuário (admin)
export const deleteUser = async (req, res) => {
  try {
    const result = await userService.deleteUser(req.params.id, req.user);
    apiMessage(res, result.message);
  } catch (err) {
    handleControllerError(res, err, 'Erro ao remover usuário');
  }
};
