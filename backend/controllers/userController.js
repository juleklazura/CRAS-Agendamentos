// Controller de usuários: camada de orquestração.
// Recebe request → delega ao service → envia response.
// Lógica de negócio: services/userService.js. Validação: validators/userValidator.js.

import * as userService from '../services/userService.js';
import { apiSuccess, apiMessage, apiError, handleControllerError } from '../utils/apiResponse.js';

// POST /api/users — Criar novo usuário (admin)
export const createUser = async (req, res) => {
  try {
    const user = await userService.createUser(req.body, req.user);
    apiSuccess(res, user, 201);
  } catch (err) {
    handleControllerError(res, err, 'Erro ao criar usuário');
  }
};

// GET /api/users — Listar usuários com controle de acesso
export const getUsers = async (req, res) => {
  try {
    const { page, pageSize } = req.query;
    const result = await userService.getUsers(req.user.role, { page, pageSize });
    apiSuccess(res, result);
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
    // Recepção só pode consultar entrevistadores do próprio CRAS — isolamento entre unidades.
    if (req.user.role === 'recepcao' && req.params.crasId !== req.user.cras) {
      return apiError(res, 'Acesso negado: você só pode consultar entrevistadores do seu CRAS', 403);
    }
    const entrevistadores = await userService.getEntrevistadoresByCras(req.params.crasId);
    apiSuccess(res, entrevistadores);
  } catch (err) {
    handleControllerError(res, err, 'Erro ao buscar entrevistadores');
  }
};

// PUT /api/users/:id — Editar usuário (admin)
export const updateUser = async (req, res) => {
  try {
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
