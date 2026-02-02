/**
 * Middleware de timeouts
 * 
 * Configura timeouts para requisições e respostas
 * 
 * @module middlewares/timeout
 */

import logger from '../utils/logger.js';

const TIMEOUT_MS = 30000; // 30 segundos

/**
 * Middleware que configura timeouts
 */
export const timeoutMiddleware = (req, res, next) => {
  // Timeout de requisição
  req.setTimeout(TIMEOUT_MS, () => {
    logger.warn(`Request timeout: ${req.method} ${req.path} - IP: ${req.ip}`);
  });
  
  // Timeout de resposta
  res.setTimeout(TIMEOUT_MS, () => {
    if (!res.headersSent) {
      logger.error(`Response timeout: ${req.method} ${req.path} - IP: ${req.ip}`);
      res.status(408).json({ error: 'Tempo de requisição excedido' });
    }
  });
  
  next();
};
