import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import { Button, TextField, Snackbar, Alert, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, IconButton, Typography, Box, TablePagination, TextField as MuiTextField } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import * as XLSX from 'xlsx';

export default function Cras() {
  const [cras, setCras] = useState([]);
  const [form, setForm] = useState({ nome: '', endereco: '', telefone: '' });
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const token = localStorage.getItem('token');

  const fetchCras = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/cras', { headers: { Authorization: `Bearer ${token}` } });
      setCras(res.data);
    } catch (err) {
      setError('Erro ao buscar CRAS');
    }
    setLoading(false);
  }, [token]);

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
        await axios.put(`http://localhost:5000/api/cras/${editId}`, form, { headers: { Authorization: `Bearer ${token}` } });
        setSuccess('CRAS atualizado com sucesso!');
      } else {
        await axios.post('http://localhost:5000/api/cras', form, { headers: { Authorization: `Bearer ${token}` } });
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
      await axios.delete(`http://localhost:5000/api/cras/${deleteId}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchCras();
      setSuccess('CRAS removido com sucesso!');
    } catch {
      setError('Erro ao remover CRAS');
    }
    setLoading(false);
  }
  function exportToExcel() {
    const data = cras.map(c => ({ Nome: c.nome, Endereço: c.endereco, Telefone: c.telefone }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'CRAS');
    XLSX.writeFile(wb, 'cras.xlsx');
  }

  const filteredCras = cras.filter(c =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.endereco.toLowerCase().includes(search.toLowerCase()) ||
    (c.telefone || '').toLowerCase().includes(search.toLowerCase())
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
        <Typography variant="h4" mb={2}>Gerenciamento de CRAS</Typography>
        <MuiTextField
          label="Buscar CRAS"
          value={search}
          onChange={e => setSearch(e.target.value)}
          size="small"
          sx={{ mb: 2, width: 320 }}
        />
        <Paper sx={{ p: 2, mb: 2 }}>
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
        <Snackbar open={!!error} autoHideDuration={4000} onClose={() => setError('')}><Alert severity="error">{error}</Alert></Snackbar>
        <Snackbar open={!!success} autoHideDuration={4000} onClose={() => setSuccess('')}><Alert severity="success">{success}</Alert></Snackbar>
        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
          <DialogTitle>Confirmar remoção</DialogTitle>
          <DialogContent><DialogContentText>Tem certeza que deseja remover este CRAS?</DialogContentText></DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={confirmDelete} color="error">Remover</Button>
          </DialogActions>
        </Dialog>
        <TableContainer component={Paper} sx={{ mt: 2 }}>
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
        </TableContainer>
      </Box>
    </Box>
  );
}
