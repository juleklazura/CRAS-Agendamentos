import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography
} from '@mui/material';

export default function ModalExclusao({ 
  open, 
  onClose, 
  agendamento,
  onConfirmar
}) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Excluir Agendamento</DialogTitle>
      <DialogContent>
        <Typography>
          Tem certeza que deseja excluir o agendamento de <strong>{agendamento?.pessoa}</strong>?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={onConfirmar} variant="contained" color="error">
          Excluir
        </Button>
      </DialogActions>
    </Dialog>
  );
}
