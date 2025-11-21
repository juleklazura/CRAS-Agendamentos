import { Routes, Route, Navigate } from 'react-router-dom';
import { memo, useContext } from 'react';
import { AuthContext } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Importações lazy para code splitting
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Usuarios from './pages/Usuarios';
import Cras from './pages/Cras';
import Agendamentos from './pages/Agendamentos';
import Logs from './pages/Logs';
import MinhaAgenda from './pages/MinhaAgenda';
import Agenda from './pages/Agenda';
import AgendaRecepcao from './pages/AgendaRecepcao';

// Componente de rota de login otimizado
const LoginRoute = memo(() => {
  const { isAuthenticated } = useContext(AuthContext);
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Login />;
});

LoginRoute.displayName = 'LoginRoute';

// Router principal otimizado com validação rigorosa de roles
const Router = memo(() => {
  return (
    <Routes>
      {/* Rota de login - redireciona se já autenticado */}
      <Route path="/login" element={<LoginRoute />} />
      
      {/* Dashboard - acessível para todos os usuários autenticados */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Usuários - APENAS ADMIN */}
      <Route 
        path="/usuarios" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Usuarios />
          </ProtectedRoute>
        } 
      />
      
      {/* CRAS - APENAS ADMIN */}
      <Route 
        path="/cras" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Cras />
          </ProtectedRoute>
        } 
      />
      
      {/* Agendamentos - todos os usuários autenticados */}
      <Route 
        path="/agendamentos" 
        element={
          <ProtectedRoute>
            <Agendamentos />
          </ProtectedRoute>
        } 
      />
      
      {/* Logs - ADMIN e RECEPÇÃO */}
      <Route 
        path="/logs" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'recepcao']}>
            <Logs />
          </ProtectedRoute>
        } 
      />
      
      {/* Minha Agenda - APENAS ENTREVISTADOR */}
      <Route 
        path="/minha-agenda" 
        element={
          <ProtectedRoute allowedRoles={['entrevistador']}>
            <MinhaAgenda />
          </ProtectedRoute>
        } 
      />
      
      {/* Agenda Recepção - APENAS RECEPÇÃO */}
      <Route 
        path="/agenda-recepcao" 
        element={
          <ProtectedRoute allowedRoles={['recepcao']}>
            <AgendaRecepcao />
          </ProtectedRoute>
        } 
      />
      
      {/* Agenda Geral - todos os usuários autenticados */}
      <Route 
        path="/agenda" 
        element={
          <ProtectedRoute>
            <Agenda />
          </ProtectedRoute>
        } 
      />
      
      {/* Redireciona raiz para login */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* Rotas não encontradas - redireciona para dashboard se autenticado */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
});

Router.displayName = 'Router';

export default Router;
