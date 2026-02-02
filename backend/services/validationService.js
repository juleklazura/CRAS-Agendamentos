/**
 * ValidationService - Camada de validação reutilizável
 * 
 * Centraliza todas as validações de dados
 * 
 * @module services/validationService
 */

import mongoose from 'mongoose';
import { validarCPF, validarTelefone } from '../utils/validators.js';

class ValidationService {
  /**
   * Valida dados de agendamento
   */
  validateAppointmentData(data) {
    const errors = [];

    if (!data.entrevistador) {
      errors.push({ field: 'entrevistador', message: 'Entrevistador é obrigatório' });
    } else if (!mongoose.Types.ObjectId.isValid(data.entrevistador)) {
      errors.push({ field: 'entrevistador', message: 'ID do entrevistador é inválido' });
    }

    if (!data.cras) {
      errors.push({ field: 'cras', message: 'CRAS é obrigatório' });
    } else if (!mongoose.Types.ObjectId.isValid(data.cras)) {
      errors.push({ field: 'cras', message: 'ID do CRAS é inválido' });
    }

    if (!data.pessoa?.trim()) {
      errors.push({ field: 'pessoa', message: 'Nome da pessoa é obrigatório' });
    }

    if (!data.cpf) {
      errors.push({ field: 'cpf', message: 'CPF é obrigatório' });
    } else if (!validarCPF(data.cpf)) {
      errors.push({ field: 'cpf', message: 'CPF inválido. Verifique os dígitos e tente novamente.' });
    }

    if (!data.telefone1) {
      errors.push({ field: 'telefone1', message: 'Telefone é obrigatório' });
    } else if (!validarTelefone(data.telefone1)) {
      errors.push({ field: 'telefone1', message: 'Telefone inválido. Use o formato (XX) XXXXX-XXXX' });
    }

    if (data.telefone2 && !validarTelefone(data.telefone2)) {
      errors.push({ field: 'telefone2', message: 'Telefone 2 inválido. Use o formato (XX) XXXXX-XXXX' });
    }

    if (!data.motivo) {
      errors.push({ field: 'motivo', message: 'Motivo é obrigatório' });
    }

    if (!data.data) {
      errors.push({ field: 'data', message: 'Data é obrigatória' });
    }

    if (errors.length > 0) {
      const error = new Error('Dados de agendamento inválidos');
      error.statusCode = 400;
      error.validationErrors = errors;
      throw error;
    }

    return true;
  }

  /**
   * Valida dados de usuário
   */
  validateUserData(data) {
    const errors = [];

    if (!data.name?.trim()) {
      errors.push({ field: 'name', message: 'Nome é obrigatório' });
    }

    if (!data.email?.trim()) {
      errors.push({ field: 'email', message: 'Email é obrigatório' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push({ field: 'email', message: 'Email inválido' });
    }

    if (!data.matricula?.trim()) {
      errors.push({ field: 'matricula', message: 'Matrícula é obrigatória' });
    }

    if (data.cras && !mongoose.Types.ObjectId.isValid(data.cras)) {
      errors.push({ field: 'cras', message: 'ID do CRAS é inválido' });
    }

    if (errors.length > 0) {
      const error = new Error('Dados de usuário inválidos');
      error.statusCode = 400;
      error.validationErrors = errors;
      throw error;
    }

    return true;
  }

  /**
   * Valida ObjectId do MongoDB
   */
  validateObjectId(id, fieldName = 'ID') {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error(`${fieldName} inválido`);
      error.statusCode = 400;
      throw error;
    }
    return true;
  }
}

export default new ValidationService();
