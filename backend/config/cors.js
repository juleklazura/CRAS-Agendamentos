/**
 * Configuração de CORS para a aplicação
 * 
 * Define origens permitidas e opções de CORS
 * 
 * @module config/cors
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

  logger.info('🔐 CORS - Origens permitidas:', allowedOrigins);
  return allowedOrigins;
};

/**
 * Configuração completa de CORS
 */
export const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();
    
    // 🔒 SEGURANÇA: Requisições sem origin (Postman, cURL, health checks)
    if (!origin) {
      return callback(null, true);
    }
    
    // Validar se origin está na whitelist
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Permitir qualquer subdomínio do Vercel
      const isVercelDomain = origin.match(/https:\/\/.*\.vercel\.app$/);
      if (isVercelDomain) {
        logger.info('✅ CORS permitido para Vercel:', origin);
        return callback(null, true);
      }
      
      logger.warn('❌ CORS bloqueado:', origin);
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
