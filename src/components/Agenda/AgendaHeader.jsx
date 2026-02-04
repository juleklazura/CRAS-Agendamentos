/**
 * AgendaHeader - Cabeçalho da página de agenda
 */

import { memo } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';

const AgendaHeader = memo(({ isEntrevistador }) => (
  <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
    <Box display="flex" flexDirection="column" alignItems="center" textAlign="center">
      <Box display="flex" alignItems="center" gap={1}>
        <EventIcon color="primary" sx={{ fontSize: 32 }} />
        <Typography variant="h4" color="primary" fontWeight="bold">
          {isEntrevistador ? 'Minha Agenda' : 'Agenda dos Entrevistadores'}
        </Typography>
      </Box>
      
      <Typography variant="body1" color="text.secondary">
        {isEntrevistador 
          ? 'Visualize e gerencie seus agendamentos pessoais' 
          : 'Visualize e gerencie os agendamentos dos entrevistadores do sistema'
        }
      </Typography>
    </Box>
  </Paper>
));

AgendaHeader.displayName = 'AgendaHeader';

export default AgendaHeader;
