// =============================================================================
// 🌎 CONFIGURAÇÃO DE TIMEZONE - HORÁRIO DE BRASÍLIA
// =============================================================================
// Centraliza todas operações com datas para garantir consistência
// Timezone: America/Sao_Paulo (UTC-3)

/**
 * Timezone padrão do sistema
 * @constant {string}
 */
export const TIMEZONE = 'America/Sao_Paulo';

/**
 * Locale brasileiro para formatação
 * @constant {string}
 */
export const LOCALE = 'pt-BR';

/**
 * Obtém a data/hora atual no timezone do sistema
 * @returns {Date} Data atual no timezone configurado
 */
export const now = () => {
  return new Date();
};

/**
 * Formata data para string legível no padrão brasileiro
 * @param {Date|string} date - Data a ser formatada
 * @param {Object} options - Opções de formatação (Intl.DateTimeFormat)
 * @returns {string} Data formatada
 * 
 * @example
 * formatDate(new Date()) // "23/11/2025"
 * formatDate(new Date(), { dateStyle: 'full' }) // "segunda-feira, 23 de novembro de 2025"
 */
export const formatDate = (date, options = {}) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions = {
    timeZone: TIMEZONE,
    ...options
  };
  
  return dateObj.toLocaleDateString(LOCALE, defaultOptions);
};

/**
 * Formata data e hora para string legível no padrão brasileiro
 * @param {Date|string} date - Data a ser formatada
 * @param {Object} options - Opções de formatação
 * @returns {string} Data e hora formatadas
 * 
 * @example
 * formatDateTime(new Date()) // "23/11/2025, 15:30:45"
 */
export const formatDateTime = (date, options = {}) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions = {
    timeZone: TIMEZONE,
    ...options
  };
  
  return dateObj.toLocaleString(LOCALE, defaultOptions);
};

/**
 * Formata apenas a hora no padrão brasileiro
 * @param {Date|string} date - Data a ser formatada
 * @param {Object} options - Opções de formatação
 * @returns {string} Hora formatada
 * 
 * @example
 * formatTime(new Date()) // "15:30:45"
 */
export const formatTime = (date, options = {}) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions = {
    timeZone: TIMEZONE,
    ...options
  };
  
  return dateObj.toLocaleTimeString(LOCALE, defaultOptions);
};

/**
 * Converte string de data para objeto Date no timezone correto
 * @param {string} dateString - String de data (ISO 8601 ou qualquer formato aceito por Date)
 * @returns {Date} Objeto Date
 * 
 * @example
 * parseDate('2025-11-23T15:30:00Z') // Date object no timezone correto
 */
export const parseDate = (dateString) => {
  return new Date(dateString);
};

/**
 * Verifica se a data é fim de semana (sábado ou domingo)
 * @param {Date|string} date - Data a verificar
 * @returns {boolean} true se for fim de semana
 */
export const isWeekend = (date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const day = dateObj.getDay();
  return day === 0 || day === 6;
};

/**
 * Obtém o dia da semana em português
 * @param {Date|string} date - Data
 * @returns {string} Nome do dia (ex: "segunda-feira")
 */
export const getDayName = (date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDate(dateObj, { weekday: 'long' });
};

/**
 * Verifica se duas datas são do mesmo dia (ignora hora)
 * @param {Date|string} date1 - Primeira data
 * @param {Date|string} date2 - Segunda data
 * @returns {boolean} true se forem do mesmo dia
 */
export const isSameDay = (date1, date2) => {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

/**
 * Adiciona dias a uma data
 * @param {Date|string} date - Data base
 * @param {number} days - Número de dias a adicionar (pode ser negativo)
 * @returns {Date} Nova data
 */
export const addDays = (date, days) => {
  const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
  dateObj.setDate(dateObj.getDate() + days);
  return dateObj;
};

/**
 * Adiciona horas a uma data
 * @param {Date|string} date - Data base
 * @param {number} hours - Número de horas a adicionar (pode ser negativo)
 * @returns {Date} Nova data
 */
export const addHours = (date, hours) => {
  const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
  dateObj.setHours(dateObj.getHours() + hours);
  return dateObj;
};

/**
 * Cria uma data no início do dia (00:00:00.000)
 * @param {Date|string} date - Data base
 * @returns {Date} Data no início do dia
 */
export const startOfDay = (date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
  dateObj.setHours(0, 0, 0, 0);
  return dateObj;
};

/**
 * Cria uma data no final do dia (23:59:59.999)
 * @param {Date|string} date - Data base
 * @returns {Date} Data no final do dia
 */
export const endOfDay = (date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
  dateObj.setHours(23, 59, 59, 999);
  return dateObj;
};

/**
 * Converte data para ISO string (formato usado no PostgreSQL)
 * @param {Date|string} date - Data a converter
 * @returns {string} String ISO 8601
 */
export const toISOString = (date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toISOString();
};

// =============================================================================
// 🔒 VALIDAÇÕES DE DATA
// =============================================================================

/**
 * Valida se a data está no formato correto e é válida
 * @param {any} date - Data a validar
 * @returns {boolean} true se válida
 */
export const isValidDate = (date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj instanceof Date && !isNaN(dateObj.getTime());
};

/**
 * Valida se a data está no futuro
 * @param {Date|string} date - Data a validar
 * @returns {boolean} true se for data futura
 */
export const isFutureDate = (date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj > now();
};

/**
 * Valida se a data está no passado
 * @param {Date|string} date - Data a validar
 * @returns {boolean} true se for data passada
 */
export const isPastDate = (date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj < now();
};

// =============================================================================
// 📊 INFORMAÇÕES DO SISTEMA
// =============================================================================

/**
 * Retorna informações sobre a configuração de timezone
 * @returns {Object} Objeto com informações do timezone
 */
export const getTimezoneInfo = () => {
  return {
    timezone: TIMEZONE,
    locale: LOCALE,
    offset: 'UTC-3',
    currentTime: formatDateTime(now()),
    serverTime: new Date().toString()
  };
};

// 🔒 SEGURANÇA: Usar logger ao invés de console.log
import('./logger.js').then(({ default: logger }) => {
  logger.info('✓ Timezone configurado', {
    timezone: TIMEZONE,
    offset: 'UTC-3'
  });
}).catch(() => {
  // Fallback silencioso se logger não estiver disponível
});

export default {
  TIMEZONE,
  LOCALE,
  now,
  formatDate,
  formatDateTime,
  formatTime,
  parseDate,
  isWeekend,
  getDayName,
  isSameDay,
  addDays,
  addHours,
  startOfDay,
  endOfDay,
  toISOString,
  isValidDate,
  isFutureDate,
  isPastDate,
  getTimezoneInfo
};
