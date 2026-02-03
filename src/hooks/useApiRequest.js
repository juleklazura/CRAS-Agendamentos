/**
 * useApiRequest - Hook para requisições HTTP
 * 
 * Gerencia loading, erro e dados de requisições API
 * 
 * @module hooks/useApiRequest
 */

import { useState, useCallback } from 'react';
import { useApp } from './useApp';
import logger from '../utils/logger';

export default function useApiRequest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const { showNotification } = useApp();

  /**
   * Executa requisição com tratamento de erros
   */
  const execute = useCallback(async (requestFn, options = {}) => {
    const {
      successMessage,
      errorMessage = 'Erro ao processar requisição',
      showSuccess = false,
      showError = true,
      onSuccess,
      onError
    } = options;

    setLoading(true);
    setError(null);

    try {
      const startTime = performance.now();
      const result = await requestFn();
      const duration = performance.now() - startTime;

      // Log de performance
      logger.logApiCall(requestFn.name || 'API Request', duration);

      setData(result);

      if (showSuccess && successMessage) {
        showNotification(successMessage, 'success');
      }

      if (onSuccess) {
        onSuccess(result);
      }

      return result;

    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || errorMessage;
      setError(errorMsg);

      if (showError) {
        showNotification(errorMsg, 'error');
      }

      if (onError) {
        onError(err);
      }

      throw err;

    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  /**
   * Reset do estado
   */
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    loading,
    error,
    data,
    execute,
    reset
  };
}
