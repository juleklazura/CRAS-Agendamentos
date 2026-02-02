import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography
} from '@mui/material';

export default function ModalObservacoes({ 
  open, 
  onClose, 
  nomeAgendamento,
  observacoes
}) {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Observações - {nomeAgendamento}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
          {observacoes}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}
