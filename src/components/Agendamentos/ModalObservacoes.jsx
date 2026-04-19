import { memo } from 'react';
import { Button, Typography, Paper } from '@mui/material';
import NotesRoundedIcon from '@mui/icons-material/NotesRounded';
import { ModalBase } from '../UI';

const ModalObservacoes = memo(function ModalObservacoes({
  open,
  onClose,
  observacoes,
  nomePessoa
}) {
  return (
    <ModalBase
      open={open}
      onClose={onClose}
      maxWidth="md"
      icon={NotesRoundedIcon}
      title="Observações do Agendamento"
      subtitle={nomePessoa}
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
          minHeight: 100,
          maxHeight: 400,
          overflow: 'auto',
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
});

export default ModalObservacoes;
