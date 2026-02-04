/**
 * InfoCard - Card de Informações Estilizado
 * 
 * Card reutilizável para exibir blocos de conteúdo.
 */

import { memo } from 'react';
import { Box, Typography } from '@mui/material';

const InfoCard = memo(({ 
  title, 
  children, 
  actions,
  elevation = 1,
  sx = {} 
}) => (
  <Box
    sx={{
      backgroundColor: 'white',
      borderRadius: 2,
      boxShadow: elevation,
      p: 3,
      ...sx
    }}
  >
    {title && (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 2,
        pb: 1,
        borderBottom: '1px solid',
        borderColor: 'grey.200'
      }}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 'medium' }}>
          {title}
        </Typography>
        {actions && <Box sx={{ display: 'flex', gap: 1 }}>{actions}</Box>}
      </Box>
    )}
    {children}
  </Box>
));

InfoCard.displayName = 'InfoCard';

export default InfoCard;
