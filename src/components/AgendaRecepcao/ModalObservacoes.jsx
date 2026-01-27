import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Paper
} from '@mui/material';

export default function ModalObservacoes({
  aberto,
  onFechar,
  observacoes,
  nomeAgendamento
}) {
  return (
    <Dialog open={aberto} onClose={onFechar} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        📝 Observações do Agendamento
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <Typography variant="subtitle1" color="primary" gutterBottom>
            👤 {nomeAgendamento}
          </Typography>
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2, 
              mt: 2, 
              backgroundColor: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: 2
            }}
          >
            <Typography 
              variant="body1" 
              style={{ 
                whiteSpace: 'pre-wrap', 
                lineHeight: 1.6,
                color: '#495057',
                fontSize: '1rem'
              }}
            >
              {observacoes || 'Nenhuma observação registrada'}
            </Typography>
          </Paper>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onFechar} variant="contained" size="large">
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
