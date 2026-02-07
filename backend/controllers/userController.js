// =============================================================================
// 🎮 CONTROLLER DE USUÁRIOS - CAMADA DE ORQUESTRAÇÃO
// =============================================================================
// Responsável APENAS por: receber request → delegar ao service → enviar response.
// Toda lógica de negócio fica em services/userService.js.
// Validação de dados fica em validators/userValidator.js.

import logger from '../utils/logger.js';
import * as userService from '../services/userService.js';
import { BusinessError } from '../services/userService.js';

/**
 * Handler centralizado de erros do controller.
 * Diferencia erros de negócio (BusinessError) de erros inesperados.
 */
const handleError = (res, err, defaultMessage) => {
  if (err instanceof BusinessError) {
    const response = { message: err.message };
    if (err.code) response.code = err.code;
    return res.status(err.statusCode).json(response);
  }

  logger.error(`${defaultMessage}:`, err);
  res.status(500).json({ message: defaultMessage });
};

// POST /api/users — Criar novo usuário (admin)
export const createUser = async (req, res) => {
  try {
    // Body já validado e sanitizado pelo middleware Joi (validate)
    const user = await userService.createUser(req.body, req.user);
    res.status(201).json(user);
  } catch (err) {
    handleError(res, err, 'Erro ao criar usuário');
  }
};

// GET /api/users — Listar usuários com controle de acesso
export const getUsers = async (req, res) => {
  try {
    const users = await userService.getUsers(req.user.role);
    res.json(users);
  } catch (err) {
    handleError(res, err, 'Erro ao buscar usuários');
  }
};

// GET /api/users/entrevistadores — Listar entrevistadores (todos autenticados)
export const getEntrevistadores = async (_req, res) => {
  try {
    const users = await userService.getEntrevistadores();
    res.json(users);
  } catch (err) {
    handleError(res, err, 'Erro ao buscar entrevistadores');
  }
};

// GET /api/users/entrevistadores/cras/:crasId — Entrevistadores por CRAS
export const getEntrevistadoresByCras = async (req, res) => {
  try {
    const entrevistadores = await userService.getEntrevistadoresByCras(req.params.crasId);
    res.json(entrevistadores);
  } catch (err) {
    handleError(res, err, 'Erro ao buscar entrevistadores');
  }
};

// PUT /api/users/:id — Editar usuário (admin)
export const updateUser = async (req, res) => {
  try {
    // Body já validado e sanitizado pelo middleware Joi (validate)
    const user = await userService.updateUser(req.params.id, req.body, req.user);
    res.json(user);
  } catch (err) {
    handleError(res, err, 'Erro ao atualizar usuário');
  }
};

// DELETE /api/users/:id — Remover usuário (admin)
export const deleteUser = async (req, res) => {
  try {
    const result = await userService.deleteUser(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    handleError(res, err, 'Erro ao remover usuário');
  }
};
