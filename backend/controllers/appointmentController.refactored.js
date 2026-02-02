/**
 * AppointmentController Refatorado - Controller para agendamentos
 * 
 * Versão refatorada usando Services Layer
 * Controllers agora são finos e delegam lógica para services
 * 
 * @module controllers/appointmentController.refactored
 */

import appointmentService from '../services/appointmentService.js';
import validationService from '../services/validationService.js';
import logger from '../utils/logger.js';
import cache from '../utils/cache.js';

/**
 * Cria novo agendamento
 */
export const createAppointment = async (req, res) => {
  try {
    // Validação de dados
    validationService.validateAppointmentData(req.body);
    
    // Delegar lógica de negócio para o service
    const appointment = await appointmentService.createAppointment(req.body, req.user.id);
    
    res.status(201).json(appointment);
    
  } catch (err) {
    logger.error('Erro ao criar agendamento:', err, logger.sanitize({ request: req.body }));
    
    // Tratamento de erros específicos
    if (err.statusCode) {
      return res.status(err.statusCode).json({ 
        message: err.message,
        code: err.code,
        field: err.field,
        validationErrors: err.validationErrors
      });
    }
    
    res.status(400).json({ message: 'Erro ao criar agendamento' });
  }
};

/**
 * Lista agendamentos com filtros
 */
export const getAppointments = async (req, res) => {
  try {
    // Gerar chave de cache
    const cacheKey = cache.generateAppointmentKey({
      crasId: req.query.cras || req.user.cras?.toString(),
      entrevistadorId: req.query.entrevistador || (req.user.role === 'entrevistador' ? req.user.id : null),
      status: req.query.status,
      search: req.query.search,
      page: req.query.page,
      pageSize: req.query.pageSize,
      sortBy: req.query.sortBy,
      order: req.query.order,
      role: req.user.role
    });
    
    // Tentar obter do cache
    const cached = cache.get(cacheKey);
    if (cached) {
      logger.info(`Cache hit: ${cacheKey}`);
      return res.json(cached);
    }
    
    // Buscar dados via service
    const result = await appointmentService.getAppointments(req.query, req.user);
    
    // Salvar no cache
    cache.set(cacheKey, result);
    
    res.json(result);
    
  } catch (err) {
    logger.error('Erro ao listar agendamentos:', err);
    res.status(500).json({ message: 'Erro ao listar agendamentos' });
  }
};

/**
 * Obtém agendamento por ID
 */
export const getAppointmentById = async (req, res) => {
  try {
    validationService.validateObjectId(req.params.id, 'ID do agendamento');
    
    const appointment = await appointmentService.getAppointmentById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Agendamento não encontrado' });
    }
    
    res.json(appointment);
    
  } catch (err) {
    logger.error('Erro ao buscar agendamento:', err);
    
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    
    res.status(500).json({ message: 'Erro ao buscar agendamento' });
  }
};

/**
 * Atualiza agendamento
 */
export const updateAppointment = async (req, res) => {
  try {
    const appointment = await appointmentService.updateAppointment(
      req.params.id, 
      req.body, 
      req.user.id
    );
    
    res.json(appointment);
    
  } catch (err) {
    logger.error('Erro ao atualizar agendamento:', err);
    
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    
    res.status(400).json({ message: 'Erro ao atualizar agendamento' });
  }
};

/**
 * Deleta agendamento
 */
export const deleteAppointment = async (req, res) => {
  try {
    const result = await appointmentService.deleteAppointment(req.params.id, req.user.id);
    
    res.json(result);
    
  } catch (err) {
    logger.error('Erro ao deletar agendamento:', err);
    
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    
    res.status(400).json({ message: 'Erro ao deletar agendamento' });
  }
};
