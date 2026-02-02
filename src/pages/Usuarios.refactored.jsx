/**
 * Usuarios - Refatorado usando Composables
 * 
 * @module pages/Usuarios.refactored
 */

import { useEffect, useState, useCallback } from 'react';
import { useUsers } from '../composables/useUsers';
import { useCras } from '../composables/useCras';
import Sidebar from '../components/Sidebar';

import { 
  Button, TextField, Select, MenuItem, InputLabel, FormControl, 
  Snackbar, Alert, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, CircularProgress, Dialog, DialogTitle, DialogContent, 
  DialogContentText, DialogActions, IconButton, Typography, Box, TablePagination 
} from '@mui/material';

import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

import { exportToCSV } from '../utils/csvExport';

export default function Usuarios() {
  // ✅ Usar composables
  const {
    users,
    loading: usersLoading,
    error: usersError,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    clearError: clearUsersError
  } = useUsers();

  const {
    crasList,
    loading: crasLoading,
    fetchCras
  } = useCras();

  // Estados locais
  const [form, setForm] = useState({
    name: '', 
    matricula: '', 
    password: '', 
    role: 'entrevistador',
    cras: '' 
  });
  const [editId, setEditId] = useState(null);
  const [success, setSuccess] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Carregar dados iniciais
  useEffect(() => {
    fetchUsers();
    fetchCras();
  }, [fetchUsers, fetchCras]);

  // Handler de formulário
  function handleChange(e) {
    const { name, value } = e.target;
    const newForm = { ...form, [name]: value };
    
    if (name === 'role' && value === 'admin') {
      newForm.cras = '';
    }
    
    setForm(newForm);
    clearUsersError();
    setSuccess('');
  }

  // Submeter formulário
  async function handleSubmit(e) {
    e.preventDefault();
    clearUsersError();
    setSuccess('');
    
    if (!form.name || !form.matricula || (!editId && !form.password) || !form.role) {
      return;
    }

    if (form.role !== 'admin' && !form.cras) {
      return;
    }

    try {
      if (editId) {
        await updateUser(editId, form);
        setSuccess('Usuário atualizado com sucesso!');
      } else {
        await createUser(form);
        setSuccess('Usuário criado com sucesso!');
      }
      setForm({ name: '', matricula: '', password: '', role: 'entrevistador', cras: '' });
      setEditId(null);
    } catch (err) {
      // Erro já tratado no composable
    }
  }

  // Editar usuário
  function handleEdit(usuario) {
    setForm({ 
      name: usuario.name, 
      matricula: usuario.matricula, 
      password: '', 
      role: usuario.role, 
      cras: usuario.cras?._id || '' 
    });
    setEditId(usuario._id);
  }

  // Cancelar edição
  function cancelEdit() {
    setForm({ name: '', matricula: '', password: '', role: 'entrevistador', cras: '' });
    setEditId(null);
  }

  // Confirmar exclusão
  function handleDeleteClick(id) {
    setDeleteId(id);
    setConfirmOpen(true);
  }

  // Executar exclusão
  async function handleDelete() {
    try {
      await deleteUser(deleteId);
      setSuccess('Usuário excluído com sucesso!');
      setConfirmOpen(false);
      setDeleteId(null);
    } catch (err) {
      // Erro já tratado
    }
  }

  // Filtrar usuários
  const usuariosFiltrados = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.matricula.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  // Paginação
  const usuariosPaginados = usuariosFiltrados.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Exportar CSV
  const handleExportCSV = () => {
    const data = users.map(u => ({
      Nome: u.name,
      Matrícula: u.matricula,
      Role: u.role,
      CRAS: u.cras?.nome || '-'
    }));
    exportToCSV(data, 'usuarios.csv');
  };

  const loading = usersLoading || crasLoading;
  const error = usersError;

  return (
    <Box sx={{ display: 'flex', bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, p: 3 }}>
        <Typography variant="h4" gutterBottom>
          👥 Usuários
        </Typography>

        {/* Formulário */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {editId ? 'Editar Usuário' : 'Novo Usuário'}
          </Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              label="Nome"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              sx={{ flexGrow: 1, minWidth: 200 }}
            />
            <TextField
              label="Matrícula"
              name="matricula"
              value={form.matricula}
              onChange={handleChange}
              required
              sx={{ flexGrow: 1, minWidth: 150 }}
            />
            <TextField
              label="Senha"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required={!editId}
              placeholder={editId ? 'Deixe vazio para manter' : ''}
              sx={{ flexGrow: 1, minWidth: 150 }}
            />
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Role</InputLabel>
              <Select name="role" value={form.role} onChange={handleChange} required>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="recepcao">Recepção</MenuItem>
                <MenuItem value="entrevistador">Entrevistador</MenuItem>
              </Select>
            </FormControl>
            {form.role !== 'admin' && (
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>CRAS</InputLabel>
                <Select name="cras" value={form.cras} onChange={handleChange} required>
                  {crasList.map(c => (
                    <MenuItem key={c._id} value={c._id}>{c.nome}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <Button type="submit" variant="contained" disabled={loading}>
              {editId ? 'Atualizar' : 'Criar'}
            </Button>
            {editId && (
              <Button variant="outlined" onClick={cancelEdit}>
                Cancelar
              </Button>
            )}
          </Box>
        </Paper>

        {/* Barra de ações */}
        <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
          <TextField
            label="🔍 Buscar"
            variant="outlined"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 300 }}
          />
          <Button
            variant="contained"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportCSV}
            disabled={users.length === 0}
          >
            Exportar CSV
          </Button>
        </Box>

        {/* Tabela */}
        <TableContainer component={Paper}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Matrícula</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>CRAS</TableCell>
                    <TableCell>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {usuariosPaginados.map((usuario) => (
                    <TableRow key={usuario._id}>
                      <TableCell>{usuario.name}</TableCell>
                      <TableCell>{usuario.matricula}</TableCell>
                      <TableCell>{usuario.role}</TableCell>
                      <TableCell>{usuario.cras?.nome || '-'}</TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => handleEdit(usuario)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDeleteClick(usuario._id)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={usuariosFiltrados.length}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
              />
            </>
          )}
        </TableContainer>

        {/* Modal de confirmação */}
        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
          <DialogTitle>Confirmar Exclusão</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Tem certeza que deseja excluir este usuário?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={handleDelete} color="error" variant="contained">
              Excluir
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbars */}
        <Snackbar open={!!error} autoHideDuration={6000} onClose={clearUsersError}>
          <Alert severity="error" onClose={clearUsersError}>
            {error}
          </Alert>
        </Snackbar>
        <Snackbar open={!!success} autoHideDuration={6000} onClose={() => setSuccess('')}>
          <Alert severity="success" onClose={() => setSuccess('')}>
            {success}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}
