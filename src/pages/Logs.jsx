import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import { 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  CircularProgress, 
  Snackbar, 
  Alert, 
  Typography, 
  Box, 
  Button, 
  TablePagination, 
  TextField as MuiTextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Divider,
  Grid
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DescriptionIcon from '@mui/icons-material/Description';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import EventIcon from '@mui/icons-material/Event';
import CategoryIcon from '@mui/icons-material/Category';
import { exportToCSV } from '../utils/csvExport';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/logs');
      // Ordenar logs por data decrescente (mais novo primeiro)
      const logsOrdenados = res.data.sort((a, b) => {
        const dataA = new Date(a.date);
        const dataB = new Date(b.date);
        return dataB.getTime() - dataA.getTime();
      });
      setLogs(logsOrdenados);
    } catch {
      setError('Erro ao buscar logs');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  function exportToExcel() {
    const data = logs.map(l => ({
      Usuário: l.user?.name || '-',
      CRAS: l.cras?.nome || '-',
      Ação: l.action,
      Detalhes: l.details,
      Data: l.date ? new Date(l.date).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) : '-'
    }));
    exportToCSV(data, 'logs.csv');
  }

  const filteredLogs = logs.filter(l =>
    (l.user?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.cras?.nome || '').toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    (l.details || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenModal = (log) => {
    setSelectedLog(log);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedLog(null);
  };

  const getActionColor = (action) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('login')) return 'info';
    if (actionLower.includes('criar') || actionLower.includes('cadastr')) return 'success';
    if (actionLower.includes('edit') || actionLower.includes('atualiz')) return 'warning';
    if (actionLower.includes('exclu') || actionLower.includes('delet')) return 'error';
    if (actionLower.includes('bloque')) return 'secondary';
    return 'default';
  };

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
          <Box mb={3} display="flex" gap={2} justifyContent="flex-start">
            <MuiTextField
              label="Buscar log"
              value={search}
              onChange={e => setSearch(e.target.value)}
              size="small"
              sx={{ width: 320 }}
            />
            <Button 
              variant="outlined" 
              startIcon={<FileDownloadIcon />} 
              onClick={exportToExcel}
            >
              Exportar
            </Button>
          </Box>

        {loading && <CircularProgress sx={{ display: 'block', mx: 'auto', my: 2 }} />}
        
        <Snackbar open={!!error} autoHideDuration={4000} onClose={() => setError('')}>
          <Alert severity="error">{error}</Alert>
        </Snackbar>
        
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Usuário</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>CRAS</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Ação</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Detalhes</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Data</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                    <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                      <DescriptionIcon color="disabled" sx={{ fontSize: 48 }} />
                      <Typography variant="body1" color="text.secondary">
                        {search ? 'Nenhum log encontrado para a busca realizada' : 'Nenhum log registrado no sistema'}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(l => (
                  <TableRow key={l._id} hover>
                    <TableCell>{l.user?.name || '-'}</TableCell>
                    <TableCell>{l.cras?.nome || '-'}</TableCell>
                    <TableCell>{l.action}</TableCell>
                    <TableCell>
                      {l.details && l.details.length > 50 
                        ? `${l.details.substring(0, 50)}...` 
                        : l.details || '-'
                      }
                    </TableCell>
                    <TableCell>
                      {l.date ? new Date(l.date).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      }) : '-'}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpenModal(l)}
                        title="Ver detalhes completos"
                      >
                        <InfoIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="pagination-container">
            <TablePagination
              component="div"
              count={filteredLogs.length}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[5, 10, 25, 50]}
              labelRowsPerPage="Linhas por página"
            />
          </div>
        </TableContainer>
        </Box>

        {/* Modal de Detalhes do Log */}
        <Dialog 
          open={modalOpen} 
          onClose={handleCloseModal}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 2 }
          }}
        >
          <DialogTitle sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            bgcolor: 'primary.main',
            color: 'white',
            py: 2,
            px: 3,
            m: '0 !important',
            minHeight: 64
          }}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <InfoIcon sx={{ color: 'white', fontSize: '1.75rem' }} />
              <Typography variant="h5" sx={{ color: 'white !important', fontWeight: 600, m: '0 !important', p: '0 !important' }}>
                Detalhes Completos do Log
              </Typography>
            </Box>
            <IconButton 
              onClick={handleCloseModal}
              sx={{ color: 'white' }}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent dividers sx={{ p: 3 }}>
            {selectedLog && (
              <Box>
                {/* ID do Log */}
                <Box mb={3}>
                  <Typography variant="overline" color="text.secondary" fontWeight="bold">
                    ID do Registro
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontFamily: 'monospace', 
                      bgcolor: 'grey.100', 
                      p: 1, 
                      borderRadius: 1,
                      mt: 0.5
                    }}
                  >
                    {selectedLog._id}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Informações do Usuário */}
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box 
                      display="flex" 
                      alignItems="center" 
                      gap={1}
                      sx={{
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
                      }}
                    >
                      <PersonIcon color="primary" />
                      <Box flex={1}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ m: '0 !important', mb: '4px !important' }}>
                          Usuário
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {selectedLog.user?.name || 'Não identificado'}
                        </Typography>
                        {selectedLog.user && (
                          <Box mt={1}>
                            <Chip 
                              label={selectedLog.user.role || 'Sem perfil'} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                            />
                            {selectedLog.user.matricula && (
                              <Typography variant="caption" display="block" mt={0.5} color="text.secondary">
                                Matrícula: {selectedLog.user.matricula}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box 
                      display="flex" 
                      alignItems="center" 
                      gap={1}
                      sx={{
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
                      }}
                    >
                      <BusinessIcon color="primary" />
                      <Box flex={1}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ m: '0 !important', mb: '4px !important' }}>
                          CRAS
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {selectedLog.cras?.nome || 'Não vinculado'}
                        </Typography>
                        {selectedLog.cras?.endereco && (
                          <Typography variant="caption" display="block" mt={0.5} color="text.secondary">
                            {selectedLog.cras.endereco}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box 
                      display="flex" 
                      alignItems="center" 
                      gap={1}
                      sx={{
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
                      }}
                    >
                      <CategoryIcon color="primary" />
                      <Box flex={1}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ m: '0 !important', mb: '4px !important' }}>
                          Tipo de Ação
                        </Typography>
                        <Chip 
                          label={selectedLog.action} 
                          color={getActionColor(selectedLog.action)}
                          sx={{ mt: 0.5, fontWeight: 'bold' }}
                        />
                      </Box>
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box 
                      display="flex" 
                      alignItems="center" 
                      gap={1}
                      sx={{
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
                      }}
                    >
                      <EventIcon color="primary" />
                      <Box flex={1}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ m: '0 !important', mb: '4px !important' }}>
                          Data e Hora
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {selectedLog.date ? new Date(selectedLog.date).toLocaleString('pt-BR', {
                            weekday: 'long',
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          }) : 'Não disponível'}
                        </Typography>
                        {selectedLog.date && (
                          <Typography variant="caption" display="block" mt={0.5} color="text.secondary">
                            {new Date(selectedLog.date).toISOString()}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                {/* Detalhes da Ação */}
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight="bold">
                    Detalhes da Ação
                  </Typography>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      bgcolor: 'grey.50', 
                      p: 2, 
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'grey.200',
                      mt: 1
                    }}
                  >
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {selectedLog.details || 'Sem detalhes adicionais'}
                    </Typography>
                  </Paper>
                </Box>

                {/* Informações Técnicas */}
                <Box mt={3} p={2} bgcolor="info.lighter" borderRadius={1}>
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    <strong>Informações Técnicas:</strong>
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
                    • ID do Usuário: {selectedLog.user?._id || 'N/A'}
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
                    • ID do CRAS: {selectedLog.cras?._id || 'N/A'}
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
                    • Timestamp Unix: {selectedLog.date ? new Date(selectedLog.date).getTime() : 'N/A'}
                  </Typography>
                </Box>
              </Box>
            )}
          </DialogContent>

          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseModal} variant="contained">
              Fechar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
}
