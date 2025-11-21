import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import { AuthProvider } from './contexts/AuthContext';
import { useApp } from './hooks/useApp';
import { useMigrateSecurityLocalStorage } from './utils/securityMigration';
import { NotificationSnackbar, GlobalLoader } from './components/Common';
import Router from './router';
import './App.css';

// Componente interno que usa o contexto
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
