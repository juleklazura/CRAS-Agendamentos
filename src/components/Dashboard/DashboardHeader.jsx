import React from 'react';
import { Paper, Box, Avatar, Typography, Chip } from '@mui/material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';

/**
 * Sanitiza nome do usuário para prevenir XSS e limitar tamanho
 * @param {string} name - Nome do usuário
 * @returns {string} Nome sanitizado
 */
const sanitizeName = (name) => {
  if (!name || typeof name !== 'string') return 'Usuário';
  return name.replace(/[<>"'&\\]/g, '').substring(0, 50).split(' ')[0] || 'Usuário';
};

/**
 * Componente de cabeçalho do dashboard
 * Exibe boas-vindas personalizadas e informações do usuário
 * @param {object} user - Dados do usuário logado
 * @param {string} crasNome - Nome do CRAS do usuário
 * @param {boolean} isAdmin - Se o usuário é admin
 * @param {boolean} showDashboard - Se deve exibir informações extras (data)
 */
const DashboardHeader = ({ user, crasNome, isAdmin, showDashboard }) => {
  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'entrevistador':
        return 'Entrevistador';
      default:
        return 'Recepção';
    }
  };

  const getCrasLabel = () => {
    if (isAdmin) return 'Todos os CRAS';
    return crasNome || user?.cras || 'N/A';
  };

  return (
    <Paper
      elevation={0}
      className="dashboard-welcome-header"
      sx={{
        p: { xs: 2.5, md: 4 },
        mb: { xs: 2, md: 4 },
        borderRadius: { xs: 3, md: 4 },
        background: 'linear-gradient(135deg, #1E4976 0%, #2d6aa3 50%, #3d8bd4 100%)',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          right: 0,
          width: '40%',
          height: '100%',
          background: 'radial-gradient(circle at 70% 50%, rgba(255,255,255,0.1) 0%, transparent 60%)',
          pointerEvents: 'none'
        }
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: { xs: 2, md: 3 }, 
        flexWrap: 'wrap' 
      }}>
        <Avatar
          sx={{
            width: { xs: 56, md: 72 },
            height: { xs: 56, md: 72 },
            bgcolor: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            border: '3px solid rgba(255,255,255,0.3)',
            fontSize: { xs: '1.4rem', md: '1.8rem' },
            fontWeight: 700
          }}
        >
          {sanitizeName(user?.name)?.charAt(0)?.toUpperCase() || 'U'}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography 
            variant="h4" 
            fontWeight={700}
            sx={{ 
              mb: 0.5,
              textShadow: '0 2px 4px rgba(0,0,0,0.1)',
              fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' },
              color: 'white !important',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            Olá, {sanitizeName(user?.name)}! 👋
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            gap: { xs: 1, md: 1.5 }, 
            flexWrap: 'wrap', 
            alignItems: 'center' 
          }}>
            <Chip
              icon={<PersonIcon sx={{ color: 'white !important', fontSize: { xs: 16, md: 20 } }} />}
              label={getRoleLabel(user?.role)}
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                color: 'white',
                fontWeight: 600,
                backdropFilter: 'blur(10px)',
                height: { xs: 28, md: 32 },
                fontSize: { xs: '0.75rem', md: '0.85rem' },
                '& .MuiChip-icon': { color: 'white' }
              }}
            />
            <Chip
              icon={<BusinessIcon sx={{ color: 'white !important', fontSize: { xs: 16, md: 20 } }} />}
              label={getCrasLabel()}
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                color: 'white',
                fontWeight: 600,
                backdropFilter: 'blur(10px)',
                height: { xs: 28, md: 32 },
                fontSize: { xs: '0.75rem', md: '0.85rem' },
                '& .MuiChip-icon': { color: 'white' },
                maxWidth: { xs: 150, sm: 'none' },
                '& .MuiChip-label': {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }
              }}
            />
          </Box>
        </Box>
        {showDashboard && (
          <Box sx={{ textAlign: 'right', display: { xs: 'none', md: 'block' } }}>
            <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5, color: 'white !important' }}>
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </Typography>
            <Typography variant="h5" fontWeight={600} sx={{ color: 'white !important' }}>
              {format(new Date(), 'yyyy')}
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default DashboardHeader;
