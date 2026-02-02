/**
 * Agendamentos - Refatorado usando Composables
 * 
 * Componente muito mais limpo usando useAppointments
 * Lógica de negócio centralizada no composable
 * 
 * @module pages/Agendamentos.refactored
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAppointments } from '../composables/useAppointments';
import Sidebar from '../components/Sidebar';

// Componentes Material-UI
import {
  Button,
  TextField,
  Snackbar,
  Alert,
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
  DialogActions,
  IconButton,
  Typography,
  Box,
  TablePagination
} from '@mui/material';

// Ícones
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DescriptionIcon from '@mui/icons-material/Description';

// Utilitários
import { exportToCSV } from '../utils/csvExport';

const STATUS_OPTIONS = [
  { value: 'agendado', label: 'Agendado' },
  { value: 'realizado', label: 'Realizado' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'reagendar', label: 'Reagendar' },
  { value: 'faltou', label: 'Faltou' }
];

export default function Agendamentos() {
  const { user } = useAuth();
  
  // ✅ Usar composable ao invés de lógica inline
  const {
    appointments,
    loading,
    error,
    fetchAppointments,
    deleteAppointment,
    clearError
  } = useAppointments();

  // Estados locais (apenas UI)
  const [success, setSuccess] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [modalObservacoesAberto, setModalObservacoesAberto] = useState(false);
  const [observacoesVisualizacao, setObservacoesVisualizacao] = useState('');
  const [nomeAgendamentoObservacoes, setNomeAgendamentoObservacoes] = useState('');
  const [orderBy, setOrderBy] = useState('data');
  const [order, setOrder] = useState('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Debounce da busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Carregar agendamentos
  useEffect(() => {
    if (!user) return;

    const filters = {};
    
    if (user.role === 'entrevistador') {
      filters.entrevistador = user.id;
    } else if (user.role === 'recepcao') {
      filters.cras = user.cras;
    }

    if (debouncedSearch) filters.search = debouncedSearch;
    filters.sortBy = orderBy;
    filters.order = order;
    filters.page = page + 1;
    filters.pageSize = rowsPerPage;

    fetchAppointments(filters);
  }, [user, debouncedSearch, orderBy, order, page, rowsPerPage, fetchAppointments]);

  // Formatar CPF
  const formatarCPFExibicao = (cpf) => {
    if (!cpf) return '-';
    if (cpf.includes('.')) return cpf;
    const apenasNumeros = cpf.replace(/\D/g, '').slice(0, 11);
    return apenasNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Confirmar exclusão
  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setConfirmOpen(true);
  };

  // Executar exclusão
  const handleDelete = async () => {
    try {
      await deleteAppointment(deleteId);
      setSuccess('Agendamento excluído com sucesso!');
      setConfirmOpen(false);
      setDeleteId(null);
    } catch (err) {
      // Erro já está no composable
    }
  };

  // Exportar CSV
  const handleExportCSV = () => {
    const data = appointments.map(a => ({
      Data: new Date(a.data).toLocaleString('pt-BR'),
      Pessoa: a.pessoa,
      CPF: formatarCPFExibicao(a.cpf),
      Telefone1: a.telefone1,
      Telefone2: a.telefone2 || '-',
      Motivo: a.motivo,
      Status: a.status,
      Entrevistador: a.entrevistador?.name || '-',
      CRAS: a.cras?.nome || '-'
    }));
    exportToCSV(data, 'agendamentos.csv');
  };

  // Visualizar observações
  const handleObservacoesClick = (agendamento) => {
    setObservacoesVisualizacao(agendamento.observacoes || 'Sem observações');
    setNomeAgendamentoObservacoes(agendamento.pessoa);
    setModalObservacoesAberto(true);
  };

  // Mudar ordenação
  const handleSort = (field) => {
    if (orderBy === field) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setOrderBy(field);
      setOrder('asc');
    }
  };

  return (
    <Box sx={{ display: 'flex', bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, p: 3 }}>
        <Typography variant="h4" gutterBottom>
          📋 Agendamentos
        </Typography>

        {/* Barra de ações */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label="🔍 Buscar"
            variant="outlined"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 300 }}
            placeholder="Nome, CPF ou telefone..."
          />
          <Button
            variant="contained"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportCSV}
            disabled={appointments.length === 0}
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
                    <TableCell onClick={() => handleSort('data')} sx={{ cursor: 'pointer' }}>
                      Data {orderBy === 'data' && (order === 'asc' ? '↑' : '↓')}
                    </TableCell>
                    <TableCell onClick={() => handleSort('pessoa')} sx={{ cursor: 'pointer' }}>
                      Pessoa {orderBy === 'pessoa' && (order === 'asc' ? '↑' : '↓')}
                    </TableCell>
                    <TableCell>CPF</TableCell>
                    <TableCell>Telefone</TableCell>
                    <TableCell>Motivo</TableCell>
                    <TableCell onClick={() => handleSort('status')} sx={{ cursor: 'pointer' }}>
                      Status {orderBy === 'status' && (order === 'asc' ? '↑' : '↓')}
                    </TableCell>
                    {user?.role === 'admin' && <TableCell>CRAS</TableCell>}
                    <TableCell>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {appointments.map((agendamento) => (
                    <TableRow key={agendamento._id}>
                      <TableCell>
                        {new Date(agendamento.data).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>{agendamento.pessoa}</TableCell>
                      <TableCell>{formatarCPFExibicao(agendamento.cpf)}</TableCell>
                      <TableCell>{agendamento.telefone1}</TableCell>
                      <TableCell>{agendamento.motivo}</TableCell>
                      <TableCell>{agendamento.status}</TableCell>
                      {user?.role === 'admin' && (
                        <TableCell>{agendamento.cras?.nome || '-'}</TableCell>
                      )}
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleObservacoesClick(agendamento)}
                          title="Ver observações"
                        >
                          <DescriptionIcon />
                        </IconButton>
                        {user?.role !== 'entrevistador' && (
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(agendamento._id)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={appointments.length}
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

        {/* Modal de confirmação de exclusão */}
        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
          <DialogTitle>Confirmar Exclusão</DialogTitle>
          <DialogContent>
            Tem certeza que deseja excluir este agendamento?
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={handleDelete} color="error" variant="contained">
              Excluir
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal de observações */}
        <Dialog open={modalObservacoesAberto} onClose={() => setModalObservacoesAberto(false)}>
          <DialogTitle>Observações - {nomeAgendamentoObservacoes}</DialogTitle>
          <DialogContent>
            <Typography>{observacoesVisualizacao}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setModalObservacoesAberto(false)}>Fechar</Button>
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
