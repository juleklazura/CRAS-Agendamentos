/**
 * Middleware de headers de segurança customizados
 * 
 * Adiciona headers extras não cobertos pelo Helmet
 * 
 * @module middlewares/securityHeaders
 */

import logger from '../utils/logger.js';

/**
 * Middleware que adiciona headers de segurança customizados
 */
export const securityHeadersMiddleware = (req, res, next) => {
  // Permissions Policy - desabilitar recursos não utilizados
  res.setHeader('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=()'
  );
  
  // Cache Control para rotas de API (não cachear dados sensíveis)
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  // Forçar HTTPS em produção
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  
  next();
};
