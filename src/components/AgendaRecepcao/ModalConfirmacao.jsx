import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';

export default function ModalConfirmacao({
  aberto,
  onFechar,
  onConfirmar,
  titulo,
  mensagem,
  textoConfirmar = 'Confirmar',
  corConfirmar = 'error'
}) {
  return (
    <Dialog open={aberto} onClose={onFechar} maxWidth="xs">
      <DialogTitle>{titulo}</DialogTitle>
      <DialogContent>
        {mensagem}
      </DialogContent>
      <DialogActions>
        <Button onClick={onFechar}>Cancelar</Button>
        <Button onClick={onConfirmar} variant="contained" color={corConfirmar}>
          {textoConfirmar}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
