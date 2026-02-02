/**
 * CacheService - Serviço especializado em gerenciamento de cache
 * 
 * Abstrai lógica de cache e torna mais fácil trocar implementação
 * 
 * @module services/CacheService
 */

import cache from '../utils/cache.js';
import logger from '../utils/logger.js';

class CacheService {
  /**
   * Busca valor do cache ou executa função se não existir
   */
  async getOrSet(key, fetchFunction, ttl = 300) {
    const cached = cache.get(key);
    
    if (cached) {
      logger.debug('Cache hit', { key });
      return cached;
    }

    logger.debug('Cache miss', { key });
    const data = await fetchFunction();
    cache.set(key, data, ttl);
    
    return data;
  }

  /**
   * Invalida cache de agendamentos
   */
  invalidateAppointments(crasId, entrevistadorId) {
    cache.invalidateAppointments(crasId, entrevistadorId);
    logger.info('Cache de agendamentos invalidado', { crasId, entrevistadorId });
  }

  /**
   * Gera chave de cache para agendamentos
   */
  generateAppointmentKey(params) {
    return cache.generateAppointmentKey(params);
  }

  /**
   * Limpa todo o cache
   */
  clearAll() {
    cache.clear();
    logger.info('Todo o cache foi limpo');
  }

  /**
   * Remove item específico do cache
   */
  remove(key) {
    cache.delete(key);
    logger.debug('Item removido do cache', { key });
  }

  /**
   * Verifica se chave existe no cache
   */
  has(key) {
    return cache.has(key);
  }

  /**
   * Obtém estatísticas do cache
   */
  getStats() {
    return {
      size: cache.keys().length,
      keys: cache.keys()
    };
  }
}

export default new CacheService();
