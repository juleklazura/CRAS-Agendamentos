// Hook customizado para gerenciamento de agendamentos
// Centraliza toda a lógica de estado e operações de agendamentos

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { UPDATE_CONFIG, ERROR_MESSAGES } from '../constants/agendamentos';
import { isValidObjectId } from '../utils/formatters';

/**
 * Hook customizado para gerenciar estado e operações de agendamentos
 * @param {Object} user - Usuário autenticado
 * @returns {Object} Estado e métodos para manipular agendamentos
 */
export function useAgendamentos(user) {
  // Estados principais
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estados de filtros e paginação
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [orderBy, setOrderBy] = useState('data');
  const [order, setOrder] = useState('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50); // 🚀 Aumentado para 50 por página
  const [total, setTotal] = useState(0);
  
  // Refs para controle
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  
  // Debounce da busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, UPDATE_CONFIG.searchDebounceDelay);
    return () => clearTimeout(timer);
  }, [search]);
  
  // Cleanup do componente
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);
  
  /**
   * Busca agendamentos do backend com filtros
   */
  const fetchAgendamentos = useCallback(async () => {
    if (!user) return;
    
    // Cancela requisição anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    try {
      let url = '/appointments';
      const params = [];
      
      // Filtros por perfil
      if (user?.role === 'entrevistador') {
        params.push(`entrevistador=${user.id}`);
      } else if (user?.role === 'recepcao') {
        params.push(`cras=${user.cras}`);
      }
      
      // 🚀 OTIMIZAÇÃO: Paginação no servidor
      params.push(`page=${page}`);
      params.push(`pageSize=${rowsPerPage}`);
      
      // Parâmetros de busca e ordenação
      if (debouncedSearch) params.push(`search=${encodeURIComponent(debouncedSearch)}`);
      if (orderBy) params.push(`sortBy=${orderBy}`);
      if (order) params.push(`order=${order}`);
      
      if (params.length > 0) {
        url += '?' + params.join('&');
      }

      setLoading(true);
      
      const res = await api.get(url, {
        signal: abortControllerRef.current.signal
      });
      
      if (!isMountedRef.current) return;
      
      // 🚀 OTIMIZAÇÃO: Backend agora retorna dados paginados
      const data = res.data;
      setAgendamentos(data.results || []);
      setTotal(data.total || 0);
    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'CanceledError') {
        return;
      }
      
      if (!isMountedRef.current) return;
      
      setAgendamentos([]);
      setTotal(0);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [user, debouncedSearch, orderBy, order, page, rowsPerPage]);
  
  /**
   * Deleta um agendamento
   * @param {string} id - ID do agendamento
   * @param {Object} agendamento - Dados do agendamento para validação
   */
  const deleteAgendamento = async (id, agendamento) => {
    if (!isValidObjectId(id)) {
      setError(ERROR_MESSAGES.INVALID_ID);
      return false;
    }
    
    // Validação frontend (adicional à validação backend)
    if (user?.role === 'entrevistador') {
      if (agendamento.entrevistador?._id !== user.id) {
        setError(ERROR_MESSAGES.DELETE_PERMISSION);
        return false;
      }
    } else if (user?.role === 'recepcao') {
      if (agendamento.cras?._id !== user.cras) {
        setError(ERROR_MESSAGES.DELETE_CRAS_PERMISSION);
        return false;
      }
    }
    
    try {
      await api.delete(`/appointments/${id}`);
      setSuccess(ERROR_MESSAGES.DELETE_SUCCESS);
      await fetchAgendamentos();
      window.dispatchEvent(new CustomEvent('appointmentChanged', { detail: { action: 'delete' } }));
      return true;
    } catch (err) {
      if (err.response?.status === 403) {
        setError(`${ERROR_MESSAGES.ACCESS_DENIED}: ${err.response?.data?.message || ''}`);
      } else if (err.response?.status === 404) {
        setError(ERROR_MESSAGES.NOT_FOUND);
      } else if (err.response?.status === 400) {
        setError(`${ERROR_MESSAGES.INVALID_DATA}: ${err.response?.data?.message || ''}`);
      } else {
        setError(err.response?.data?.message || 'Erro ao excluir agendamento');
      }
      return false;
    }
  };
  
  /**
   * Gerencia ordenação
   */
  const handleSort = (campo) => {
    if (orderBy === campo) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setOrderBy(campo);
      setOrder('asc');
    }
    setPage(0);
  };
  
  /**
   * Limpa mensagens de erro/sucesso
   */
  const clearMessages = () => {
    setError('');
    setSuccess('');
  };
  
  // Efeito inicial de carregamento
  useEffect(() => {
    fetchAgendamentos();
  }, [fetchAgendamentos]);
  
  // Polling automático
  useEffect(() => {
    pollingIntervalRef.current = setInterval(() => {
      fetchAgendamentos();
    }, UPDATE_CONFIG.pollingInterval);
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [fetchAgendamentos]);
  
  // Atualiza ao voltar para a aba
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchAgendamentos();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchAgendamentos]);
  
  // Volta para primeira página ao mudar filtros
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, rowsPerPage]);
  
  return {
    // Estado
    agendamentos,
    loading,
    error,
    success,
    
    // Filtros e paginação
    search,
    setSearch,
    orderBy,
    order,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    total,
    
    // Métodos
    fetchAgendamentos,
    deleteAgendamento,
    handleSort,
    clearMessages,
    
    // 🚀 OTIMIZAÇÃO: Dados já vêm paginados do servidor
    paginatedAgendamentos: agendamentos
  };
}
