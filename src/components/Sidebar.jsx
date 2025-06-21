import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, List, ListItem, ListItemText, Button } from '@mui/material';

const menuPorPerfil = {
  admin: [
    { label: 'Painel Principal', path: '/dashboard' },
    { label: 'Usuários', path: '/usuarios' },
    { label: 'Unidades CRAS', path: '/cras' },
    { label: 'Agendamentos', path: '/agendamentos' },
    { label: 'Agenda Geral', path: '/agenda' },
    { label: 'Histórico', path: '/logs' },
  ],
  entrevistador: [
    { label: 'Painel Principal', path: '/dashboard' },
    { label: 'Minha Agenda', path: '/minha-agenda' },
    { label: 'Agendamentos', path: '/agendamentos' }
  ],
  recepcao: [
    { label: 'Painel Principal', path: '/dashboard' },
    { label: 'Agenda Recepção', path: '/agenda-recepcao' },
    { label: 'Agendamentos', path: '/agendamentos' }
  ]
};

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const usuario = JSON.parse(localStorage.getItem('user'));

  if (!usuario) return null;

  const menuItems = menuPorPerfil[usuario.role] || [];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login'); // Alterado para redirecionar para /login ao invés de /
  };

  return (
    <Box
      sx={{
        width: 240,
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bgcolor: '#1E4976',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        overflowY: 'auto',
        overflowX: 'hidden'
      }}
    >
      {/* Container Principal */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          boxSizing: 'border-box'
        }}
      >
        {/* Cabeçalho */}
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 'bold',
              color: 'white !important', // Forçar cor branca
              fontSize: '1.2rem',
              lineHeight: 1.2,
              wordBreak: 'break-word'
            }}
          >
            CRAS
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 'bold',
              color: 'white !important', // Forçar cor branca
              fontSize: '1.1rem',
              lineHeight: 1.2
            }}
          >
            Agendamentos
          </Typography>
        </Box>

        {/* Menu */}
        <List sx={{ flexGrow: 1, mb: 2 }}>
          {menuItems.map((item) => (
            <ListItem 
              key={item.path}
              component={Link}
              to={item.path}
              sx={{
                color: 'white',
                textDecoration: 'none',
                mb: 1,
                borderRadius: 1,
                bgcolor: location.pathname === item.path ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                }
              }}
            >
              <ListItemText 
                primary={item.label} 
                primaryTypographyProps={{
                  fontSize: '0.95rem',
                  fontWeight: location.pathname === item.path ? 'bold' : 'normal',
                  whiteSpace: 'nowrap'
                }}
              />
            </ListItem>
          ))}
        </List>

        {/* Perfil e Logout */}
        <Box sx={{ mt: 'auto' }}>
          <Typography 
            variant="body2" 
            sx={{ 
              mb: 1, 
              opacity: 0.8,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {usuario.name}
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              display: 'block', 
              mb: 2, 
              opacity: 0.6 
            }}
          >
            {usuario.role === 'admin' ? 'Administrador' :
             usuario.role === 'entrevistador' ? 'Entrevistador' :
             'Recepção'}
          </Typography>
          <Button
            fullWidth
            variant="contained"
            color="error"
            onClick={handleLogout}
            sx={{ 
              '&:hover': {
                backgroundColor: '#d32f2f'
              }
            }}
          >
            Sair
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
