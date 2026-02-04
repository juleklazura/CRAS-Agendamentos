/**
 * LogDetailModal - Modal de detalhes do log
 */

import { memo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Paper,
  Chip,
  Divider,
  Grid,
  IconButton
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import EventIcon from '@mui/icons-material/Event';
import CategoryIcon from '@mui/icons-material/Category';

// Helper para cor da ação
const getActionColor = (action) => {
  const actionLower = action.toLowerCase();
  if (actionLower.includes('login')) return 'info';
  if (actionLower.includes('criar') || actionLower.includes('cadastr')) return 'success';
  if (actionLower.includes('edit') || actionLower.includes('atualiz')) return 'warning';
  if (actionLower.includes('exclu') || actionLower.includes('delet')) return 'error';
  if (actionLower.includes('bloque')) return 'secondary';
  return 'default';
};

// Estilo comum para cards de informação
const infoCardStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 1,
  p: 2,
  borderRadius: 2,
  border: '1px solid',
  borderColor: 'grey.300',
  bgcolor: 'grey.50',
  transition: 'all 0.3s',
  height: '100%',
  minHeight: 120,
  '&:hover': {
    borderColor: 'primary.main',
    bgcolor: 'primary.lighter',
    boxShadow: 1
  }
};

// Componente de informação
const InfoBox = memo(({ icon, label, children }) => {
  const IconComp = icon;
  return (
    <Box sx={infoCardStyle}>
      <IconComp color="primary" />
      <Box flex={1}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: '4px' }}>
          {label}
        </Typography>
        {children}
      </Box>
    </Box>
  );
});

InfoBox.displayName = 'InfoBox';

const LogDetailModal = memo(({ open, onClose, log }) => {
  if (!log) return null;

  const formatFullDate = (date) => {
    if (!date) return 'Não disponível';
    return new Date(date).toLocaleString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        bgcolor: 'primary.main',
        color: 'white',
        py: 2,
        px: 3
      }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <InfoIcon sx={{ fontSize: '1.75rem' }} />
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Detalhes Completos do Log
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white' }} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {/* ID do Log */}
        <Box mb={3}>
          <Typography variant="overline" color="text.secondary" fontWeight="bold">
            ID do Registro
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', p: 1, borderRadius: 1, mt: 0.5 }}
          >
            {log._id}
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Grid de informações */}
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <InfoBox icon={PersonIcon} label="Usuário">
              <Typography variant="body1" fontWeight="medium">
                {log.user?.name || 'Não identificado'}
              </Typography>
              {log.user && (
                <Box mt={1}>
                  <Chip 
                    label={log.user.role || 'Sem perfil'} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                  />
                  {log.user.matricula && (
                    <Typography variant="caption" display="block" mt={0.5} color="text.secondary">
                      Matrícula: {log.user.matricula}
                    </Typography>
                  )}
                </Box>
              )}
            </InfoBox>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <InfoBox icon={BusinessIcon} label="CRAS">
              <Typography variant="body1" fontWeight="medium">
                {log.cras?.nome || 'Não vinculado'}
              </Typography>
              {log.cras?.endereco && (
                <Typography variant="caption" display="block" mt={0.5} color="text.secondary">
                  {log.cras.endereco}
                </Typography>
              )}
            </InfoBox>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <InfoBox icon={CategoryIcon} label="Tipo de Ação">
              <Chip 
                label={log.action} 
                color={getActionColor(log.action)}
                sx={{ mt: 0.5, fontWeight: 'bold' }}
              />
            </InfoBox>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <InfoBox icon={EventIcon} label="Data e Hora">
              <Typography variant="body1" fontWeight="medium">
                {formatFullDate(log.date)}
              </Typography>
              {log.date && (
                <Typography variant="caption" display="block" mt={0.5} color="text.secondary">
                  {new Date(log.date).toISOString()}
                </Typography>
              )}
            </InfoBox>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Detalhes da Ação */}
        <Box>
          <Typography variant="subtitle2" color="text.secondary" fontWeight="bold" gutterBottom>
            Detalhes da Ação
          </Typography>
          <Paper 
            elevation={0} 
            sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}
          >
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {log.details || 'Sem detalhes adicionais'}
            </Typography>
          </Paper>
        </Box>

        {/* Informações Técnicas */}
        <Box mt={3} p={2} bgcolor="info.lighter" borderRadius={1}>
          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
            <strong>Informações Técnicas:</strong>
          </Typography>
          <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
            • ID do Usuário: {log.user?._id || 'N/A'}
          </Typography>
          <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
            • ID do CRAS: {log.cras?._id || 'N/A'}
          </Typography>
          <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
            • Timestamp Unix: {log.date ? new Date(log.date).getTime() : 'N/A'}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained">Fechar</Button>
      </DialogActions>
    </Dialog>
  );
});

LogDetailModal.displayName = 'LogDetailModal';

export default LogDetailModal;
