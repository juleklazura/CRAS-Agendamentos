/**
 * AppointmentRepository - Camada de acesso a dados
 * 
 * Implementa Repository Pattern para abstrair acesso ao banco de dados
 * Centraliza queries e facilita testes unitários
 * 
 * @module repositories/AppointmentRepository
 */

import Appointment from '../models/Appointment.js';
import { parseDate } from '../utils/timezone.js';

class AppointmentRepository {
  /**
   * Busca agendamento por ID
   */
  async findById(id, populate = true) {
    let query = Appointment.findById(id);
    
    if (populate) {
      query = query
        .populate('entrevistador', 'name email matricula')
        .populate('cras', 'nome endereco telefone')
        .populate('createdBy', 'name matricula');
    }
    
    return query.exec();
  }

  /**
   * Busca agendamentos com filtros
   */
  async find(filter = {}, options = {}) {
    const {
      sort = { data: 1 },
      limit = null,
      skip = 0,
      populate = true
    } = options;

    let query = Appointment.find(filter);

    if (populate) {
      query = query
        .populate('entrevistador', 'name email matricula')
        .populate('cras', 'nome endereco telefone')
        .populate('createdBy', 'name matricula');
    }

    query = query.sort(sort);

    if (skip > 0) query = query.skip(skip);
    if (limit) query = query.limit(limit);

    return query.exec();
  }

  /**
   * Conta documentos que atendem ao filtro
   */
  async count(filter = {}) {
    return Appointment.countDocuments(filter);
  }

  /**
   * Cria novo agendamento
   */
  async create(data) {
    const appointment = new Appointment(data);
    return appointment.save();
  }

  /**
   * Atualiza agendamento
   */
  async update(id, data) {
    return Appointment.findByIdAndUpdate(
      id,
      data,
      { new: true, runValidators: true }
    );
  }

  /**
   * Remove agendamento
   */
  async delete(id) {
    return Appointment.findByIdAndDelete(id);
  }

  /**
   * Busca agendamentos por entrevistador
   */
  async findByEntrevistador(entrevistadorId, filters = {}) {
    return this.find({ 
      entrevistador: entrevistadorId, 
      ...filters 
    });
  }

  /**
   * Busca agendamentos por CRAS
   */
  async findByCras(crasId, filters = {}) {
    return this.find({ 
      cras: crasId, 
      ...filters 
    });
  }

  /**
   * Busca agendamentos em um intervalo de datas
   */
  async findByDateRange(startDate, endDate, filters = {}) {
    return this.find({
      data: {
        $gte: parseDate(startDate),
        $lte: parseDate(endDate)
      },
      ...filters
    });
  }

  /**
   * Busca agendamento específico por entrevistador e data
   */
  async findByEntrevistadorAndDate(entrevistadorId, data) {
    return Appointment.findOne({
      entrevistador: entrevistadorId,
      data: parseDate(data)
    });
  }

  /**
   * Busca agendamentos por CPF
   */
  async findByCpf(cpf, filters = {}) {
    return this.find({ cpf, ...filters });
  }

  /**
   * Busca agendamentos por status
   */
  async findByStatus(status, filters = {}) {
    return this.find({ status, ...filters });
  }

  /**
   * Busca agendamentos com pesquisa de texto
   */
  async search(searchTerm, filters = {}) {
    const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    return this.find({
      $or: [
        { pessoa: { $regex: escapedSearch, $options: 'i' } },
        { cpf: { $regex: escapedSearch, $options: 'i' } },
        { telefone1: { $regex: escapedSearch, $options: 'i' } },
        { telefone2: { $regex: escapedSearch, $options: 'i' } }
      ],
      ...filters
    });
  }

  /**
   * Atualiza múltiplos agendamentos
   */
  async updateMany(filter, update) {
    return Appointment.updateMany(filter, update);
  }

  /**
   * Remove múltiplos agendamentos
   */
  async deleteMany(filter) {
    return Appointment.deleteMany(filter);
  }

  /**
   * Verifica se existe agendamento no horário
   */
  async existsByEntrevistadorAndDate(entrevistadorId, data, excludeId = null) {
    const filter = {
      entrevistador: entrevistadorId,
      data: parseDate(data)
    };

    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    const count = await this.count(filter);
    return count > 0;
  }
}

export default new AppointmentRepository();
