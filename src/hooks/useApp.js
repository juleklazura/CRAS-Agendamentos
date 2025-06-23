import { useContext, useCallback, useMemo } from 'react';
import AppContext from '../contexts/AppContext';

// Hook personalizado para usar o contexto
export const useApp = () => {
  const context = useContext(AppContext);
  
  if (!context) {
    throw new Error('useApp deve ser usado dentro de um AppProvider');
  }
  
  return context;
};

// Hook para controle de acesso baseado em roles
export const useAuth = () => {
  const { user, token, login, logout, isAuthenticated } = useApp();
  
  const hasRole = useCallback((roles) => {
    if (!user) return false;
    if (typeof roles === 'string') return user.role === roles;
    return roles.includes(user.role);
  }, [user]);
  
  const canAccess = useCallback((allowedRoles) => {
    if (!allowedRoles) return isAuthenticated;
    return isAuthenticated && hasRole(allowedRoles);
  }, [isAuthenticated, hasRole]);
  
  return useMemo(() => ({
    user,
    token,
    isAuthenticated,
    login,
    logout,
    hasRole,
    canAccess,
    userRole: user?.role,
    userName: user?.name,
    userCras: user?.cras
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
