/**
 * ConfirmDialog - Modal de Confirmação para Ações Críticas
 * 
 * Modal reutilizável e estilizado para solicitar confirmação antes de ações importantes.
 * Segue o padrão visual do sistema com gradientes, ícones e feedback visual.
 */

import { memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Fade
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';

const severityConfig = {
  error: {
    icon: DeleteOutlineRoundedIcon,
    gradient: 'linear-gradient(135deg, #d32f2f 0%, #f44336 50%, #ef5350 100%)',
    bgLight: '#fef2f2',
    borderColor: '#fecaca',
    iconBg: 'rgba(211, 47, 47, 0.1)',
    color: '#d32f2f',
    muiColor: 'error',
  },
  warning: {
    icon: WarningAmberRoundedIcon,
    gradient: 'linear-gradient(135deg, #e65100 0%, #f57c00 50%, #ff9800 100%)',
    bgLight: '#fff8e1',
    borderColor: '#ffe082',
    iconBg: 'rgba(230, 81, 0, 0.1)',
    color: '#e65100',
    muiColor: 'warning',
  },
  info: {
    icon: InfoOutlinedIcon,
    gradient: 'linear-gradient(135deg, #1565c0 0%, #1976d2 50%, #42a5f5 100%)',
    bgLight: '#e3f2fd',
    borderColor: '#90caf9',
    iconBg: 'rgba(25, 118, 210, 0.1)',
    color: '#1565c0',
    muiColor: 'info',
  },
};

const ConfirmDialog = memo(({
  open,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  severity = 'error',
  loading = false,
  confirmIcon: ConfirmIconProp,
}) => {
  const config = severityConfig[severity] || severityConfig.error;
  const SeverityIcon = config.icon;
  const ConfirmIcon = ConfirmIconProp || (severity === 'error' ? DeleteOutlineRoundedIcon : CheckRoundedIcon);

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onCancel}
      maxWidth="xs"
      fullWidth
      TransitionComponent={Fade}
      transitionDuration={250}
      PaperProps={{
        sx: {
          borderRadius: { xs: '12px', md: '16px' },
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
        }
      }}
    >
      {/* Header com gradiente */}
      <Box
        sx={{
          background: config.gradient,
          py: { xs: 3, md: 4 },
          px: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: -30,
            right: -30,
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: -20,
            left: -20,
            width: 70,
            height: 70,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.08)',
          },
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 1.5,
          }}
        >
          <SeverityIcon sx={{ fontSize: 36, color: '#fff' }} />
        </Box>
        <Typography
          variant="h6"
          sx={{
            color: '#fff',
            fontWeight: 700,
            textAlign: 'center',
            textShadow: '0 1px 2px rgba(0,0,0,0.1)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {title}
        </Typography>
      </Box>

      {/* Conteúdo */}
      <DialogContent sx={{ py: 3, px: 3, textAlign: 'center' }}>
        <Box
          sx={{
            backgroundColor: config.bgLight,
            border: `1px solid ${config.borderColor}`,
            borderRadius: '12px',
            p: 2.5,
          }}
        >
          <Typography
            variant="body1"
            sx={{
              color: '#424242',
              lineHeight: 1.6,
              '& strong': {
                color: '#1a1a1a',
                fontWeight: 600,
              },
            }}
          >
            {message}
          </Typography>
        </Box>
      </DialogContent>

      {/* Ações */}
      <DialogActions
        sx={{
          px: 3,
          pb: 3,
          pt: 0,
          gap: 1.5,
          justifyContent: 'center',
        }}
      >
        <Button
          onClick={onCancel}
          disabled={loading}
          variant="outlined"
          size="large"
          startIcon={<CloseRoundedIcon />}
          sx={{
            flex: 1,
            borderRadius: '10px',
            textTransform: 'none',
            fontWeight: 600,
            py: 1.2,
            borderColor: '#ccc',
            color: '#666',
            '&:hover': {
              borderColor: '#999',
              backgroundColor: '#f5f5f5',
            },
          }}
        >
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          variant="contained"
          color={config.muiColor}
          size="large"
          startIcon={
            loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <ConfirmIcon />
            )
          }
          sx={{
            flex: 1,
            borderRadius: '10px',
            textTransform: 'none',
            fontWeight: 600,
            py: 1.2,
            boxShadow: `0 4px 12px ${config.color}40`,
            '&:hover': {
              boxShadow: `0 6px 16px ${config.color}50`,
            },
          }}
        >
          {loading ? 'Processando...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

ConfirmDialog.displayName = 'ConfirmDialog';

export default ConfirmDialog;
