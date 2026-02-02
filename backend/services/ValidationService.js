/**
 * ValidationService - Serviço especializado em validações
 * 
 * Centraliza todas as regras de validação do sistema
 * 
 * @module services/ValidationService
 */

import { validarCPF, validarTelefone } from '../utils/validators.js';
import { isWeekend } from '../utils/timezone.js';
import mongoose from 'mongoose';

class ValidationService {
  /**
   * Valida dados de agendamento
   */
  validateAppointmentData(data) {
    const errors = [];

    // Validar entrevistador
    if (!data.entrevistador) {
      errors.push({ field: 'entrevistador', message: 'Entrevistador é obrigatório' });
    } else if (!mongoose.Types.ObjectId.isValid(data.entrevistador)) {
      errors.push({ field: 'entrevistador', message: 'ID do entrevistador é inválido' });
    }

    // Validar CRAS
    if (!data.cras) {
      errors.push({ field: 'cras', message: 'CRAS é obrigatório' });
    } else if (!mongoose.Types.ObjectId.isValid(data.cras)) {
      errors.push({ field: 'cras', message: 'ID do CRAS é inválido' });
    }

    // Validar pessoa
    if (!data.pessoa?.trim()) {
      errors.push({ field: 'pessoa', message: 'Nome da pessoa é obrigatório' });
    }

    // Validar CPF
    if (!data.cpf) {
      errors.push({ field: 'cpf', message: 'CPF é obrigatório' });
    } else if (!validarCPF(data.cpf)) {
      errors.push({ field: 'cpf', message: 'CPF inválido. Verifique os dígitos e tente novamente.' });
    }

    // Validar telefone principal
    if (!data.telefone1) {
      errors.push({ field: 'telefone1', message: 'Telefone é obrigatório' });
    } else if (!validarTelefone(data.telefone1)) {
      errors.push({ field: 'telefone1', message: 'Telefone inválido. Use o formato (XX) XXXXX-XXXX' });
    }

    // Validar telefone secundário
    if (data.telefone2 && !validarTelefone(data.telefone2)) {
      errors.push({ field: 'telefone2', message: 'Telefone 2 inválido. Use o formato (XX) XXXXX-XXXX' });
    }

    // Validar motivo
    if (!data.motivo?.trim()) {
      errors.push({ field: 'motivo', message: 'Motivo é obrigatório' });
    }

    // Validar data
    if (!data.data) {
      errors.push({ field: 'data', message: 'Data é obrigatória' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida regras de negócio de agendamento
   */
  validateAppointmentBusinessRules(data) {
    const errors = [];

    // Não permitir agendamento em fins de semana
    if (data.data && isWeekend(data.data)) {
      errors.push({ 
        field: 'data', 
        message: 'Não é permitido agendar para sábado ou domingo.' 
      });
    }

    // Adicionar outras regras de negócio aqui
    // Exemplo: validar horário de funcionamento, limites de agendamentos, etc.

    return {
      isValid: errors.length === 0,
      errors
    };
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
    } else if (!this.isValidEmail(data.email)) {
      errors.push({ field: 'email', message: 'Email inválido' });
    }

    if (!data.matricula?.trim()) {
      errors.push({ field: 'matricula', message: 'Matrícula é obrigatória' });
    }

    if (!data.role) {
      errors.push({ field: 'role', message: 'Role é obrigatório' });
    } else if (!['admin', 'recepcao', 'entrevistador'].includes(data.role)) {
      errors.push({ field: 'role', message: 'Role inválido' });
    }

    if (!data.cras) {
      errors.push({ field: 'cras', message: 'CRAS é obrigatório' });
    } else if (!mongoose.Types.ObjectId.isValid(data.cras)) {
      errors.push({ field: 'cras', message: 'ID do CRAS é inválido' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida formato de email
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Valida ObjectId do MongoDB
   */
  isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
  }

  /**
   * Valida string de busca
   */
  validateSearchString(search) {
    if (!search) return { isValid: true };
    
    if (search.length > 100) {
      return {
        isValid: false,
        error: 'String de busca muito longa (máximo 100 caracteres)'
      };
    }

    return { isValid: true };
  }
}

export default new ValidationService();
