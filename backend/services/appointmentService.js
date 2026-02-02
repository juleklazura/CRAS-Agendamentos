/**
 * AppointmentService - Camada de serviço para agendamentos
 * 
 * Separa lógica de negócio dos controllers
 * Facilita testes e reutilização de código
 * 
 * @module services/appointmentService
 */

import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import Log from '../models/Log.js';
import mongoose from 'mongoose';
import { parseDate, isWeekend, formatDateTime } from '../utils/timezone.js';
import cache from '../utils/cache.js';
import logger from '../utils/logger.js';

class AppointmentService {
  /**
   * Cria novo agendamento
   */
  async createAppointment(data, userId) {
    const { entrevistador, cras, pessoa, cpf, telefone1, telefone2, motivo, data: dataAgendamento, status, observacoes } = data;
    
    // Validação de regra de negócio: não permitir agendamento em fins de semana
    const dataObj = parseDate(dataAgendamento);
    if (isWeekend(dataObj)) {
      throw new Error('Não é permitido agendar para sábado ou domingo.');
    }
    
    try {
      // Criação do novo agendamento
      const appointment = new Appointment({ 
        entrevistador, 
        cras, 
        pessoa, 
        cpf, 
        telefone1, 
        telefone2, 
        motivo,
        data: dataAgendamento, 
        status, 
        observacoes, 
        createdBy: userId 
      });
      
      await appointment.save();
      
      // Carregar agendamento com dados relacionados
      const appointmentPopulated = await Appointment.findById(appointment._id)
        .populate('entrevistador', 'name email matricula')
        .populate('cras', 'nome endereco telefone')
        .populate('createdBy', 'name matricula');
      
      // Criar log da ação
      await Log.create({
        user: userId,
        cras: cras,
        action: 'criar_agendamento',
        details: `Agendamento criado para ${pessoa} em ${formatDateTime(dataAgendamento)} - Motivo: ${motivo}`
      });
      
      // Invalidar cache
      cache.invalidateAppointments(cras, entrevistador);
      
      return appointmentPopulated.toJSON();
      
    } catch (dbError) {
      // Tratar erro de duplicata (código 11000 do MongoDB)
      if (dbError.code === 11000 || dbError.name === 'MongoServerError') {
        const dataFormatada = formatDateTime(dataAgendamento);
        const error = new Error(`Este horário (${dataFormatada}) já está ocupado para este entrevistador. Por favor, escolha outro horário.`);
        error.statusCode = 409;
        error.code = 'SLOT_TAKEN';
        throw error;
      }
      throw dbError;
    }
  }

  /**
   * Lista agendamentos com filtros e paginação
   */
  async getAppointments(filters, userContext) {
    const { role, id: userId, cras: userCras } = userContext;
    const filter = {};
    
    // Aplicar filtros baseados no role
    if (role === 'entrevistador') {
      filter.entrevistador = userId;
    } else if (role === 'recepcao') {
      const entrevistadoresDoCras = await User.find({ 
        cras: userCras, 
        role: 'entrevistador' 
      }).select('_id');
      
      const idsEntrevistadores = entrevistadoresDoCras.map(user => user._id);
      
      if (idsEntrevistadores.length > 0) {
        filter.entrevistador = { $in: idsEntrevistadores };
      } else {
        return { results: [], total: 0 };
      }
    } else if (role === 'admin') {
      if (filters.cras) {
        const entrevistadoresDoCras = await User.find({ 
          cras: filters.cras, 
          role: 'entrevistador' 
        }).select('_id');
        
        const idsEntrevistadores = entrevistadoresDoCras.map(user => user._id);
        
        if (idsEntrevistadores.length > 0) {
          filter.entrevistador = { $in: idsEntrevistadores };
        } else {
          return { results: [], total: 0 };
        }
      }
      
      if (filters.entrevistador) {
        filter.entrevistador = filters.entrevistador;
      }
    }

    // Filtro de status
    if (filters.status) {
      filter.status = filters.status;
    }

    // Busca por texto
    if (filters.search) {
      const searchRegex = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { pessoa: searchRegex },
        { cpf: searchRegex },
        { telefone1: searchRegex },
        { telefone2: searchRegex }
      ];
    }

    // Paginação
    const page = parseInt(filters.page) || 1;
    const pageSize = parseInt(filters.pageSize) || 50;
    const skip = (page - 1) * pageSize;

    // Ordenação
    const sortBy = filters.sortBy || 'data';
    const order = filters.order === 'asc' ? 1 : -1;

    const [results, total] = await Promise.all([
      Appointment.find(filter)
        .populate('entrevistador', 'name email matricula')
        .populate('cras', 'nome endereco')
        .sort({ [sortBy]: order })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Appointment.countDocuments(filter)
    ]);

    return {
      results,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * Atualiza agendamento
   */
  async updateAppointment(id, data, userId) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error('ID de agendamento inválido');
      error.statusCode = 400;
      throw error;
    }

    const appointment = await Appointment.findById(id);
    
    if (!appointment) {
      const error = new Error('Agendamento não encontrado');
      error.statusCode = 404;
      throw error;
    }

    // Atualizar campos permitidos
    const allowedFields = ['pessoa', 'cpf', 'telefone1', 'telefone2', 'motivo', 'status', 'observacoes'];
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        appointment[field] = data[field];
      }
    });

    await appointment.save();

    const updated = await Appointment.findById(id)
      .populate('entrevistador', 'name email matricula')
      .populate('cras', 'nome endereco telefone');

    // Log da ação
    await Log.create({
      user: userId,
      cras: appointment.cras,
      action: 'editar_agendamento',
      details: `Agendamento de ${appointment.pessoa} atualizado`
    });

    // Invalidar cache
    cache.invalidateAppointments(appointment.cras, appointment.entrevistador);

    return updated.toJSON();
  }

  /**
   * Deleta agendamento
   */
  async deleteAppointment(id, userId) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error('ID de agendamento inválido');
      error.statusCode = 400;
      throw error;
    }

    const appointment = await Appointment.findById(id);
    
    if (!appointment) {
      const error = new Error('Agendamento não encontrado');
      error.statusCode = 404;
      throw error;
    }

    const { pessoa, cras, entrevistador, data } = appointment;

    await Appointment.findByIdAndDelete(id);

    // Log da ação
    await Log.create({
      user: userId,
      cras: cras,
      action: 'deletar_agendamento',
      details: `Agendamento de ${pessoa} em ${formatDateTime(data)} foi deletado`
    });

    // Invalidar cache
    cache.invalidateAppointments(cras, entrevistador);

    return { message: 'Agendamento deletado com sucesso' };
  }
}

export default new AppointmentService();
