import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { memo } from 'react';
import { useAuth } from './hooks/useApp';

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

// Componente de rota protegida otimizado
const ProtectedRoute = memo(({ element, allowedRoles }) => {
  const { isAuthenticated, canAccess } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccess(allowedRoles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return element;
});

ProtectedRoute.displayName = 'ProtectedRoute';

// Componente de rota de login otimizado
const LoginRoute = memo(() => {
  const { isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Login />;
});

LoginRoute.displayName = 'LoginRoute';

// Router principal otimizado
const Router = memo(() => {
  return (
    <BrowserRouter
      future={{
        v7_relativeSplatPath: true,
        v7_startTransition: true
      }}
    >
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} />
        <Route path="/usuarios" element={<ProtectedRoute element={<Usuarios />} allowedRoles={['admin']} />} />
        <Route path="/cras" element={<ProtectedRoute element={<Cras />} allowedRoles={['admin']} />} />
        <Route path="/agendamentos" element={<ProtectedRoute element={<Agendamentos />} />} />
        <Route path="/logs" element={<ProtectedRoute element={<Logs />} allowedRoles={['admin', 'recepcao']} />} />
        <Route path="/minha-agenda" element={<ProtectedRoute element={<MinhaAgenda />} allowedRoles={['entrevistador']} />} />
        <Route path="/agenda-recepcao" element={<ProtectedRoute element={<AgendaRecepcao />} allowedRoles={['recepcao']} />} />
        <Route path="/agenda" element={<ProtectedRoute element={<Agenda />} />} />
        {/* Redireciona para login por padrão */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        {/* Redireciona qualquer rota não encontrada para o dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
});

Router.displayName = 'Router';

export default Router;
