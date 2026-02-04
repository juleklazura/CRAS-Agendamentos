/**
 * EmptyState - Estado Vazio com Mensagem
 * 
 * Componente para exibir quando não há dados disponíveis.
 */

import { memo } from 'react';
import { Box, Typography } from '@mui/material';

const EmptyState = memo(({ 
  message = 'Nenhum item encontrado',
  icon: Icon,
  action
}) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      p: 4,
      textAlign: 'center',
      minHeight: 200
    }}
  >
    {Icon && (
      <Icon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
    )}
    <Typography variant="h6" sx={{ color: 'grey.600', mb: 1 }}>
      {message}
    </Typography>
    {action}
  </Box>
));

EmptyState.displayName = 'EmptyState';

export default EmptyState;
