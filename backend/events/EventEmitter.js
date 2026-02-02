/**
 * EventEmitter - Sistema de eventos para desacoplamento
 * 
 * Implementa Observer Pattern para comunicação entre módulos sem dependências diretas
 * Permite extensibilidade sem modificar código existente
 * 
 * @module events/EventEmitter
 */

import { EventEmitter as NodeEventEmitter } from 'events';
import logger from '../utils/logger.js';

class AppEventEmitter extends NodeEventEmitter {
  constructor() {
    super();
    this.setMaxListeners(20); // Aumentar limite para múltiplos listeners
  }

  /**
   * Emite evento com log automático
   */
  emitEvent(eventName, data) {
    logger.info(`Evento emitido: ${eventName}`, { event: eventName });
    this.emit(eventName, data);
  }

  /**
   * Adiciona listener com log
   */
  addListener(eventName, handler) {
    logger.info(`Listener registrado: ${eventName}`);
    this.on(eventName, handler);
  }

  /**
   * Remove listener
   */
  removeListener(eventName, handler) {
    this.off(eventName, handler);
  }
}

// Eventos disponíveis no sistema
export const EVENTS = {
  // Agendamentos
  APPOINTMENT_CREATED: 'appointment:created',
  APPOINTMENT_UPDATED: 'appointment:updated',
  APPOINTMENT_DELETED: 'appointment:deleted',
  APPOINTMENT_STATUS_CHANGED: 'appointment:status_changed',
  
  // Usuários
  USER_CREATED: 'user:created',
  USER_UPDATED: 'user:updated',
  USER_DELETED: 'user:deleted',
  USER_LOGIN: 'user:login',
  USER_LOGOUT: 'user:logout',
  
  // CRAS
  CRAS_CREATED: 'cras:created',
  CRAS_UPDATED: 'cras:updated',
  CRAS_DELETED: 'cras:deleted',
  
  // Bloqueios
  SLOT_BLOCKED: 'slot:blocked',
  SLOT_UNBLOCKED: 'slot:unblocked',
  
  // Sistema
  CACHE_INVALIDATED: 'cache:invalidated',
  ERROR_OCCURRED: 'error:occurred'
};

const eventEmitter = new AppEventEmitter();

export default eventEmitter;
