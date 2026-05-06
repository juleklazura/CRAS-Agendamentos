/**
 * Headers de segurança complementares ao Helmet.
 *
 * - Permissions-Policy: desabilita features de browser não utilizadas (câmera, microfone, etc.)
 * - Cache-Control: impede que dados sensíveis de /api sejam cacheados por proxies ou browsers.
 * - Redirect HTTP→HTTPS: força HTTPS em produção para requisições sem TLS.
 */

import logger from '../utils/logger.js';

/**
 * Middleware que adiciona headers de segurança customizados
 */
export const securityHeadersMiddleware = (req, res, next) => {
  res.setHeader('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=()'
  );
  
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  // Redireciona HTTP para HTTPS em produção. Depende de TRUST_PROXY=true
  // para que x-forwarded-proto reflita o protocolo real do cliente.
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  
  next();
};
