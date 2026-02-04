/**
 * AgendaLegend - Legenda de status da agenda
 */

import { memo } from 'react';
import { Box, Paper, Typography, Stack, Chip } from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  Block as BlockIcon
} from '@mui/icons-material';

const legendItems = [
  {
    icon: <ScheduleIcon fontSize="small" />,
    label: 'Disponível',
    color: '#e8f5e9',
    textColor: '#2e7d32'
  },
  {
    icon: <CheckCircleIcon fontSize="small" />,
    label: 'Agendado',
    color: '#e3f2fd',
    textColor: '#1565c0'
  },
  {
    icon: <CheckCircleIcon fontSize="small" />,
    label: 'Compareceu',
    color: '#e8f5e9',
    textColor: '#2e7d32'
  },
  {
    icon: <CancelIcon fontSize="small" />,
    label: 'Não Compareceu',
    color: '#ffebee',
    textColor: '#c62828'
  },
  {
    icon: <BlockIcon fontSize="small" />,
    label: 'Bloqueado',
    color: '#fff3e0',
    textColor: '#ef6c00'
  }
];

const AgendaLegend = memo(() => {
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
        Legenda:
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {legendItems.map((item) => (
          <Chip
            key={item.label}
            icon={item.icon}
            label={item.label}
            size="small"
            sx={{
              backgroundColor: item.color,
              color: item.textColor,
              '& .MuiChip-icon': { color: item.textColor }
            }}
          />
        ))}
      </Stack>
    </Paper>
  );
});

AgendaLegend.displayName = 'AgendaLegend';

export default AgendaLegend;
