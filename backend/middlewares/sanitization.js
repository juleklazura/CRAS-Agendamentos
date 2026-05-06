/**
 * Sanitização de entrada como defesa em profundidade.
 * O Prisma usa queries parametrizadas (SQL injection não é uma ameaça direta),
 * mas este middleware remove chaves com `$` que poderiam ser usadas para
 * injetar operadores em ORMs que aceitam objetos arbitrários no `where`.
 */

import logger from '../utils/logger.js';

// Remove chaves que começam com `$` (ex: `$where`, `$or`) — defesa contra injeção de operadores.
export const sanitizeInput = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeInput(item));
  }
  
  Object.keys(obj).forEach(key => {
    // Remove chaves com $ (defesa em profundidade)
    if (key.includes('$')) {
      delete obj[key];
      logger.security(`Campo com operador removido: ${key}`);
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

// Detecta chaves perigosas de forma recursiva sem modificar o objeto (usado em query/params).
const checkDangerousChars = (obj, source) => {
  if (!obj || typeof obj !== 'object') return false;
  
  for (const key in obj) {
    if (key.includes('$')) {
      logger.security(`Tentativa de injeção de operador detectada em ${source} — campo: ${key}`);
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

// Aplica sanitização ao body (mutando o objeto) e valida query/params sem modificar.
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
