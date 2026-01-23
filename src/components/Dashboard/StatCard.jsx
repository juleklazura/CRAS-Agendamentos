import React from 'react';
import { Paper, Box, Avatar, Typography } from '@mui/material';

/**
 * Componente de card estatístico reutilizável
 * Exibe uma métrica com ícone, título e valor
 * @param {string} title - Título do card
 * @param {number} value - Valor numérico a exibir
 * @param {Component} icon - Ícone do Material-UI
 * @param {Array<string>} gradientColors - Array com 2 cores para o gradiente [início, fim]
 * @param {string} shadowColor - Cor da sombra no hover
 */
// eslint-disable-next-line no-unused-vars
const StatCard = ({ title, value, icon: Icon, gradientColors, shadowColor }) => (
  <Paper
    elevation={0}
    sx={{
      p: { xs: 2, md: 3 },
      borderRadius: { xs: 2, md: 3 },
      background: `linear-gradient(135deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 100%)`,
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
      minHeight: { xs: 110, md: 140 },
      height: { xs: '100%', md: 'auto' },
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: `0 12px 20px ${shadowColor}`
      },
      '&:active': {
        transform: { xs: 'scale(0.98)', md: 'translateY(-4px)' }
      },
      '&::after': {
        content: '""',
        position: 'absolute',
        top: -20,
        right: -20,
        width: { xs: 60, md: 100 },
        height: { xs: 60, md: 100 },
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)'
      }
    }}
  >
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: { xs: 0.5, md: 1 }, 
      mb: { xs: 1, md: 2 } 
    }}>
      <Avatar sx={{ 
        bgcolor: 'rgba(255,255,255,0.2)', 
        width: { xs: 32, md: 40 }, 
        height: { xs: 32, md: 40 } 
      }}>
        <Icon sx={{ fontSize: { xs: 18, md: 24 } }} />
      </Avatar>
      <Typography 
        variant="body2" 
        sx={{ 
          opacity: 0.9, 
          fontWeight: 600, 
          color: 'white',
          fontSize: { xs: '0.75rem', md: '0.875rem' }
        }}
      >
        {title}
      </Typography>
    </Box>
    <Typography 
      variant="h3" 
      fontWeight={700} 
      sx={{ 
        color: 'white !important',
        fontSize: { xs: '1.75rem', md: '3rem' }
      }}
    >
      {value}
    </Typography>
  </Paper>
);

export default StatCard;
