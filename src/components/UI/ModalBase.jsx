/**
 * ModalBase — Wrapper padronizado para todos os modais do sistema.
 *
 * Fornece:
 *  - Header com gradiente, ícone, título, subtítulo e botão fechar
 *  - DialogContent com padding consistente
 *  - DialogActions com padding consistente
 *  - Transição Fade e borderRadius uniformes
 */

import { memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Fade,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

const HEADER_GRADIENT = 'linear-gradient(135deg, #1E4976 0%, #2d6aa3 50%, #3d8bd4 100%)';

const ModalBase = memo(({
  open,
  onClose,
  maxWidth = 'sm',
  fullWidth = true,
  icon: Icon,
  title,
  subtitle,
  children,
  actions,
  loading = false,
  contentSx = {},
}) => (
  <Dialog
    open={open}
    onClose={loading ? undefined : onClose}
    maxWidth={maxWidth}
    fullWidth={fullWidth}
    TransitionComponent={Fade}
    transitionDuration={200}
    PaperProps={{
      sx: {
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.12)',
      },
    }}
  >
    {/* Header */}
    <Box
      sx={{
        background: HEADER_GRADIENT,
        py: 2.5,
        px: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Box display="flex" alignItems="center" gap={1.5}>
        {Icon && <Icon sx={{ color: 'white', fontSize: '1.75rem' }} />}
        <Box>
          <Typography
            variant="h6"
            sx={{ color: 'white !important', fontWeight: 600, lineHeight: 1.3, mt: '0 !important' }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="body2"
              sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.25 }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>

      <IconButton
        onClick={onClose}
        disabled={loading}
        size="small"
        sx={{
          color: 'rgba(255,255,255,0.8)',
          '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.15)' },
          '&.Mui-disabled': { color: 'rgba(255,255,255,0.4)' },
        }}
      >
        <CloseRoundedIcon />
      </IconButton>
    </Box>

    {/* Content */}
    {children && (
      <DialogContent sx={{ p: 3, ...contentSx }}>
        {children}
      </DialogContent>
    )}

    {/* Actions */}
    {actions && (
      <DialogActions sx={{ px: 3, pb: 3, pt: 0, gap: 1 }}>
        {actions}
      </DialogActions>
    )}
  </Dialog>
));

ModalBase.displayName = 'ModalBase';

export default ModalBase;
