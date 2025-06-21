import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Usuarios from './pages/Usuarios';
import Cras from './pages/Cras';
import Agendamentos from './pages/Agendamentos';
import Logs from './pages/Logs';
import MinhaAgenda from './pages/MinhaAgenda';
import Agenda from './pages/Agenda';
import AgendaRecepcao from './pages/AgendaRecepcao';

export default function Router() {
  const ProtectedRoute = ({ element, allowedRoles }) => {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    
    if (!token || !user) {
      localStorage.clear(); // Limpar dados inválidos
      return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return <Navigate to="/dashboard" replace />;
    }

    return element;
  };

  const LoginRoute = () => {
    const token = localStorage.getItem('token');
    if (token) {
      return <Navigate to="/dashboard" replace />;
    }
    return <Login />;
  };

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
}
