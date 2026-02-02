/**
 * Cras - Refatorado usando Composables
 * 
 * @module pages/Cras.refactored
 */

import { useEffect, useState } from 'react';
import { useCras } from '../composables/useCras';
import Sidebar from '../components/Sidebar';

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

import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

import { exportToCSV } from '../utils/csvExport';

export default function CrasPage() {
  // ✅ Usar composable
  const {
    crasList,
    loading,
    error,
    fetchCras,
    createCras,
    updateCras,
    deleteCras,
    clearError
  } = useCras();

  // Estados locais
  const [form, setForm] = useState({ nome: '', endereco: '', telefone: '' });
  const [editId, setEditId] = useState(null);
  const [success, setSuccess] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Carregar dados iniciais
  useEffect(() => {
    fetchCras();
  }, [fetchCras]);

  // Handler de formulário
  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    clearError();
    setSuccess('');
  }

  // Submeter formulário
  async function handleSubmit(e) {
    e.preventDefault();
    clearError();
    setSuccess('');
    
    if (!form.nome || !form.endereco) {
      return;
    }

    try {
      if (editId) {
        await updateCras(editId, form);
        setSuccess('CRAS atualizado com sucesso!');
      } else {
        await createCras(form);
        setSuccess('CRAS criado com sucesso!');
      }
      setForm({ nome: '', endereco: '', telefone: '' });
      setEditId(null);
    } catch (err) {
      // Erro já tratado
    }
  }

  // Editar CRAS
  function handleEdit(cras) {
    setForm({ 
      nome: cras.nome, 
      endereco: cras.endereco, 
      telefone: cras.telefone || '' 
    });
    setEditId(cras._id);
  }

  // Cancelar edição
  function cancelEdit() {
    setForm({ nome: '', endereco: '', telefone: '' });
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
      await deleteCras(deleteId);
      setSuccess('CRAS excluído com sucesso!');
      setConfirmOpen(false);
      setDeleteId(null);
    } catch (err) {
      // Erro já tratado
    }
  }

  // Filtrar CRAS
  const crasFiltrados = crasList.filter(c => 
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.endereco.toLowerCase().includes(search.toLowerCase())
  );

  // Paginação
  const crasPaginados = crasFiltrados.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Exportar CSV
  const handleExportCSV = () => {
    const data = crasList.map(c => ({
      Nome: c.nome,
      Endereço: c.endereco,
      Telefone: c.telefone || '-'
    }));
    exportToCSV(data, 'cras.csv');
  };

  return (
    <Box sx={{ display: 'flex', bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, p: 3 }}>
        <Typography variant="h4" gutterBottom>
          🏢 CRAS
        </Typography>

        {/* Formulário */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {editId ? 'Editar CRAS' : 'Novo CRAS'}
          </Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              label="Nome"
              name="nome"
              value={form.nome}
              onChange={handleChange}
              required
              sx={{ flexGrow: 1, minWidth: 200 }}
            />
            <TextField
              label="Endereço"
              name="endereco"
              value={form.endereco}
              onChange={handleChange}
              required
              sx={{ flexGrow: 2, minWidth: 300 }}
            />
            <TextField
              label="Telefone"
              name="telefone"
              value={form.telefone}
              onChange={handleChange}
              sx={{ minWidth: 150 }}
            />
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
            disabled={crasList.length === 0}
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
                    <TableCell>Endereço</TableCell>
                    <TableCell>Telefone</TableCell>
                    <TableCell>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {crasPaginados.map((cras) => (
                    <TableRow key={cras._id}>
                      <TableCell>{cras.nome}</TableCell>
                      <TableCell>{cras.endereco}</TableCell>
                      <TableCell>{cras.telefone || '-'}</TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => handleEdit(cras)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDeleteClick(cras._id)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={crasFiltrados.length}
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
              Tem certeza que deseja excluir este CRAS?
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
        <Snackbar open={!!error} autoHideDuration={6000} onClose={clearError}>
          <Alert severity="error" onClose={clearError}>
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
