// Componente de busca e exportação de agendamentos
// Separado para melhor organização e reutilização

import { Box, TextField, Button } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

/**
 * Barra de busca com campo de texto e botão de exportação
 * @param {Object} props
 * @param {string} props.search - Valor atual da busca
 * @param {Function} props.onSearchChange - Callback quando busca muda
 * @param {Function} props.onExport - Callback para exportação
 * @param {Object} props.searchInputRef - Ref para o input de busca
 * @param {boolean} props.loading - Se está carregando
 */
export default function BarraBusca({ 
  search, 
  onSearchChange, 
  onExport, 
  searchInputRef,
  loading 
}) {
  return (
    <Box 
      display="flex" 
      gap={2} 
      mb={2} 
      sx={{ 
        flexDirection: { xs: 'column', sm: 'row' },
        width: '100%'
      }}
    >
      <TextField
        inputRef={searchInputRef}
        label="Buscar por nome, CPF, telefone ou motivo"
        variant="outlined"
        fullWidth
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        disabled={loading}
        sx={{ flex: 1 }}
      />
      <Button
        variant="contained"
        color="success"
        startIcon={<FileDownloadIcon />}
        onClick={onExport}
        disabled={loading}
        sx={{ 
          minWidth: { xs: '100%', sm: '150px' },
          height: '56px'
        }}
      >
        Exportar CSV
      </Button>
    </Box>
  );
}
