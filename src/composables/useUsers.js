/**
 * useUsers - Composable para gerenciamento de usuários
 * 
 * @module composables/useUsers
 */

import { useState, useCallback } from 'react';
import { useApi } from './useApi';

export const useUsers = () => {
  const api = useApi();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  /**
   * Buscar usuários
   */
  const fetchUsers = useCallback(async (filters = {}) => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== '') {
        params.append(key, value);
      }
    });

    const response = await api.get(`/users?${params}`);
    setUsers(response.data);
    return response.data;
  }, [api]);

  /**
   * Buscar usuário por ID
   */
  const fetchUserById = useCallback(async (id) => {
    const response = await api.get(`/users/${id}`);
    setSelectedUser(response.data);
    return response.data;
  }, [api]);

  /**
   * Criar usuário
   */
  const createUser = useCallback(async (data) => {
    const response = await api.post('/users', data);
    setUsers(prev => [...prev, response.data]);
    return response.data;
  }, [api]);

  /**
   * Atualizar usuário
   */
  const updateUser = useCallback(async (id, data) => {
    const response = await api.put(`/users/${id}`, data);
    setUsers(prev => 
      prev.map(user => user._id === id ? response.data : user)
    );
    return response.data;
  }, [api]);

  /**
   * Deletar usuário
   */
  const deleteUser = useCallback(async (id) => {
    await api.delete(`/users/${id}`);
    setUsers(prev => prev.filter(user => user._id !== id));
  }, [api]);

  /**
   * Buscar entrevistadores por CRAS
   */
  const fetchEntrevistadoresByCras = useCallback(async (crasId) => {
    const response = await api.get(`/users?cras=${crasId}&role=entrevistador`);
    return response.data;
  }, [api]);

  return {
    users,
    selectedUser,
    loading: api.loading,
    error: api.error,
    fetchUsers,
    fetchUserById,
    createUser,
    updateUser,
    deleteUser,
    fetchEntrevistadoresByCras,
    clearError: api.clearError,
    setUsers
  };
};
