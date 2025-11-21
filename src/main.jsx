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

if (import.meta.env.PROD) {
  const noop = () => {};
  console.log = noop;
  console.debug = noop;
  console.info = noop;
  console.warn = noop;
  // Manter console.error para debug crítico
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

if (import.meta.env.PROD) {
  // Prevenir menu de contexto
  const preventContext = (e) => {
    e.preventDefault();
    return false;
  };
  addSecurityListener(document, 'contextmenu', preventContext);
  
  // Prevenir atalhos do DevTools
  const preventShortcuts = (e) => {
    // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) ||
      (e.ctrlKey && e.key === 'U')
    ) {
      e.preventDefault();
      return false;
    }
  };
  addSecurityListener(document, 'keydown', preventShortcuts);
  
  // ---------------------------------------------------------------------------
  // 🔒 DETECÇÃO DE DEVTOOLS ABERTO (Proteção Crítica)
  // ---------------------------------------------------------------------------
  
  let devtoolsOpen = false;
  let devtoolsCheckInterval = null;
  
  // Método 1: Detecção por dimensões da janela
  const detectDevToolsBySize = () => {
    const threshold = 160;
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;
    
    return widthThreshold || heightThreshold;
  };
  
  // Método 2: Detecção por console.log timing
  const detectDevToolsByTiming = () => {
    const start = performance.now();
    // eslint-disable-next-line no-debugger
    debugger;
    const end = performance.now();
    
    // Se debugger pausou a execução, DevTools está aberto
    return end - start > 100;
  };
  
  // Método 3: Detecção por toString override
  let devtoolsDetectedByToString = false;
  const detectDevToolsByToString = () => {
    const element = new Image();
    Object.defineProperty(element, 'id', {
      get: function() {
        devtoolsDetectedByToString = true;
        return 'devtools-detector';
      }
    });
    
    // Console.log chama toString/valueOf em objetos
    console.log('%c', element);
    
    return devtoolsDetectedByToString;
  };
  
  // Ação quando DevTools é detectado
  const handleDevToolsDetected = () => {
    if (!devtoolsOpen) {
      devtoolsOpen = true;
      
      // Limpar console
      console.clear();
      
      // Registrar evento de auditoria
      try {
        fetch('/api/audit/devtools-detected', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            windowSize: `${window.innerWidth}x${window.innerHeight}`
          })
        }).catch(() => {});
      } catch {
        // Falha silenciosa
      }
      
      // Ação drástica: Obscurecer conteúdo
      const overlay = document.createElement('div');
      overlay.id = 'devtools-warning-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        z-index: 999999;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        color: #ff0000;
        font-family: 'Courier New', monospace;
        font-size: 24px;
        text-align: center;
        padding: 40px;
        backdrop-filter: blur(10px);
      `;
      
      overlay.innerHTML = `
        <div style="max-width: 600px;">
          <div style="font-size: 72px; margin-bottom: 30px;">🚫</div>
          <div style="font-size: 32px; font-weight: bold; margin-bottom: 20px; color: #ff3333;">
            ACESSO NEGADO
          </div>
          <div style="font-size: 18px; color: #fff; line-height: 1.6; margin-bottom: 30px;">
            Ferramentas de desenvolvedor não são permitidas neste sistema.<br>
            Este evento foi registrado para fins de auditoria de segurança.
          </div>
          <div style="font-size: 14px; color: #888; margin-top: 40px;">
            Código: DEVTOOLS_DETECTED<br>
            Timestamp: ${new Date().toLocaleString('pt-BR')}
          </div>
        </div>
      `;
      
      document.body.appendChild(overlay);
      
      // Opcional: Recarregar página após alguns segundos
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    }
  };
  
  // Verificação combinada
  const checkDevTools = () => {
    const detectedBySize = detectDevToolsBySize();
    const detectedByTiming = detectDevToolsByTiming();
    const detectedByToString = detectDevToolsByToString();
    
    if (detectedBySize || detectedByTiming || detectedByToString) {
      handleDevToolsDetected();
    } else {
      devtoolsOpen = false;
      devtoolsDetectedByToString = false;
    }
  };
  
  // Iniciar verificação periódica
  devtoolsCheckInterval = setInterval(checkDevTools, 1000);
  
  // Verificação imediata na inicialização
  checkDevTools();
  
  // Método adicional: Debugger em loop (mais agressivo)
  const continuousDebuggerCheck = () => {
    setInterval(() => {
      const before = new Date().getTime();
      // eslint-disable-next-line no-debugger
      debugger;
      const after = new Date().getTime();
      
      // Se demorou mais de 100ms, debugger pausou
      if (after - before > 100) {
        handleDevToolsDetected();
      }
    }, 2000);
  };
  
  continuousDebuggerCheck();
  
  // Detectar eventos específicos do DevTools
  const detectDevToolsEvents = () => {
    // Detectar Firebug
    if (window.Firebug && window.Firebug.chrome && window.Firebug.chrome.isInitialized) {
      handleDevToolsDetected();
    }
    
    // Detectar Chrome DevTools via console
    const devtools = /./;
    devtools.toString = function() {
      handleDevToolsDetected();
      return 'devtools';
    };
    
    console.log('%c', devtools);
  };
  
  detectDevToolsEvents();
  
  // Adicionar intervalos ao gerenciador de timers para limpeza
  const originalCleanup = cleanup;
  window.addEventListener('unload', () => {
    if (devtoolsCheckInterval) {
      clearInterval(devtoolsCheckInterval);
    }
    originalCleanup();
  });
}

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
