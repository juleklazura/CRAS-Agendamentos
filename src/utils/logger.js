/**
 * Logger seguro para desenvolvimento
 * 
 * ⚠️ SEGURANÇA:
 * - Logs NUNCA devem expor dados sensíveis (tokens, senhas, CPFs, etc)
 * - Logs de erro NÃO devem mostrar stack traces completos em produção
 * - Usar apenas em desenvolvimento (NODE_ENV !== 'production')
 * 
 * @module utils/logger
 */

const isDev = import.meta.env.DEV;

const logger = {
  /**
   * Loga informações de chamadas API (APENAS DEV)
   */
  logApiCall: (name, duration) => {
    if (isDev) {
      console.log(`[API] ${name} - ${duration}ms`);
    }
  },

  /**
   * Loga erros de forma segura
   * ⚠️ NUNCA logar: tokens, senhas, dados pessoais (CPF, email, telefone)
   */
  error: (message, error = null) => {
    if (isDev) {
      // Em desenvolvimento, mostra erro sanitizado
      const sanitizedError = error ? {
        name: error.name,
        message: error.message,
        status: error.response?.status
      } : null;
      console.error(`[ERROR] ${message}`, sanitizedError);
    }
    // Em produção, não loga nada no console
  },

  /**
   * Loga avisos
   */
  warn: (message, ...args) => {
    if (isDev) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },

  /**
   * Loga informações
   */
  info: (message, ...args) => {
    if (isDev) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },

  /**
   * Loga debug
   */
  debug: (message, ...args) => {
    if (isDev) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }
};


export default logger;
