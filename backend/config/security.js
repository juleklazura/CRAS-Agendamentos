/**
 * Configuração de Helmet (Security Headers)
 * 
 * Define headers de segurança para proteger a aplicação
 * 
 * @module config/security
 */

/**
 * Opções de configuração do Helmet
 */
export const helmetOptions = {
  // Content Security Policy - define fontes permitidas para recursos
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // MUI/React precisa de unsafe-inline
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [])].filter(Boolean),
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  // Cross-Origin Policies
  crossOriginEmbedderPolicy: false, // Desabilitado para compatibilidade
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-site" },
  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },
  // Frameguard - previne clickjacking
  frameguard: { action: "deny" },
  // Hide X-Powered-By
  hidePoweredBy: true,
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 ano
    includeSubDomains: true,
    preload: true
  },
  // IE No Open
  ieNoOpen: true,
  // No Sniff
  noSniff: true,
  // Referrer Policy
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  // XSS Filter
  xssFilter: true
};
