/**
 * Configuração do Axios com segurança aprimorada
 * 🔒 SEGURANÇA: Usa httpOnly cookies ao invés de localStorage
 * 
 * ⚠️ NOTA: Este arquivo não é mais usado pelo projeto.
 * O arquivo principal é src/services/api.js
 */

import axios from 'axios';

// Instância configurada do axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  withCredentials: true, // 🔒 Envia cookies automaticamente (httpOnly)
  timeout: 15000
});

// Interceptor de requisição - cookies enviados automaticamente
api.interceptors.request.use(
  (config) => {
    // 🔒 Token agora vem automaticamente via httpOnly cookie
    // Não precisa mais adicionar Authorization header manualmente
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para lidar com respostas e erros
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Se for erro 401 (não autorizado) e não estiver na página de login
    if (error.response?.status === 401) {
      const isLoginPage = window.location.pathname === '/login';
      
      // Silenciar erro 401 no console quando esperado (página de login, rotas públicas)
      const isExpectedUnauth = isLoginPage || 
                              error.config?.url?.includes('/auth/me') ||
                              error.config?.url?.includes('/auth/logout');
      
      if (!isExpectedUnauth) {
        // 🔒 Não precisa remover token do localStorage (não existe mais)
        // Apenas redirecionar
        window.location.href = '/login';
      }
      
      // Marcar erro como silenciado para o AuthContext
      error.isSilent401 = isExpectedUnauth;
    }
    
    return Promise.reject(error);
  }
);

export default api;
