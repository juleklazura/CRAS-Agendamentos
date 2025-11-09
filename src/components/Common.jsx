// Componentes comuns reutilizáveis do sistema
// Centraliza componentes que são usados em múltiplas páginas para consistência
import React, { memo } from 'react';
import {
  Snackbar,
  Alert,
  CircularProgress,
  Box,
  Backdrop,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography
} from '@mui/material';

/**
 * Componente de notificação global otimizado
 * Exibe mensagens de feedback para o usuário (sucesso, erro, aviso, info)
 * @param {boolean} open - Se a notificação está visível
 * @param {string} message - Texto da mensagem
 * @param {string} severity - Tipo da mensagem (success, error, warning, info)
 * @param {function} onClose - Função para fechar a notificação
 * @param {number} autoHideDuration - Tempo em ms para auto-ocultar
 */
export const NotificationSnackbar = memo(({ 
  open, 
  message, 
  severity = 'info', 
  onClose,
  autoHideDuration = 6000 
}) => (
  <Snackbar
    open={open}
    autoHideDuration={autoHideDuration}
    onClose={onClose}
    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
  >
    <Alert
      onClose={onClose}
      severity={severity}
      variant="filled"
      sx={{ width: '100%' }}
    >
      {message}
    </Alert>
  </Snackbar>
));

NotificationSnackbar.displayName = 'NotificationSnackbar';

/**
 * Componente de loading global otimizado
 * Exibe indicador de carregamento com backdrop para bloquear interações
 */
export const GlobalLoader = memo(({ open, message = 'Carregando...' }) => (
  <Backdrop
    sx={{ 
      color: '#fff', 
      zIndex: (theme) => theme.zIndex.drawer + 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }}
    open={open}
  >
    <CircularProgress color="inherit" size={60} />
    <Typography variant="h6" component="div">
      {message}
    </Typography>
  </Backdrop>
));

GlobalLoader.displayName = 'GlobalLoader';

/**
 * ❓ Modal de confirmação reutilizável e otimizado
 */
export const ConfirmDialog = memo(({
  open,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  severity = 'warning'
}) => {
  const getSeverityColor = () => {
    switch (severity) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'primary';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {title}
      </DialogTitle>
      <DialogContent>
        <Typography>
          {message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button 
          onClick={onCancel}
          variant="outlined"
        >
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={getSeverityColor()}
          autoFocus
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

ConfirmDialog.displayName = 'ConfirmDialog';

/**
 * 🎯 Container de página padronizado e otimizado
 */
export const PageContainer = memo(({ children, title, maxWidth = 'xl' }) => (
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
          sx={{ 
            fontWeight: 'bold',
            color: 'primary.main',
            mb: 3
          }}
        >
          {title}
        </Typography>
      )}
      {children}
    </Box>
  </Box>
));

PageContainer.displayName = 'PageContainer';

/**
 * 📝 Card de informações reutilizável
 */
export const InfoCard = memo(({ 
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
        <Typography 
          variant="h6" 
          component="h2"
          sx={{ fontWeight: 'medium' }}
        >
          {title}
        </Typography>
        {actions && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {actions}
          </Box>
        )}
      </Box>
    )}
    {children}
  </Box>
));

InfoCard.displayName = 'InfoCard';

/**
 * 📊 Indicador de status otimizado
 */
export const StatusIndicator = memo(({ 
  status, 
  size = 'small',
  showLabel = true 
}) => {
  const getStatusConfig = () => {
    const configs = {
      'livre': { color: '#4caf50', label: 'Disponível' },
      'agendado': { color: '#2196f3', label: 'Agendado' },
      'realizado': { color: '#4caf50', label: 'Realizado' },
      'bloqueado': { color: '#ff9800', label: 'Bloqueado' },
      'cancelado': { color: '#f44336', label: 'Cancelado' }
    };
    
    return configs[status] || { color: '#9e9e9e', label: 'Indefinido' };
  };

  const config = getStatusConfig();
  const dotSize = size === 'large' ? 12 : 8;

  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 1 
    }}>
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

/**
 * 🔄 Estado vazio otimizado
 */
export const EmptyState = memo(({ 
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
      <Icon 
        sx={{ 
          fontSize: 64, 
          color: 'grey.400',
          mb: 2 
        }} 
      />
    )}
    <Typography 
      variant="h6" 
      sx={{ 
        color: 'grey.600',
        mb: 1
      }}
    >
      {message}
    </Typography>
    {action}
  </Box>
));

EmptyState.displayName = 'EmptyState';
