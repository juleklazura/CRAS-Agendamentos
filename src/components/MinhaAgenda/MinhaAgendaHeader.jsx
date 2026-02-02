import { Box, Typography } from '@mui/material';

export default function MinhaAgendaHeader() {
  return (
    <Box sx={{ 
      mt: { xs: 1, sm: 2, md: 4 }, 
      mb: { xs: 2, sm: 3, md: 3 }, 
      textAlign: 'center',
      pt: { xs: 1, sm: 0 },
      position: 'relative',
      zIndex: 1
    }}>
      <Typography 
        variant="h4" 
        component="h1" 
        className="main-page-title" 
        sx={{ 
          fontFamily: 'Poppins, Roboto, Arial, sans-serif',
          fontWeight: 700,
          fontSize: {
            xs: '1.8rem',
            sm: '2.2rem',
            md: '2.5rem',
            lg: '2.8rem'
          },
          background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 2px 4px rgba(0,0,0,0.1)',
          letterSpacing: '0.5px',
          lineHeight: 1.2,
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: '-8px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: { xs: '60px', sm: '80px' },
            height: '3px',
            background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
            borderRadius: '2px'
          }
        }}
      >
        📅 Minha Agenda
      </Typography>
    </Box>
  );
}
