// Middleware de autorização para recursos do sistema
// Valida se o usuário tem permissão para acessar/modificar recursos específicos
// Previne IDOR (Insecure Direct Object References) e privilege escalation

import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

/**
 * Valida se o usuário pode acessar/modificar um agendamento específico
 * 
 * Regras de acesso:
 * - Admin: pode acessar qualquer agendamento
 * - Entrevistador: pode acessar apenas seus próprios agendamentos
 * - Recepção: pode acessar agendamentos do próprio CRAS
 * 
 * @param {string} action - Ação sendo executada (read, update, delete)
 * @returns {Function} Middleware Express
 */
export function canAccessAppointment(action = 'read') {
  return async (req, res, next) => {
    try {
      const appointmentId = req.params.id;
      const userId = req.user.id;
      const userRole = req.user.role;
      
      // Validar formato do ID
      if (!appointmentId || !appointmentId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ 
          message: 'ID de agendamento inválido',
          code: 'INVALID_ID'
        });
      }
      
      // Buscar agendamento
      const appointment = await Appointment.findById(appointmentId);
      
      if (!appointment) {
        logger.warn(`Tentativa de ${action} em agendamento inexistente`, {
          appointmentId,
          userId,
          userRole,
          action
        });
        
        return res.status(404).json({ 
          message: 'Agendamento não encontrado',
          code: 'NOT_FOUND'
        });
      }
      
      // Admin tem acesso total
      if (userRole === 'admin') {
        req.appointment = appointment; // Disponibiliza para próximo handler
        return next();
      }
      
      // Entrevistador: apenas seus agendamentos
      if (userRole === 'entrevistador') {
        if (appointment.entrevistador.toString() !== userId) {
          logger.warn(`Tentativa não autorizada de ${action} em agendamento`, {
            appointmentId,
            appointmentOwner: appointment.entrevistador.toString(),
            userId,
            userRole,
            action
          });
          
          return res.status(403).json({ 
            message: 'Você não tem permissão para acessar este agendamento',
            code: 'FORBIDDEN'
          });
        }
        
        req.appointment = appointment;
        return next();
      }
      
      // Recepção: apenas agendamentos do próprio CRAS
      if (userRole === 'recepcao') {
        const entrevistador = await User.findById(appointment.entrevistador);
        
        if (!entrevistador || entrevistador.cras.toString() !== req.user.cras.toString()) {
          logger.warn(`Tentativa não autorizada de ${action} em agendamento de outro CRAS`, {
            appointmentId,
            appointmentCras: entrevistador?.cras?.toString(),
            userCras: req.user.cras?.toString(),
            userId,
            userRole,
            action
          });
          
          return res.status(403).json({ 
            message: 'Você não tem permissão para acessar agendamentos de outro CRAS',
            code: 'FORBIDDEN_CROSS_CRAS'
          });
        }
        
        req.appointment = appointment;
        return next();
      }
      
      // Role desconhecido
      logger.error('Role desconhecido tentando acessar agendamento', {
        userId,
        userRole,
        appointmentId,
        action
      });
      
      return res.status(403).json({ 
        message: 'Acesso negado',
        code: 'FORBIDDEN'
      });
      
    } catch (error) {
      logger.error('Erro no middleware de autorização:', {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        userId: req.user?.id,
        appointmentId: req.params?.id,
        action
      });
      
      return res.status(500).json({ 
        message: 'Erro ao verificar permissões',
        code: 'AUTHORIZATION_ERROR'
      });
    }
  };
}

/**
 * Valida se o usuário pode acessar/modificar um usuário específico
 * 
 * Regras de acesso:
 * - Admin: pode acessar qualquer usuário
 * - Outros roles: podem acessar apenas seus próprios dados
 * 
 * @param {string} action - Ação sendo executada (read, update, delete)
 * @returns {Function} Middleware Express
 */
export function canAccessUser(action = 'read') {
  return async (req, res, next) => {
    try {
      const targetUserId = req.params.id;
      const currentUserId = req.user.id;
      const userRole = req.user.role;
      
      // Validar formato do ID
      if (!targetUserId || !targetUserId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ 
          message: 'ID de usuário inválido',
          code: 'INVALID_ID'
        });
      }
      
      // Admin tem acesso total
      if (userRole === 'admin') {
        return next();
      }
      
      // Outros usuários só podem acessar seus próprios dados
      if (targetUserId !== currentUserId) {
        logger.warn(`Tentativa não autorizada de ${action} em dados de outro usuário`, {
          targetUserId,
          currentUserId,
          userRole,
          action
        });
        
        return res.status(403).json({ 
          message: 'Você não tem permissão para acessar dados de outros usuários',
          code: 'FORBIDDEN'
        });
      }
      
      next();
      
    } catch (error) {
      logger.error('Erro no middleware de autorização de usuário:', {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        userId: req.user?.id,
        targetUserId: req.params?.id,
        action
      });
      
      return res.status(500).json({ 
        message: 'Erro ao verificar permissões',
        code: 'AUTHORIZATION_ERROR'
      });
    }
  };
}

/**
 * Valida se o usuário pode gerenciar CRAS
 * 
 * Regras de acesso:
 * - Admin: pode gerenciar qualquer CRAS
 * - Recepção: pode visualizar dados do próprio CRAS
 * - Entrevistador: pode visualizar dados do próprio CRAS
 * 
 * @param {string} action - Ação sendo executada (read, update, delete, create)
 * @returns {Function} Middleware Express
 */
export function canManageCras(action = 'read') {
  return async (req, res, next) => {
    try {
      const crasId = req.params.id;
      const userRole = req.user.role;
      const userCras = req.user.cras;
      
      // Admin pode fazer qualquer ação
      if (userRole === 'admin') {
        return next();
      }
      
      // Para ações de escrita (create, update, delete), apenas admin
      if (action !== 'read') {
        logger.warn(`Tentativa não autorizada de ${action} em CRAS`, {
          crasId,
          userId: req.user.id,
          userRole,
          action
        });
        
        return res.status(403).json({ 
          message: 'Apenas administradores podem modificar dados de CRAS',
          code: 'FORBIDDEN_ADMIN_ONLY'
        });
      }
      
      // Para leitura, validar se é o CRAS do usuário
      if (crasId && crasId !== userCras?.toString()) {
        logger.warn(`Tentativa não autorizada de visualizar outro CRAS`, {
          crasId,
          userCras: userCras?.toString(),
          userId: req.user.id,
          userRole,
          action
        });
        
        return res.status(403).json({ 
          message: 'Você não tem permissão para acessar dados de outro CRAS',
          code: 'FORBIDDEN_CROSS_CRAS'
        });
      }
      
      next();
      
    } catch (error) {
      logger.error('Erro no middleware de autorização de CRAS:', {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        userId: req.user?.id,
        crasId: req.params?.id,
        action
      });
      
      return res.status(500).json({ 
        message: 'Erro ao verificar permissões',
        code: 'AUTHORIZATION_ERROR'
      });
    }
  };
}

/**
 * Middleware genérico para autorização baseada em roles
 * Complementa o middleware authorize() do auth.js
 * 
 * @param {Object} options - Opções de autorização
 * @param {string[]} options.roles - Roles permitidos
 * @param {Function} options.customCheck - Função customizada de verificação
 * @returns {Function} Middleware Express
 */
export function authorizeResource(options = {}) {
  const { roles = [], customCheck = null } = options;
  
  return async (req, res, next) => {
    try {
      const userRole = req.user.role;
      
      // Verificar role básico
      if (roles.length > 0 && !roles.includes(userRole)) {
        logger.warn('Tentativa de acesso com role não autorizado', {
          userId: req.user.id,
          userRole,
          requiredRoles: roles,
          path: req.path
        });
        
        return res.status(403).json({ 
          message: 'Você não tem permissão para acessar este recurso',
          code: 'FORBIDDEN_INSUFFICIENT_ROLE'
        });
      }
      
      // Executar verificação customizada se fornecida
      if (customCheck) {
        const isAuthorized = await customCheck(req, res);
        
        if (!isAuthorized) {
          return res.status(403).json({ 
            message: 'Acesso negado',
            code: 'FORBIDDEN_CUSTOM_CHECK'
          });
        }
      }
      
      next();
      
    } catch (error) {
      logger.error('Erro no middleware de autorização genérico:', {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        userId: req.user?.id,
        path: req.path
      });
      
      return res.status(500).json({ 
        message: 'Erro ao verificar permissões',
        code: 'AUTHORIZATION_ERROR'
      });
    }
  };
}
