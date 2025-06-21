import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import axios from 'axios';

// Componentes do Material-UI
import { 
  Box, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Snackbar, 
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  Container,
  Grid,
  Card,
  CardContent,
  Tooltip,
  CircularProgress
} from '@mui/material';

// Ícones do Material-UI
import {
  Description as DescriptionIcon,
  Event as EventIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Assignment as AssignmentIcon,
  AccessTime as AccessTimeIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

// Provedor de datas
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import ptBR from 'date-fns/locale/pt-BR';

// Componentes personalizados
import Sidebar from '../components/Sidebar';

// Constantes da aplicação - movidas para fora do componente para melhor performance
const MOTIVOS_AGENDAMENTO = [
  { value: 'Atualização', label: 'Atualização Cadastral', icon: <AssignmentIcon /> },
  { value: 'Inclusão', label: 'Nova Inclusão', icon: <PersonIcon /> },
  { value: 'Transferência', label: 'Transferência', icon: <EventIcon /> },
  { value: 'Orientações', label: 'Orientações Gerais', icon: <DescriptionIcon /> }
];

const STATUS_COLORS = {
  'livre': { color: 'success', label: 'Disponível' },
  'agendado': { color: 'primary', label: 'Agendado' },
  'realizado': { color: 'success', label: 'Realizado' },
  'bloqueado': { color: 'warning', label: 'Bloqueado' }
};

// Componente memoizado para linha da tabela
const HorarioTableRow = memo(({ 
  horario, 
  status, 
  agendamento, 
  bloqueio, 
  formatarCPF, 
  abrirModalObservacoes, 
  abrirModalAgendamento,
  abrirModalEdicao,
  isEntrevistador
}) => (
  <TableRow 
    sx={{
      backgroundColor: status === 'realizado' ? '#e8f5e8' : 'inherit',
      transition: 'background 0.2s',
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: '#e3e9f7',
        boxShadow: '0 2px 8px 0 rgba(30,73,118,0.08)'
      }
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
          status === 'agendado' ? 'primary.main' :
          status === 'realizado' ? 'success.main' :
          status === 'bloqueado' ? 'warning.main' :
          'success.main'
        }
        fontWeight="medium"
      >
        {status === 'agendado' ? '📅 Agendado' :
         status === 'realizado' ? '✅ Realizado' :
         status === 'bloqueado' ? '🚫 Bloqueado' :
         '✨ Disponível'}
      </Typography>
    </TableCell>
    <TableCell>{agendamento?.pessoa || (bloqueio ? 'Horário Bloqueado' : '-')}</TableCell>
    <TableCell>{agendamento ? formatarCPF(agendamento.cpf) : '-'}</TableCell>
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
    <TableCell>{agendamento?.motivo || (bloqueio?.motivo || '-')}</TableCell>
    <TableCell>
      {agendamento?.observacoes ? (
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
    <TableCell>{agendamento?.createdBy?.name || bloqueio?.createdBy?.name || '-'}</TableCell>
    <TableCell align="center">
      {status === 'livre' && (
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
        >
          Agendar
        </Button>
      )}
      {status === 'agendado' && (
        <Box display="flex" gap={1} alignItems="center" justifyContent="center">
          <Chip 
            label="Ocupado" 
            color="primary" 
            size="small"
            icon={<PersonIcon />}
          />
          {isEntrevistador && (
            <IconButton
              color="primary"
              size="small"
              onClick={() => abrirModalEdicao(agendamento)}
              title="Editar agendamento"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      )}
      {status === 'realizado' && (
        <Chip 
          label="Concluído" 
          color="success" 
          size="small"
          icon={<CheckCircleIcon />}
        />
      )}
      {status === 'bloqueado' && (
        <Chip 
          label="Indisponível" 
          color="warning" 
          size="small"
          icon={<BlockIcon />}
        />
      )}
    </TableCell>
  </TableRow>
));

HorarioTableRow.displayName = 'HorarioTableRow';

/**
 * Componente principal da página de agenda dos entrevistadores
 * Permite visualizar e criar agendamentos para entrevistadores específicos
 * Otimizado para performance com memoização e lazy loading
 */
const AgendaEntrevistadores = memo(() => {
  // Estados principais da aplicação - otimizados com valores iniciais
  const [data, setData] = useState(() => {
    const hoje = new Date();
    const diaSemana = hoje.getDay();
    
    // Se for domingo (0) ou sábado (6), ajusta para próxima segunda
    if (diaSemana === 0) {
      const proximaSegunda = new Date(hoje);
      proximaSegunda.setDate(hoje.getDate() + 1);
      return proximaSegunda;
    } else if (diaSemana === 6) {
      const proximaSegunda = new Date(hoje);
      proximaSegunda.setDate(hoje.getDate() + 2);
      return proximaSegunda;
    }
    return hoje;
  });
  
  const [entrevistadores, setEntrevistadores] = useState([]);
  const [selectedEntrevistador, setSelectedEntrevistador] = useState('');
  const [agendamentos, setAgendamentos] = useState([]);
  const [bloqueios, setBloqueios] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Estados de feedback - consolidados
  const [feedbackState, setFeedbackState] = useState({ error: '', success: '' });
  
  // Estados do modal de criação de agendamento - memoizados
  const [modalAberto, setModalAberto] = useState(false);
  const [horarioSelecionado, setHorarioSelecionado] = useState('');
  const [dadosAgendamento, setDadosAgendamento] = useState(() => ({
    pessoa: '',
    cpf: '',
    telefone1: '',
    telefone2: '',
    motivo: '',
    observacoes: ''
  }));
  
  // Estados do modal de observações - memoizados
  const [modalObservacoesAberto, setModalObservacoesAberto] = useState(false);
  const [observacoesVisualizacao, setObservacoesVisualizacao] = useState('');
  const [nomeAgendamentoObservacoes, setNomeAgendamentoObservacoes] = useState('');

  // Estados para edição
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [agendamentoParaEditar, setAgendamentoParaEditar] = useState(null);
  const [dadosEdicao, setDadosEdicao] = useState({
    pessoa: '',
    cpf: '',
    telefone1: '',
    telefone2: '',
    motivo: '',
    observacoes: ''
  });

  // Token e user - memoizados e estáticos
  const token = useMemo(() => localStorage.getItem('token'), []);
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);
  const isEntrevistador = useMemo(() => user?.role === 'entrevistador', [user?.role]);

  // Funções helper memoizadas para feedback
  const setError = useCallback((message) => {
    setFeedbackState(prev => ({ ...prev, error: message }));
  }, []);

  const setSuccess = useCallback((message) => {
    setFeedbackState(prev => ({ ...prev, success: message }));
  }, []);

  /**
   * Funções de formatação memoizadas para melhor performance
   */
  const formatarCPF = useCallback((valor) => {
    if (!valor) return '';
    const apenasNumeros = valor.replace(/\D/g, '');
    if (apenasNumeros.length !== 11) return valor;
    return apenasNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }, []);

  const formatarTelefone = useCallback((valor) => {
    if (!valor) return '';
    const apenasNumeros = valor.replace(/\D/g, '');
    
    // Telefone celular (11 dígitos)
    if (apenasNumeros.length === 11) {
      return apenasNumeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    
    // Telefone fixo (10 dígitos)
    if (apenasNumeros.length === 10) {
      return apenasNumeros.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    
    return valor;
  }, []);

  // Handlers de mudança otimizados
  const handleCPFChange = useCallback((valor) => {
    const cpfFormatado = formatarCPF(valor);
    setDadosAgendamento(prev => ({ ...prev, cpf: cpfFormatado }));
  }, [formatarCPF]);

  const handleTelefone1Change = useCallback((valor) => {
    const telefoneFormatado = formatarTelefone(valor);
    setDadosAgendamento(prev => ({ ...prev, telefone1: telefoneFormatado }));
  }, [formatarTelefone]);

  const handleTelefone2Change = useCallback((valor) => {
    const telefoneFormatado = formatarTelefone(valor);
    setDadosAgendamento(prev => ({ ...prev, telefone2: telefoneFormatado }));
  }, [formatarTelefone]);

  /**
   * Busca todos os entrevistadores disponíveis no sistema
   * Se o usuário logado for um entrevistador, retorna apenas ele mesmo
   * Se for admin ou recepção, mostra todos os entrevistadores
   */
  const fetchEntrevistadores = useCallback(async () => {
    try {
      setLoading(true);
      
      // Pega dados do usuário do localStorage sempre atualizado
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Se o usuário logado é um entrevistador, usa apenas seus próprios dados
      if (isEntrevistador && currentUser._id) {
        setEntrevistadores([currentUser]);
        setSelectedEntrevistador(currentUser._id);
        return;
      }
      
      // Para admin e recepção, busca todos os entrevistadores
      const response = await axios.get('http://localhost:5000/api/users', { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      const entrevistadoresFiltrados = response.data.filter(usuario => usuario.role === 'entrevistador');
      setEntrevistadores(entrevistadoresFiltrados);
      
    } catch (error) {
      console.error('Erro ao carregar entrevistadores:', error);
      setError('Não foi possível carregar os entrevistadores. Por favor, verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [token, isEntrevistador, setError]);

  /**
   * Busca todos os agendamentos do entrevistador selecionado
   * Não aplica paginação para mostrar todos os horários na agenda
   */
  const fetchAgendamentos = useCallback(async () => {
    if (!selectedEntrevistador) {
      setAgendamentos([]);
      return;
    }
    
    try {
      const response = await axios.get(
        `http://localhost:5000/api/appointments?entrevistador=${selectedEntrevistador}`, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Normaliza a resposta para sempre trabalhar com array
      let agendamentosData = response.data;
      if (agendamentosData && typeof agendamentosData === 'object' && Array.isArray(agendamentosData.results)) {
        agendamentosData = agendamentosData.results;
      }
      
      setAgendamentos(Array.isArray(agendamentosData) ? agendamentosData : []);
      
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
      setError('Não foi possível carregar os agendamentos. Por favor, verifique sua conexão e tente novamente.');
    }
  }, [token, selectedEntrevistador, setError]);

  /**
   * Busca todos os bloqueios de horário do entrevistador selecionado
   */
  const fetchBloqueios = useCallback(async () => {
    if (!selectedEntrevistador) {
      setBloqueios([]);
      return;
    }
    
    try {
      const response = await axios.get(
        `http://localhost:5000/api/blocked-slots?entrevistador=${selectedEntrevistador}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setBloqueios(response.data || []);
      
    } catch (error) {
      console.error('Erro ao carregar bloqueios:', error);
      setError('Não foi possível carregar os horários bloqueados. Por favor, tente novamente.');
    }
  }, [token, selectedEntrevistador, setError]);

  // Carrega a lista de entrevistadores ao montar o componente
  useEffect(() => {
    fetchEntrevistadores();
  }, [fetchEntrevistadores]);

  // Recarrega agendamentos e bloqueios quando o entrevistador ou data mudam
  useEffect(() => {
    if (selectedEntrevistador) {
      fetchAgendamentos();
      fetchBloqueios();
    }
  }, [selectedEntrevistador, fetchAgendamentos, fetchBloqueios, data]);

  // Valores computados memoizados para performance
  const entrevistadorSelecionado = useMemo(() => 
    entrevistadores.find(e => e._id === selectedEntrevistador), 
    [entrevistadores, selectedEntrevistador]
  );
  
  const horariosDisponiveis = useMemo(() => 
    entrevistadorSelecionado?.agenda?.horariosDisponiveis || [
      '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
      '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
    ], 
    [entrevistadorSelecionado?.agenda?.horariosDisponiveis]
  );

  // Normaliza agendamentos para sempre trabalhar com array - memoizado
  const agendamentosArray = useMemo(() => {
    if (Array.isArray(agendamentos)) {
      return agendamentos;
    } else if (agendamentos && Array.isArray(agendamentos.results)) {
      return agendamentos.results;
    }
    return [];
  }, [agendamentos]);

  /**
   * Determina o status detalhado de um horário específico
   * Verifica se existe agendamento ou bloqueio para o horário
   * @param {string} horario - Horário no formato "HH:MM"
   * @returns {Object} Objeto com status, agendamento e bloqueio
   */
  const getStatusHorarioDetalhado = useCallback((horario) => {
    // Cria objeto Date para o horário específico na data selecionada
    const dataHorario = new Date(data);
    const [hora, minuto] = horario.split(':');
    dataHorario.setHours(Number(hora), Number(minuto), 0, 0);

    // Busca agendamento para este horário específico
    const agendamento = agendamentosArray.find(agend => {
      const dataAgendamento = new Date(agend.data);
      return dataAgendamento.getTime() === dataHorario.getTime();
    });

    // Se encontrou agendamento, retorna com o status do agendamento
    if (agendamento) {
      return { 
        status: agendamento.status || 'agendado', 
        agendamento,
        bloqueio: null
      };
    }

    // Busca bloqueio para este horário específico
    const bloqueio = bloqueios.find(bloq => {
      const dataBloqueio = new Date(bloq.data);
      return dataBloqueio.getTime() === dataHorario.getTime();
    });

    // Se encontrou bloqueio
    if (bloqueio) {
      return { 
        status: 'bloqueado', 
        agendamento: null,
        bloqueio
      };
    }

    // Horário está livre
    return { 
      status: 'livre', 
      agendamento: null,
      bloqueio: null
    };
  }, [data, agendamentosArray, bloqueios]);

  /**
   * Abre o modal de visualização de observações
   * @param {Object} agendamento - Dados do agendamento
   */
  const abrirModalObservacoes = useCallback((agendamento) => {
    setObservacoesVisualizacao(agendamento?.observacoes || 'Nenhuma observação registrada');
    setNomeAgendamentoObservacoes(agendamento?.pessoa || 'Paciente');
    setModalObservacoesAberto(true);
  }, []);

  /**
   * Funções para edição de agendamentos
   */
  const abrirModalEdicao = useCallback((agendamento) => {
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
  }, []);

  const fecharModalEdicao = useCallback(() => {
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
  }, []);

  const salvarEdicao = useCallback(async () => {
    if (!agendamentoParaEditar?._id) {
      setFeedbackState(prev => ({ ...prev, error: 'Agendamento inválido para edição' }));
      return;
    }

    if (!dadosEdicao.pessoa?.trim() || !dadosEdicao.cpf?.trim()) {
      setFeedbackState(prev => ({ ...prev, error: 'Nome da pessoa e CPF são obrigatórios' }));
      return;
    }

    try {
      await axios.put(
        `http://localhost:5000/api/appointments/${agendamentoParaEditar._id}`,
        dadosEdicao,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setFeedbackState(prev => ({ ...prev, success: 'Agendamento editado com sucesso!' }));
      fecharModalEdicao();
      await Promise.all([fetchAgendamentos(), fetchBloqueios()]);
    } catch (erro) {
      console.error('Erro ao editar agendamento:', erro);
      setFeedbackState(prev => ({ 
        ...prev, 
        error: erro.response?.data?.message || 'Erro ao editar agendamento'
      }));
    }
  }, [agendamentoParaEditar, dadosEdicao, token, fecharModalEdicao, fetchAgendamentos, fetchBloqueios]);

  /**
   * Abre o modal de criação de agendamento
   * @param {string} horario - Horário selecionado no formato "HH:MM"
   */
  const abrirModalAgendamento = useCallback((horario) => {
    setHorarioSelecionado(horario);
    setDadosAgendamento({
      pessoa: '',
      cpf: '',
      telefone1: '',
      telefone2: '',
      motivo: '',
      observacoes: ''
    });
    setModalAberto(true);
  }, []);

  /**
   * Cria um novo agendamento após validar todos os campos obrigatórios
   * Exibe mensagens de erro específicas e amigáveis para cada tipo de validação
   */
  const criarAgendamento = useCallback(async () => {
    // Validação do nome do paciente
    if (!dadosAgendamento.pessoa.trim()) {
      setError('Por favor, informe o nome completo da pessoa que será atendida.');
      return;
    }

    // Validação do CPF
    if (!dadosAgendamento.cpf.trim()) {
      setError('O CPF é obrigatório para prosseguir com o agendamento.');
      return;
    }

    // Valida se CPF tem 11 dígitos (removendo formatação)
    const cpfApenasNumeros = dadosAgendamento.cpf.replace(/\D/g, '');
    if (cpfApenasNumeros.length !== 11) {
      setError('O CPF deve conter exatamente 11 dígitos. Por favor, verifique o número informado.');
      return;
    }

    // Validação do telefone
    if (!dadosAgendamento.telefone1.trim()) {
      setError('É necessário informar pelo menos um número de telefone para contato.');
      return;
    }

    // Validação do motivo
    if (!dadosAgendamento.motivo) {
      setError('Por favor, selecione o motivo do agendamento para que possamos nos preparar adequadamente.');
      return;
    }

    // Validação do entrevistador e CRAS
    if (!entrevistadorSelecionado?.cras) {
      setError('O entrevistador deve estar vinculado a um CRAS. Entre em contato com o administrador.');
      return;
    }

    try {
      setLoading(true);
      
      // Cria objeto Date para o horário selecionado
      const dataHorario = new Date(data);
      const [hora, minuto] = horarioSelecionado.split(':');
      dataHorario.setHours(Number(hora), Number(minuto), 0, 0);

      // Envia requisição para criar agendamento
      await axios.post('http://localhost:5000/api/appointments', {
        entrevistador: selectedEntrevistador,
        cras: entrevistadorSelecionado.cras,
        pessoa: dadosAgendamento.pessoa,
        cpf: cpfApenasNumeros, // Envia apenas números
        telefone1: dadosAgendamento.telefone1,
        telefone2: dadosAgendamento.telefone2,
        motivo: dadosAgendamento.motivo,
        data: dataHorario,
        status: 'agendado',
        observacoes: dadosAgendamento.observacoes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Feedback de sucesso
      setSuccess(`Agendamento criado com sucesso! ${dadosAgendamento.pessoa} está agendado(a) para ${horarioSelecionado} em ${data?.toLocaleDateString('pt-BR')}.`);
      setModalAberto(false);
      
      // Recarrega os dados
      fetchAgendamentos();
      
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      const errorMessage = error.response?.data?.message || 'Ocorreu um erro inesperado ao criar o agendamento. Por favor, tente novamente.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [
    dadosAgendamento, 
    entrevistadorSelecionado, 
    selectedEntrevistador, 
    data, 
    horarioSelecionado, 
    token, 
    fetchAgendamentos,
    setError,
    setSuccess
  ]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <Sidebar />
      
      <Container 
        component="main" 
        maxWidth={false}
        sx={{ 
          flexGrow: 1,
          p: 3,
          marginLeft: '240px',
          minHeight: '100vh'
        }}
      >
        {/* Cabeçalho da página */}
        <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <EventIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h4" color="primary" fontWeight="bold">
              {isEntrevistador ? 'Minha Agenda' : 'Agenda dos Entrevistadores'}
            </Typography>
          </Box>
          
          <Typography variant="body1" color="text.secondary">
            {isEntrevistador 
              ? 'Visualize e gerencie seus agendamentos pessoais' 
              : 'Visualize e gerencie os agendamentos dos entrevistadores do sistema'
            }
          </Typography>
        </Paper>

        {/* Seleção de entrevistador - só aparece para admin e recepção */}
        {!isEntrevistador && (
          <Card elevation={2} sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <PersonIcon color="primary" />
                Seleção de Entrevistador
              </Typography>
              
              <FormControl fullWidth sx={{ maxWidth: 400 }}>
                <InputLabel>Escolha o entrevistador</InputLabel>
                <Select
                  value={selectedEntrevistador}
                  label="Escolha o entrevistador"
                  onChange={(e) => setSelectedEntrevistador(e.target.value)}
                  startAdornment={<PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />}
                  disabled={loading}
                >
                  <MenuItem value="">
                    <em>Selecione um entrevistador</em>
                  </MenuItem>
                  {entrevistadores.map((entrevistador) => (
                    <MenuItem key={entrevistador._id} value={entrevistador._id}>
                      {entrevistador.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        )}

        {/* Para entrevistadores, mostra informações do usuário logado */}
        {isEntrevistador && (
          <Card elevation={2} sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <PersonIcon color="primary" />
                Informações do Entrevistador
              </Typography>
              
              <Box sx={{ p: 2, backgroundColor: '#f8f9fa', borderRadius: 1 }}>
                <Typography variant="body1" fontWeight="medium">
                  👤 {user.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ✉️ {user.email}
                </Typography>
                {user.cras && (
                  <Typography variant="body2" color="text.secondary">
                    🏢 CRAS: {user.cras}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        )}

        {selectedEntrevistador && (
          <>
            <Card elevation={2} sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                  <AccessTimeIcon color="primary" />
                  Selecionar Data da Agenda
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                    <DatePicker
                      label="Data da agenda"
                      value={data}
                      onChange={setData}
                      disablePast
                      shouldDisableDate={(date) => date.getDay() === 0 || date.getDay() === 6}
                      sx={{ maxWidth: 300 }}
                      slotProps={{
                        textField: {
                          helperText: "Selecione uma data de segunda a sexta-feira"
                        }
                      }}
                    />
                  </LocalizationProvider>
                </Box>
                
                <Typography variant="body2" color="text.secondary">
                  📅 Apenas dias úteis estão disponíveis para agendamento
                </Typography>
              </CardContent>
            </Card>

            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center" p={4}>
                <CircularProgress />
                <Typography variant="body1" sx={{ ml: 2 }}>
                  Carregando agenda...
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Horário</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Nome</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>CPF</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Telefones</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Motivo</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Observações</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Criado Por</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {horariosDisponiveis.map((horario) => {
                      const { status, agendamento, bloqueio } = getStatusHorarioDetalhado(horario);
                      return (
                        <HorarioTableRow
                          key={horario}
                          horario={horario}
                          status={status}
                          agendamento={agendamento}
                          bloqueio={bloqueio}
                          formatarCPF={formatarCPF}
                          abrirModalObservacoes={abrirModalObservacoes}
                          abrirModalAgendamento={abrirModalAgendamento}
                          abrirModalEdicao={abrirModalEdicao}
                          isEntrevistador={isEntrevistador}
                        />
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}

        {/* Modal para criar agendamento */}
        <Dialog open={modalAberto} onClose={() => setModalAberto(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ pb: 2 }}>
            📅 Novo Agendamento
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {horarioSelecionado} • {data?.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="👤 Nome completo da pessoa"
                value={dadosAgendamento.pessoa}
                onChange={(e) => setDadosAgendamento({...dadosAgendamento, pessoa: e.target.value})}
                fullWidth
                required
                placeholder="Digite o nome completo"
                helperText="Nome da pessoa que será atendida"
              />
              <TextField
                label="🆔 CPF"
                value={dadosAgendamento.cpf}
                onChange={(e) => handleCPFChange(e.target.value)}
                onKeyDown={(e) => {
                  // Permite apagar com backspace mesmo nos caracteres especiais
                  if (e.key === 'Backspace' && dadosAgendamento.cpf.length > 0) {
                    const ultimoChar = dadosAgendamento.cpf[dadosAgendamento.cpf.length - 1];
                    if (ultimoChar === '.' || ultimoChar === '-') {
                      e.preventDefault();
                      const novoValor = dadosAgendamento.cpf.slice(0, -1);
                      handleCPFChange(novoValor);
                    }
                  }
                }}
                fullWidth
                required
                placeholder="000.000.000-00"
                helperText="Digite apenas números, a formatação é automática"
                inputProps={{ maxLength: 14 }}
              />
              <TextField
                label="📞 Telefone principal"
                value={dadosAgendamento.telefone1}
                onChange={(e) => handleTelefone1Change(e.target.value)}
                onKeyDown={(e) => {
                  // Permite apagar com backspace mesmo nos caracteres especiais
                  if (e.key === 'Backspace' && dadosAgendamento.telefone1.length > 0) {
                    const ultimoChar = dadosAgendamento.telefone1[dadosAgendamento.telefone1.length - 1];
                    if (ultimoChar === '(' || ultimoChar === ')' || ultimoChar === ' ' || ultimoChar === '-') {
                      e.preventDefault();
                      const novoValor = dadosAgendamento.telefone1.slice(0, -1);
                      handleTelefone1Change(novoValor);
                    }
                  }
                }}
                fullWidth
                required
                placeholder="(00) 00000-0000"
                helperText="Número principal para contato"
                inputProps={{ maxLength: 15 }}
              />
              <TextField
                label="📱 Telefone alternativo"
                value={dadosAgendamento.telefone2}
                onChange={(e) => handleTelefone2Change(e.target.value)}
                onKeyDown={(e) => {
                  // Permite apagar com backspace mesmo nos caracteres especiais
                  if (e.key === 'Backspace' && dadosAgendamento.telefone2.length > 0) {
                    const ultimoChar = dadosAgendamento.telefone2[dadosAgendamento.telefone2.length - 1];
                    if (ultimoChar === '(' || ultimoChar === ')' || ultimoChar === ' ' || ultimoChar === '-') {
                      e.preventDefault();
                      const novoValor = dadosAgendamento.telefone2.slice(0, -1);
                      handleTelefone2Change(novoValor);
                    }
                  }
                }}
                fullWidth
                placeholder="(00) 00000-0000"
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
                  {MOTIVOS_AGENDAMENTO.map((motivo) => (
                    <MenuItem key={motivo.value} value={motivo.value}>
                      <Box display="flex" alignItems="center" gap={1}>
                        {motivo.icon}
                        {motivo.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="📝 Observações importantes"
                value={dadosAgendamento.observacoes}
                onChange={(e) => setDadosAgendamento({...dadosAgendamento, observacoes: e.target.value})}
                fullWidth
                multiline
                rows={3}
                placeholder="Informações adicionais que podem ser úteis para o atendimento..."
                helperText="Campo opcional para detalhes específicos"
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button 
              onClick={() => setModalAberto(false)}
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
              {loading ? 'Criando...' : 'Confirmar Agendamento'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal de Observações */}
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
                label="Nome da Pessoa"
                value={dadosEdicao.pessoa}
                onChange={(e) => setDadosEdicao({ ...dadosEdicao, pessoa: e.target.value })}
                required
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                margin="dense"
                label="CPF"
                value={dadosEdicao.cpf}
                onChange={(e) => setDadosEdicao({ ...dadosEdicao, cpf: e.target.value })}
                required
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                margin="dense"
                label="Telefone Principal"
                value={dadosEdicao.telefone1}
                onChange={(e) => setDadosEdicao({ ...dadosEdicao, telefone1: e.target.value })}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                margin="dense"
                label="Telefone Secundário"
                value={dadosEdicao.telefone2}
                onChange={(e) => setDadosEdicao({ ...dadosEdicao, telefone2: e.target.value })}
                sx={{ mb: 2 }}
              />
              
              <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
                <InputLabel>Motivo do Agendamento</InputLabel>
                <Select
                  value={dadosEdicao.motivo}
                  onChange={(e) => setDadosEdicao({ ...dadosEdicao, motivo: e.target.value })}
                  label="Motivo do Agendamento"
                >
                  {MOTIVOS_AGENDAMENTO.map((motivo) => (
                    <MenuItem key={motivo.value} value={motivo.value}>
                      {motivo.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                margin="dense"
                label="Observações"
                value={dadosEdicao.observacoes}
                onChange={(e) => setDadosEdicao({ ...dadosEdicao, observacoes: e.target.value })}
                multiline
                rows={3}
                placeholder="Informações adicionais sobre o agendamento..."
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

        <Snackbar 
          open={!!feedbackState.error} 
          autoHideDuration={4000} 
          onClose={() => setFeedbackState(prev => ({ ...prev, error: '' }))}
        >
          <Alert severity="error" onClose={() => setFeedbackState(prev => ({ ...prev, error: '' }))}>
            {feedbackState.error}
          </Alert>
        </Snackbar>

        <Snackbar 
          open={!!feedbackState.success} 
          autoHideDuration={4000} 
          onClose={() => setFeedbackState(prev => ({ ...prev, success: '' }))}
        >
          <Alert severity="success" onClose={() => setFeedbackState(prev => ({ ...prev, success: '' }))}>
            {feedbackState.success}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
});

// Definir displayName para debug
AgendaEntrevistadores.displayName = 'AgendaEntrevistadores';

export default AgendaEntrevistadores;
