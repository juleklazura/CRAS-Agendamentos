import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography
} from '@mui/material';

export default function ModalBloqueio({ 
  open, 
  onClose, 
  horarioParaBloqueio,
  dataSelecionada,
  onConfirmar
}) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Bloquear Horário</DialogTitle>
      <DialogContent>
        <Typography>
          Deseja bloquear o horário {horarioParaBloqueio} do dia {dataSelecionada?.toLocaleDateString('pt-BR')}?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={onConfirmar} variant="contained" color="warning">
          Bloquear
        </Button>
      </DialogActions>
    </Dialog>
  );
}
