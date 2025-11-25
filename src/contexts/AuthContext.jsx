/**
 * Contexto de Autenticação Seguro
 * - Não armazena token ou dados sensíveis no localStorage
 * - Busca dados do usuário do backend quando necessário
 * - Token gerenciado via httpOnly cookies
 */

import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Buscar dados do usuário atual (autenticado via cookie)
  const fetchCurrentUser = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      // 🔒 SEGURANÇA: Não logar erros que podem expor dados
      // Silenciar completamente erros 401 esperados (marcados pelo interceptor)
      if (error.isSilent401) {
        // Erro esperado - não logar nada
      } else if (error.response?.status !== 401) {
        // Logar apenas em desenvolvimento e sem dados sensíveis
        if (import.meta.env.MODE === 'development') {
          console.error('Erro ao buscar usuário:', {
            status: error.response?.status,
            message: error.message
          });
        }
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar usuário ao montar o componente (exceto na página de login)
  useEffect(() => {
    // Não fazer checkAuth se estiver na página de login
    const isLoginPage = window.location.pathname === '/login';
    
    if (!isLoginPage) {
      fetchCurrentUser();
    } else {
      // Se estiver no login, apenas marcar como não-loading
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Executar apenas uma vez ao montar

  // Login - agora usa cookies httpOnly
  const login = useCallback(async (matricula, password) => {
    try {
      const response = await api.post('/auth/login', { matricula, password });
      
      // 🔒 SEGURANÇA: Token é setado automaticamente no cookie httpOnly pelo backend
      // Nunca armazenar ou logar tokens!
      setUser(response.data.user);
      
      return { success: true, user: response.data.user };
    } catch (error) {
      // 🔒 SEGURANÇA: Não logar dados completos de erro (podem conter info sensível)
      if (import.meta.env.MODE === 'development') {
        console.error('Erro no login:', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message
        });
      }
      return { 
        success: false, 
        message: error.response?.data?.message || 'Erro ao fazer login' 
      };
    }
  }, []);

  // Logout - limpa cookie no backend
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // 🔒 SEGURANÇA: Não logar erros de logout (podem conter info de sessão)
      // Silenciar erros 401 esperados e outros erros
      if (import.meta.env.MODE === 'development' && !error.isSilent401) {
        console.error('Erro no logout:', {
          status: error.response?.status,
          message: error.message
        });
      }
    } finally {
      setUser(null);
      localStorage.clear(); // Limpar qualquer dado residual
      navigate('/login');
    }
  }, [navigate]);

  // Verificar se usuário está autenticado
  const isAuthenticated = useMemo(() => !!user, [user]);

  // Verificar se usuário tem permissão específica
  const hasRole = useCallback((roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user]);

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    refetch: fetchCurrentUser,
    hasRole
  }), [user, loading, isAuthenticated, login, logout, fetchCurrentUser, hasRole]);

  // Mostrar loading enquanto verifica autenticação inicial
  if (loading) {
    return (
      <AuthContext.Provider value={value}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
