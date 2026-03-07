// =============================================================================
// 🔒 MIDDLEWARE DE VALIDAÇÃO DE ID
// =============================================================================
// Valida se parâmetros de ID são strings válidas (CUIDs do Prisma)
// Previne crashes e comportamento inesperado com IDs malformados

import logger from '../utils/logger.js';

const ID_PATTERN = /^[a-z0-9]+$/i;

/**
 * Valida se uma string é um ID válido (CUID)
 */
function isValidId(value) {
  return typeof value === 'string' && value.length >= 1 && value.length <= 50 && ID_PATTERN.test(value);
}

/**
 * Middleware para validar parâmetro :id como string válida
 * CUIDs têm ~25 caracteres alfanuméricos
 */
export const validateId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id) {
      return next();
    }
    
    if (!isValidId(id)) {
      logger.warn('🔒 ID inválido recebido', {
        paramName,
        value: String(id).substring(0, 50),
        ip: req.ip,
        path: req.path,
        method: req.method
      });
      
      return res.status(400).json({ 
        message: `ID inválido: ${paramName}`,
        code: 'INVALID_ID'
      });
    }
    
    next();
  };
};

/**
 * Middleware para validar IDs em query string
 * Ex: ?cras=abc123&entrevistador=def456
 */
export const validateQueryIds = (paramNames = []) => {
  return (req, res, next) => {
    for (const paramName of paramNames) {
      const value = req.query[paramName];
      
      if (!value) continue;
      
      if (!isValidId(value)) {
        logger.warn('🔒 ID inválido em query', {
          paramName,
          value: String(value).substring(0, 50),
          ip: req.ip,
          path: req.path,
          method: req.method
        });
        
        return res.status(400).json({
          message: `ID inválido no filtro: ${paramName}`,
          code: 'INVALID_ID'
        });
      }
    }
    
    next();
  };
};
