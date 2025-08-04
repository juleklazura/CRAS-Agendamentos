import { useEffect, useState, useCallback } from 'react';
import api from '../utils/axiosConfig';
import Sidebar from '../components/Sidebar';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Snackbar, Alert, Typography, Box, Button, TablePagination, TextField as MuiTextField } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DescriptionIcon from '@mui/icons-material/Description';
import { exportToCSV } from '../utils/csvExport';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/logs');
      setLogs(res.data);
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
      Data: l.date ? new Date(l.date).toLocaleString() : '-'
    }));
    exportToCSV(data, 'logs.csv');
  }

  const filteredLogs = logs.filter(l =>
    (l.user?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.cras?.nome || '').toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    (l.details || '').toLowerCase().includes(search.toLowerCase())
  );

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
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
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
                  <TableRow key={l._id}>
                    <TableCell>{l.user?.name || '-'}</TableCell>
                    <TableCell>{l.cras?.nome || '-'}</TableCell>
                    <TableCell>{l.action}</TableCell>
                    <TableCell>{l.details}</TableCell>
                    <TableCell>{l.date ? new Date(l.date).toLocaleString() : '-'}</TableCell>
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
      </Box>
    </>
  );
}
