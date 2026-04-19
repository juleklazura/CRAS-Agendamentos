import { Button, Typography, Paper } from '@mui/material';
import NotesRoundedIcon from '@mui/icons-material/NotesRounded';
import { ModalBase } from '../UI';

export default function ModalObservacoes({
  open,
  onClose,
  nomeAgendamento,
  observacoes
}) {
  return (
    <ModalBase
      open={open}
      onClose={onClose}
      maxWidth="md"
      icon={NotesRoundedIcon}
      title="Observações do Agendamento"
      subtitle={nomeAgendamento}
      actions={
        <Button onClick={onClose} variant="contained" size="large">
          Fechar
        </Button>
      }
    >
      <Paper
        variant="outlined"
        sx={{
          p: 2.5,
          backgroundColor: 'grey.50',
          borderRadius: 2,
          minHeight: 80,
        }}
      >
        <Typography
          variant="body1"
          sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'text.primary' }}
        >
          {observacoes || 'Nenhuma observação registrada.'}
        </Typography>
      </Paper>
    </ModalBase>
  );
}
