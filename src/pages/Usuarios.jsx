import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import { Button, TextField, Select, MenuItem, InputLabel, FormControl, Snackbar, Alert, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, IconButton, Typography, Box, TablePagination } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { exportToCSV } from '../utils/csvExport';

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState({ name: '', matricula: '', password: '', role: 'entrevistador', cras: '' });
  const [editId, setEditId] = useState(null);
  const [crasList, setCrasList] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const token = localStorage.getItem('token');

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/users', { headers: { Authorization: `Bearer ${token}` } });
      setUsuarios(res.data);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      setError('Erro ao buscar usuários');
    }
    setLoading(false);
  }, [token]);

  const fetchCras = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/cras', { headers: { Authorization: `Bearer ${token}` } });
      setCrasList(res.data);
    } catch (error) {
      console.error('Erro ao buscar CRAS:', error);
      setError('Erro ao buscar CRAS');
    }
  }, [token]);

  useEffect(() => {
    fetchUsuarios();
    fetchCras();
  }, [fetchUsuarios, fetchCras]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.name || !form.matricula || (editId ? false : !form.password) || !form.role || (form.role !== 'admin' && !form.cras)) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }
    if (form.password && form.password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    try {
      if (editId) {
        await axios.put(`http://localhost:5000/api/users/${editId}`, form, { headers: { Authorization: `Bearer ${token}` } });
        setSuccess('Usuário atualizado com sucesso!');
      } else {
        await axios.post('http://localhost:5000/api/users', form, { headers: { Authorization: `Bearer ${token}` } });
        setSuccess('Usuário criado com sucesso!');
      }
      setForm({ name: '', matricula: '', password: '', role: 'entrevistador', cras: '' });
      setEditId(null);
      fetchUsuarios();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar usuário');
    }
  }

  function handleEdit(u) {
    setForm({ name: u.name, matricula: u.matricula, password: '', role: u.role, cras: u.cras?._id || '' });
    setEditId(u._id);
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
      await axios.delete(`http://localhost:5000/api/users/${deleteId}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchUsuarios();
      setSuccess('Usuário removido com sucesso!');
    } catch {
      setError('Erro ao remover usuário');
    }
    setLoading(false);
  }
  function exportToExcel() {
    const data = usuarios.map(u => ({ 
      Nome: u.name, 
      Matrícula: u.matricula, 
      Papel: u.role, 
      CRAS: u.cras?.nome || '-' 
    }));
    exportToCSV(data, 'usuarios.csv');
  }

  const filteredUsuarios = usuarios.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.matricula.toLowerCase().includes(search.toLowerCase()) ||
    (u.cras?.nome || '').toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Sidebar />
      <Box 
        component="main" 
        className="main-content"
      >
        <Typography variant="h4" className="main-page-title" sx={{fontWeight: 'bold'}} >Gerenciamento de Usuários</Typography>
        <TextField
          label="Buscar usuário"
          value={search}
          onChange={e => setSearch(e.target.value)}
          size="small"
          sx={{ mb: 2, width: 320 }}
        />
        <Paper sx={{ p: 2}}>
          <Typography variant="h6" sx={{fontWeight: 'bold', color: 'primary.main', mt: '0 !important' }}>
            {editId ? 'Editar Usuário' : 'Criar Novo Usuário'}
          </Typography>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField name="name" label="Nome" value={form.name} onChange={handleChange} required size="small" />
            <TextField name="matricula" label="Matrícula" value={form.matricula} onChange={handleChange} required size="small" />
            <TextField name="password" label="Senha" value={form.password} onChange={handleChange} type="password" required={!editId} size="small" />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Papel</InputLabel>
              <Select name="role" value={form.role} onChange={handleChange} required label="Papel">
                <MenuItem value="admin">Administrador</MenuItem>
                <MenuItem value="entrevistador">Entrevistador</MenuItem>
                <MenuItem value="recepcao">Recepção</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>CRAS</InputLabel>
              <Select name="cras" value={form.cras} onChange={handleChange} required={form.role !== 'admin'} label="CRAS">
                <MenuItem value="">Selecione o CRAS</MenuItem>
                {crasList.map(c => <MenuItem key={c._id} value={c._id}>{c.nome}</MenuItem>)}
              </Select>
            </FormControl>
            <Button type="submit" variant="contained" color="success">{editId ? 'Salvar' : 'Criar'}</Button>
            {editId && <Button type="button" onClick={() => { setEditId(null); setForm({ name: '', matricula: '', password: '', role: 'entrevistador', cras: '' }); }} color="inherit">Cancelar</Button>}
            <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={exportToExcel}>Exportar</Button>
          </form>
        </Paper>
        {loading && <CircularProgress sx={{ display: 'block', mx: 'auto', my: 2 }} />}
        <Snackbar open={!!error} autoHideDuration={4000} onClose={() => setError('')}><Alert severity="error">{error}</Alert></Snackbar>
        <Snackbar open={!!success} autoHideDuration={4000} onClose={() => setSuccess('')}><Alert severity="success">{success}</Alert></Snackbar>
        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
          <DialogTitle>Confirmar remoção</DialogTitle>
          <DialogContent><DialogContentText>Tem certeza que deseja remover este usuário?</DialogContentText></DialogContent>
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
                <TableCell>Matrícula</TableCell>
                <TableCell>Papel</TableCell>
                <TableCell>CRAS</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsuarios.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(u => (
                <TableRow key={u._id} selected={editId === u._id}>
                  <TableCell>{u.name}</TableCell>
                  <TableCell>{u.matricula}</TableCell>
                  <TableCell>{u.role}</TableCell>
                  <TableCell>{u.cras?.nome || '-'}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleEdit(u)} color="primary"><EditIcon /></IconButton>
                    <IconButton onClick={() => handleDelete(u._id)} color="error"><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="pagination-container">
            <TablePagination
              component="div"
              count={filteredUsuarios.length}
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
