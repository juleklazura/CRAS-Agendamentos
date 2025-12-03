/**
 * ========================================
 * APP - Componente Raiz da Aplicação
 * ========================================
 * 
 * Componente principal que configura estrutura global da aplicação.
 * Gerencia providers de contexto, roteamento e componentes globais.
 * Implementa migração de segurança automática.
 * 
 * ESTRUTURA DE PROVIDERS:
 * BrowserRouter (Roteamento)
 *   └─ AppProvider (Estado global da aplicação)
 *       └─ AuthProvider (Autenticação)
 *           └─ AppContent (Conteúdo da aplicação)
 * 
 * FUNCIONALIDADES PRINCIPAIS:
 * - Gerenciamento de rotas com React Router
 * - Sistema de notificações global (Snackbar)
 * - Indicador de carregamento global (Backdrop)
 * - Migração automática de segurança (remove tokens do localStorage)
 * - Configuração de flags de futuro do React Router v7
 * 
 * COMPONENTES GLOBAIS:
 * - Router: Sistema de roteamento com proteção de rotas
 * - NotificationSnackbar: Feedback visual para ações do usuário
 * - GlobalLoader: Indicador de operações assíncronas
 * 
 * SEGURANÇA:
 * - Migração automática via useMigrateSecurityLocalStorage
 * - Remove tokens antigos do localStorage na inicialização
 * - Força reautenticação após migração
 * 
 * REACT ROUTER FUTURE FLAGS:
 * - v7_startTransition: Usa React.startTransition para transições
 * - v7_relativeSplatPath: Resolução de caminhos relativos melhorada
 * 
 * @module App
 * @requires react-router-dom - Roteamento
 * @requires AppContext - Contexto de aplicação
 * @requires AuthContext - Contexto de autenticação
 * @requires securityMigration - Migração de segurança
 * @requires Common - Componentes globais
 */

import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import { AuthProvider } from './contexts/AuthContext';
import { useApp } from './hooks/useApp';
import { useMigrateSecurityLocalStorage } from './utils/securityMigration';
import { NotificationSnackbar, GlobalLoader } from './components/Common';
import Router from './router';
import './App.css';

/**
 * AppContent - Componente interno que consome os contextos
 * 
 * Separado do App principal para permitir uso dos hooks de contexto.
 * Implementa a migração de segurança e renderiza componentes globais.
 * 
 * @returns {JSX.Element} Conteúdo da aplicação com router e componentes globais
 */
const AppContent = () => {
  const { 
    notification, 
    hideNotification, 
    loading 
  } = useApp();

  // 🔒 SEGURANÇA: Migração automática - remove tokens antigos do localStorage
  useMigrateSecurityLocalStorage();

  return (
    <>
      <Router />
      
      {/* Notificações globais */}
      <NotificationSnackbar
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={hideNotification}
      />
      
      {/* Loading global */}
      <GlobalLoader open={loading} />
    </>
  );
};

/**
 * App - Componente Raiz com Providers
 * 
 * Configura a hierarquia de providers necessários para a aplicação.
 * BrowserRouter deve estar no topo para fornecer contexto de roteamento.
 * AppProvider fornece estado global (notificações, loading).
 * AuthProvider gerencia autenticação e autorização.
 * 
 * ORDEM DOS PROVIDERS:
 * 1. BrowserRouter - Roteamento (mais externo)
 * 2. AppProvider - Estado global da aplicação
 * 3. AuthProvider - Autenticação (depende de AppProvider)
 * 4. AppContent - Conteúdo (consome ambos os contextos)
 * 
 * FUTURE FLAGS:
 * - v7_startTransition: Melhora performance de navegação
 * - v7_relativeSplatPath: Corrige resolução de rotas relativas
 * 
 * @returns {JSX.Element} Aplicação completa com todos os providers configurados
 */
// App principal com Provider
function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <AppProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
