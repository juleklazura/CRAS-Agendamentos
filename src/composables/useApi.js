/**
 * useApi - Composable para requisições HTTP
 * 
 * Abstrai lógica de requisições com tratamento de estados
 * Padrão composable (Vue/React) para reutilização
 * 
 * @module composables/useApi
 */

import { useState, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './useAuth';

/**
 * Composable para gerenciar requisições de API
 */
export const useApi = () => {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Executa requisição com tratamento automático de estados
   */
  const execute = useCallback(async (requestFn, options = {}) => {
    const { 
      onSuccess = null, 
      onError = null,
      showLoading = true 
    } = options;

    if (showLoading) setLoading(true);
    setError(null);

    try {
      const result = await requestFn();
      
      if (onSuccess) onSuccess(result);
      
      return result;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Erro ao processar requisição';
      setError(errorMessage);

      // Logout automático se token inválido
      if (err.response?.status === 401) {
        logout();
      }

      if (onError) onError(err);
      
      throw err;
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [logout]);

  /**
   * Limpa estado de erro
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Helper para requisições GET
   */
  const get = useCallback((url, options) => {
    return execute(() => api.get(url), options);
  }, [execute]);

  /**
   * Helper para requisições POST
   */
  const post = useCallback((url, data, options) => {
    return execute(() => api.post(url, data), options);
  }, [execute]);

  /**
   * Helper para requisições PUT
   */
  const put = useCallback((url, data, options) => {
    return execute(() => api.put(url, data), options);
  }, [execute]);

  /**
   * Helper para requisições PATCH
   */
  const patch = useCallback((url, data, options) => {
    return execute(() => api.patch(url, data), options);
  }, [execute]);

  /**
   * Helper para requisições DELETE
   */
  const del = useCallback((url, options) => {
    return execute(() => api.delete(url), options);
  }, [execute]);

  return {
    loading,
    error,
    execute,
    clearError,
    get,
    post,
    put,
    patch,
    delete: del
  };
};
