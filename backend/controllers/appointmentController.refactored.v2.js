/**
 * AppointmentController Refatorado - Controller mais leve
 * 
 * Responsabilidades reduzidas:
 * - Receber requisição HTTP
 * - Validar entrada básica
 * - Delegar para Service
 * - Retornar resposta HTTP
 * 
 * Lógica de negócio, validações complexas e side-effects foram movidos para:
 * - Services (lógica de negócio)
 * - Repositories (acesso a dados)
 * - Event System (side-effects)
 * 
 * @module controllers/appointmentController.refactored
 */

import AppointmentService from '../services/AppointmentService.refactored.js';
import logger from '../utils/logger.js';

/**
 * Criar novo agendamento
 */
export const createAppointment = async (req, res) => {
  try {
    const appointment = await AppointmentService.createAppointment(
      req.body,
      req.user
    );

    res.status(201).json(appointment);
  } catch (error) {
    handleError(error, res, 'criar agendamento', req.body);
  }
};

/**
 * Listar agendamentos
 */
export const getAppointments = async (req, res) => {
  try {
    const filters = {
      cras: req.query.cras,
      entrevistador: req.query.entrevistador,
      status: req.query.status,
      search: req.query.search,
      page: req.query.page,
      pageSize: req.query.pageSize,
      sortBy: req.query.sortBy,
      order: req.query.order
    };

    const result = await AppointmentService.getAppointments(filters, req.user);

    res.json(result);
  } catch (error) {
    handleError(error, res, 'listar agendamentos');
  }
};

/**
 * Buscar agendamento por ID
 */
export const getAppointmentById = async (req, res) => {
  try {
    const appointment = await AppointmentService.getAppointmentById(
      req.params.id,
      req.user
    );

    res.json(appointment);
  } catch (error) {
    handleError(error, res, 'buscar agendamento');
  }
};

/**
 * Atualizar agendamento
 */
export const updateAppointment = async (req, res) => {
  try {
    const appointment = await AppointmentService.updateAppointment(
      req.params.id,
      req.body,
      req.user
    );

    res.json(appointment);
  } catch (error) {
    handleError(error, res, 'atualizar agendamento', req.body);
  }
};

/**
 * Deletar agendamento
 */
export const deleteAppointment = async (req, res) => {
  try {
    const result = await AppointmentService.deleteAppointment(
      req.params.id,
      req.user
    );

    res.json(result);
  } catch (error) {
    handleError(error, res, 'deletar agendamento');
  }
};

/**
 * Atualizar status do agendamento
 */
export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status é obrigatório' });
    }

    const appointment = await AppointmentService.updateAppointment(
      req.params.id,
      { status },
      req.user
    );

    res.json(appointment);
  } catch (error) {
    handleError(error, res, 'atualizar status');
  }
};

/**
 * Handler centralizado de erros
 */
function handleError(error, res, action, data = null) {
  const statusCode = error.statusCode || 500;
  
  // Log do erro
  logger.error(`Erro ao ${action}:`, {
    error: error.message,
    stack: error.stack,
    data: data ? logger.sanitize(data) : undefined
  });

  // Preparar resposta
  const response = {
    message: error.message || `Erro ao ${action}`
  };

  // Adicionar informações extras se disponíveis
  if (error.code) response.code = error.code;
  if (error.field) response.field = error.field;
  if (error.validationErrors) response.errors = error.validationErrors;

  res.status(statusCode).json(response);
}
