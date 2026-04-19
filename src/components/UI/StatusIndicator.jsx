/**
 * StatusIndicator - Indicador Visual de Status
 * 
 * Exibe status com cor e label correspondente ao estado.
 */

import { memo } from 'react';
import { Box, Typography } from '@mui/material';

const STATUS_CONFIG = {
  'livre':     { color: '#4caf50', label: 'Disponível' },
  'agendado':  { color: '#2196f3', label: 'Agendado'   },
  'realizado': { color: '#9c27b0', label: 'Realizado'  },
  'ausente':   { color: '#ff9800', label: 'Ausente'    },
  'bloqueado': { color: '#f44336', label: 'Bloqueado'  },
};

const StatusIndicator = memo(({ 
  status, 
  size = 'small',
  showLabel = true 
}) => {
  const config = STATUS_CONFIG[status] || { color: '#9e9e9e', label: 'Indefinido' };
  const dotSize = size === 'large' ? 12 : 8;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box
        sx={{
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          backgroundColor: config.color,
          flexShrink: 0
        }}
      />
      {showLabel && (
        <Typography 
          variant={size === 'large' ? 'body1' : 'body2'}
          sx={{ color: 'text.secondary' }}
        >
          {config.label}
        </Typography>
      )}
    </Box>
  );
});

StatusIndicator.displayName = 'StatusIndicator';

export default StatusIndicator;
