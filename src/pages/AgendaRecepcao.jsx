import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  CircularProgress,
  FormHelperText
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import DescriptionIcon from '@mui/icons-material/Description';
import EventIcon from '@mui/icons-material/Event';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import ptBR from 'date-fns/locale/pt-BR';

// 🎯 Importa utilitários humanizados e centralizados
import {
  formatarCPF,
  formatarTelefone,
  exibirCPFFormatado,
  validarCPF,
  validarTelefone,
  motivosAtendimento,
  horariosDisponiveis,
  criarDataHorario
} from '../utils/agendamentoUtils';

// 🏢 Agenda da Recepção - Gestão Humanizada de Agendamentos
// Permite à equipe de recepção visualizar e gerenciar agendamentos 
// de todos os entrevistadores de forma centralizada e intuitiva

export default function AgendaRecepcao() {
  const navigate = useNavigate();
  const { user: usuario, loading: authLoading } = useAuth();  // 🔒 SEGURANÇA: Dados via httpOnly cookies
  
  // Estados principais
  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const [agendamentos, setAgendamentos] = useState([]);
  const [entrevistadores, setEntrevistadores] = useState([]);
  const [entrevistadorSelecionado, setEntrevistadorSelecionado] = useState('');
  const [crasInfo, setCrasInfo] = useState(null);
  const [bloqueios, setBloqueios] = useState([]);
  
  // Estados para modais
  const [modalAgendamentoAberto, setModalAgendamentoAberto] = useState(false);
  const [modalExclusaoAberto, setModalExclusaoAberto] = useState(false);
  const [modalObservacoesAberto, setModalObservacoesAberto] = useState(false);
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  
  // Estados para dados dos formulários
  const [dadosAgendamento, setDadosAgendamento] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    motivo: '',
    observacoes: ''
  });
  const [dadosEdicao, setDadosEdicao] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    motivo: '',
    observacoes: ''
  });
  
  // Estados para seleções temporárias
  const [horarioParaAgendamento, setHorarioParaAgendamento] = useState(null);
  const [agendamentoParaExcluir, setAgendamentoParaExcluir] = useState(null);
  const [agendamentoParaEditar, setAgendamentoParaEditar] = useState(null);
  const [observacoesVisualizacao, setObservacoesVisualizacao] = useState('');
  const [nomeAgendamentoObservacoes, setNomeAgendamentoObservacoes] = useState('');
  
  // Estado para loading
  const [loading, setLoading] = useState(false);
  
  // 💬 Estado para mensagens humanizadas
  const [mensagem, setMensagem] = useState({ 
    visivel: false, 
    texto: '', 
    tipo: 'success' 
  });

  // � Função humanizada para exibir mensagens
  const mostrarMensagem = useCallback((texto, tipo = 'success') => {
    setMensagem({ visivel: true, texto, tipo });
  }, []);

  // �🔒 Verificação humanizada de permissão
  useEffect(() => {
    if (usuario?.role !== 'recepcao') {
      mostrarMensagem('🔒 Acesso restrito à equipe de recepção', 'error');
      navigate('/dashboard');
    }
  }, [usuario, navigate, mostrarMensagem]);

  // 📝 Handlers humanizados para campos formatados
  // Buscar informações do CRAS
  const buscarCrasInfo = useCallback(async () => {
    try {
      const response = await api.get(
        `/cras/${usuario.cras}`
      );
      setCrasInfo(response.data);
    } catch (erro) {
      console.error('Erro ao buscar informações do CRAS:', erro);
    }
  }, [usuario.cras]);

  // Buscar entrevistadores do CRAS
  const buscarEntrevistadores = useCallback(async () => {
    try {
      const url = `/users/entrevistadores/cras/${usuario.cras}`;
      
      const response = await api.get(url);
      
      setEntrevistadores(response.data);
      
      // Se só tem um entrevistador, seleciona automaticamente
      if (response.data.length === 1) {
        setEntrevistadorSelecionado(response.data[0]._id);
      } else if (response.data.length === 0) {
        mostrarMensagem('Nenhum entrevistador encontrado para este CRAS. ID: ' + usuario.cras, 'error');
      }
    } catch (erro) {
      mostrarMensagem('Erro ao carregar entrevistadores: ' + (erro.response?.data?.message || erro.message), 'error');
    }
  }, [usuario.cras, mostrarMensagem]);

  useEffect(() => {
    if (usuario?.cras) {
      buscarCrasInfo();
      buscarEntrevistadores();
    }
  }, [buscarCrasInfo, buscarEntrevistadores, usuario?.cras]);

  // Se abrir a agenda em sábado ou domingo, já mostrar a agenda de segunda
  useEffect(() => {
    const hoje = new Date();
    if (hoje.getDay() === 0) { // domingo
      const segunda = new Date(hoje);
      segunda.setDate(hoje.getDate() + 1);
      setDataSelecionada(segunda);
    } else if (hoje.getDay() === 6) { // sábado
      const segunda = new Date(hoje);
      segunda.setDate(hoje.getDate() + 2);
      setDataSelecionada(segunda);
    }
  }, []);

  // 🔍 Buscar bloqueios do entrevistador selecionado
  const buscarBloqueios = useCallback(async () => {
    if (!entrevistadorSelecionado) return;
    try {
      const resposta = await api.get(
        `/blocked-slots?entrevistador=${entrevistadorSelecionado}`
      );
      
      setBloqueios(resposta.data || []);
    } catch (erro) {
      console.error('Erro ao buscar bloqueios:', erro);
      mostrarMensagem('Erro ao carregar bloqueios', 'error');
    }
  }, [entrevistadorSelecionado, mostrarMensagem]);

  // Buscar agendamentos igual MinhaAgenda (todos do entrevistador, sem paginação)
  const buscarAgendamentos = useCallback(async () => {
    if (!entrevistadorSelecionado) return;
    try {
      const resposta = await api.get(
        `/appointments?entrevistador=${entrevistadorSelecionado}`
      );
      let data = resposta.data;
      if (data && typeof data === 'object' && Array.isArray(data.results)) {
        data = data.results;
      }
      setAgendamentos(Array.isArray(data) ? data : []);
    } catch (erro) {
      console.error('Erro ao buscar agendamentos:', erro);
      mostrarMensagem('Erro ao carregar agendamentos', 'error');
    }
  }, [entrevistadorSelecionado, mostrarMensagem]);

  // Carregar agendamentos e bloqueios ao trocar entrevistador ou data
  useEffect(() => {
    if (entrevistadorSelecionado) {
      buscarAgendamentos();
      buscarBloqueios();
    }
  }, [buscarAgendamentos, buscarBloqueios, dataSelecionada, entrevistadorSelecionado]);

  // Função para obter agendamento de um horário específico
  const obterAgendamento = (horario) => {
    const dataHorario = criarDataHorario(dataSelecionada, horario);
    if (!dataHorario) return null;
    return agendamentos.find(agendamento => {
      // Comparar IDs como string para garantir compatibilidade
      if (agendamento.entrevistador && entrevistadorSelecionado &&
          String(agendamento.entrevistador._id || agendamento.entrevistador) !== String(entrevistadorSelecionado)) {
        return false;
      }
      const dataAgendamento = new Date(agendamento.data);
      return Math.abs(dataAgendamento.getTime() - dataHorario.getTime()) < 60000;
    });
  };

  // Função para verificar se horário está bloqueado
  const verificarHorarioBloqueado = (horario) => {
    const dataHorario = criarDataHorario(dataSelecionada, horario);
    if (!dataHorario) return false;
    return bloqueios.some(b => {
      const dataBloqueio = new Date(b.data);
      return dataBloqueio.getTime() === dataHorario.getTime();
    });
  };

  // REMOVIDO: Funções de bloquear/desbloquear horário
  // Recepção não tem mais permissão para bloquear/desbloquear
  // Apenas entrevistadores podem fazer isso em suas próprias agendas

  // Funções de agendamento
  const abrirModalAgendamento = (horario) => {
    setHorarioParaAgendamento(horario);
    setDadosAgendamento({
      pessoa: '',
      cpf: '',
      telefone1: '',
      telefone2: '',
      motivo: '',
      observacoes: ''
    });
    setModalAgendamentoAberto(true);
  };

  // Atualizar agendamentos ao criar
  // 📝 Função humanizada para criar agendamentos
  const criarAgendamento = async () => {
    // 🔍 Validações humanizadas usando utilitários centralizados
    if (!dadosAgendamento.pessoa.trim()) {
      mostrarMensagem('⚠️ Por favor, preencha todos os campos obrigatórios.', 'error');
      return;
    }
    
    const validacaoCPF = validarCPF(dadosAgendamento.cpf);
    if (!validacaoCPF.valido) {
      mostrarMensagem(validacaoCPF.mensagem, 'error');
      return;
    }
    
    const validacaoTelefone = validarTelefone(dadosAgendamento.telefone1);
    if (!validacaoTelefone.valido) {
      mostrarMensagem(validacaoTelefone.mensagem, 'error');
      return;
    }
    
    if (!dadosAgendamento.motivo) {
      mostrarMensagem('🎯 Por favor, selecione o motivo do atendimento', 'error');
      return;
    }
    
    setLoading(true);
    try {
      const dataHorario = criarDataHorario(dataSelecionada, horarioParaAgendamento);
      if (!dataHorario) throw new Error('Data inválida');
      
      const cpfApenasNumeros = dadosAgendamento.cpf.replace(/\D/g, '');
      
      await api.post(
        `/appointments`,
        {
          entrevistador: entrevistadorSelecionado,
          cras: usuario.cras,
          pessoa: dadosAgendamento.pessoa,
          cpf: cpfApenasNumeros,
          telefone1: dadosAgendamento.telefone1,
          telefone2: dadosAgendamento.telefone2,
          motivo: dadosAgendamento.motivo,
          data: dataHorario,
          status: 'agendado',
          observacoes: dadosAgendamento.observacoes
        }
      );
      
      mostrarMensagem('Agendamento criado com sucesso', 'success');
      
      await buscarAgendamentos();
      setModalAgendamentoAberto(false);
      setDadosAgendamento({
        pessoa: '',
        cpf: '',
        telefone1: '',
        telefone2: '',
        motivo: '',
        observacoes: ''
      });
    } catch (erro) {
      console.error('Erro ao criar agendamento:', erro);
      const mensagemErro = erro.response?.data?.message || 
        '😔 Ops! Algo deu errado ao criar o agendamento. Tente novamente.';
      mostrarMensagem(mensagemErro, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Outras funções (exclusão, edição, etc.) - semelhantes à MinhaAgenda
  const abrirModalExclusao = (agendamento) => {
    setAgendamentoParaExcluir(agendamento);
    setModalExclusaoAberto(true);
  };

  const confirmarExclusao = async () => {
    if (!agendamentoParaExcluir) return;

    try {
      await api.delete(
        `/appointments/${agendamentoParaExcluir._id}`
      );

      mostrarMensagem('Agendamento excluído com sucesso');
      await buscarAgendamentos();
      setModalExclusaoAberto(false);
      setAgendamentoParaExcluir(null);
    } catch (erro) {
      console.error('Erro ao excluir agendamento:', erro);
      mostrarMensagem('Erro ao excluir agendamento', 'error');
    }
  };

  const confirmarPresenca = async (agendamento) => {
    try {
      await api.patch(
        `/appointments/${agendamento._id}/confirm`,
        {}
      );

      mostrarMensagem('Presença confirmada com sucesso!');
      await buscarAgendamentos();
    } catch (erro) {
      console.error('Erro ao confirmar presença:', erro);
      mostrarMensagem('Erro ao confirmar presença', 'error');
    }
  };

  // Função para desconfirmar presença
  const removerConfirmacao = async (agendamento) => {
    if (!agendamento?._id) {
      mostrarMensagem('Agendamento inválido', 'error');
      return;
    }
    try {
      await api.patch(
        `/appointments/${agendamento._id}/unconfirm`,
        {}
      );
      mostrarMensagem('Confirmação removida com sucesso!');
      await buscarAgendamentos();
    } catch (erro) {
      console.error('Erro ao remover confirmação:', erro);
      mostrarMensagem('Erro ao remover confirmação', 'error');
    }
  };

  // Função para marcar como ausente
  const marcarAusente = async (agendamento) => {
    if (!agendamento?._id) {
      mostrarMensagem('Agendamento inválido', 'error');
      return;
    }
    try {
      await api.patch(
        `/appointments/${agendamento._id}`,
        { status: 'ausente' }
      );
      mostrarMensagem('Marcado como ausente!');
      await buscarAgendamentos();
    } catch (erro) {
      console.error('Erro ao marcar como ausente:', erro);
      mostrarMensagem('Erro ao marcar como ausente', 'error');
    }
  };

  const abrirModalObservacoes = (agendamento) => {
    setObservacoesVisualizacao(agendamento?.observacoes || 'Nenhuma observação registrada');
    setNomeAgendamentoObservacoes(agendamento?.pessoa || 'Agendamento');
    setModalObservacoesAberto(true);
  };

  // Funções para edição
  const abrirModalEdicao = (agendamento) => {
    setAgendamentoParaEditar(agendamento);
    setDadosEdicao({
      pessoa: agendamento?.pessoa || '',
      cpf: agendamento?.cpf || '',
      telefone1: agendamento?.telefone1 || '',
      telefone2: agendamento?.telefone2 || '',
      motivo: agendamento?.motivo || '',
      observacoes: agendamento?.observacoes || ''
    });
    setModalEdicaoAberto(true);
  };

  const fecharModalEdicao = () => {
    setModalEdicaoAberto(false);
    setAgendamentoParaEditar(null);
    setDadosEdicao({
      pessoa: '',
      cpf: '',
      telefone1: '',
      telefone2: '',
      motivo: '',
      observacoes: ''
    });
  };

  const salvarEdicao = async () => {
    if (!agendamentoParaEditar?._id) {
      mostrarMensagem('Agendamento inválido para edição', 'error');
      return;
    }

    if (!dadosEdicao.pessoa?.trim() || !dadosEdicao.cpf?.trim()) {
      mostrarMensagem('Nome da pessoa e CPF são obrigatórios', 'error');
      return;
    }

    try {
      await api.put(
        `/appointments/${agendamentoParaEditar._id}`,
        dadosEdicao
      );
      
      mostrarMensagem('Agendamento atualizado com sucesso');
      fecharModalEdicao();
      await buscarAgendamentos();
    } catch (erro) {
      console.error('Erro ao editar agendamento:', erro);
      mostrarMensagem(
        erro.response?.data?.message || 'Erro ao editar agendamento',
        'error'
      );
    }
  };



  return (
    <>
      <Sidebar />
      
      {/* Loading enquanto autenticação está carregando */}
      {authLoading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
          <CircularProgress />
        </Box>
      ) : (
      <Box 
        className="main-content"
        sx={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: '#fff'
        }}
      >
        {/* Cabeçalho centralizado */}
        <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Box display="flex" flexDirection="column" alignItems="center" textAlign="center">
            <Typography variant="h4" color="primary" fontWeight="bold" gutterBottom>
              Agenda da Recepção - {crasInfo?.nome || 'Carregando...'}
            </Typography>
          </Box>
        </Paper>

        {/* Container unificado para seletores */}
        <Paper elevation={2} sx={{ p: 3, mb: 3, width: '100%', maxWidth: 'none' }} className="agenda-selectors">
          
          {/* Seletor de Entrevistador */}
          <Box sx={{ mb: 3 }}>
            {entrevistadores.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <PersonIcon sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
                <Typography color="warning.main" variant="body1" sx={{ mb: 1 }}>
                  Nenhum entrevistador encontrado
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Verifique se existem entrevistadores cadastrados para o CRAS: {crasInfo?.nome || usuario?.cras}
                </Typography>
              </Box>
            ) : (
              <>
                {/* Container com entrevistador e data na mesma linha */}
                <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  {/* Seleção do Entrevistador */}
                  <Box sx={{ flex: 1, minWidth: 300 }}>
                    <Typography variant="body1" fontWeight="medium" sx={{ mb: 1, textAlign: 'left' }}>
                      Entrevistador
                    </Typography>
                    <FormControl sx={{ width: '100%' }}>
                      <InputLabel>Escolha o entrevistador</InputLabel>
                      <Select
                        value={entrevistadorSelecionado}
                        onChange={(e) => setEntrevistadorSelecionado(e.target.value)}
                        label="Escolha o entrevistador"
                      >
                        {entrevistadores.map((entrevistador) => (
                          <MenuItem key={entrevistador._id} value={entrevistador._id}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <PersonIcon fontSize="small" color="primary" />
                              {entrevistador.name}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                      {entrevistadorSelecionado && (
                        <FormHelperText>
                          Visualizando agenda de: {entrevistadores.find(e => e._id === entrevistadorSelecionado)?.name}
                        </FormHelperText>
                      )}
                    </FormControl>
                  </Box>

                  {/* Seleção da Data */}
                  {entrevistadorSelecionado && (
                    <Box sx={{ flex: 1, minWidth: 300 }}>
                      <Typography variant="body1" fontWeight="medium" sx={{ mb: 1, textAlign: 'left' }}>
                        Data da Agenda
                      </Typography>
                      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                        <DatePicker
                          label="Data da agenda"
                          value={dataSelecionada}
                          onChange={setDataSelecionada}
                          minDate={new Date()}
                          shouldDisableDate={(data) => data.getDay() === 0 || data.getDay() === 6}
                          slotProps={{
                            textField: {
                              helperText: 'Apenas dias úteis (segunda a sexta-feira)',
                              sx: { width: '100%' }
                            }
                          }}
                        />
                      </LocalizationProvider>
                    </Box>
                  )}
                </Box>
              </>
            )}
          </Box>
        </Paper>

        {entrevistadorSelecionado && dataSelecionada && (
          <>
            {/* Tabela de Horários */}
            <Paper elevation={2} sx={{ width: '100%', mt: 1 }}>
              <Typography variant="h6" sx={{ p: 2, borderBottom: 1, borderColor: 'divider', textAlign: 'center' }}>
                Agenda - {dataSelecionada?.toLocaleDateString('pt-BR')}
              </Typography>
              
              <TableContainer sx={{ width: '100%' }}>
                <Table sx={{ width: '100%' }} size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: '8%', fontWeight: 'bold' }}>Horário</TableCell>
                      <TableCell sx={{ width: '10%', fontWeight: 'bold' }}>Status</TableCell>
                      <TableCell sx={{ width: '18%', fontWeight: 'bold' }}>Nome</TableCell>
                      <TableCell sx={{ width: '12%', fontWeight: 'bold' }}>CPF</TableCell>
                      <TableCell sx={{ width: '18%', fontWeight: 'bold' }}>Telefones</TableCell>
                      <TableCell sx={{ width: '12%', fontWeight: 'bold' }}>Motivo</TableCell>
                      <TableCell sx={{ width: '6%', fontWeight: 'bold', textAlign: 'center' }}>Obs</TableCell>
                      <TableCell sx={{ width: '12%', fontWeight: 'bold' }}>Criado Por</TableCell>
                      <TableCell sx={{ width: '4%', fontWeight: 'bold', textAlign: 'center' }}>Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {horariosDisponiveis.map((horario) => {
                      const agendamento = obterAgendamento(horario);
                      const agendado = !!agendamento;
                      const bloqueado = verificarHorarioBloqueado(horario);
                      return (
                        <TableRow
                          key={horario}
                          sx={{
                            backgroundColor: 
                              agendamento?.status === 'realizado' ? '#e8f5e8' : 
                              agendamento?.status === 'ausente' ? '#fff9c4' :
                              bloqueado ? '#fff3e0' : 
                              'inherit'
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {horario}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              color={
                                agendado && agendamento?.status === 'realizado' ? 'success.main' :
                                agendado && agendamento?.status === 'ausente' ? 'warning.main' :
                                agendado ? 'primary.main' :
                                bloqueado ? 'warning.main' :
                                'success.main'
                              }
                            >
                              {agendado && agendamento?.status === 'realizado' ? 'Realizado' :
                               agendado && agendamento?.status === 'ausente' ? 'Ausente' :
                               agendado ? 'Agendado' :
                               bloqueado ? 'Bloqueado' :
                               'Disponível'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {agendamento?.pessoa || (bloqueado ? 'Horário Bloqueado' : '-')}
                          </TableCell>
                          <TableCell>
                            {exibirCPFFormatado(agendamento?.cpf)}
                          </TableCell>
                          <TableCell>
                            {agendamento ? (
                              <Box>
                                <Typography variant="body2">{agendamento.telefone1}</Typography>
                                {agendamento.telefone2 && (
                                  <Typography variant="body2">{agendamento.telefone2}</Typography>
                                )}
                              </Box>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {agendamento?.motivo || (bloqueado ? 'Bloqueio' : '-')}
                          </TableCell>
                          <TableCell align="center">
                            {agendamento ? (
                              <IconButton
                                color="primary"
                                size="small"
                                onClick={() => abrirModalObservacoes(agendamento)}
                                title="Ver observações"
                              >
                                <DescriptionIcon fontSize="small" />
                              </IconButton>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {agendamento?.createdBy?.name || '-'}
                          </TableCell>
                          <TableCell align="center">
                            <Box display="flex" gap={1} justifyContent="center">
                              {!agendado && !bloqueado ? (
                                <Button
                                  variant="contained"
                                  size="small"
                                  color="primary"
                                  onClick={() => abrirModalAgendamento(horario)}
                                  startIcon={<EventIcon />}
                                  sx={{
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 'medium'
                                  }}
                                  disabled={dataSelecionada.getDay() === 0 || dataSelecionada.getDay() === 6}
                                >
                                  Agendar
                                </Button>
                              ) : null}
                              {/* REMOVIDO: Recepção não pode mais bloquear/desbloquear horários */}
                              {/* Apenas entrevistadores podem bloquear seus próprios horários */}
                              {agendado ? (
                                <>
                                  {agendamento?.status !== 'realizado' && agendamento?.status !== 'ausente' ? (
                                    <>
                                      <IconButton
                                        color="success"
                                        size="small"
                                        onClick={() => confirmarPresenca(agendamento)}
                                        title="Confirmar presença"
                                      >
                                        <CheckCircleIcon fontSize="small" />
                                      </IconButton>
                                      <IconButton
                                        color="warning"
                                        size="small"
                                        onClick={() => marcarAusente(agendamento)}
                                        title="Marcar como ausente"
                                      >
                                        <PersonOffIcon fontSize="small" />
                                      </IconButton>
                                    </>
                                  ) : agendamento?.status === 'realizado' ? (
                                    <IconButton
                                      color="warning"
                                      size="small"
                                      onClick={() => removerConfirmacao(agendamento)}
                                      title="Remover confirmação"
                                    >
                                      <CancelIcon fontSize="small" />
                                    </IconButton>
                                  ) : agendamento?.status === 'ausente' ? (
                                    <IconButton
                                      color="info"
                                      size="small"
                                      onClick={() => removerConfirmacao(agendamento)}
                                      title="Remover status ausente"
                                    >
                                      <CancelIcon fontSize="small" />
                                    </IconButton>
                                  ) : null}
                                  <IconButton
                                    color="primary"
                                    size="small"
                                    onClick={() => abrirModalEdicao(agendamento)}
                                    title="Editar agendamento"
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    color="error"
                                    size="small"
                                    onClick={() => abrirModalExclusao(agendamento)}
                                    title="Excluir agendamento"
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </>
                              ) : null}
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </>
        )}

        {/* Modal de Agendamento */}
        <Dialog open={modalAgendamentoAberto} onClose={() => setModalAgendamentoAberto(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ pb: 2 }}>
            📅 Novo Agendamento
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {horarioParaAgendamento} • {dataSelecionada?.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="👤 Nome Completo"
                value={dadosAgendamento.pessoa}
                onChange={(e) => setDadosAgendamento({...dadosAgendamento, pessoa: e.target.value})}
                fullWidth
                required
                placeholder="Digite o nome completo da pessoa"
                helperText="Nome da pessoa que será atendida"
              />
              <TextField
                label="📋 CPF"
                value={dadosAgendamento.cpf}
                onChange={(e) => setDadosAgendamento({...dadosAgendamento, cpf: formatarCPF(e.target.value)})}
                fullWidth
                required
                placeholder="Digite o CPF (000.000.000-00)"
                helperText="Digite apenas números, a formatação é automática"
                inputProps={{ maxLength: 14 }}
              />
              <TextField
                label="📞 Telefone Principal"
                value={dadosAgendamento.telefone1}
                onChange={(e) => setDadosAgendamento({...dadosAgendamento, telefone1: formatarTelefone(e.target.value)})}
                fullWidth
                required
                placeholder="Digite o telefone (00) 00000-0000"
                helperText="Número principal para contato"
                inputProps={{ maxLength: 15 }}
              />
              <TextField
                label="📞 Telefone Alternativo (Opcional)"
                value={dadosAgendamento.telefone2}
                onChange={(e) => setDadosAgendamento({...dadosAgendamento, telefone2: formatarTelefone(e.target.value)})}
                fullWidth
                placeholder="Digite o telefone alternativo (00) 00000-0000"
                helperText="Número adicional (opcional)"
                inputProps={{ maxLength: 15 }}
              />
              <FormControl fullWidth required>
                <InputLabel>🎯 Motivo do atendimento</InputLabel>
                <Select
                  value={dadosAgendamento.motivo}
                  onChange={(e) => setDadosAgendamento({...dadosAgendamento, motivo: e.target.value})}
                  label="🎯 Motivo do atendimento"
                >
                  {motivosAtendimento.map((motivo) => (
                    <MenuItem key={motivo} value={motivo}>
                      {motivo}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="📝 Observações (Opcional)"
                value={dadosAgendamento.observacoes}
                onChange={(e) => setDadosAgendamento({...dadosAgendamento, observacoes: e.target.value})}
                fullWidth
                multiline
                rows={3}
                placeholder="Digite observações adicionais (opcional)"
                helperText="Campo opcional para detalhes específicos"
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button 
              onClick={() => setModalAgendamentoAberto(false)}
              size="large"
            >
              Cancelar
            </Button>
            <Button 
              onClick={criarAgendamento} 
              variant="contained"
              size="large"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
            >
              {loading ? '💾 Salvando dados...' : 'Salvar Agendamento'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal de Exclusão */}
        <Dialog open={modalExclusaoAberto} onClose={() => setModalExclusaoAberto(false)} maxWidth="xs">
          <DialogTitle>Excluir Agendamento</DialogTitle>
          <DialogContent>
            Tem certeza que deseja excluir o agendamento de <strong>{agendamentoParaExcluir?.pessoa}</strong> para o dia <strong>{dataSelecionada?.toLocaleDateString('pt-BR')}</strong>?
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setModalExclusaoAberto(false)}>Cancelar</Button>
            <Button onClick={confirmarExclusao} variant="contained" color="error">
              Excluir
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal de Observações */}
        <Dialog open={modalObservacoesAberto} onClose={() => setModalObservacoesAberto(false)} maxWidth="md" fullWidth>
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
            <Button onClick={() => setModalObservacoesAberto(false)} variant="contained" size="large">
              Fechar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal de Edição */}
        <Dialog open={modalEdicaoAberto} onClose={fecharModalEdicao} maxWidth="sm" fullWidth>
          <DialogTitle>
            ✏️ Editar Agendamento
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                margin="dense"
                label="👤 Nome Completo"
                value={dadosEdicao.pessoa}
                onChange={(e) => setDadosEdicao({ ...dadosEdicao, pessoa: e.target.value })}
                required
                placeholder="Digite o nome completo da pessoa"
                helperText="Nome da pessoa que será atendida"
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                margin="dense"
                label="📋 CPF"
                value={dadosEdicao.cpf}
                onChange={(e) => setDadosEdicao({ ...dadosEdicao, cpf: e.target.value })}
                required
                placeholder="Digite o CPF (000.000.000-00)"
                helperText="Digite apenas números, a formatação é automática"
                inputProps={{ maxLength: 14 }}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                margin="dense"
                label="📞 Telefone Principal"
                value={dadosEdicao.telefone1}
                onChange={(e) => setDadosEdicao({ ...dadosEdicao, telefone1: e.target.value })}
                placeholder="Digite o telefone (00) 00000-0000"
                helperText="Número principal para contato"
                inputProps={{ maxLength: 15 }}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                margin="dense"
                label="📞 Telefone Alternativo (Opcional)"
                value={dadosEdicao.telefone2}
                onChange={(e) => setDadosEdicao({ ...dadosEdicao, telefone2: e.target.value })}
                placeholder="Digite o telefone alternativo (00) 00000-0000"
                helperText="Número adicional (opcional)"
                inputProps={{ maxLength: 15 }}
                sx={{ mb: 2 }}
              />
              
              <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
                <InputLabel>🎯 Motivo do atendimento</InputLabel>
                <Select
                  value={dadosEdicao.motivo}
                  onChange={(e) => setDadosEdicao({ ...dadosEdicao, motivo: e.target.value })}
                  label="🎯 Motivo do atendimento"
                >
                  {motivosAtendimento.map((motivo) => (
                    <MenuItem key={motivo} value={motivo}>
                      {motivo}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                margin="dense"
                label="📝 Observações (Opcional)"
                value={dadosEdicao.observacoes}
                onChange={(e) => setDadosEdicao({ ...dadosEdicao, observacoes: e.target.value })}
                multiline
                rows={3}
                placeholder="Digite observações adicionais (opcional)"
                helperText="Campo opcional para detalhes específicos"
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={fecharModalEdicao} size="large">
              Cancelar
            </Button>
            <Button 
              onClick={salvarEdicao} 
              variant="contained" 
              size="large"
              disabled={!dadosEdicao.pessoa?.trim() || !dadosEdicao.cpf?.trim()}
            >
              Salvar Alterações
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar para mensagens */}
        <Snackbar
          open={mensagem.visivel}
          autoHideDuration={6000}
          onClose={(event, reason) => {
            if (reason === 'clickaway') return;
            setMensagem({ ...mensagem, visivel: false });
          }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{ mb: 2, mr: 2 }}
        >
          <Alert severity={mensagem.tipo} onClose={() => setMensagem({ ...mensagem, visivel: false })}>
            {mensagem.texto}
          </Alert>
        </Snackbar>
      </Box>
      )}
    </>
  );
}
