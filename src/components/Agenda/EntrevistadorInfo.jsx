/**
 * EntrevistadorInfo - Card de informações do entrevistador logado
 */

import { memo } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';

const EntrevistadorInfo = memo(({ user }) => (
  <Card elevation={2} sx={{ mb: 3 }}>
    <CardContent>
      <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
        <PersonIcon color="primary" />
        Informações do Entrevistador
      </Typography>
      
      <Box sx={{ p: 2, backgroundColor: '#f8f9fa', borderRadius: 1 }}>
        <Typography variant="body1" fontWeight="medium">
          👤 {user.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          ✉️ {user.email}
        </Typography>
        {user.cras && (
          <Typography variant="body2" color="text.secondary">
            🏢 CRAS: {user.cras}
          </Typography>
        )}
      </Box>
    </CardContent>
  </Card>
));

EntrevistadorInfo.displayName = 'EntrevistadorInfo';

export default EntrevistadorInfo;
