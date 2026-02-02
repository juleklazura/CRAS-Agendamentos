/**
 * useCras - Composable para gerenciamento de CRAS
 * 
 * @module composables/useCras
 */

import { useState, useCallback } from 'react';
import { useApi } from './useApi';

export const useCras = () => {
  const api = useApi();
  const [crasList, setCrasList] = useState([]);
  const [selectedCras, setSelectedCras] = useState(null);

  /**
   * Buscar todos os CRAS
   */
  const fetchCras = useCallback(async () => {
    const response = await api.get('/cras');
    setCrasList(response.data);
    return response.data;
  }, [api]);

  /**
   * Buscar CRAS por ID
   */
  const fetchCrasById = useCallback(async (id) => {
    const response = await api.get(`/cras/${id}`);
    setSelectedCras(response.data);
    return response.data;
  }, [api]);

  /**
   * Criar CRAS
   */
  const createCras = useCallback(async (data) => {
    const response = await api.post('/cras', data);
    setCrasList(prev => [...prev, response.data]);
    return response.data;
  }, [api]);

  /**
   * Atualizar CRAS
   */
  const updateCras = useCallback(async (id, data) => {
    const response = await api.put(`/cras/${id}`, data);
    setCrasList(prev => 
      prev.map(cras => cras._id === id ? response.data : cras)
    );
    return response.data;
  }, [api]);

  /**
   * Deletar CRAS
   */
  const deleteCras = useCallback(async (id) => {
    await api.delete(`/cras/${id}`);
    setCrasList(prev => prev.filter(cras => cras._id !== id));
  }, [api]);

  return {
    crasList,
    selectedCras,
    loading: api.loading,
    error: api.error,
    fetchCras,
    fetchCrasById,
    createCras,
    updateCras,
    deleteCras,
    clearError: api.clearError,
    setCrasList
  };
};
