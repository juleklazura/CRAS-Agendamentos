/**
 * AgendaFeedback - Componente de feedback (Snackbars) para a agenda
 */

import { memo } from 'react';
import { Snackbar, Alert } from '@mui/material';

const AgendaFeedback = memo(({ 
  error, 
  success, 
  onCloseError, 
  onCloseSuccess 
}) => (
  <>
    {/* Snackbar de erro */}
    <Snackbar 
      open={!!error} 
      autoHideDuration={4000} 
      onClose={(event, reason) => {
        if (reason === 'clickaway') return;
        onCloseError();
      }}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      sx={{ mb: 2, mr: 2 }}
    >
      <Alert severity="error" onClose={onCloseError}>
        {error}
      </Alert>
    </Snackbar>

    {/* Snackbar de sucesso */}
    <Snackbar 
      open={!!success} 
      autoHideDuration={4000} 
      onClose={(event, reason) => {
        if (reason === 'clickaway') return;
        onCloseSuccess();
      }}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      sx={{ mb: 2, mr: 2 }}
    >
      <Alert severity="success" onClose={onCloseSuccess}>
        {success}
      </Alert>
    </Snackbar>
  </>
));

AgendaFeedback.displayName = 'AgendaFeedback';

export default AgendaFeedback;
