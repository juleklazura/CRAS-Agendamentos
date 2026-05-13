/**
 * Componente de Cabeçalho de Agendamentos
 * Responsabilidade: Título e descrição da página
 */
import { Typography, Box } from '@mui/material';

const SUBTITLES = {
  admin:        'Consulte e audite agendamentos de todos os CRAS e entrevistadores',
  entrevistador: 'Consulte seus agendamentos. Para criar novos, acesse "Minha Agenda"',
  recepcao:     'Consulte agendamentos do seu CRAS. Para criar novos, acesse "Agenda Recepção"',
};

export default function AgendamentosHeader({ role }) {
  const subtitle = SUBTITLES[role] || 'Consulte e gerencie agendamentos';

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
        Buscar Agendamentos
      </Typography>

      <Typography 
        variant="body2" 
        color="text.secondary" 
        textAlign="center"
      >
        {subtitle}
      </Typography>
    </Box>
  );
}
