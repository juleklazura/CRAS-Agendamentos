import React, { useEffect } from 'react';
import { AppProvider } from './contexts/AppContext';
import { useApp } from './hooks/useApp';
import { NotificationSnackbar, GlobalLoader } from './components/Common';
import Router from './router';
import './App.css';

// Componente interno que usa o contexto
const AppContent = () => {
  const { 
    initializeAuth, 
    notification, 
    hideNotification, 
    loading 
  } = useApp();

  // Inicializar autenticação na primeira renderização
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

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
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
