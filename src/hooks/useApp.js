// Hooks personalizados para integração com o contexto global da aplicação
// Facilitam acesso aos dados do usuário, autenticação e notificações
import { useContext, useCallback, useMemo } from 'react';
import AppContext from '../contexts/AppContext';

// Hook principal para acessar o contexto da aplicação
// Garante que seja usado apenas dentro do AppProvider
export const useApp = () => {
  const context = useContext(AppContext);
  
  if (!context) {
    throw new Error('useApp deve ser usado dentro de um AppProvider');
  }
  
  return context;
};

// Hook especializado para controle de autenticação e autorização
// Fornece funções para verificar permissões baseadas em roles
export const useAuth = () => {
  const { user, token, login, logout, isAuthenticated } = useApp();
  
  // Função para verificar se usuário tem determinado(s) role(s)
  const hasRole = useCallback((roles) => {
    if (!user) return false;
    if (typeof roles === 'string') return user.role === roles;
    return roles.includes(user.role);
  }, [user]);
  
  // Função para verificar se usuário pode acessar determinada funcionalidade
  const canAccess = useCallback((allowedRoles) => {
    if (!allowedRoles) return isAuthenticated;
    return isAuthenticated && hasRole(allowedRoles);
  }, [isAuthenticated, hasRole]);
  
  // Retorna dados memoizados para evitar re-renders desnecessários
  return useMemo(() => ({
    user,
    token,
    isAuthenticated,
    login,
    logout,
    hasRole,
    canAccess,
    userRole: user?.role,     // Atalho para o role do usuário
    userName: user?.name,     // Atalho para o nome do usuário
    userCras: user?.cras      // Atalho para o CRAS do usuário
  }), [user, token, isAuthenticated, login, logout, hasRole, canAccess]);
};

// Hook para notificações
export const useNotifications = () => {
  const { 
    notification, 
    showNotification, 
    hideNotification, 
    showSuccess, 
    showError 
  } = useApp();
  
  return useMemo(() => ({
    notification,
    showNotification,
    hideNotification,
    showSuccess,
    showError
  }), [notification, showNotification, hideNotification, showSuccess, showError]);
};
