/**
 * DTOs (Data Transfer Objects) - Objetos para transferência de dados
 * 
 * Define estruturas de dados claras para comunicação entre camadas
 * Facilita validação e documentação da API
 * 
 * @module dto/AppointmentDTO
 */

/**
 * DTO para criação de agendamento
 */
export class CreateAppointmentDTO {
  constructor(data) {
    this.entrevistador = data.entrevistador;
    this.cras = data.cras;
    this.pessoa = data.pessoa;
    this.cpf = data.cpf;
    this.telefone1 = data.telefone1;
    this.telefone2 = data.telefone2 || null;
    this.motivo = data.motivo;
    this.data = data.data;
    this.status = data.status || 'agendado';
    this.observacoes = data.observacoes || '';
  }

  /**
   * Valida estrutura do DTO
   */
  validate() {
    const errors = [];

    const requiredFields = [
      'entrevistador', 'cras', 'pessoa', 'cpf', 
      'telefone1', 'motivo', 'data'
    ];

    requiredFields.forEach(field => {
      if (!this[field]) {
        errors.push({
          field,
          message: `${field} é obrigatório`
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Converte para objeto plano
   */
  toObject() {
    return {
      entrevistador: this.entrevistador,
      cras: this.cras,
      pessoa: this.pessoa,
      cpf: this.cpf,
      telefone1: this.telefone1,
      telefone2: this.telefone2,
      motivo: this.motivo,
      data: this.data,
      status: this.status,
      observacoes: this.observacoes
    };
  }
}

/**
 * DTO para atualização de agendamento
 */
export class UpdateAppointmentDTO {
  constructor(data) {
    // Apenas campos que podem ser atualizados
    if (data.pessoa !== undefined) this.pessoa = data.pessoa;
    if (data.cpf !== undefined) this.cpf = data.cpf;
    if (data.telefone1 !== undefined) this.telefone1 = data.telefone1;
    if (data.telefone2 !== undefined) this.telefone2 = data.telefone2;
    if (data.motivo !== undefined) this.motivo = data.motivo;
    if (data.data !== undefined) this.data = data.data;
    if (data.status !== undefined) this.status = data.status;
    if (data.observacoes !== undefined) this.observacoes = data.observacoes;
    if (data.entrevistador !== undefined) this.entrevistador = data.entrevistador;
  }

  toObject() {
    const obj = {};
    
    Object.keys(this).forEach(key => {
      if (this[key] !== undefined) {
        obj[key] = this[key];
      }
    });

    return obj;
  }
}

/**
 * DTO para resposta de agendamento
 */
export class AppointmentResponseDTO {
  constructor(appointment) {
    this._id = appointment._id;
    this.entrevistador = this._formatUser(appointment.entrevistador);
    this.cras = this._formatCras(appointment.cras);
    this.pessoa = appointment.pessoa;
    this.cpf = appointment.cpf;
    this.telefone1 = appointment.telefone1;
    this.telefone2 = appointment.telefone2;
    this.motivo = appointment.motivo;
    this.data = appointment.data;
    this.status = appointment.status;
    this.observacoes = appointment.observacoes;
    this.createdBy = this._formatUser(appointment.createdBy);
    this.createdAt = appointment.createdAt;
    this.updatedAt = appointment.updatedAt;
  }

  _formatUser(user) {
    if (!user) return null;
    
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      matricula: user.matricula
    };
  }

  _formatCras(cras) {
    if (!cras) return null;

    return {
      _id: cras._id,
      nome: cras.nome,
      endereco: cras.endereco,
      telefone: cras.telefone
    };
  }

  toJSON() {
    return { ...this };
  }
}

/**
 * DTO para filtros de busca
 */
export class AppointmentFilterDTO {
  constructor(queryParams) {
    this.cras = queryParams.cras || null;
    this.entrevistador = queryParams.entrevistador || null;
    this.status = queryParams.status || null;
    this.search = queryParams.search || null;
    this.page = parseInt(queryParams.page) || 1;
    this.pageSize = parseInt(queryParams.pageSize) || 10;
    this.sortBy = queryParams.sortBy || 'data';
    this.order = queryParams.order || 'asc';
  }

  toObject() {
    const obj = {};

    Object.keys(this).forEach(key => {
      if (this[key] !== null && this[key] !== undefined) {
        obj[key] = this[key];
      }
    });

    return obj;
  }
}
