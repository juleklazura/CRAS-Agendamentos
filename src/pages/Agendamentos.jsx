// Componente Agendamentos - Lista e gerencia todos os agendamentos do sistema
// Permite visualizar, filtrar, editar e excluir agendamentos com controle de permissões
// Implementa paginação, busca, ordenação e exportação de dados
// Acesso controlado por perfil: admin vê todos, entrevistador vê seus, recepção vê do CRAS
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';  // Cliente HTTP configurado com httpOnly cookies
import Sidebar from '../components/Sidebar';  // Componente de navegação lateral

// Componentes Material-UI para interface
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

// Ícones para ações da interface
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DescriptionIcon from '@mui/icons-material/Description';

// Utilitário para exportação de dados em CSV
import { exportToCSV } from '../utils/csvExport';

// Opções de status disponíveis para agendamentos
// Define todos os possíveis estados de um agendamento no sistema
const STATUS_OPTIONS = [
  { value: 'agendado', label: 'Agendado' },    // Status inicial após criação
  { value: 'realizado', label: 'Realizado' },  // Atendimento foi concluído
  { value: 'cancelado', label: 'Cancelado' },  // Cancelado pelo usuário/sistema
  { value: 'reagendar', label: 'Reagendar' },  // Precisa ser reagendado
  { value: 'faltou', label: 'Faltou' }         // Pessoa não compareceu
];

/**
 * Componente principal para listagem e gerenciamento de agendamentos
 * Funcionalidades: listagem, busca, ordenação, paginação, edição, exclusão, exportação
 * Controle de acesso baseado no perfil do usuário logado
 */
export default function Agendamentos() {
  const { user } = useAuth();  // 🔒 SEGURANÇA: Dados via httpOnly cookies
  
  // Estados principais para dados e interface
  const [agendamentos, setAgendamentos] = useState([]);       // Lista de agendamentos carregados
  const [loading, setLoading] = useState(true);               // Estado de carregamento
  const [error, setError] = useState('');                     // Mensagens de erro
  const [success, setSuccess] = useState('');                 // Mensagens de sucesso
  const [confirmOpen, setConfirmOpen] = useState(false);      // Modal de confirmação de exclusão
  const [deleteId, setDeleteId] = useState(null);            // ID do agendamento a ser excluído
  const [search, setSearch] = useState('');                   // Termo de busca atual
  const [debouncedSearch, setDebouncedSearch] = useState(''); // Busca com debounce para performance
  
  // Estados para modal de visualização de observações
  const [modalObservacoesAberto, setModalObservacoesAberto] = useState(false);
  const [observacoesVisualizacao, setObservacoesVisualizacao] = useState('');     // Texto das observações para modal
  const [nomeAgendamentoObservacoes, setNomeAgendamentoObservacoes] = useState(''); // Nome da pessoa para modal

  // Estados para ordenação da tabela
  const [orderBy, setOrderBy] = useState('data');    // Campo para ordenação (data, nome, etc.)
  const [order, setOrder] = useState('asc');         // Direção da ordenação (asc/desc)

  // Estados para paginação da tabela
  const [page, setPage] = useState(0);               // Página atual (zero-indexed)
  const [rowsPerPage, setRowsPerPage] = useState(20); // Itens por página
  const [total, setTotal] = useState(0);             // Total de registros

  // Ref para manter o foco no input de busca após operações
  const searchInputRef = useRef(null);

  // Implementa debounce na busca para evitar muitas requisições
  // Aguarda 500ms após parar de digitar antes de executar a busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  /**
   * Formata CPF para exibição na tabela
   * Aceita CPF com ou sem formatação e padroniza para xxx.xxx.xxx-xx
   * @param {string} cpf - CPF em qualquer formato
   * @returns {string} CPF formatado ou '-' se inválido
   */
  const formatarCPFExibicao = (cpf) => {
    if (!cpf) return '-';
    if (cpf.includes('.')) return cpf; // Já formatado
    const apenasNumeros = cpf.replace(/\D/g, '').slice(0, 11);
    return apenasNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  /**
   * Busca agendamentos do backend com filtros baseados no perfil do usuário
   * Admin: vê todos os agendamentos
   * Entrevistador: vê apenas seus agendamentos
   * Recepção: vê agendamentos do CRAS onde trabalha
   */
  const fetchAgendamentos = useCallback(async () => {
    if (!user) return; // Validação de autenticação
    
    try {
      // Monta URL com filtros baseados no perfil
      let url = '/appointments?';
      if (user?.role === 'entrevistador') {
        url += `entrevistador=${user.id}&`;           // Filtra por entrevistador
      } else if (user?.role === 'recepcao') {
        url += `cras=${user.cras}&`;                  // Filtra por CRAS
      }
      // Admin não tem filtro, vê todos os agendamentos
      
      // Adiciona parâmetros de busca e ordenação
      if (debouncedSearch) url += `&search=${encodeURIComponent(debouncedSearch)}`;
      if (orderBy) url += `&sortBy=${orderBy}`;
      if (order) url += `&order=${order}`;

      setLoading(true);
      
      const res = await api.get(url);
      const allResults = res.data.results || res.data || [];
      setAgendamentos(allResults);
      setTotal(allResults.length);
    } catch {
      setAgendamentos([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [user, debouncedSearch, orderBy, order]);

  useEffect(() => {
    fetchAgendamentos();
  }, [fetchAgendamentos]);

  // Ao mudar busca ou itens por página, volta para primeira página
  // Evita exibir páginas vazias quando filtros reduzem resultados
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, rowsPerPage]);

  // Mantém foco no input de busca após carregamento para melhor UX
  // Permite que usuário continue digitando sem perder foco
  useEffect(() => {
    if (!loading && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [loading, agendamentos]);

  /**
   * Gerencia ordenação da tabela ao clicar nos cabeçalhos
   * Alterna entre ascendente/descendente no mesmo campo
   * Volta para primeira página ao mudar ordenação
   * @param {string} campo - Campo para ordenar (data, nome, etc.)
   */
  const handleSort = (campo) => {
    if (orderBy === campo) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setOrderBy(campo);
      setOrder('asc');
    }
    setPage(0); // Volta para primeira página
  };

  // Implementa paginação no frontend após busca/ordenação no backend
  // Garante performance mesmo com muitos registros
  const startIndex = page * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedAgendamentos = agendamentos.slice(startIndex, endIndex);

  /**
   * Inicia processo de exclusão de agendamento
   * Abre modal de confirmação para evitar exclusões acidentais
   * @param {string} id - ID do agendamento a ser excluído
   */
  const handleDelete = async (id) => {
    setDeleteId(id);
    setConfirmOpen(true);
  };

  /**
   * Confirma e executa a exclusão do agendamento
   * Chama API de exclusão e atualiza lista local
   * Exibe feedback de sucesso ou erro ao usuário
   */
  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      await api.delete(`/appointments/${deleteId}`);
      setSuccess('Agendamento excluído com sucesso!');
      fetchAgendamentos(); // Recarrega lista após exclusão
    } catch {
      setError('Erro ao excluir o agendamento');
    } finally {
      setConfirmOpen(false);
      setDeleteId(null);
    }
  };

  /**
   * Exporta dados dos agendamentos para arquivo CSV
   * Aplica os mesmos filtros da visualização atual
   * Formata dados para legibilidade no arquivo exportado
   */
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
    exportToCSV(data, 'agendamentos.csv');
  };

  // Função para abrir modal de observações
  const abrirModalObservacoes = (agendamento) => {
    setObservacoesVisualizacao(agendamento?.observacoes || 'Nenhuma observação registrada');
    setNomeAgendamentoObservacoes(agendamento?.pessoa || 'Agendamento');
    setModalObservacoesAberto(true);
  };

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
          className="main-page-title"
          color="primary" 
          fontWeight="bold" 
          textAlign="center"
          mb={0}
        >
          Agendamentos
        </Typography>

        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 1}}>
          Para criar novos agendamentos, acesse a página "Agenda" e selecione um horário disponível.
        </Typography>

        <Box sx={{ width: '100%' }}>
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Box mb={3} display="flex" gap={2} justifyContent="flex-start">
                <TextField
                  inputRef={searchInputRef}
                  label="Buscar agendamento"
                  variant="outlined"
                  size="small"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
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

            <TableContainer component={Paper} className="agendamentos-table-container">
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
                    <TableCell sx={{ fontWeight: 'bold' }}>CPF</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Telefones</TableCell>
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
                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                    <TableCell onClick={() => handleSort('createdBy')} sx={{ cursor: 'pointer', fontWeight: 'bold' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Criado Por {orderBy === 'createdBy' ? <span style={{ fontSize: 14 }}>{order === 'asc' ? '▲' : '▼'}</span> : ''}
                      </span>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Observações</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedAgendamentos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} sx={{ textAlign: 'center', py: 4 }}>
                        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                          <DescriptionIcon color="disabled" sx={{ fontSize: 48 }} />
                          <Typography variant="body1" color="text.secondary">
                            {debouncedSearch ? 'Nenhum agendamento encontrado para a busca realizada' : 'Nenhum agendamento cadastrado no sistema'}
                          </Typography>
                          {!debouncedSearch && (
                            <Typography variant="body2" color="text.secondary">
                              Vá para a página "Agenda" para criar novos agendamentos
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedAgendamentos.map((agendamento) => (
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
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Box display="flex" justifyContent="center" mt={2} className="pagination-container">
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
        </Box>

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
    </>
  );
}
