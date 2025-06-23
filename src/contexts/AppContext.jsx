import React, { createContext, useCallback, useMemo, useReducer } from 'react';

// Estado inicial da aplicação
const initialState = {
  // Dados do usuário logado
  user: null,
  token: null,
  
  // Estados de carregamento global
  loading: false,
  
  // Notificações globais
  notification: {
    open: false,
    message: '',
    severity: 'info' // 'success', 'error', 'warning', 'info'
  },
  
  // Cache de dados frequentemente acessados
  cache: {
    cras: [],
    entrevistadores: [],
    lastUpdate: null
  }
};

// Actions do reducer
const ACTIONS = {
  SET_USER: 'SET_USER',
  SET_LOADING: 'SET_LOADING',
  SHOW_NOTIFICATION: 'SHOW_NOTIFICATION',
  HIDE_NOTIFICATION: 'HIDE_NOTIFICATION',
  UPDATE_CACHE: 'UPDATE_CACHE',
  CLEAR_CACHE: 'CLEAR_CACHE',
  LOGOUT: 'LOGOUT'
};

// Reducer para gerenciar estado global
const appReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_USER:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token
      };
      
    case ACTIONS.SET_LOADING:
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

  // Inicializar dados do localStorage na primeira renderização
  const initializeAuth = useCallback(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      try {
        dispatch({
          type: ACTIONS.SET_USER,
          payload: {
            token,
            user: JSON.parse(user)
          }
        });
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
        localStorage.clear();
      }
    }
  }, []);

  // Actions memoizadas
  const actions = useMemo(() => ({
    // Autenticação
    login: (token, user) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      dispatch({
        type: ACTIONS.SET_USER,
        payload: { token, user }
      });
    },

    logout: () => {
      localStorage.clear();
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
    
    // Estado computado
    isAuthenticated: !!state.token && !!state.user,
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
