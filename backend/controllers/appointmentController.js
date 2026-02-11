// =============================================================================
// 🎮 CONTROLLER DE AGENDAMENTOS — CAMADA FINA DE ORQUESTRAÇÃO
// =============================================================================
// Responsável APENAS por: extrair dados do request, chamar o service,
// e retornar a resposta HTTP. Toda lógica de negócio está em
// services/appointmentService.js.

import logger from '../utils/logger.js';
import { apiSuccess, apiMessage, apiError } from '../utils/apiResponse.js';
import { BusinessError } from '../services/userService.js';
import * as appointmentService from '../services/appointmentService.js';

/**
 * Trata erros do service e retorna resposta HTTP padronizada.
 * BusinessError → status específico; outros → 500.
 */
const handleError = (res, error, fallbackMessage) => {
  if (error instanceof BusinessError) {
    return apiError(res, error.message, error.statusCode, error.code ? { code: error.code } : {});
  }
  logger.error(fallbackMessage, error);
  return apiError(res, fallbackMessage, 500);
};

// POST /api/appointments
export const createAppointment = async (req, res) => {
  try {
    const data = await appointmentService.createAppointment(req.body, req.user);
    apiSuccess(res, data, 201);
  } catch (error) {
    handleError(res, error, 'Erro ao criar agendamento');
  }
};

// GET /api/appointments
export const getAppointments = async (req, res) => {
  try {
    const data = await appointmentService.getAppointments(req.query, req.user);
    apiSuccess(res, data);
  } catch (error) {
    handleError(res, error, 'Erro ao buscar agendamentos');
  }
};

// PATCH|PUT /api/appointments/:id
export const updateAppointment = async (req, res) => {
  try {
    const data = await appointmentService.updateAppointment(req.params.id, req.body, req.user);
    apiSuccess(res, data);
  } catch (error) {
    handleError(res, error, 'Erro ao atualizar agendamento');
  }
};

// DELETE /api/appointments/:id
export const deleteAppointment = async (req, res) => {
  try {
    await appointmentService.deleteAppointment(req.params.id, req.user);
    apiMessage(res, 'Agendamento removido');
  } catch (error) {
    handleError(res, error, 'Erro ao remover agendamento');
  }
};

// PATCH /api/appointments/:id/confirm
export const confirmPresence = async (req, res) => {
  try {
    const data = await appointmentService.confirmPresence(req.params.id, req.user);
    apiSuccess(res, data);
  } catch (error) {
    handleError(res, error, 'Erro ao confirmar presença');
  }
};

// PATCH /api/appointments/:id/unconfirm
export const removePresenceConfirmation = async (req, res) => {
  try {
    const data = await appointmentService.removePresenceConfirmation(req.params.id, req.user);
    apiSuccess(res, data);
  } catch (error) {
    handleError(res, error, 'Erro ao remover confirmação de presença');
  }
};
