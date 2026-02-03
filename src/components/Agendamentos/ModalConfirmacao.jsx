// Modal de confirmação de exclusão
// Componente reutilizável para confirmações críticas

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress
} from '@mui/material';

/**
 * Modal de confirmação para ações críticas
 * @param {Object} props
 * @param {boolean} props.open - Se o modal está aberto
 * @param {Function} props.onClose - Callback para fechar
 * @param {Function} props.onConfirm - Callback de confirmação
 * @param {string} props.title - Título do modal
 * @param {string} props.message - Mensagem de confirmação
 * @param {boolean} props.loading - Se está processando
 */
export default function ModalConfirmacao({ 
  open, 
  onClose, 
  onConfirm,
  title = 'Confirmar exclusão',
  message = 'Tem certeza que deseja excluir este agendamento?',
  loading = false
}) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>{message}</DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button onClick={onConfirm} color="error" disabled={loading}>
          {loading ? <CircularProgress size={20} /> : 'Excluir'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
