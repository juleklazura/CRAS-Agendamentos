/**
 * Configuração de Rate Limiting
 * 
 * Define limites de requisições para prevenir abuso
 * 
 * @module config/rateLimiting
 */

import rateLimit from 'express-rate-limit';

/**
 * Rate limiter global
 * Protege contra ataques de negação de serviço (DoS)
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 100 : 500, // Dev: 500, Prod: 100
  message: {
    error: 'Muitas requisições deste IP. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Configuração para trust proxy
 * Habilita detecção correta de IPs com proxy reverso
 */
export const shouldTrustProxy = () => {
  return process.env.TRUST_PROXY === 'true';
};
