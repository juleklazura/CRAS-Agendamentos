/**
 * Cache em memória (node-cache) para reduzir queries ao banco.
 *
 * Armazena apenas dados não sensíveis ou já processados.
 * TTL curto (2 min padrão) minimiza janela de dados desatualizados.
 * Invalidação explícita em operações CUD garante consistência.
 * Sem persistência — ao reiniciar, o cache é recriado do banco sob demanda.
 */

import NodeCache from 'node-cache';
import logger from './logger.js';

// ============================================================================
// Sanitiza chave antes de logar, removendo CPF, telefone e dados pessoais.
// ============================================================================

// Sanitiza a chave antes de logar, removendo CPF, telefone e dados pessoais
// que podem ser incluídos como parte das chaves de cache.
const sanitizeCacheKey = (key) => {
  if (!key || typeof key !== 'string') return key;
  
  let sanitized = key;
  
  // Remove CPFs (formato com pontos e hífen: 123.456.789-00)
  sanitized = sanitized.replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, '[CPF_REDACTED]');
  
  // Remove CPFs (formato sem formatação: 12345678900)
  sanitized = sanitized.replace(/\b\d{11}\b/g, '[CPF_REDACTED]');
  
  // Remove telefones com formatação: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
  sanitized = sanitized.replace(/\(\d{2}\)\s?\d{4,5}-\d{4}/g, '[TELEFONE_REDACTED]');
  
  // Remove telefones sem formatação: 11 dígitos ou 10 dígitos
  sanitized = sanitized.replace(/\b\d{10,11}\b/g, '[TELEFONE_REDACTED]');
  
  // Remove parâmetros de busca que podem conter nomes/dados pessoais
  sanitized = sanitized.replace(/(?:search|busca|nome|pessoa)=[^:&]+/gi, '$&'.split('=')[0] + '=[REDACTED]');
  
  // Remove valores de query strings que podem ter dados sensíveis
  sanitized = sanitized.replace(/(?:cpf|telefone1|telefone2)=[^:&]+/gi, '$&'.split('=')[0] + '=[REDACTED]');
  
  return sanitized;
};

// ============================================================================
// CONFIGURAÇÃO DO CACHE
// ============================================================================

/**
 * Cache principal com configuração otimizada
 * 
 * Opções:
 * - stdTTL: Tempo de vida padrão (2 minutos = 120 segundos)
 * - checkperiod: Intervalo de limpeza de cache expirado (30 segundos)
 * - useClones: false para melhor performance (não clona objetos)
 * - deleteOnExpire: true (remove automaticamente quando expira)
 * - maxKeys: 2000
 */
const cache = new NodeCache({
  stdTTL: 120,              // 2 minutos
  checkperiod: 30,          // limpeza de chaves expiradas a cada 30s
  useClones: false,         // sem clone — cuidado com mutações externas
  deleteOnExpire: true,
  maxKeys: 2000,            // acima disso o cache rejeita novas chaves
  errorOnMissing: false
});

// ============================================================================
// EVENTOS DE MONITORAMENTO
// ============================================================================

// Log quando cache expira (debug)
cache.on('expired', (key, value) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug('🗑️  Cache expirado', { key: sanitizeCacheKey(key) });
  }
});

// Log quando cache atinge limite (warning)
cache.on('flush', () => {
  if (process.env.NODE_ENV !== 'test') {
    logger.warn('⚠️  Cache limpo (flush)');
  }
});

// ============================================================================
// FUNÇÕES PRINCIPAIS
// ============================================================================

/**
 * Retorna o valor cacheado para `key`, ou `undefined` se ausente/expirado.
 */
export const get = (key) => {
  try {
    const value = cache.get(key);
    
    if (process.env.NODE_ENV === 'development') {
      if (value !== undefined) {
        logger.debug('Cache HIT', { key: sanitizeCacheKey(key) });
      } else {
        logger.debug('Cache MISS', { key: sanitizeCacheKey(key) });
      }
    }
    
    return value;
  } catch (error) {
    logger.error('Erro ao obter do cache', { key: sanitizeCacheKey(key), error: error.message });
    return undefined;
  }
};

/**
 * Armazena `value` em `key` com TTL em segundos (padrão: 300s = 5min).
 * Retorna `true` se sucesso.
 */
export const set = (key, value, ttl = 300) => {
  try {
    const success = cache.set(key, value, ttl);
    
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Cache SET', { 
        key: sanitizeCacheKey(key), 
        ttl, 
        success,
        size: value ? JSON.stringify(value).length : 0
      });
    }
    
    return success;
  } catch (error) {
    logger.error('Erro ao definir cache', { key: sanitizeCacheKey(key), error: error.message });
    return false;
  }
};

/**
 * Deletar chave do cache
 * 
 * @param {string} key - Chave a ser deletada
 * @returns {number} Número de chaves deletadas
 * 
 * @example
 * cache.del('appointments:cras123:2025-11-24');
 */
export const del = (key) => {
  try {
    const deleted = cache.del(key);
    
    if (process.env.NODE_ENV === 'development' && deleted > 0) {
      logger.debug('🗑️  Cache DEL', { key: sanitizeCacheKey(key), deleted });
    }
    
    return deleted;
  } catch (error) {
    logger.error('Erro ao deletar cache', { key: sanitizeCacheKey(key), error: error.message });
    return 0;
  }
};

/**
 * Deletar múltiplas chaves por padrão (pattern matching)
 * 
 * Útil para invalidar cache relacionado, ex:
 * - Todos os appointments de um CRAS
 * - Todos os appointments de um entrevistador
 * 
 * @param {string} pattern - Padrão para buscar chaves (substring match)
 * @returns {number} Número de chaves deletadas
 * 
 * @example
 * // Invalidar todos os appointments do CRAS 123
 * cache.delPattern('appointments:cras123');
 * 
 * // Invalidar todos os dados de um entrevistador
 * cache.delPattern('entrevistador:user456');
 */
export const delPattern = (pattern) => {
  try {
    // Buscar todas as chaves que contém o padrão
    const keys = cache.keys().filter(key => key.includes(pattern));
    
    if (keys.length === 0) {
      return 0;
    }
    
    // Deletar todas as chaves encontradas
    const deleted = cache.del(keys);
    
    if (process.env.NODE_ENV === 'development') {
      logger.debug('🗑️  Cache DEL Pattern', { 
        pattern: sanitizeCacheKey(pattern), 
        keys: keys.length, 
        deleted 
      });
    }
    
    return deleted;
  } catch (error) {
    logger.error('Erro ao deletar por padrão', { 
      pattern: sanitizeCacheKey(pattern), 
      error: error.message 
    });
    return 0;
  }
};

/** Remove todas as entradas do cache. Use com parcimônia. */
export const flush = () => {
  try {
    cache.flushAll();
    
    if (process.env.NODE_ENV !== 'test') {
      logger.info('Cache completamente limpo (flush)');
    }
  } catch (error) {
    logger.error('Erro ao limpar cache', { error: error.message });
  }
};

/**
 * Wrapper cache-aside: tenta o cache; em miss executa `fn()`, armazena e retorna o resultado.
 * Em caso de erro no cache, executa `fn()` diretamente para não bloquear a requisição.
 */
export const cached = async (key, fn, ttl = 300) => {
  try {
    const cachedValue = get(key);
    
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    
    const result = await fn();
    set(key, result, ttl);
    return result;
  } catch (error) {
    logger.error('Erro em cached wrapper', { 
      key: sanitizeCacheKey(key), 
      error: error.message 
    });
    return await fn();
  }
};

/**
 * Obter estatísticas do cache
 * 
 * Útil para monitoramento e debugging
 * 
 * @returns {Object} Estatísticas do cache
 * 
 * @example
 * const stats = cache.stats();
 * console.log(`Hit rate: ${(stats.hits / (stats.hits + stats.misses) * 100).toFixed(2)}%`);
 */
export const stats = () => {
  try {
    const cacheStats = cache.getStats();
    const keys = cache.keys().length;
    
    return {
      ...cacheStats,
      keys,
      hitRate: cacheStats.hits > 0 
        ? ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(2) + '%'
        : '0%'
    };
  } catch (error) {
    logger.error('Erro ao obter estatísticas', { error: error.message });
    return {};
  }
};

/**
 * Verificar se uma chave existe no cache
 * 
 * @param {string} key - Chave a verificar
 * @returns {boolean} true se existe, false caso contrário
 */
export const has = (key) => {
  try {
    return cache.has(key);
  } catch (error) {
    logger.error('Erro ao verificar existência', { 
      key: sanitizeCacheKey(key), 
      error: error.message 
    });
    return false;
  }
};

/**
 * Obter tempo restante de uma chave (TTL)
 * 
 * @param {string} key - Chave a verificar
 * @returns {number|undefined} Segundos restantes ou undefined se não existe
 */
export const ttl = (key) => {
  try {
    return cache.getTtl(key);
  } catch (error) {
    logger.error('Erro ao obter TTL', { 
      key: sanitizeCacheKey(key), 
      error: error.message 
    });
    return undefined;
  }
};

// ============================================================================
// HELPERS ESPECÍFICOS PARA O SISTEMA
// ============================================================================

/**
 * Gerar chave de cache para appointments
 * 
 * @param {Object} params - Parâmetros da query
 * @returns {string} Chave única
 */
export const generateAppointmentKey = ({ crasId, startDate, endDate, entrevistadorId, status, data }) => {
  const parts = ['appointments'];
  
  if (crasId) parts.push(`cras:${crasId}`);
  if (entrevistadorId) parts.push(`entrevistador:${entrevistadorId}`);
  if (status) parts.push(`status:${status}`);
  if (data) parts.push(`data:${data}`); // Data específica do dia
  if (startDate) parts.push(`start:${startDate}`);
  if (endDate) parts.push(`end:${endDate}`);
  
  return parts.join(':');
};

/**
 * Invalidar cache de appointments relacionados
 * 
 * @param {string} crasId - ID do CRAS
 * @param {string} entrevistadorId - ID do entrevistador (opcional)
 */
export const invalidateAppointments = (crasId, entrevistadorId = null) => {
  // Invalidar TODOS os caches de appointments para garantir consistência
  // Isso é necessário porque o admin pode ver dados de qualquer CRAS
  delPattern('appointments:');
  // Invalidar cache de estatísticas do dashboard (afetado por qualquer mudança de agendamento)
  delPattern('stats:');
  
  if (process.env.NODE_ENV === 'development') {
    logger.debug('🔄 Cache de appointments invalidado (todos)', { crasId, entrevistadorId });
  }
};

/**
 * Invalidar cache de usuários
 */
export const invalidateUsers = () => {
  delPattern('users:');
  
  if (process.env.NODE_ENV === 'development') {
    logger.debug('🔄 Cache de usuários invalidado');
  }
};

/**
 * Invalidar cache de CRAS
 */
export const invalidateCras = () => {
  delPattern('cras:');
  
  if (process.env.NODE_ENV === 'development') {
    logger.debug('🔄 Cache de CRAS invalidado');
  }
};

/**
 * Adiciona um token JWT à blacklist até a sua expiração natural.
 * Usado no logout e na rotação de refresh tokens para impedir
 * reutilização de tokens capturados (OWASP A07).
 *
 * @param {string} jti - JWT ID (claim `jti`) do token a revogar
 * @param {number} ttlSeconds - Segundos restantes até o token expirar
 * @returns {boolean} true se adicionado com sucesso
 */
export const blacklistToken = (jti, ttlSeconds) => {
  if (!jti || ttlSeconds <= 0) return false;
  return set(`blacklist:${jti}`, true, ttlSeconds);
};

/**
 * Verifica se um token JWT está na blacklist (foi revogado).
 *
 * @param {string} jti - JWT ID (claim `jti`) do token
 * @returns {boolean} true se o token foi revogado
 */
export const isTokenBlacklisted = (jti) => {
  if (!jti) return false;
  return has(`blacklist:${jti}`);
};

/**
 * Invalidar cache de autenticação de um usuário específico.
 * Deve ser chamado sempre que role, cras ou matrícula forem alterados,
 * ou quando o usuário for excluído — garante que mudanças entrem em
 * vigor imediatamente sem esperar o TTL expirar.
 *
 * @param {string} userId - ID do usuário
 */
export const invalidateUser = (userId) => {
  del(`user:auth:${userId}`);
  
  if (process.env.NODE_ENV === 'development') {
    logger.debug('🔄 Cache de usuário invalidado', { userId });
  }
};

// ============================================================================
// EXPORTAÇÃO PADRÃO
// ============================================================================

export default {
  get,
  set,
  del,
  delPattern,
  flush,
  cached,
  stats,
  has,
  ttl,
  // Helpers específicos
  generateAppointmentKey,
  invalidateAppointments,
  invalidateUsers,
  invalidateCras,
  invalidateUser,
  // Blacklist de tokens (OWASP A07)
  blacklistToken,
  isTokenBlacklisted,
};
