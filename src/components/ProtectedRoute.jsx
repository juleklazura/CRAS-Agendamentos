// Componente de rota protegida com validação rigorosa de permissões
// Controla acesso baseado em autenticação e roles (perfis) de usuário
import { Navigate, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Box, CircularProgress, Typography, Button, Paper } from '@mui/material';
import { Lock as LockIcon, Home as HomeIcon } from '@mui/icons-material';

// Mapeamento de roles para exibição amigável
const ROLE_NAMES = {
  admin: 'Administrador',
  entrevistador: 'Entrevistador',
  recepcao: 'Recepção'
};

// Componente principal de proteção de rotas
const ProtectedRoute = ({ children, allowedRoles = null, requireAuth = true }) => {
  const { user, loading, isAuthenticated } = useContext(AuthContext);
  const location = useLocation();

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="#f5f5f5"
      >
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 3, color: 'text.secondary' }}>
          Verificando autenticação...
        </Typography>
      </Box>
    );
  }

  // Verificar se está autenticado
  if (requireAuth && !isAuthenticated) {
    // Salvar URL de destino para redirecionar após login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificar roles permitidas
  if (allowedRoles && isAuthenticated) {
    const userRole = user?.role;
    
    // Normalizar allowedRoles para array
    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    // Verificar se o role do usuário está na lista de permitidos
    if (!rolesArray.includes(userRole)) {
      return (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
          bgcolor="#f5f5f5"
          p={3}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              maxWidth: 500,
              textAlign: 'center',
              borderTop: '4px solid',
              borderColor: 'error.main'
            }}
          >
            <LockIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
            
            <Typography variant="h4" gutterBottom color="error">
              Acesso Negado
            </Typography>
            
            <Typography variant="body1" color="text.secondary" paragraph>
              Você não tem permissão para acessar esta página.
            </Typography>
            
            <Box sx={{ my: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Perfil necessário:</strong>{' '}
                {rolesArray.map(role => ROLE_NAMES[role] || role).join(' ou ')}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                <strong>Seu perfil:</strong> {ROLE_NAMES[userRole] || userRole}
              </Typography>
              
              {user?.name && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  <strong>Usuário:</strong> {user.name}
                </Typography>
              )}
            </Box>
            
            <Button
              variant="contained"
              color="primary"
              startIcon={<HomeIcon />}
              onClick={() => window.location.href = '/dashboard'}
              fullWidth
              sx={{ mt: 2 }}
            >
              Voltar ao Dashboard
            </Button>
            
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              Se você acredita que deveria ter acesso a esta página,
              entre em contato com o administrador do sistema.
            </Typography>
          </Paper>
        </Box>
      );
    }
  }

  // Tudo OK - renderizar conteúdo protegido
  return children;
};

export default ProtectedRoute;
