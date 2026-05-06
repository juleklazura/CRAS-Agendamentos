// Valida parâmetros de ID (CUIDs do Prisma) em params e query strings.
// Previne crashes causados por IDs malformados e expeções Prisma com detalhes internos.

import logger, { pseudonymizeIp } from '../utils/logger.js';

// CUIDs têm ~25 caracteres alfanuméricos. O padrão admite também IDs legados mais curtos.
const ID_PATTERN = /^[a-z0-9]+$/i;

function isValidId(value) {
  return typeof value === 'string' && value.length >= 1 && value.length <= 50 && ID_PATTERN.test(value);
}

/**
 * Valida o parâmetro de rota `:id` (ou outro param nomeado).
 * Rejeita com 400 antes de qualquer query ao banco.
 */
export const validateId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id) {
      return next();
    }
    
    if (!isValidId(id)) {
      logger.warn('ID inválido recebido em param', {
        paramName,
        value: String(id).substring(0, 50),
        ip: pseudonymizeIp(req.ip),
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
 * Valida IDs informados em query strings (ex: ?cras=abc123&entrevistador=def456).
 * Previne PrismaClientValidationError que poderia expor mensagens de erro internas.
 */
export const validateQueryIds = (paramNames = []) => {
  return (req, res, next) => {
    for (const paramName of paramNames) {
      const value = req.query[paramName];
      
      if (!value) continue;
      
      if (!isValidId(value)) {
        logger.warn('ID inválido em query string', {
          paramName,
          value: String(value).substring(0, 50),
          ip: pseudonymizeIp(req.ip),
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
