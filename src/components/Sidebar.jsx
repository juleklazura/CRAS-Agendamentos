import React, { useState, memo, useMemo, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  Button,
  Drawer,
  IconButton,
  AppBar,
  Toolbar,
  useTheme,
  useMediaQuery,
  ListItemIcon,
  Avatar
} from '@mui/material';
import { 
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  Event as EventIcon,
  CalendarToday as CalendarIcon,
  History as HistoryIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useApp';

// Configuração otimizada dos menus por perfil
const MENU_CONFIG = {
  admin: [
    { label: 'Painel Principal', path: '/dashboard', icon: DashboardIcon },
    { label: 'Usuários', path: '/usuarios', icon: PeopleIcon },
    { label: 'Unidades CRAS', path: '/cras', icon: BusinessIcon },
    { label: 'Agendamentos', path: '/agendamentos', icon: EventIcon },
    { label: 'Agenda Geral', path: '/agenda', icon: CalendarIcon },
    { label: 'Histórico', path: '/logs', icon: HistoryIcon },
  ],
  entrevistador: [
    { label: 'Painel Principal', path: '/dashboard', icon: DashboardIcon },
    { label: 'Minha Agenda', path: '/minha-agenda', icon: CalendarIcon },
    { label: 'Agendamentos', path: '/agendamentos', icon: EventIcon }
  ],
  recepcao: [
    { label: 'Painel Principal', path: '/dashboard', icon: DashboardIcon },
    { label: 'Agenda Recepção', path: '/agenda-recepcao', icon: AssignmentIcon },
    { label: 'Agendamentos', path: '/agendamentos', icon: EventIcon }
  ]
};

// Componente para item de menu otimizado
const MenuItem = memo(({ item, isActive, onClick }) => {
  const Icon = item.icon;
  
  return (
    <ListItem
      component={Link}
      to={item.path}
      onClick={onClick}
      sx={{
        borderRadius: 2,
        mb: 0.5,
        mx: 1,
        textDecoration: 'none',
        color: 'inherit',
        backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
        '&:hover': {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
        },
        transition: 'all 0.2s ease'
      }}
    >
      <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
        <Icon />
      </ListItemIcon>
      <ListItemText
        primary={item.label}
        primaryTypographyProps={{
          fontSize: '0.9rem',
          fontWeight: isActive ? 'bold' : 'normal',
          color: 'white'
        }}
      />
    </ListItem>
  );
});

MenuItem.displayName = 'MenuItem';

// Componente principal da Sidebar otimizado
const Sidebar = memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout } = useAuth();

  // Memoizar dados do usuário
  const usuario = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  }, []);

  // Memoizar itens do menu baseado no role do usuário
  const menuItems = useMemo(() => 
    MENU_CONFIG[usuario?.role] || [],
    [usuario?.role]
  );

  // Callbacks otimizados
  const handleLogout = useCallback(() => {
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  const handleDrawerToggle = useCallback(() => {
    setMobileOpen(prev => !prev);
  }, []);

  const handleMenuClick = useCallback(() => {
    if (isMobile) {
      setMobileOpen(false);
    }
  }, [isMobile]);

  // Conteúdo memoizado do sidebar/drawer
  const sidebarContent = useMemo(() => (
    <Box
      sx={{
        p: 2,
        pt: isMobile ? 1 : 2, // Mais padding no mobile para evitar sobreposição
        pb: 2,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* Cabeçalho - só aparece no desktop */}
      {!isMobile && (
        <Box sx={{ mb: 3, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Avatar 
            src="/cras-icon.svg" 
            alt="CRAS"
            sx={{ 
              width: 48, 
              height: 48, 
              mb: 1,
              backgroundColor: 'transparent'
            }}
          />
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 'bold',
              color: 'white !important',
              fontSize: '1.1rem',
              lineHeight: 1.1,
              textAlign: 'center'
            }}
          >
            CRAS{'\n'}Agendamentos
          </Typography>
        </Box>
      )}

      {/* Menu */}
      <List sx={{ 
        flexGrow: 1,
        pt: isMobile ? 2 : 1 // Mais padding no topo para mobile
      }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <MenuItem
              key={item.path}
              item={item}
              isActive={isActive}
              onClick={handleMenuClick}
            />
          );
        })}
      </List>

      {/* Perfil e Logout */}
      <Box sx={{ mt: 'auto' }}>
        <Typography 
          variant="body2" 
          sx={{ 
            mb: 1, 
            color: 'white',
            opacity: 0.8,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {usuario?.name}
        </Typography>
        <Typography 
          variant="caption" 
          sx={{ 
            display: 'block', 
            mb: 2, 
            color: 'white',
            opacity: 0.6 
          }}
        >
          {usuario?.role === 'admin' ? 'Administrador' :
           usuario?.role === 'entrevistador' ? 'Entrevistador' :
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
  ), [isMobile, menuItems, location.pathname, usuario, handleMenuClick, handleLogout]);

  // Se não há usuário, não renderizar sidebar
  if (!usuario) return null;

  return (
    <>
      {/* AppBar para mobile */}
      {isMobile && (
        <AppBar 
          position="fixed" 
          sx={{ 
            bgcolor: '#1E4976 !important',
            zIndex: 1300,
            height: '64px'
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="abrir menu"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{ 
              flexGrow: 1,
              color: 'white !important',
              textAlign: 'center',
              mr: 6 // Compensar espaço do ícone para centralizar
            }}>
              CRAS Agendamentos
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      {/* Drawer para mobile */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Melhor performance no mobile
          }}
          sx={{
            zIndex: 1400, // Acima do AppBar (1300)
            '& .MuiDrawer-paper': {
              width: 280,
              bgcolor: '#1E4976 !important',
              color: 'white',
              zIndex: 1400,
              paddingTop: '64px' // Espaço para o AppBar
            }
          }}
        >
          {sidebarContent}
        </Drawer>
      )}

      {/* Sidebar fixo para desktop */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: 280,
            '& .MuiDrawer-paper': {
              width: 280,
              bgcolor: '#1E4976 !important',
              color: 'white',
              borderRight: 'none'
            }
          }}
        >
          {sidebarContent}
        </Drawer>
      )}
    </>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
