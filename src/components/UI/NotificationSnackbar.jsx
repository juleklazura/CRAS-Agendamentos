/**
 * NotificationSnackbar - Sistema de Notificações Toast
 * 
 * Exibe mensagens de feedback temporárias no canto da tela.
 */

import { memo } from 'react';
import { Snackbar, Alert } from '@mui/material';

const NotificationSnackbar = memo(({ 
  open, 
  message, 
  severity = 'info', 
  onClose,
  autoHideDuration = 6000 
}) => {
  const handleClose = (event, reason) => {
    if (reason === 'clickaway') return;
    onClose?.(event, reason);
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      sx={{ mb: 2, mr: 2 }}
    >
      <Alert
        onClose={onClose}
        severity={severity}
        variant="filled"
        sx={{ width: '100%' }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
});

NotificationSnackbar.displayName = 'NotificationSnackbar';

export default NotificationSnackbar;
