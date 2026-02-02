/**
 * useAppointments - Composable para gerenciamento de agendamentos
 * 
 * Abstrai lógica de agendamentos em um composable reutilizável
 * Separação de responsabilidades e facilita testes
 * 
 * @module composables/useAppointments
 */

import { useState, useCallback } from 'react';
import { useApi } from './useApi';
import { validarCPF, validarTelefone } from '../utils/agendamentoUtils';

export const useAppointments = () => {
  const api = useApi();
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  /**
   * Buscar agendamentos
   */
  const fetchAppointments = useCallback(async (filters = {}) => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== '') {
        params.append(key, value);
      }
    });

    const response = await api.get(`/appointments?${params}`);
    setAppointments(response.data.results || response.data);
    return response.data;
  }, [api]);

  /**
   * Buscar agendamento por ID
   */
  const fetchAppointmentById = useCallback(async (id) => {
    const response = await api.get(`/appointments/${id}`);
    setSelectedAppointment(response.data);
    return response.data;
  }, [api]);

  /**
   * Criar agendamento
   */
  const createAppointment = useCallback(async (data) => {
    // Validações client-side
    const validation = validateAppointmentData(data);
    if (!validation.isValid) {
      throw new Error(validation.errors[0].message);
    }

    const response = await api.post('/appointments', data);
    
    // Atualizar lista local
    setAppointments(prev => [...prev, response.data]);
    
    return response.data;
  }, [api]);

  /**
   * Atualizar agendamento
   */
  const updateAppointment = useCallback(async (id, data) => {
    const validation = validateAppointmentData(data);
    if (!validation.isValid) {
      throw new Error(validation.errors[0].message);
    }

    const response = await api.put(`/appointments/${id}`, data);
    
    // Atualizar lista local
    setAppointments(prev => 
      prev.map(apt => apt._id === id ? response.data : apt)
    );
    
    return response.data;
  }, [api]);

  /**
   * Deletar agendamento
   */
  const deleteAppointment = useCallback(async (id) => {
    await api.delete(`/appointments/${id}`);
    
    // Remover da lista local
    setAppointments(prev => prev.filter(apt => apt._id !== id));
  }, [api]);

  /**
   * Atualizar status
   */
  const updateStatus = useCallback(async (id, status) => {
    const response = await api.patch(`/appointments/${id}/status`, { status });
    
    // Atualizar lista local
    setAppointments(prev => 
      prev.map(apt => apt._id === id ? { ...apt, status } : apt)
    );
    
    return response.data;
  }, [api]);

  /**
   * Validação de dados de agendamento
   */
  const validateAppointmentData = (data) => {
    const errors = [];

    if (!data.pessoa?.trim()) {
      errors.push({ field: 'pessoa', message: 'Nome da pessoa é obrigatório' });
    }

    if (!data.cpf) {
      errors.push({ field: 'cpf', message: 'CPF é obrigatório' });
    } else {
      const cpfValidation = validarCPF(data.cpf);
      if (!cpfValidation.valido) {
        errors.push({ field: 'cpf', message: cpfValidation.mensagem });
      }
    }

    if (!data.telefone1) {
      errors.push({ field: 'telefone1', message: 'Telefone é obrigatório' });
    } else {
      const telefoneValidation = validarTelefone(data.telefone1);
      if (!telefoneValidation.valido) {
        errors.push({ field: 'telefone1', message: telefoneValidation.mensagem });
      }
    }

    if (data.telefone2) {
      const telefone2Validation = validarTelefone(data.telefone2);
      if (!telefone2Validation.valido) {
        errors.push({ field: 'telefone2', message: telefone2Validation.mensagem });
      }
    }

    if (!data.motivo?.trim()) {
      errors.push({ field: 'motivo', message: 'Motivo é obrigatório' });
    }

    if (!data.data) {
      errors.push({ field: 'data', message: 'Data é obrigatória' });
    }

    if (!data.entrevistador) {
      errors.push({ field: 'entrevistador', message: 'Entrevistador é obrigatório' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  return {
    // Estado
    appointments,
    selectedAppointment,
    loading: api.loading,
    error: api.error,
    
    // Métodos
    fetchAppointments,
    fetchAppointmentById,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    updateStatus,
    validateAppointmentData,
    
    // Controle
    clearError: api.clearError,
    setAppointments
  };
};
