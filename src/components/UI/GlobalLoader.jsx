/**
 * GlobalLoader - Indicador de Carregamento Global
 * 
 * Exibe spinner centralizado com backdrop que bloqueia interações.
 */

import { memo } from 'react';
import { Backdrop, CircularProgress, Typography } from '@mui/material';

const GlobalLoader = memo(({ open, message = 'Carregando...' }) => (
  <Backdrop
    sx={{ 
      color: '#fff', 
      zIndex: (theme) => theme.zIndex.drawer + 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }}
    open={open}
  >
    <CircularProgress color="inherit" size={60} />
    <Typography variant="h6" component="div">
      {message}
    </Typography>
  </Backdrop>
));

GlobalLoader.displayName = 'GlobalLoader';

export default GlobalLoader;
