// Middleware de autorização para recursos do sistema
// Valida se o usuário tem permissão para acessar/modificar recursos específicos
// Previne IDOR (Insecure Direct Object References) e privilege escalation

import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';

/**
 * Valida se o usuário pode acessar/modificar um agendamento específico
 *
 * Regras de acesso:
 * - Admin: pode acessar qualquer agendamento
 * - Entrevistador: pode acessar apenas seus próprios agendamentos
 * - Recepção: pode acessar agendamentos do próprio CRAS
 */
export function canAccessAppointment(action = 'read') {
  return async (req, res, next) => {
    try {
      const appointmentId = req.params.id;
      const userId = req.user.id;
      const userRole = req.user.role;

      if (!appointmentId || typeof appointmentId !== 'string' || appointmentId.length > 50) {
        return res.status(400).json({
          message: 'ID de agendamento inválido',
          code: 'INVALID_ID',
        });
      }

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });

      if (!appointment) {
        logger.warn(`Tentativa de ${action} em agendamento inexistente`, {
          appointmentId,
          userId,
          userRole,
          action,
        });
        return res.status(404).json({
          message: 'Agendamento não encontrado',
          code: 'NOT_FOUND',
        });
      }

      // Admin tem acesso total
      if (userRole === 'admin') {
        req.appointment = appointment;
        return next();
      }

      // Entrevistador: apenas seus agendamentos
      if (userRole === 'entrevistador') {
        if (appointment.entrevistadorId !== userId) {
          logger.warn(`Tentativa não autorizada de ${action} em agendamento`, {
            appointmentId,
            appointmentOwner: appointment.entrevistadorId,
            userId,
            userRole,
            action,
          });
          return res.status(403).json({
            message: 'Você não tem permissão para acessar este agendamento',
            code: 'FORBIDDEN',
          });
        }
        req.appointment = appointment;
        return next();
      }

      // Recepção: apenas agendamentos do próprio CRAS
      if (userRole === 'recepcao') {
        const entrevistador = await prisma.user.findUnique({
          where: { id: appointment.entrevistadorId },
          select: { id: true, crasId: true },
        });

        if (!entrevistador || entrevistador.crasId !== req.user.cras) {
          logger.warn(`Tentativa não autorizada de ${action} em agendamento de outro CRAS`, {
            appointmentId,
            appointmentCras: entrevistador?.crasId,
            userCras: req.user.cras,
            userId,
            userRole,
            action,
          });
          return res.status(403).json({
            message: 'Você não tem permissão para acessar agendamentos de outro CRAS',
            code: 'FORBIDDEN_CROSS_CRAS',
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
        action,
      });
      return res.status(403).json({
        message: 'Acesso negado',
        code: 'FORBIDDEN',
      });
    } catch (error) {
      logger.error('Erro no middleware de autorização:', {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        userId: req.user?.id,
        appointmentId: req.params?.id,
        action,
      });
      return res.status(500).json({
        message: 'Erro ao verificar permissões',
        code: 'AUTHORIZATION_ERROR',
      });
    }
  };
}
