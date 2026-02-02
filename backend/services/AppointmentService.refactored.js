/**
 * AppointmentService Refatorado - Usando Repository Pattern e Event System
 * 
 * Camada de serviço focada em orquestração de lógica de negócio
 * Delega acesso a dados para repositories e emite eventos para side-effects
 * 
 * @module services/AppointmentService
 */

import AppointmentRepository from '../repositories/AppointmentRepository.js';
import UserRepository from '../repositories/UserRepository.js';
import ValidationService from './ValidationService.js';
import AuthorizationService from './AuthorizationService.js';
import CacheService from './CacheService.js';
import eventEmitter, { EVENTS } from '../events/EventEmitter.js';
import { formatDateTime } from '../utils/timezone.js';
import logger from '../utils/logger.js';

class AppointmentService {
  /**
   * Cria novo agendamento
   */
  async createAppointment(data, user) {
    // 1. Validar dados
    const dataValidation = ValidationService.validateAppointmentData(data);
    if (!dataValidation.isValid) {
      const error = new Error(dataValidation.errors[0].message);
      error.statusCode = 400;
      error.validationErrors = dataValidation.errors;
      throw error;
    }

    // 2. Validar regras de negócio
    const businessValidation = ValidationService.validateAppointmentBusinessRules(data);
    if (!businessValidation.isValid) {
      const error = new Error(businessValidation.errors[0].message);
      error.statusCode = 400;
      error.validationErrors = businessValidation.errors;
      throw error;
    }

    // 3. Verificar autorização
    if (!AuthorizationService.canAccess(user.role, 'appointments', 'create')) {
      const error = new Error('Sem permissão para criar agendamentos');
      error.statusCode = 403;
      throw error;
    }

    try {
      // 4. Criar agendamento
      const appointmentData = {
        ...data,
        createdBy: user.id
      };

      const appointment = await AppointmentRepository.create(appointmentData);

      // 5. Carregar dados completos
      const appointmentPopulated = await AppointmentRepository.findById(
        appointment._id, 
        true
      );

      // 6. Emitir evento (log e cache serão tratados pelos listeners)
      eventEmitter.emitEvent(EVENTS.APPOINTMENT_CREATED, {
        appointment: appointmentPopulated,
        userId: user.id,
        crasId: data.cras
      });

      return appointmentPopulated.toJSON();

    } catch (dbError) {
      // Tratar erro de duplicata
      if (dbError.code === 11000 || dbError.name === 'MongoServerError') {
        const dataFormatada = formatDateTime(data.data);
        const error = new Error(
          `Este horário (${dataFormatada}) já está ocupado para este entrevistador. Por favor, escolha outro horário.`
        );
        error.statusCode = 409;
        error.code = 'SLOT_TAKEN';
        error.field = 'data';
        throw error;
      }
      throw dbError;
    }
  }

  /**
   * Lista agendamentos com filtros
   */
  async getAppointments(filters, user) {
    // 1. Construir filtros de acesso baseado no role
    const accessFilters = await AuthorizationService.buildAccessFilters(user);
    const combinedFilters = { ...accessFilters };

    // 2. Aplicar filtros adicionais (apenas para admin)
    if (user.role === 'admin') {
      if (filters.cras) {
        const entrevistadoresDoCras = await UserRepository.findByCras(
          filters.cras,
          'entrevistador'
        );
        const idsEntrevistadores = entrevistadoresDoCras.map(u => u._id);
        
        if (idsEntrevistadores.length > 0) {
          combinedFilters.entrevistador = { $in: idsEntrevistadores };
        } else {
          return { results: [], total: 0 };
        }
      }

      if (filters.entrevistador) {
        combinedFilters.entrevistador = filters.entrevistador;
      }
    }

    // 3. Aplicar filtro de status
    if (filters.status) {
      combinedFilters.status = filters.status;
    }

    // 4. Gerar chave de cache
    const cacheKey = CacheService.generateAppointmentKey({
      ...filters,
      ...combinedFilters,
      role: user.role
    });

    // 5. Buscar do cache ou banco
    return CacheService.getOrSet(cacheKey, async () => {
      let results;

      // Busca com pesquisa de texto
      if (filters.search) {
        const searchValidation = ValidationService.validateSearchString(filters.search);
        if (!searchValidation.isValid) {
          return { results: [], total: 0 };
        }
        
        results = await AppointmentRepository.search(
          filters.search,
          combinedFilters
        );
      } else {
        // Busca normal
        results = await AppointmentRepository.find(
          combinedFilters,
          {
            sort: this._buildSort(filters),
            populate: true
          }
        );
      }

      // Converter para JSON
      results = results.map(doc => doc.toJSON());

      // Ordenação manual para campos populados
      if (filters.sortBy && ['cras', 'entrevistador', 'createdBy'].includes(filters.sortBy)) {
        results = this._sortByPopulatedField(results, filters.sortBy, filters.order);
      }

      const total = results.length;
      
      // Aplicar paginação
      if (filters.page && filters.pageSize) {
        const page = parseInt(filters.page) || 1;
        const pageSize = parseInt(filters.pageSize) || 10;
        const skip = (page - 1) * pageSize;
        results = results.slice(skip, skip + pageSize);
      }

      return { results, total };
    }, 60); // Cache de 60 segundos
  }

  /**
   * Busca agendamento por ID
   */
  async getAppointmentById(id, user) {
    const appointment = await AppointmentRepository.findById(id, true);
    
    if (!appointment) {
      const error = new Error('Agendamento não encontrado');
      error.statusCode = 404;
      throw error;
    }

    // Verificar autorização
    const canManage = await AuthorizationService.canManageAppointment(user, appointment);
    if (!canManage) {
      const error = new Error('Sem permissão para acessar este agendamento');
      error.statusCode = 403;
      throw error;
    }

    return appointment.toJSON();
  }

  /**
   * Atualiza agendamento
   */
  async updateAppointment(id, data, user) {
    // 1. Buscar agendamento existente
    const existingAppointment = await AppointmentRepository.findById(id, false);
    
    if (!existingAppointment) {
      const error = new Error('Agendamento não encontrado');
      error.statusCode = 404;
      throw error;
    }

    // 2. Verificar autorização
    const canManage = await AuthorizationService.canManageAppointment(user, existingAppointment);
    if (!canManage) {
      const error = new Error('Sem permissão para editar este agendamento');
      error.statusCode = 403;
      throw error;
    }

    // 3. Validar novos dados
    const updateData = { ...existingAppointment.toObject(), ...data };
    const dataValidation = ValidationService.validateAppointmentData(updateData);
    if (!dataValidation.isValid) {
      const error = new Error(dataValidation.errors[0].message);
      error.statusCode = 400;
      error.validationErrors = dataValidation.errors;
      throw error;
    }

    const businessValidation = ValidationService.validateAppointmentBusinessRules(updateData);
    if (!businessValidation.isValid) {
      const error = new Error(businessValidation.errors[0].message);
      error.statusCode = 400;
      error.validationErrors = businessValidation.errors;
      throw error;
    }

    // 4. Atualizar
    try {
      const updated = await AppointmentRepository.update(id, data);
      const appointmentPopulated = await AppointmentRepository.findById(id, true);

      // 5. Emitir evento
      const changes = this._getChanges(existingAppointment, data);
      eventEmitter.emitEvent(EVENTS.APPOINTMENT_UPDATED, {
        appointment: appointmentPopulated,
        userId: user.id,
        crasId: appointmentPopulated.cras._id || appointmentPopulated.cras,
        oldCras: existingAppointment.cras,
        oldEntrevistador: existingAppointment.entrevistador,
        changes
      });

      return appointmentPopulated.toJSON();

    } catch (dbError) {
      if (dbError.code === 11000) {
        const dataFormatada = formatDateTime(data.data || existingAppointment.data);
        const error = new Error(
          `Este horário (${dataFormatada}) já está ocupado. Por favor, escolha outro horário.`
        );
        error.statusCode = 409;
        error.code = 'SLOT_TAKEN';
        throw error;
      }
      throw dbError;
    }
  }

  /**
   * Deleta agendamento
   */
  async deleteAppointment(id, user) {
    // 1. Buscar agendamento
    const appointment = await AppointmentRepository.findById(id, true);
    
    if (!appointment) {
      const error = new Error('Agendamento não encontrado');
      error.statusCode = 404;
      throw error;
    }

    // 2. Verificar autorização
    const canManage = await AuthorizationService.canManageAppointment(user, appointment);
    if (!canManage) {
      const error = new Error('Sem permissão para deletar este agendamento');
      error.statusCode = 403;
      throw error;
    }

    // 3. Deletar
    await AppointmentRepository.delete(id);

    // 4. Emitir evento
    eventEmitter.emitEvent(EVENTS.APPOINTMENT_DELETED, {
      appointment,
      userId: user.id,
      crasId: appointment.cras._id || appointment.cras
    });

    return { message: 'Agendamento deletado com sucesso' };
  }

  /**
   * Helper: construir objeto de ordenação
   */
  _buildSort(filters) {
    if (!filters.sortBy) return { data: 1 };

    let field = filters.sortBy;
    if (['cras', 'entrevistador', 'createdBy'].includes(field)) {
      field = field + '.name';
    }

    return { [field]: filters.order === 'desc' ? -1 : 1 };
  }

  /**
   * Helper: ordenar por campo populado
   */
  _sortByPopulatedField(results, field, order = 'asc') {
    return results.sort((a, b) => {
      const aName = a[field]?.name?.toLowerCase() || '';
      const bName = b[field]?.name?.toLowerCase() || '';
      return order === 'desc' 
        ? bName.localeCompare(aName)
        : aName.localeCompare(bName);
    });
  }

  /**
   * Helper: detectar alterações
   */
  _getChanges(oldData, newData) {
    const changes = [];
    const fields = ['pessoa', 'cpf', 'telefone1', 'telefone2', 'motivo', 'data', 'status', 'observacoes'];
    
    fields.forEach(field => {
      if (newData[field] !== undefined && newData[field] !== oldData[field]) {
        changes.push(`${field}: "${oldData[field]}" → "${newData[field]}"`);
      }
    });

    return changes.join(', ');
  }
}

export default new AppointmentService();
