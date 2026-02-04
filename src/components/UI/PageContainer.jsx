/**
 * PageContainer - Container Padrão para Páginas
 * 
 * Fornece estrutura consistente para todas as páginas.
 */

import { memo } from 'react';
import { Box, Typography } from '@mui/material';

const PageContainer = memo(({ children, title, maxWidth = 'xl' }) => (
  <Box
    component="main"
    sx={{
      flexGrow: 1,
      p: 3,
      minHeight: '100vh',
      backgroundColor: 'grey.50'
    }}
  >
    <Box 
      sx={{ 
        maxWidth: maxWidth === 'full' ? '100%' : `${maxWidth}.main`,
        mx: 'auto'
      }}
    >
      {title && (
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom
          sx={{ fontWeight: 'bold', color: 'primary.main', mb: 3 }}
        >
          {title}
        </Typography>
      )}
      {children}
    </Box>
  </Box>
));

PageContainer.displayName = 'PageContainer';

export default PageContainer;
