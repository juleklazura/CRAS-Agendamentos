import { useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { validarCPF, validarTelefone, mensagens } from '../utils/agendamentoUtils';

const API_BASE_URL = 'http://localhost:5000/api';

/**
 * 🎯 Hook personalizado para gerenciar agendamentos
 * Centraliza toda a lógica de CRUD de agendamentos para reutilização
 */
export const useAgendamento = () => {
  // Estados consolidados
  const [state, setState] = useState({
    agendamentos: [],
    loading: false,
    error: null,
    success: null
  });

  // Helper para atualizar estado de forma otimizada
  const updateState = useCallback((updates) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Função para fazer requisições com tratamento de erro padrão
  const makeRequest = useCallback(async (requestFn, successMessage = null) => {
    updateState({ loading: true, error: null, success: null });
    
    try {
      const result = await requestFn();
      updateState({ 
        loading: false, 
        success: successMessage,
        error: null 
      });
      return result;
    } catch (error) {
      const errorMessage = error.response?.data?.message || mensagens.erro.erroInesperado;
      updateState({ 
        loading: false, 
        error: errorMessage,
        success: null 
      });
      throw error;
    }
  }, [updateState]);

  // Buscar agendamentos com filtros otimizados
  const buscarAgendamentos = useCallback(async (filtros = {}) => {
    return makeRequest(async () => {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      // Adicionar filtros apenas se tiverem valor
      Object.entries(filtros).forEach(([key, value]) => {
        if (value && value !== '') {
          params.append(key, value);
        }
      });
      
      const response = await axios.get(`${API_BASE_URL}/appointments?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      updateState({ agendamentos: response.data });
      return response.data;
    });
  }, [makeRequest, updateState]);

  // Criar agendamento com validações completas
  const criarAgendamento = useCallback(async (dadosAgendamento) => {
    // Validações front-end otimizadas
    const validacoes = [
      () => {
        if (!dadosAgendamento.pessoa?.trim()) {
          throw new Error('Nome da pessoa é obrigatório');
        }
      },
      () => {
        const resultadoCPF = validarCPF(dadosAgendamento.cpf);
        if (!resultadoCPF.valido) {
          throw new Error(resultadoCPF.mensagem);
        }
      },
      () => {
        const resultadoTelefone = validarTelefone(dadosAgendamento.telefone1);
        if (!resultadoTelefone.valido) {
          throw new Error(resultadoTelefone.mensagem);
        }
      },
      () => {
        if (!dadosAgendamento.motivo) {
          throw new Error('Motivo do atendimento é obrigatório');
        }
      },
      () => {
        if (!dadosAgendamento.data) {
          throw new Error('Data e horário são obrigatórios');
        }
      }
    ];

    // Executar todas as validações
    try {
      validacoes.forEach(validacao => validacao());
    } catch (error) {
      updateState({ error: error.message });
      throw error;
    }

    return makeRequest(async () => {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/appointments`, dadosAgendamento, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Atualizar lista local de agendamentos
      updateState(prev => ({
        agendamentos: [...prev.agendamentos, response.data]
      }));
      
      return response.data;
    }, mensagens.sucesso.agendamentoCriado);
  }, [makeRequest, updateState]);

  // Editar agendamento
  const editarAgendamento = useCallback(async (id, dadosAtualizados) => {
    return makeRequest(async () => {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_BASE_URL}/appointments/${id}`, dadosAtualizados, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Atualizar lista local
      updateState(prev => ({
        agendamentos: prev.agendamentos.map(agendamento => 
          agendamento._id === id ? response.data : agendamento
        )
      }));
      
      return response.data;
    }, mensagens.sucesso.agendamentoEditado);
  }, [makeRequest, updateState]);

  // Cancelar agendamento
  const cancelarAgendamento = useCallback(async (id) => {
    return makeRequest(async () => {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/appointments/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Remover da lista local
      updateState(prev => ({
        agendamentos: prev.agendamentos.filter(agendamento => agendamento._id !== id)
      }));
      
      return true;
    }, mensagens.sucesso.agendamentoCancelado);
  }, [makeRequest, updateState]);

  // Confirmar presença
  const confirmarPresenca = useCallback(async (id) => {
    return makeRequest(async () => {
      const token = localStorage.getItem('token');
      const response = await axios.patch(`${API_BASE_URL}/appointments/${id}/confirm`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Atualizar lista local
      updateState(prev => ({
        agendamentos: prev.agendamentos.map(agendamento => 
          agendamento._id === id ? { ...agendamento, status: 'realizado' } : agendamento
        )
      }));
      
      return response.data;
    }, mensagens.sucesso.presencaConfirmada);
  }, [makeRequest, updateState]);

  // Limpar mensagens
  const limparMensagens = useCallback(() => {
    updateState({ error: null, success: null });
  }, [updateState]);

  // Valores memoizados para otimização
  const valores = useMemo(() => ({
    // Estados
    agendamentos: state.agendamentos,
    loading: state.loading,
    error: state.error,
    success: state.success,
    
    // Ações
    buscarAgendamentos,
    criarAgendamento,
    editarAgendamento,
    cancelarAgendamento,
    confirmarPresenca,
    limparMensagens,
    
    // Utilitários
    temAgendamentos: state.agendamentos.length > 0,
    totalAgendamentos: state.agendamentos.length
  }), [
    state,
    buscarAgendamentos,
    criarAgendamento,
    editarAgendamento,
    cancelarAgendamento,
    confirmarPresenca,
    limparMensagens
  ]);

  return valores;
};

/**
 * 🏥 Hook para gerenciar dados do CRAS
 */
export const useCras = () => {
  const [crasList, setCrasList] = useState([]);
  const [loading, setLoading] = useState(false);

  const buscarCras = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/cras`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCrasList(response.data);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar CRAS:', error);
      setCrasList([]);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return useMemo(() => ({
    crasList,
    loading,
    buscarCras,
    temCras: crasList.length > 0
  }), [crasList, loading, buscarCras]);
};

/**
 * 👥 Hook para gerenciar usuários/entrevistadores
 */
export const useUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);

  const buscarUsuarios = useCallback(async (filtros = {}) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      // Adicionar filtros
      Object.entries(filtros).forEach(([key, value]) => {
        if (value && value !== '') {
          params.append(key, value);
        }
      });
      
      const response = await axios.get(`${API_BASE_URL}/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUsuarios(response.data);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      setUsuarios([]);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Filtrar apenas entrevistadores de forma memoizada
  const entrevistadores = useMemo(() => 
    usuarios.filter(user => user.role === 'entrevistador'),
    [usuarios]
  );

  return useMemo(() => ({
    usuarios,
    entrevistadores,
    loading,
    buscarUsuarios,
    temEntrevistadores: entrevistadores.length > 0
  }), [usuarios, entrevistadores, loading, buscarUsuarios]);
};

export default useAgendamento;
