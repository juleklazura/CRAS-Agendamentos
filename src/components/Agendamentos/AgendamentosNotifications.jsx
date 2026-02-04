/**
 * Componente de Notificações de Agendamentos
 * Responsabilidade: Exibir mensagens de erro e sucesso
 * Padrão idêntico ao da página Agenda
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
        autoHideDuration={4000} 
        onClose={(event, reason) => {
          if (reason === 'clickaway') return;
          onClose();
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{ mb: 2, mr: 2 }}
      >
        <Alert severity="error" onClose={onClose}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar 
        open={!!success} 
        autoHideDuration={4000} 
        onClose={(event, reason) => {
          if (reason === 'clickaway') return;
          onClose();
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{ mb: 2, mr: 2 }}
      >
        <Alert severity="success" onClose={onClose}>
          {success}
        </Alert>
      </Snackbar>
    </>
  );
}
