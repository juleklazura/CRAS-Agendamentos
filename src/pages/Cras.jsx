// Componente CRAS - Gerencia unidades do Centro de Referência de Assistência Social
// Permite criar, editar, listar e excluir unidades CRAS (apenas para administradores)
import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';  // Cliente HTTP configurado com httpOnly cookies
import Sidebar from '../components/Sidebar';  // Navegação lateral

// Componentes Material-UI para interface completa
import { 
  Button, 
  TextField, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  CircularProgress, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogContentText, 
  DialogActions, 
  IconButton, 
  Typography, 
  Box, 
  Snackbar, 
  Alert, 
  TablePagination 
} from '@mui/material';

// Ícones para ações
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

// Utilitário para exportação
import { exportToCSV } from '../utils/csvExport';

// Componente principal para gerenciamento de CRAS
export default function Cras() {
  // Estados principais para dados e controle
  const [cras, setCras] = useState([]);  // Lista de unidades CRAS
  const [form, setForm] = useState({ nome: '', endereco: '', telefone: '' });  // Formulário
  const [editId, setEditId] = useState(null);  // ID do CRAS sendo editado
  const [error, setError] = useState('');      // Mensagens de erro
  const [success, setSuccess] = useState('');  // Mensagens de sucesso
  const [loading, setLoading] = useState(false);  // Estado de carregamento
  const [confirmOpen, setConfirmOpen] = useState(false);  // Modal de confirmação
  const [deleteId, setDeleteId] = useState(null);  // ID para exclusão
  const [search, setSearch] = useState('');     // Termo de busca
  const [page, setPage] = useState(0);          // Página atual (paginação)
  const [rowsPerPage, setRowsPerPage] = useState(10);  // Itens por página

  const fetchCras = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/cras');
      setCras(res.data);
    } catch (error) {
      console.error('Erro ao buscar CRAS:', error);
      setError('Erro ao buscar CRAS');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCras();
  }, [fetchCras]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.nome || !form.endereco) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      if (editId) {
        await api.put(`/cras/${editId}`, form);
        setSuccess('CRAS atualizado com sucesso!');
      } else {
        await api.post('/cras', form);
        setSuccess('CRAS criado com sucesso!');
      }
      setForm({ nome: '', endereco: '', telefone: '' });
      setEditId(null);
      fetchCras();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar CRAS');
    }
  }

  function handleEdit(c) {
    setForm({ nome: c.nome, endereco: c.endereco, telefone: c.telefone });
    setEditId(c._id);
    setError('');
    setSuccess('');
  }

  async function handleDelete(id) {
    setDeleteId(id);
    setConfirmOpen(true);
  }
  async function confirmDelete() {
    setConfirmOpen(false);
    setLoading(true);
    try {
      await api.delete(`/cras/${deleteId}`);
      fetchCras();
      setSuccess('CRAS removido com sucesso!');
    } catch {
      setError('Erro ao remover CRAS');
    }
    setLoading(false);
  }
  function exportToExcel() {
    const data = cras.map(c => ({ 
      Nome: c.nome, 
      Endereço: c.endereco, 
      Telefone: c.telefone 
    }));
    exportToCSV(data, 'cras.csv');
  }

  const filteredCras = cras.filter(c =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.endereco.toLowerCase().includes(search.toLowerCase()) ||
    (c.telefone || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Sidebar />
      <Box 
        component="main" 
        className="main-content"
      >
        <Typography variant="h4" className="main-page-title" sx={{fontWeight: 'bold'}} >Gerenciamento de CRAS</Typography>
        <TextField
          label="Buscar CRAS"
          value={search}
          onChange={e => setSearch(e.target.value)}
          size="small"
          sx={{ mb: 2, width: 320 }}
        />
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{fontWeight: 'bold', color: 'primary.main', mt: '0 !important' }}>
            {editId ? 'Editar CRAS' : 'Criar Novo CRAS'}
          </Typography>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField name="nome" label="Nome" value={form.nome} onChange={handleChange} required size="small" />
            <TextField name="endereco" label="Endereço" value={form.endereco} onChange={handleChange} required size="small" />
            <TextField name="telefone" label="Telefone" value={form.telefone} onChange={handleChange} size="small" />
            <Button type="submit" variant="contained" color="success">{editId ? 'Salvar' : 'Criar'}</Button>
            {editId && <Button type="button" onClick={() => { setEditId(null); setForm({ nome: '', endereco: '', telefone: '' }); }} color="inherit">Cancelar</Button>}
            <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={exportToExcel}>Exportar</Button>
          </form>
        </Paper>
        {loading && <CircularProgress sx={{ display: 'block', mx: 'auto', my: 2 }} />}
        <Snackbar 
          open={!!error} 
          autoHideDuration={4000} 
          onClose={(e, reason) => { if (reason !== 'clickaway') setError(''); }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{ mb: 2, mr: 2 }}
        >
          <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
        </Snackbar>
        <Snackbar 
          open={!!success} 
          autoHideDuration={4000} 
          onClose={(e, reason) => { if (reason !== 'clickaway') setSuccess(''); }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{ mb: 2, mr: 2 }}
        >
          <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>
        </Snackbar>
        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
          <DialogTitle>Confirmar remoção</DialogTitle>
          <DialogContent><DialogContentText>Tem certeza que deseja remover este CRAS?</DialogContentText></DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={confirmDelete} color="error">Remover</Button>
          </DialogActions>
        </Dialog>
        <TableContainer component={Paper} sx={{ mt: 4 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Endereço</TableCell>
                <TableCell>Telefone</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCras.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(c => (
                <TableRow key={c._id} selected={editId === c._id}>
                  <TableCell>{c.nome}</TableCell>
                  <TableCell>{c.endereco}</TableCell>
                  <TableCell>{c.telefone}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleEdit(c)} color="primary"><EditIcon /></IconButton>
                    <IconButton onClick={() => handleDelete(c._id)} color="error"><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="pagination-container">
            <TablePagination
              component="div"
              count={filteredCras.length}
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
    </>
  );
}
