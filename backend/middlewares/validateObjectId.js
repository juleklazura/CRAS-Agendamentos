// =============================================================================
// 🔒 MIDDLEWARE DE VALIDAÇÃO DE OBJECTID
// =============================================================================
// Valida se parâmetros de ID são ObjectIds válidos do MongoDB
// Previne crashes e comportamento inesperado com IDs malformados

import mongoose from 'mongoose';
import logger from '../utils/logger.js';

/**
 * Middleware para validar parâmetro :id como ObjectId válido
 * Retorna 400 se o ID for inválido ao invés de causar crash
 */
export const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id) {
      return next(); // Se não há ID, deixa o controller tratar
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn('🔒 ObjectId inválido recebido', {
        paramName,
        value: id.substring(0, 50), // Limitar tamanho no log
        ip: req.ip,
        path: req.path,
        method: req.method
      });
      
      return res.status(400).json({ 
        message: `ID inválido: ${paramName}`,
        code: 'INVALID_OBJECT_ID'
      });
    }
    
    next();
  };
};

/**
 * Middleware para validar múltiplos ObjectIds em query params
 * Útil para rotas que aceitam filtros opcionais
 */
export const validateQueryObjectIds = (paramNames = []) => {
  return (req, res, next) => {
    for (const paramName of paramNames) {
      const id = req.query[paramName];
      
      if (id && !mongoose.Types.ObjectId.isValid(id)) {
        logger.warn('🔒 ObjectId inválido em query param', {
          paramName,
          value: id.substring(0, 50),
          ip: req.ip,
          path: req.path
        });
        
        return res.status(400).json({ 
          message: `Filtro inválido: ${paramName}`,
          code: 'INVALID_QUERY_OBJECT_ID'
        });
      }
    }
    
    next();
  };
};

export default { validateObjectId, validateQueryObjectIds };
