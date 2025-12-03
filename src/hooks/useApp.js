// Hooks personalizados para integração com o contexto global da aplicação
// Facilitam acesso aos dados do usuário, autenticação e notificações
// Abstraem a complexidade do contexto e fornecem APIs específicas
import { useContext, useCallback, useMemo } from 'react';
import AppContext from '../contexts/AppContext';

/**
 * Hook principal para acessar o contexto da aplicação
 * Garante que seja usado apenas dentro do AppProvider
 * Lança erro se usado fora do provedor de contexto
 * @returns {Object} Contexto completo da aplicação
 */
export const useApp = () => {
  const context = useContext(AppContext);
  
  if (!context) {
    throw new Error('useApp deve ser usado dentro de um AppProvider');
  }
  
  return context;
};

/**
 * Hook especializado para controle de autenticação e autorização
 * Fornece funções otimizadas para verificar permissões baseadas em roles
 * Memoiza valores para evitar re-renders desnecessários
 * @returns {Object} API completa de autenticação e autorização
 */
export const useAuth = () => {
  const { user, token, login, logout, isAuthenticated } = useApp();
  
  /**
   * Verifica se usuário possui determinado(s) role(s)
   * Aceita string única ou array de roles
   * @param {string|Array} roles - Role(s) para verificar
   * @returns {boolean} True se usuário tem o(s) role(s)
   */
  const hasRole = useCallback((roles) => {
    if (!user) return false;
    if (typeof roles === 'string') return user.role === roles;
    return roles.includes(user.role);
  }, [user]);
  
  /**
   * Verifica se usuário pode acessar determinada funcionalidade
   * Combina autenticação com verificação de roles
   * @param {string|Array} allowedRoles - Roles permitidos (opcional)
   * @returns {boolean} True se usuário pode acessar
   */
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

/**
 * Hook especializado para sistema de notificações
 * Abstrai funções de notificação do contexto principal
 * Otimizado para uso em componentes que só precisam de notificações
 * @returns {Object} API completa de notificações
 */
export const useNotifications = () => {
  const { 
    notification, 
    showNotification, 
    hideNotification, 
    showSuccess, 
    showError 
  } = useApp();
  
  return useMemo(() => ({
    notification,      // Estado atual da notificação
    showNotification,  // Função genérica para mostrar notificação
    hideNotification,  // Função para ocultar notificação
    showSuccess,       // Atalho para notificação de sucesso
    showError         // Atalho para notificação de erro
  }), [notification, showNotification, hideNotification, showSuccess, showError]);
};
