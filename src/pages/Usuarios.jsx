// Componente Usuarios - Gerenciamento completo de usuários do sistema
// Permite criar, editar, excluir e visualizar usuários com diferentes perfis
// Acesso restrito para administradores apenas
// Funcionalidades: CRUD completo, busca, paginação, exportação
import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';  // Cliente HTTP configurado com httpOnly cookies
import { useAuth } from '../hooks/useAuth';  // Hook de autenticação
import Sidebar from '../components/Sidebar';  // Navegação lateral

// Componentes Material-UI para interface completa
import { 
  Button, TextField, Select, MenuItem, InputLabel, FormControl, 
  Snackbar, Alert, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, CircularProgress, Dialog, DialogTitle, DialogContent, 
  DialogContentText, DialogActions, IconButton, Typography, Box, TablePagination 
} from '@mui/material';

// Ícones para ações de usuários
import DeleteIcon from '@mui/icons-material/Delete';  // Exclusão de usuário
import EditIcon from '@mui/icons-material/Edit';      // Edição de usuário
import FileDownloadIcon from '@mui/icons-material/FileDownload';  // Exportação

// Utilitário para exportação de dados
import { exportToCSV } from '../utils/csvExport';

/**
 * Componente principal para gerenciamento de usuários
 * Restrito a administradores do sistema
 * Permite CRUD completo de usuários com validações
 */
export default function Usuarios() {
  const { user: currentUser } = useAuth();  // Usuário logado
  
  // Estados principais para dados
  const [usuarios, setUsuarios] = useState([]);              // Lista de usuários carregados
  const [form, setForm] = useState({                         // Formulário de criação/edição
    name: '', 
    matricula: '', 
    password: '', 
    role: 'entrevistador',  // Valor padrão
    cras: '' 
  });
  const [editId, setEditId] = useState(null);               // ID do usuário em edição
  const [crasList, setCrasList] = useState([]);             // Lista de CRAS disponíveis
  
  // Estados de interface e feedback
  const [error, setError] = useState('');                   // Mensagens de erro
  const [success, setSuccess] = useState('');               // Mensagens de sucesso
  const [loading, setLoading] = useState(false);            // Estado de carregamento
  const [confirmOpen, setConfirmOpen] = useState(false);    // Modal de confirmação
  const [deleteId, setDeleteId] = useState(null);          // ID para exclusão
  
  // Estados de busca e paginação
  const [search, setSearch] = useState('');                 // Termo de busca
  const [page, setPage] = useState(0);                      // Página atual
  const [rowsPerPage, setRowsPerPage] = useState(10);       // Itens por página

  /**
   * Busca todos os usuários do sistema
   * Carrega lista completa para administração
   * Exibe feedback de erro em caso de falha
   */
  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsuarios(res.data);
    } catch {
      setError('Erro ao buscar usuários');
    }
    setLoading(false);
  }, []);

  /**
   * Busca lista de unidades CRAS para o formulário
   * Necessário para vincular usuários a suas unidades
   * Administradores não precisam estar vinculados a CRAS
   */
  const fetchCras = useCallback(async () => {
    try {
      const res = await api.get('/cras');
      setCrasList(res.data);
    } catch {
      setError('Erro ao buscar CRAS');
    }
  }, []);

  // Carrega dados iniciais ao montar o componente
  useEffect(() => {
    fetchUsuarios();
    fetchCras();
  }, [fetchUsuarios, fetchCras]);

  /**
   * Handler para mudanças nos campos do formulário
   * Limpa mensagens de erro/sucesso ao editar
   * @param {Event} e - Evento de mudança do input
   */
  function handleChange(e) {
    const { name, value } = e.target;
    const newForm = { ...form, [name]: value };
    
    // Se mudar para admin, limpa o campo CRAS
    if (name === 'role' && value === 'admin') {
      newForm.cras = '';
    }
    
    setForm(newForm);
    setError('');
    setSuccess('');
  }

  /**
   * Submissão do formulário para criar/editar usuário
   * Valida campos obrigatórios conforme o perfil
   * Admin não precisa de CRAS, outros perfis sim
   * @param {Event} e - Evento de submit do formulário
   */
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Validação: senha obrigatória apenas na criação, CRAS obrigatório para não-admin
    if (!form.name || !form.matricula || (editId ? false : !form.password) || !form.role) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }
    
    // Validação específica: CRAS obrigatório para não-admin
    if (form.role !== 'admin' && !form.cras) {
      setError('CRAS é obrigatório para entrevistadores e recepção.');
      return;
    }
    if (form.password && form.password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    try {
      if (editId) {
        await api.put(`/users/${editId}`, form);
        setSuccess('Usuário atualizado com sucesso!');
      } else {
        await api.post('/users', form);
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
      await api.delete(`/users/${deleteId}`);
      fetchUsuarios();
      setSuccess('Usuário removido com sucesso!');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao remover usuário');
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
            {form.role !== 'admin' && (
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>CRAS</InputLabel>
                <Select name="cras" value={form.cras} onChange={handleChange} required label="CRAS">
                  <MenuItem value="">Selecione o CRAS</MenuItem>
                  {crasList.map(c => <MenuItem key={c._id} value={c._id}>{c.nome}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            <Button type="submit" variant="contained" color="success">{editId ? 'Salvar' : 'Criar'}</Button>
            {editId && <Button type="button" onClick={() => { setEditId(null); setForm({ name: '', matricula: '', password: '', role: 'entrevistador', cras: '' }); }} color="inherit">Cancelar</Button>}
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
                    {u._id !== currentUser?.id && (
                      <IconButton onClick={() => handleDelete(u._id)} color="error"><DeleteIcon /></IconButton>
                    )}
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
