import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Snackbar, Alert, Typography, Box, Button, TablePagination, TextField as MuiTextField } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import * as XLSX from 'xlsx';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const token = localStorage.getItem('token');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/logs', { headers: { Authorization: `Bearer ${token}` } });
      setLogs(res.data);
    } catch {
      setError('Erro ao buscar logs');
    }
    setLoading(false);
  }, [token]);

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
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Logs');
    XLSX.writeFile(wb, 'logs.xlsx');
  }

  const filteredLogs = logs.filter(l =>
    (l.user?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.cras?.nome || '').toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    (l.details || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar />
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1,
          p: 3,
          marginLeft: '240px',
          minHeight: '100vh',
          backgroundColor: '#f5f5f5'
        }}
      >
        <Typography variant="h4" mb={2}>Logs do Sistema</Typography>
        
        <Box mb={3} display="flex" gap={2}>
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
                <TableCell>Usuário</TableCell>
                <TableCell>CRAS</TableCell>
                <TableCell>Ação</TableCell>
                <TableCell>Detalhes</TableCell>
                <TableCell>Data</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(l => (
                <TableRow key={l._id}>
                  <TableCell>{l.user?.name || '-'}</TableCell>
                  <TableCell>{l.cras?.nome || '-'}</TableCell>
                  <TableCell>{l.action}</TableCell>
                  <TableCell>{l.details}</TableCell>
                  <TableCell>{l.date ? new Date(l.date).toLocaleString() : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
        </TableContainer>
      </Box>
    </Box>
  );
}
