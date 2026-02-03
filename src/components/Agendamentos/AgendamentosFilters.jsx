/**
 * Componente de Filtros e Ações de Agendamentos
 * Responsabilidade: Busca e exportação
 */
import { Box, TextField, Button } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

export default function AgendamentosFilters({ 
  search, 
  onSearchChange, 
  onExport,
  searchInputRef,
  disabled = false
}) {
  return (
    <Box 
      mb={{ xs: 2, md: 3 }} 
      display="flex" 
      gap={{ xs: 1.5, md: 2 }} 
      flexDirection={{ xs: 'column', sm: 'row' }}
    >
      <TextField
        inputRef={searchInputRef}
        label="Buscar agendamento"
        variant="outlined"
        size="small"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Nome, CPF, telefone..."
        autoFocus
        disabled={disabled}
        sx={{ 
          flex: 1,
          maxWidth: { sm: 400 }
        }}
        inputProps={{
          'aria-label': 'Campo de busca de agendamentos'
        }}
      />
      <Button
        startIcon={<FileDownloadIcon />}
        onClick={onExport}
        variant="contained"
        color="success"
        disabled={disabled}
        aria-label="Exportar agendamentos para CSV"
        sx={{
          minWidth: { xs: '100%', sm: 150 }
        }}
      >
        Exportar CSV
      </Button>
    </Box>
  );
}
