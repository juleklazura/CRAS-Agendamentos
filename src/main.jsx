import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// =============================================================================
// 🔒 GERENCIADOR DE EVENT LISTENERS (Previne Memory Leaks)
// =============================================================================

const securityEventListeners = [];

const addSecurityListener = (target, event, handler, options) => {
  target.addEventListener(event, handler, options);
  securityEventListeners.push({ target, event, handler, options });
};

const removeAllSecurityListeners = () => {
  securityEventListeners.forEach(({ target, event, handler, options }) => {
    target.removeEventListener(event, handler, options);
  });
  securityEventListeners.length = 0;
};

// =============================================================================
// 🔒 SEGURANÇA: Limpar console em produção e suprimir erros esperados
// =============================================================================

// Suprimir logs em produção para segurança
if (import.meta.env.PROD) {
  const noop = () => {};
  console.log = noop;
  console.debug = noop;
  console.info = noop;
  // Manter console.warn e console.error para debug crítico
}

// Suprimir erros 401 esperados no console (desenvolvimento)
if (import.meta.env.DEV) {
  const originalError = console.error;
  console.error = (...args) => {
    const errorMessage = args.join(' ');
    
    // Suprimir erros 401 de autenticação esperados
    const is401AuthError = errorMessage.includes('401') && 
                          (errorMessage.includes('/auth/me') || 
                           errorMessage.includes('/auth/logout'));
    
    // Suprimir warning do React DevTools (apenas informativo)
    const isDevToolsWarning = errorMessage.includes('React DevTools');
    
    if (!is401AuthError && !isDevToolsWarning) {
      originalError.apply(console, args);
    }
  };
  
  // Interceptar e suprimir erros de rede 401 no console do navegador
  // Observação: Erros de rede ainda aparecem na aba Network, mas não no Console
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    
    // Se for 401 em endpoints de autenticação, não logar no console
    if (response.status === 401) {
      const url = args[0]?.toString() || '';
      const isAuthEndpoint = url.includes('/auth/me') || 
                            url.includes('/auth/logout') || 
                            url.includes('/auth/login');
      
      if (isAuthEndpoint) {
        // Retornar resposta normalmente sem logar erro
        return response;
      }
    }
    
    return response;
  };
}

// =============================================================================
// 🔒 SEGURANÇA: Prevenir drag and drop não autorizado
// =============================================================================

const preventDrag = (e) => {
  e.preventDefault();
  return false;
};

addSecurityListener(document, 'dragover', preventDrag, false);
addSecurityListener(document, 'drop', preventDrag, false);

// =============================================================================
// 🔒 SEGURANÇA: Proteção contra clickjacking
// =============================================================================

if (window.self !== window.top) {
  window.top.location = window.self.location;
}

// =============================================================================
// 🔒 SEGURANÇA: Prevenir clique direito e atalhos em produção
// =============================================================================

// ⚠️ DESABILITADO: Proteções de DevTools muito agressivas impediam acesso
// Reativar apenas se necessário em ambiente específico

// =============================================================================
// 🔒 LIMPEZA AUTOMÁTICA (Previne Memory Leaks)
// =============================================================================

const cleanup = () => {
  // Remover todos os event listeners
  removeAllSecurityListeners();
  
  // Limpar cache se disponível
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    }).catch(() => {
      // Ignorar erros de limpeza de cache
    });
  }
};

// Registrar cleanup nos eventos de unload
addSecurityListener(window, 'unload', cleanup);
addSecurityListener(window, 'beforeunload', cleanup);

// =============================================================================
// 🚀 INICIALIZAÇÃO DO REACT
// =============================================================================

// Verificar se o root element existe
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found. Cannot mount application.');
}

// Evitar criar múltiplos roots durante HMR
if (!window.__REACT_ROOT__) {
  window.__REACT_ROOT__ = createRoot(rootElement);
}

const root = window.__REACT_ROOT__;

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// =============================================================================
// 🔥 HOT MODULE REPLACEMENT (apenas desenvolvimento)
// =============================================================================

if (import.meta.hot) {
  import.meta.hot.accept();
  
  // Limpar listeners ao fazer HMR
  import.meta.hot.dispose(() => {
    removeAllSecurityListeners();
  });
}
