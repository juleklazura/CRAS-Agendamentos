/**
 * Middleware de sanitização de entrada
 * 
 * Protege contra injeção NoSQL e outros ataques
 * 
 * @module middlewares/sanitization
 */

import logger from '../utils/logger.js';

/**
 * Sanitiza objeto recursivamente removendo caracteres perigosos
 */
export const sanitizeInput = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeInput(item));
  }
  
  Object.keys(obj).forEach(key => {
    // Remove chaves com caracteres perigosos ($ e .)
    if (key.includes('$') || key.includes('.')) {
      delete obj[key];
      logger.security(`Campo removido (chave perigosa): ${key}`);
      return;
    }
    
    if (typeof obj[key] === 'string') {
      const value = obj[key];
      
      // Padrões seguros que podem conter pontos
      const isISODate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value);
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      const isURL = /^https?:\/\/.+/.test(value);
      const isDecimal = /^\d+\.\d+$/.test(value);
      const isVersion = /^\d+\.\d+\.\d+$/.test(value);
      const isCPF = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value);
      
      const isSafePattern = isISODate || isEmail || isURL || isDecimal || isVersion || isCPF;
      
      // Detecta tentativas de injeção NoSQL
      const hasMongoDollar = /\$[\w]+/.test(value);
      const hasDotNotation = /^[\w]+\.[\w]+/.test(value) && !isSafePattern;
      
      if (hasMongoDollar || hasDotNotation) {
        logger.security(`🚨 Injeção NoSQL detectada - Campo: ${key}, Valor: ${value.substring(0, 50)}`);
        delete obj[key];
        return;
      }
    } else if (Array.isArray(obj[key])) {
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
    if (key.includes('$') || key.includes('.')) {
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
  // Sanitizar body
  if (req.body && typeof req.body === 'object') {
    sanitizeInput(req.body);
  }
  
  // Verificar caracteres perigosos em query e params
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
