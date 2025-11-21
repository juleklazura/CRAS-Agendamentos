// Utilitários de Performance Otimizados
// Funções e classes para melhorar performance da aplicação
import React from 'react';
import axios from 'axios';

/**
 * Cache simples para funções custosas
 * Implementa cache com TTL (time to live) e limite de tamanho
 * Útil para evitar recálculos desnecessários e requisições repetidas
 */
export class SimpleCache {
  constructor(maxSize = 100, ttl = 5 * 60 * 1000) { // 5 minutos default
    this.cache = new Map();     // Armazenamento do cache
    this.maxSize = maxSize;     // Tamanho máximo do cache
    this.ttl = ttl;             // Tempo de vida dos itens (TTL)
  }

  // Recupera item do cache verificando validade
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    // Verifica se item expirou
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  // Adiciona item ao cache com timestamp
  set(key, value) {
    // Limpa cache se exceder tamanho máximo (FIFO)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  // Limpa todo o cache
  clear() {
    this.cache.clear();
  }
}

/**
 * Debounce otimizado para inputs e buscas
 * Evita execução excessiva de funções durante digitação
 * @param {Function} func - Função a ser executada
 * @param {number} delay - Delay em milissegundos (padrão 300ms)
 */
export const debounce = (func, delay = 300) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

/**
 * ⏳ Throttle para eventos frequentes
 */
export const throttle = (func, limit = 100) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * 🎯 Memoização customizada
 */
export const memoize = (fn, keyGenerator) => {
  const cache = new Map();
  
  return (...args) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

/**
 * 📊 Formatadores otimizados com cache
 */
const formatCache = new SimpleCache(1000, 10 * 60 * 1000); // 10 minutos

export const formatarDataOtimizado = memoize((data) => {
  if (!data) return '-';
  
  try {
    const dataObj = new Date(data);
    return dataObj.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Data inválida';
  }
});

export const formatarCPFOtimizado = memoize((cpf) => {
  if (!cpf) return '';
  const cached = formatCache.get(`cpf_${cpf}`);
  if (cached) return cached;
  
  const apenasNumeros = cpf.replace(/\D/g, '').slice(0, 11);
  const formatted = apenasNumeros
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2');
  
  formatCache.set(`cpf_${cpf}`, formatted);
  return formatted;
});

export const formatarTelefoneOtimizado = memoize((telefone) => {
  if (!telefone) return '';
  const cached = formatCache.get(`tel_${telefone}`);
  if (cached) return cached;
  
  const apenasNumeros = telefone.replace(/\D/g, '').slice(0, 11);
  let formatted;
  
  if (apenasNumeros.length <= 10) {
    formatted = apenasNumeros
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  } else {
    formatted = apenasNumeros
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  }
  
  formatCache.set(`tel_${telefone}`, formatted);
  return formatted;
});

/**
 * 🔍 Busca otimizada
 */
export const criarFiltro = (termo, campos) => {
  if (!termo?.trim()) return () => true;
  
  const termoNormalizado = termo.toLowerCase().trim();
  
  return (item) => {
    return campos.some(campo => {
      const valor = item[campo];
      if (!valor) return false;
      
      return String(valor).toLowerCase().includes(termoNormalizado);
    });
  };
};

/**
 * 📈 Paginação otimizada
 */
export const usePaginacao = (dados, itensPorPagina = 10) => {
  const [paginaAtual, setPaginaAtual] = React.useState(1);
  
  const dadosPaginados = React.useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    return dados.slice(inicio, fim);
  }, [dados, paginaAtual, itensPorPagina]);
  
  const totalPaginas = Math.ceil(dados.length / itensPorPagina);
  
  const irParaPagina = React.useCallback((pagina) => {
    setPaginaAtual(Math.max(1, Math.min(pagina, totalPaginas)));
  }, [totalPaginas]);
  
  return {
    dadosPaginados,
    paginaAtual,
    totalPaginas,
    irParaPagina,
    proximaPagina: () => irParaPagina(paginaAtual + 1),
    paginaAnterior: () => irParaPagina(paginaAtual - 1),
    temProximaPagina: paginaAtual < totalPaginas,
    temPaginaAnterior: paginaAtual > 1
  };
};

/**
 * 🌐 Interceptador de axios otimizado
 */
export const criarAxiosOtimizado = () => {
  const instance = axios.create({
    baseURL: 'http://localhost:5000/api',
    timeout: 10000
  });
  
  // Request interceptor
  instance.interceptors.request.use(
    (config) => {
      // Token agora 00e9 enviado automaticamente via cookies httpOnly
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Log para desenvolvimento
      if (import.meta.env.DEV) {
        console.log('🚀 API Request:', {
          method: config.method?.toUpperCase(),
          url: config.url,
          data: config.data
        });
      }
      
      return config;
    },
    (error) => Promise.reject(error)
  );
  
  // Response interceptor
  instance.interceptors.response.use(
    (response) => {
      if (import.meta.env.DEV) {
        console.log('✅ API Response:', {
          status: response.status,
          url: response.config.url,
          data: response.data
        });
      }
      return response;
    },
    (error) => {
      if (import.meta.env.DEV) {
        console.error('❌ API Error:', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.response?.data?.message || error.message
        });
      }
      
      // Logout automático em caso de token inválido
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.clear();
        window.location.href = '/login';
      }
      
      return Promise.reject(error);
    }
  );
  
  return instance;
};

/**
 * 📱 Hook para detectar dispositivo móvel
 */
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(false);
  
  React.useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    const throttledResize = throttle(checkIsMobile, 100);
    window.addEventListener('resize', throttledResize);
    
    return () => window.removeEventListener('resize', throttledResize);
  }, []);
  
  return isMobile;
};

/**
 * 🔄 Hook para gerenciar estado local otimizado
 */
export const useOptimizedState = (initialState) => {
  const [state, setState] = React.useState(initialState);
  
  const updateState = React.useCallback((updates) => {
    setState(prev => {
      // Verificar se realmente mudou
      const newState = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates };
      return JSON.stringify(newState) === JSON.stringify(prev) ? prev : newState;
    });
  }, []);
  
  const resetState = React.useCallback(() => {
    setState(initialState);
  }, [initialState]);
  
  return [state, updateState, resetState];
};

/**
 * 💾 Hook para persistir estado no localStorage
 */
export const usePersistedState = (key, defaultValue) => {
  const [state, setState] = React.useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  });
  
  const setValue = React.useCallback((value) => {
    try {
      setState(value);
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Erro ao salvar no localStorage:`, error);
    }
  }, [key]);
  
  return [state, setValue];
};

export default {
  SimpleCache,
  debounce,
  throttle,
  memoize,
  formatarDataOtimizado,
  formatarCPFOtimizado,
  formatarTelefoneOtimizado,
  criarFiltro,
  usePaginacao,
  criarAxiosOtimizado,
  useIsMobile,
  useOptimizedState,
  usePersistedState
};
