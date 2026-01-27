import { Box, Typography, Paper } from '@mui/material';

export default function AgendaRecepcaoHeader({ crasInfo }) {
  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
      <Box display="flex" flexDirection="column" alignItems="center" textAlign="center">
        <Typography variant="h4" color="primary" fontWeight="bold" gutterBottom>
          Agenda da Recepção - {crasInfo?.nome || 'Carregando...'}
        </Typography>
      </Box>
    </Paper>
  );
}
