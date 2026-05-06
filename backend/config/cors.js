/**
 * Configuração de CORS.
 * Origens permitidas: frontend em produção, previews do Vercel e localhost em dev.
 */

import logger from '../utils/logger.js';

/**
 * Obtém lista de origens permitidas baseado no ambiente
 */
export const getAllowedOrigins = () => {
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    // URLs do Vercel (pattern para previews e produção)
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    // URLs comuns do Vercel para este projeto
    'https://cras-agendamentos.vercel.app',
    'https://cras-agendamentos-git-main-juleklazuras-projects.vercel.app',
    ...(process.env.NODE_ENV === 'development' ? [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173'
    ] : [])
  ].filter(Boolean);

  logger.debug('CORS - Origens permitidas:', allowedOrigins);
  return allowedOrigins;
};

/**
 * Configuração completa de CORS
 */
export const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();
    
    // Requisições sem Origin são bloqueadas em produção (previne CSRF via ferramenta).
    // Em dev, permite Postman, cURL e similares.
    if (!origin) {
      if (process.env.NODE_ENV === 'production') {
        logger.warn('CORS: requisição sem cabeçalho Origin bloqueada em produção');
        return callback(new Error('Requisições sem origin não são permitidas em produção'));
      }
      return callback(null, true);
    }
    
    // Validar se origin está na whitelist
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS bloqueado:', origin);
      callback(new Error('Origem não permitida pelo CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization', 'Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 600 // 10 minutos
};
