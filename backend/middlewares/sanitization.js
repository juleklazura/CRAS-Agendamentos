/**
 * Middleware de sanitização de entrada
 * 
 * Protege contra injeção e ataques de manipulação de entrada.
 * Com Prisma/PostgreSQL, SQL injection é prevenido por queries parametrizadas.
 * Este middleware oferece defesa em profundidade.
 */

import logger from '../utils/logger.js';

/**
 * Sanitiza objeto recursivamente removendo chaves perigosas
 */
export const sanitizeInput = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeInput(item));
  }
  
  Object.keys(obj).forEach(key => {
    // Remove chaves com $ (defesa em profundidade)
    if (key.includes('$')) {
      delete obj[key];
      logger.security(`Campo removido (chave perigosa): ${key}`);
      return;
    }
    
    if (Array.isArray(obj[key])) {
      obj[key] = sanitizeInput(obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      obj[key] = sanitizeInput(obj[key]);
    }
  });
  
  return obj;
};

/**
 * Verifica caracteres perigosos em objeto
 */
const checkDangerousChars = (obj, source) => {
  if (!obj || typeof obj !== 'object') return false;
  
  for (const key in obj) {
    if (key.includes('$')) {
      logger.security(`🚨 Tentativa de injeção detectada em ${source} - Campo: ${key}`);
      return true;
    }
    
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (checkDangerousChars(obj[key], source)) {
        return true;
      }
    }
  }
  
  return false;
};

/**
 * Middleware que sanitiza body, query e params
 */
export const sanitizationMiddleware = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    sanitizeInput(req.body);
  }
  
  if (checkDangerousChars(req.query, 'query')) {
    return res.status(400).json({ 
      error: 'Requisição contém caracteres não permitidos' 
    });
  }
  
  if (checkDangerousChars(req.params, 'params')) {
    return res.status(400).json({ 
      error: 'Requisição contém caracteres não permitidos' 
    });
  }
  
  next();
};
