/**
 * AuthorizationService - Serviço de autorização e controle de acesso
 * 
 * Centraliza lógica de permissões e controle de acesso baseado em roles
 * 
 * @module services/AuthorizationService
 */

import UserRepository from '../repositories/UserRepository.js';

class AuthorizationService {
  /**
   * Verifica se usuário tem permissão para acessar recurso
   */
  canAccess(userRole, resource, action) {
    const permissions = {
      admin: {
        appointments: ['create', 'read', 'update', 'delete'],
        users: ['create', 'read', 'update', 'delete'],
        cras: ['create', 'read', 'update', 'delete'],
        logs: ['read'],
        blockedSlots: ['create', 'read', 'delete']
      },
      recepcao: {
        appointments: ['create', 'read', 'update', 'delete'],
        users: [],
        cras: ['read'],
        logs: [],
        blockedSlots: ['create', 'read', 'delete']
      },
      entrevistador: {
        appointments: ['read'],
        users: [],
        cras: ['read'],
        logs: [],
        blockedSlots: ['create', 'read', 'delete']
      }
    };

    const rolePermissions = permissions[userRole];
    if (!rolePermissions) return false;

    const resourcePermissions = rolePermissions[resource];
    if (!resourcePermissions) return false;

    return resourcePermissions.includes(action);
  }

  /**
   * Verifica se usuário pode gerenciar agendamento específico
   */
  async canManageAppointment(user, appointment) {
    // Admin pode gerenciar tudo
    if (user.role === 'admin') return true;

    // Recepção pode gerenciar agendamentos do próprio CRAS
    if (user.role === 'recepcao') {
      const entrevistador = await UserRepository.findById(appointment.entrevistador);
      return entrevistador && entrevistador.cras.toString() === user.cras.toString();
    }

    // Entrevistador só pode visualizar próprios agendamentos
    if (user.role === 'entrevistador') {
      return appointment.entrevistador.toString() === user.id;
    }

    return false;
  }

  /**
   * Constrói filtros de acesso baseado no role do usuário
   */
  async buildAccessFilters(user) {
    const filter = {};

    if (user.role === 'entrevistador') {
      // Entrevistador vê apenas seus próprios agendamentos
      filter.entrevistador = user.id;
    } else if (user.role === 'recepcao') {
      // Recepção vê agendamentos do próprio CRAS
      const entrevistadoresDoCras = await UserRepository.findByCras(
        user.cras, 
        'entrevistador'
      );
      const idsEntrevistadores = entrevistadoresDoCras.map(u => u._id);
      
      if (idsEntrevistadores.length > 0) {
        filter.entrevistador = { $in: idsEntrevistadores };
      } else {
        // Se não há entrevistadores, retornar filtro que não retorna nada
        filter._id = { $in: [] };
      }
    }
    // Admin não tem filtros adicionais

    return filter;
  }

  /**
   * Verifica se usuário pode acessar dados de outro usuário
   */
  canAccessUser(requestingUser, targetUserId) {
    // Admin pode acessar todos
    if (requestingUser.role === 'admin') return true;

    // Usuários podem acessar próprios dados
    if (requestingUser.id === targetUserId) return true;

    return false;
  }

  /**
   * Verifica se usuário pode acessar dados de um CRAS
   */
  canAccessCras(user, crasId) {
    // Admin pode acessar todos
    if (user.role === 'admin') return true;

    // Outros usuários só podem acessar próprio CRAS
    return user.cras.toString() === crasId.toString();
  }
}

export default new AuthorizationService();
