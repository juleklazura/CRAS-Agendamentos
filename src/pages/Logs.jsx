/**
 * Logs - Página de logs do sistema
 * Versão refatorada com componentes modulares
 */

import { 
  CircularProgress, 
  Snackbar, 
  Alert, 
  Typography, 
  Box, 
  Button, 
  TextField
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

import Sidebar from '../components/Sidebar';
import { LogsTable, LogDetailModal } from '../components/Logs';
import useLogs from '../hooks/useLogs';

export default function Logs() {
  const {
    paginatedLogs,
    filteredLogs,
    loading,
    error,
    search,
    page,
    rowsPerPage,
    selectedLog,
    modalOpen,
    setSearch,
    exportLogs,
    openModal,
    closeModal,
    handlePageChange,
    handleRowsPerPageChange,
    clearError
  } = useLogs();

  return (
    <>
      <Sidebar />
      <Box 
        component="main" 
        className="main-content"
        sx={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          maxWidth: 1200,
          margin: '0 auto',
          padding: 3
        }}
      >
        <Typography 
          variant="h4" 
          color="primary" 
          fontWeight="bold" 
          mb={3} 
          textAlign="center"
        >
          Logs do Sistema
        </Typography>
        
        <Box sx={{ width: '100%' }}>
          {/* Barra de ferramentas */}
          <Box mb={3} display="flex" gap={2} justifyContent="flex-start">
            <TextField
              label="Buscar log"
              value={search}
              onChange={e => setSearch(e.target.value)}
              size="small"
              sx={{ width: 320 }}
            />
            <Button 
              variant="outlined" 
              startIcon={<FileDownloadIcon />} 
              onClick={exportLogs}
            >
              Exportar
            </Button>
          </Box>

          {/* Loading */}
          {loading && (
            <CircularProgress sx={{ display: 'block', mx: 'auto', my: 2 }} />
          )}
          
          {/* Feedback de erro */}
          <Snackbar open={!!error} autoHideDuration={4000} onClose={clearError}>
            <Alert severity="error">{error}</Alert>
          </Snackbar>
          
          {/* Tabela de logs */}
          <LogsTable
            logs={paginatedLogs}
            totalCount={filteredLogs.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
            onViewDetails={openModal}
            search={search}
          />
        </Box>

        {/* Modal de detalhes */}
        <LogDetailModal
          open={modalOpen}
          onClose={closeModal}
          log={selectedLog}
        />
      </Box>
    </>
  );
}
