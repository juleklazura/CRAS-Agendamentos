/**
 * Componente de Notificações de Agendamentos
 * Responsabilidade: Exibir mensagens de erro e sucesso
 */
import { Snackbar, Alert } from '@mui/material';

export default function AgendamentosNotifications({ 
  error, 
  success, 
  onClose 
}) {
  return (
    <>
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={onClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          severity="error" 
          onClose={onClose}
          variant="filled"
          elevation={6}
        >
          {error}
        </Alert>
      </Snackbar>

      <Snackbar 
        open={!!success} 
        autoHideDuration={4000} 
        onClose={onClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          severity="success" 
          onClose={onClose}
          variant="filled"
          elevation={6}
        >
          {success}
        </Alert>
      </Snackbar>
    </>
  );
}
