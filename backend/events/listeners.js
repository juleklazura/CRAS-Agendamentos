/**
 * Event Listeners - Handlers para eventos do sistema
 * 
 * Organiza lógica de side-effects de forma desacoplada
 * 
 * @module events/listeners
 */

import eventEmitter, { EVENTS } from './EventEmitter.js';
import LogRepository from '../repositories/LogRepository.js';
import cache from '../utils/cache.js';
import logger from '../utils/logger.js';
import { formatDateTime } from '../utils/timezone.js';

/**
 * Listener: Criar log quando agendamento é criado
 */
eventEmitter.on(EVENTS.APPOINTMENT_CREATED, async (data) => {
  try {
    const { appointment, userId, crasId } = data;
    
    await LogRepository.create({
      user: userId,
      cras: crasId,
      action: 'criar_agendamento',
      details: `Agendamento criado para ${appointment.pessoa} em ${formatDateTime(appointment.data)} - Motivo: ${appointment.motivo}`
    });
    
    logger.info('Log de criação de agendamento registrado', { appointmentId: appointment._id });
  } catch (error) {
    logger.error('Erro ao criar log de agendamento', error);
  }
});

/**
 * Listener: Criar log quando agendamento é atualizado
 */
eventEmitter.on(EVENTS.APPOINTMENT_UPDATED, async (data) => {
  try {
    const { appointment, userId, crasId, changes } = data;
    
    await LogRepository.create({
      user: userId,
      cras: crasId,
      action: 'editar_agendamento',
      details: `Agendamento de ${appointment.pessoa} atualizado. Alterações: ${changes}`
    });
    
    logger.info('Log de atualização de agendamento registrado', { appointmentId: appointment._id });
  } catch (error) {
    logger.error('Erro ao criar log de atualização', error);
  }
});

/**
 * Listener: Criar log quando agendamento é deletado
 */
eventEmitter.on(EVENTS.APPOINTMENT_DELETED, async (data) => {
  try {
    const { appointment, userId, crasId } = data;
    
    await LogRepository.create({
      user: userId,
      cras: crasId,
      action: 'deletar_agendamento',
      details: `Agendamento de ${appointment.pessoa} em ${formatDateTime(appointment.data)} foi deletado`
    });
    
    logger.info('Log de deleção de agendamento registrado', { appointmentId: appointment._id });
  } catch (error) {
    logger.error('Erro ao criar log de deleção', error);
  }
});

/**
 * Listener: Invalidar cache quando agendamento é criado
 */
eventEmitter.on(EVENTS.APPOINTMENT_CREATED, (data) => {
  const { appointment } = data;
  cache.invalidateAppointments(appointment.cras, appointment.entrevistador);
  logger.info('Cache invalidado após criação de agendamento');
});

/**
 * Listener: Invalidar cache quando agendamento é atualizado
 */
eventEmitter.on(EVENTS.APPOINTMENT_UPDATED, (data) => {
  const { appointment, oldCras, oldEntrevistador } = data;
  
  // Invalidar cache antigo e novo (caso CRAS ou entrevistador tenham mudado)
  cache.invalidateAppointments(oldCras, oldEntrevistador);
  cache.invalidateAppointments(appointment.cras, appointment.entrevistador);
  
  logger.info('Cache invalidado após atualização de agendamento');
});

/**
 * Listener: Invalidar cache quando agendamento é deletado
 */
eventEmitter.on(EVENTS.APPOINTMENT_DELETED, (data) => {
  const { appointment } = data;
  cache.invalidateAppointments(appointment.cras, appointment.entrevistador);
  logger.info('Cache invalidado após deleção de agendamento');
});

/**
 * Listener: Registrar login de usuário
 */
eventEmitter.on(EVENTS.USER_LOGIN, async (data) => {
  try {
    const { user } = data;
    
    await LogRepository.create({
      user: user._id,
      cras: user.cras,
      action: 'login',
      details: `Usuário ${user.name} realizou login`
    });
    
    logger.info('Login registrado', { userId: user._id });
  } catch (error) {
    logger.error('Erro ao registrar login', error);
  }
});

/**
 * Listener: Registrar logout de usuário
 */
eventEmitter.on(EVENTS.USER_LOGOUT, async (data) => {
  try {
    const { userId, crasId } = data;
    
    await LogRepository.create({
      user: userId,
      cras: crasId,
      action: 'logout',
      details: 'Usuário realizou logout'
    });
    
    logger.info('Logout registrado', { userId });
  } catch (error) {
    logger.error('Erro ao registrar logout', error);
  }
});

/**
 * Listener: Registrar erros do sistema
 */
eventEmitter.on(EVENTS.ERROR_OCCURRED, (data) => {
  const { error, context } = data;
  logger.error('Erro no sistema', { error: error.message, context });
});

logger.info('Event listeners inicializados');
