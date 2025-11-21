import axios from 'axios';

// Instância configurada do axios
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000
});

// Interceptor para adicionar token automaticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
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
        // Apenas redirecionar se não estiver na página de login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      
      // Marcar erro como silenciado para o AuthContext
      error.isSilent401 = isExpectedUnauth;
    }
    
    return Promise.reject(error);
  }
);

export default api;
