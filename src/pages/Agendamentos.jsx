import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
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
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DescriptionIcon from '@mui/icons-material/Description';
import * as XLSX from 'xlsx';

const STATUS_OPTIONS = [
  { value: 'agendado', label: 'Agendado' },
  { value: 'realizado', label: 'Realizado' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'reagendar', label: 'Reagendar' },
  { value: 'faltou', label: 'Faltou' }
];

// Pegue token e user fora do componente para garantir que não mudem a cada render
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));

export default function Agendamentos() {
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState('');
  
  // Estados para modal de observações
  const [modalObservacoesAberto, setModalObservacoesAberto] = useState(false);
  const [observacoesVisualizacao, setObservacoesVisualizacao] = useState('');
  const [nomeAgendamentoObservacoes, setNomeAgendamentoObservacoes] = useState('');

  // Estados para ordenação
  const [orderBy, setOrderBy] = useState('data');
  const [order, setOrder] = useState('asc');

  // Paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [total, setTotal] = useState(0);

  // Função para formatar CPF para exibição
  const formatarCPFExibicao = (cpf) => {
    if (!cpf) return '-';
    if (cpf.includes('.')) return cpf;
    const apenasNumeros = cpf.replace(/\D/g, '').slice(0, 11);
    return apenasNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Buscar agendamentos do backend
  const fetchAgendamentos = useCallback(async () => {
    if (!token || !user) return; // Não carregar se não tem token ou user
    
    try {
      let url = 'http://localhost:5000/api/appointments?';
      if (user?.role === 'entrevistador') {
        url += `entrevistador=${user.id}&`;
      } else if (user?.role === 'recepcao') {
        url += `cras=${user.cras}&`;
      }
      // Não enviar page e pageSize para fazer paginação no frontend
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (orderBy) url += `&sortBy=${orderBy}`;
      if (order) url += `&order=${order}`;

      setLoading(true);
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allResults = res.data.results || res.data || [];
      setAgendamentos(allResults);
      setTotal(allResults.length);
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
      setAgendamentos([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, orderBy, order]);

  useEffect(() => {
    if (token && user) {
      fetchAgendamentos();
    }
  }, [fetchAgendamentos]);

  // Ao mudar busca, volta para página 0
  useEffect(() => {
    setPage(0);
  }, [search, rowsPerPage]);

  // Função para ordenar ao clicar no cabeçalho
  const handleSort = (campo) => {
    if (orderBy === campo) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setOrderBy(campo);
      setOrder('asc');
    }
    setPage(0);
  };

  // Busca e ordenação agora são feitas no backend, paginação no frontend
  const startIndex = page * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedAgendamentos = agendamentos.slice(startIndex, endIndex);

  const handleDelete = async (id) => {
    setDeleteId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId || !token) return;

    try {
      await axios.delete(
        `http://localhost:5000/api/appointments/${deleteId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Agendamento excluído com sucesso!');
      fetchAgendamentos();
    } catch (error) {
      console.error('Erro ao excluir agendamento:', error);
      setError('Erro ao excluir o agendamento');
    } finally {
      setConfirmOpen(false);
      setDeleteId(null);
    }
  };

  const exportToExcel = () => {
    const data = agendamentos.map(a => ({
      Entrevistador: a.entrevistador?.name || '-',
      CRAS: a.cras?.nome || '-',
      Nome: a.pessoa || '-',
      CPF: formatarCPFExibicao(a.cpf),
      'Telefone 1': a.telefone1 || '-',
      'Telefone 2': a.telefone2 || '-',
      Motivo: a.motivo || '-',
      'Data/Hora': new Date(a.data).toLocaleString() || '-',
      Status: STATUS_OPTIONS.find(s => s.value === a.status)?.label || a.status,
      'Criado Por': a.createdBy?.name || '-',
      Observações: a.observacoes || '-'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Agendamentos');
    XLSX.writeFile(wb, 'agendamentos.xlsx');
  };

  // Função para abrir modal de observações
  const abrirModalObservacoes = (agendamento) => {
    setObservacoesVisualizacao(agendamento?.observacoes || 'Nenhuma observação registrada');
    setNomeAgendamentoObservacoes(agendamento?.pessoa || 'Agendamento');
    setModalObservacoesAberto(true);
  };

  if (!token || !user) {
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
          <Typography variant="h6" color="error">
            Você precisa estar logado para acessar esta página.
          </Typography>
        </Box>
      </Box>
    );
  }

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
        <Typography variant="h4" gutterBottom>
          Agendamentos
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Para criar novos agendamentos, acesse a página "Agenda" e selecione um horário disponível.
        </Typography>

        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box mb={3} display="flex" gap={2}>
              <TextField
                label="Buscar agendamento"
                variant="outlined"
                size="small"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ width: 300 }}
              />
              <Button
                startIcon={<FileDownloadIcon />}
                onClick={exportToExcel}
                variant="outlined"
              >
                Exportar
              </Button>
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell onClick={() => handleSort('entrevistador')} sx={{ cursor: 'pointer', fontWeight: 'bold' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Entrevistador {orderBy === 'entrevistador' ? <span style={{ fontSize: 14 }}>{order === 'asc' ? '▲' : '▼'}</span> : ''}
                      </span>
                    </TableCell>
                    <TableCell onClick={() => handleSort('cras')} sx={{ cursor: 'pointer', fontWeight: 'bold' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        CRAS {orderBy === 'cras' ? <span style={{ fontSize: 14 }}>{order === 'asc' ? '▲' : '▼'}</span> : ''}
                      </span>
                    </TableCell>
                    <TableCell onClick={() => handleSort('pessoa')} sx={{ cursor: 'pointer', fontWeight: 'bold' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Nome {orderBy === 'pessoa' ? <span style={{ fontSize: 14 }}>{order === 'asc' ? '▲' : '▼'}</span> : ''}
                      </span>
                    </TableCell>
                    <TableCell>CPF</TableCell>
                    <TableCell>Telefones</TableCell>
                    <TableCell onClick={() => handleSort('motivo')} sx={{ cursor: 'pointer', fontWeight: 'bold' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Motivo {orderBy === 'motivo' ? <span style={{ fontSize: 14 }}>{order === 'asc' ? '▲' : '▼'}</span> : ''}
                      </span>
                    </TableCell>
                    <TableCell onClick={() => handleSort('data')} sx={{ cursor: 'pointer', fontWeight: 'bold' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Data/Hora {orderBy === 'data' ? <span style={{ fontSize: 14 }}>{order === 'asc' ? '▲' : '▼'}</span> : ''}
                      </span>
                    </TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell onClick={() => handleSort('createdBy')} sx={{ cursor: 'pointer', fontWeight: 'bold' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Criado Por {orderBy === 'createdBy' ? <span style={{ fontSize: 14 }}>{order === 'asc' ? '▲' : '▼'}</span> : ''}
                      </span>
                    </TableCell>
                    <TableCell>Observações</TableCell>
                    <TableCell align="center">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedAgendamentos.map((agendamento) => (
                    <TableRow key={agendamento._id}>
                      <TableCell>{agendamento.entrevistador?.name || '-'}</TableCell>
                      <TableCell>{agendamento.cras?.nome || '-'}</TableCell>
                      <TableCell>{agendamento.pessoa}</TableCell>
                      <TableCell>{formatarCPFExibicao(agendamento.cpf)}</TableCell>
                      <TableCell>
                        {agendamento.telefone1 || '-'}
                        {agendamento.telefone2 && <><br />{agendamento.telefone2}</>}
                      </TableCell>
                      <TableCell>{agendamento.motivo || '-'}</TableCell>
                      <TableCell>
                        {new Date(agendamento.data).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {STATUS_OPTIONS.find(s => s.value === agendamento.status)?.label || agendamento.status}
                      </TableCell>
                      <TableCell>{agendamento.createdBy?.name || '-'}</TableCell>
                      <TableCell>
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => abrirModalObservacoes(agendamento)}
                          title="Ver observações"
                        >
                          <DescriptionIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          onClick={() => handleDelete(agendamento._id)}
                          color="error"
                          size="small"
                          title="Excluir agendamento"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box display="flex" justifyContent="flex-end" mt={2}>
              <TablePagination
                component="div"
                count={total}
                page={page}
                onPageChange={(event, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={event => {
                  setRowsPerPage(parseInt(event.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[10, 20, 50, 100]}
                labelRowsPerPage="Agendamentos por página"
              />
            </Box>
          </>
        )}

        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
          <DialogTitle>Confirmar exclusão</DialogTitle>
          <DialogContent>
            Tem certeza que deseja excluir este agendamento?
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={confirmDelete} color="error">
              Excluir
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={modalObservacoesAberto}
          onClose={() => setModalObservacoesAberto(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ pb: 1 }}>
            📝 Observações do Agendamento
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                👤 {nomeAgendamentoObservacoes}
              </Typography>
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 2, 
                  mt: 2, 
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  borderRadius: 2
                }}
              >
                <Typography 
                  variant="body1" 
                  style={{ 
                    whiteSpace: 'pre-wrap', 
                    lineHeight: 1.6,
                    color: '#495057',
                    fontSize: '1rem'
                  }}
                >
                  {observacoesVisualizacao}
                </Typography>
              </Paper>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button 
              onClick={() => setModalObservacoesAberto(false)} 
              variant="contained"
              size="large"
            >
              Fechar
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={!!error || !!success}
          autoHideDuration={6000}
          onClose={() => {
            setError('');
            setSuccess('');
          }}
        >
          <Alert
            severity={error ? "error" : "success"}
            variant="filled"
            onClose={() => {
              setError('');
              setSuccess('');
            }}
          >
            {error || success}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}
