/**
 * LogDetailModal - Modal de detalhes do log
 */

import { memo } from 'react';
import {
  Button,
  Typography,
  Box,
  Paper,
  Chip,
  Divider,
  Grid,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import EventIcon from '@mui/icons-material/Event';
import CategoryIcon from '@mui/icons-material/Category';
import { ModalBase } from '../UI';

// Helper para cor da ação
const getActionColor = (action) => {
  const a = action.toLowerCase();
  if (a.includes('login')) return 'info';
  if (a.includes('criar') || a.includes('cadastr')) return 'success';
  if (a.includes('edit') || a.includes('atualiz')) return 'warning';
  if (a.includes('exclu') || a.includes('delet')) return 'error';
  if (a.includes('bloque')) return 'secondary';
  return 'default';
};

// Card de informação interno
const InfoBox = memo(({ icon: IconComp, label, children }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 1,
      p: 2,
      borderRadius: 2,
      border: '1px solid',
      borderColor: 'grey.300',
      bgcolor: 'grey.50',
      height: '100%',
      minHeight: 100,
      transition: 'all 0.2s',
      '&:hover': { borderColor: 'primary.main', bgcolor: '#e8f0f8', boxShadow: 1 },
    }}
  >
    <IconComp color="primary" />
    <Box flex={1}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: '4px' }}>
        {label}
      </Typography>
      {children}
    </Box>
  </Box>
));

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
      second: '2-digit',
    });
  };

  return (
    <ModalBase
      open={open}
      onClose={onClose}
      maxWidth="md"
      icon={InfoOutlinedIcon}
      title="Detalhes do Log"
      subtitle={log.action}
      actions={
        <Button onClick={onClose} variant="contained" size="large">
          Fechar
        </Button>
      }
    >
      {/* ID */}
      <Box mb={2.5}>
        <Typography variant="overline" color="text.secondary" fontWeight="bold">
          ID do Registro
        </Typography>
        <Typography
          variant="body2"
          sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', p: 1, borderRadius: 1, mt: 0.5 }}
        >
          {log.id}
        </Typography>
      </Box>

      <Divider sx={{ mb: 2.5 }} />

      {/* Grid de informações */}
      <Grid container spacing={2} mb={2.5}>
        <Grid size={{ xs: 12, md: 6 }}>
          <InfoBox icon={PersonIcon} label="Usuário">
            <Typography variant="body1" fontWeight={600}>
              {log.user?.name || 'Não identificado'}
            </Typography>
            {log.user && (
              <Box mt={1}>
                <Chip label={log.user.role || 'Sem perfil'} size="small" color="primary" variant="outlined" />
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
            <Typography variant="body1" fontWeight={600}>
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
            <Typography variant="body1" fontWeight={600}>
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

      <Divider sx={{ mb: 2.5 }} />

      {/* Detalhes da Ação */}
      <Box mb={2.5}>
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
      <Box p={2} bgcolor="grey.100" borderRadius={1}>
        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
          <strong>Informações Técnicas</strong>
        </Typography>
        <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
          ID Usuário: {log.user?.id || 'N/A'}
        </Typography>
        <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
          ID CRAS: {log.cras?.id || 'N/A'}
        </Typography>
        <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
          Timestamp: {log.date ? new Date(log.date).getTime() : 'N/A'}
        </Typography>
      </Box>
    </ModalBase>
  );
});

LogDetailModal.displayName = 'LogDetailModal';

export default LogDetailModal;
