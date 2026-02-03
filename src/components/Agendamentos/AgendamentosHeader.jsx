/**
 * Componente de Cabeçalho de Agendamentos
 * Responsabilidade: Título e descrição da página
 */
import { Typography, Box } from '@mui/material';

export default function AgendamentosHeader() {
  return (
    <Box mb={3}>
      <Typography 
        variant="h4" 
        color="primary" 
        fontWeight="bold" 
        textAlign="center"
        mb={1}
        sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}
        component="h1"
      >
        Agendamentos
      </Typography>

      <Typography 
        variant="body2" 
        color="text.secondary" 
        textAlign="center"
      >
        Para criar novos agendamentos, acesse a página "Agenda"
      </Typography>
    </Box>
  );
}
