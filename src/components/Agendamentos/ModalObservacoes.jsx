// Modal para visualização de observações
// Componente separado para melhor organização

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Paper,
  Box
} from '@mui/material';

/**
 * Modal de visualização de observações do agendamento
 * @param {Object} props
 * @param {boolean} props.open - Se o modal está aberto
 * @param {Function} props.onClose - Callback para fechar
 * @param {string} props.observacoes - Texto das observações (já sanitizado)
 * @param {string} props.nomePessoa - Nome da pessoa do agendamento
 */
export default function ModalObservacoes({ 
  open, 
  onClose, 
  observacoes,
  nomePessoa 
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ pb: 1 }}>
        📝 Observações do Agendamento
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <Typography variant="subtitle1" color="primary" gutterBottom>
            👤 {nomePessoa}
          </Typography>
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2, 
              mt: 2,
              backgroundColor: 'grey.50',
              minHeight: '100px',
              maxHeight: '400px',
              overflow: 'auto'
            }}
          >
            <Typography 
              variant="body1" 
              style={{ whiteSpace: 'pre-wrap' }}
            >
              {observacoes}
            </Typography>
          </Paper>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}
