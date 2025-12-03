// Contexto global da aplicação para gerenciamento de estado compartilhado
// Centraliza informações do usuário, autenticação, notificações e cache
// 🔒 SEGURANÇA: Token não é mais armazenado no estado - gerenciado via httpOnly cookies
import React, { createContext, useCallback, useMemo, useReducer } from 'react';

// Estado inicial da aplicação com estrutura organizada
const initialState = {
  // Dados do usuário logado (apenas dados públicos, sem token)
  user: null,     // objeto com dados do usuário (nome, role, cras, etc)
  
  // Estados de carregamento global para UX
  loading: false,
  
  // Sistema de notificações globais
  notification: {
    open: false,
    message: '',
    severity: 'info' // 'success', 'error', 'warning', 'info'
  },
  
  // Cache de dados frequentemente acessados para otimizar performance
  cache: {
    cras: [],              // lista de CRAS cadastrados
    entrevistadores: [],   // lista de entrevistadores
    lastUpdate: null       // timestamp da última atualização do cache
  }
};

// Ações disponíveis para o reducer
// Padronizar nomes facilita manutenção e evita erros de digitacao
const ACTIONS = {
  SET_USER: 'SET_USER',                   // define dados do usuário logado
  SET_LOADING: 'SET_LOADING',             // controla estado de carregamento
  SHOW_NOTIFICATION: 'SHOW_NOTIFICATION', // exibe notificação
  HIDE_NOTIFICATION: 'HIDE_NOTIFICATION', // oculta notificação
  UPDATE_CACHE: 'UPDATE_CACHE',           // atualiza cache de dados
  CLEAR_CACHE: 'CLEAR_CACHE',             // limpa cache
  LOGOUT: 'LOGOUT'                        // faz logout completo
};

// Reducer para gerenciar estado global da aplicação
// Centraliza todas as mudanças de estado de forma previsível
const appReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_USER:
      // Define apenas dados do usuário (token via httpOnly cookie)
      return {
        ...state,
        user: action.payload.user
      };
      
    case ACTIONS.SET_LOADING:
      // Controla estado global de carregamento
      return {
        ...state,
        loading: action.payload
      };
      
    case ACTIONS.SHOW_NOTIFICATION:
      return {
        ...state,
        notification: {
          open: true,
          message: action.payload.message,
          severity: action.payload.severity || 'info'
        }
      };
      
    case ACTIONS.HIDE_NOTIFICATION:
      return {
        ...state,
        notification: {
          ...state.notification,
          open: false
        }
      };
      
    case ACTIONS.UPDATE_CACHE:
      return {
        ...state,
        cache: {
          ...state.cache,
          ...action.payload,
          lastUpdate: new Date().toISOString()
        }
      };
      
    case ACTIONS.CLEAR_CACHE:
      return {
        ...state,
        cache: {
          cras: [],
          entrevistadores: [],
          lastUpdate: null
        }
      };
      
    case ACTIONS.LOGOUT:
      return {
        ...initialState
      };
      
    default:
      return state;
  }
};

// Context
const AppContext = createContext(null);

// Provider otimizado
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // 🔒 SEGURANÇA: Não inicializar do localStorage (token agora via httpOnly cookie)
  // O AuthContext é responsável por buscar dados do usuário via API
  const initializeAuth = useCallback(() => {
    // Limpar qualquer token antigo do localStorage (migração de segurança)
    const oldToken = localStorage.getItem('token');
    const oldUser = localStorage.getItem('user');
    
    if (oldToken || oldUser) {
      console.warn('🔒 Migração de Segurança: Removendo tokens antigos do localStorage');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }, []);

  // Actions memoizadas
  const actions = useMemo(() => ({
    // Autenticação - 🔒 SEGURANÇA: Não armazena token (httpOnly cookie)
    login: (user) => {
      // Token é gerenciado automaticamente via httpOnly cookie
      dispatch({
        type: ACTIONS.SET_USER,
        payload: { user }
      });
    },

    logout: () => {
      // Limpar apenas dados não-sensíveis (manter preferências do usuário se houver)
      localStorage.removeItem('token'); // Caso ainda exista algum resquício
      localStorage.removeItem('user');
      dispatch({ type: ACTIONS.LOGOUT });
    },

    // Loading global
    setLoading: (loading) => {
      dispatch({
        type: ACTIONS.SET_LOADING,
        payload: loading
      });
    },

    // Notificações
    showNotification: (message, severity = 'info') => {
      dispatch({
        type: ACTIONS.SHOW_NOTIFICATION,
        payload: { message, severity }
      });
    },

    hideNotification: () => {
      dispatch({ type: ACTIONS.HIDE_NOTIFICATION });
    },

    // Notificações de sucesso e erro simplificadas
    showSuccess: (message) => {
      dispatch({
        type: ACTIONS.SHOW_NOTIFICATION,
        payload: { message, severity: 'success' }
      });
    },

    showError: (message) => {
      dispatch({
        type: ACTIONS.SHOW_NOTIFICATION,
        payload: { message, severity: 'error' }
      });
    },

    // Cache
    updateCache: (data) => {
      dispatch({
        type: ACTIONS.UPDATE_CACHE,
        payload: data
      });
    },

    clearCache: () => {
      dispatch({ type: ACTIONS.CLEAR_CACHE });
    },

    // Verificar se cache está válido (5 minutos)
    isCacheValid: () => {
      if (!state.cache.lastUpdate) return false;
      const lastUpdate = new Date(state.cache.lastUpdate);
      const now = new Date();
      const diffMinutes = (now - lastUpdate) / (1000 * 60);
      return diffMinutes < 5;
    }
  }), [state.cache.lastUpdate]);

  // Valores memoizados do contexto
  const contextValue = useMemo(() => ({
    // Estado
    ...state,
    
    // Actions
    ...actions,
    
    // Helper para inicialização
    initializeAuth,
    
    // Estado computado (autenticação baseada em user, não em token local)
    isAuthenticated: !!state.user,
    userRole: state.user?.role,
    userName: state.user?.name,
    userCras: state.user?.cras
  }), [state, actions, initializeAuth]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};



export default AppContext;
