/**
 * Serviço centralizado de API com segurança aprimorada
 * - Usa httpOnly cookies ao invés de localStorage
 * - Interceptors para tratamento de erros
 * - Logout automático em 401
 */

import axios from 'axios';

// Base URL da API (usa variável de ambiente ou fallback para dev)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Criar instância do axios com configurações seguras
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Envia cookies automaticamente (httpOnly)
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor de requisição (caso precise adicionar headers no futuro)
api.interceptors.request.use(
  (config) => {
    // 🔒 SEGURANÇA: Token agora vem automaticamente via httpOnly cookie
    // Não precisa mais adicionar Authorization header manualmente
    return config;
  },
  (error) => {
    // 🔒 SEGURANÇA: Não logar detalhes completos de erro
    if (import.meta.env.MODE === 'development') {
      console.error('Erro na requisição:', {
        url: error.config?.url,
        method: error.config?.method,
        message: error.message
      });
    }
    return Promise.reject(error);
  }
);

// Interceptor de resposta - logout automático em 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 🔒 SEGURANÇA: Tratamento seguro de erros sem expor detalhes sensíveis
    
    // Detectar erro de CORS (sem response)
    if (!error.response && error.message?.includes('Network Error')) {
      if (import.meta.env.MODE === 'development') {
        console.error('Erro de rede (possível CORS):', {
          message: 'Falha na conexão com o servidor',
          url: error.config?.url
        });
      }
      // Criar erro amigável sem expor detalhes internos
      error.message = 'Erro de conexão com o servidor';
      return Promise.reject(error);
    }
    
    // Se receber 401 (não autorizado)
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isLoginPage = window.location.pathname === '/login';
      
      // Lista de endpoints que não devem redirecionar automaticamente
      const skipRedirectEndpoints = [
        '/auth/me',
        '/auth/logout',
        '/auth/login',
        '/auth/refresh'
      ];
      
      const shouldSkipRedirect = skipRedirectEndpoints.some(endpoint => 
        url.includes(endpoint)
      );
      
      // Marcar erro como silenciado se for esperado (página de login ou endpoints de auth)
      const isExpectedUnauth = isLoginPage || shouldSkipRedirect;
      error.isSilent401 = isExpectedUnauth;
      
      // Limpar localStorage apenas se não for erro esperado
      if (!isExpectedUnauth) {
        localStorage.clear();
      }
      
      // Redirecionar para login apenas se não for endpoint de autenticação
      // e não estiver já na página de login
      if (!shouldSkipRedirect && !isLoginPage) {
        window.location.href = '/login';
      }
    }
    
    // 🔒 SEGURANÇA: Logar erros apenas em desenvolvimento e sem dados sensíveis
    if (import.meta.env.MODE === 'development' && error.response?.status !== 401) {
      console.error('Erro na resposta da API:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method
      });
    }
    
    return Promise.reject(error);
  }
);

export default api;
