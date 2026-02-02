// Importações principais do React
// useEffect: para efeitos colaterais e ciclo de vida
// useState: para gerenciar estado local do componente
// useCallback: para memoizar funções e evitar re-renderizações desnecessárias
// useMemo: para memoizar valores computados
// memo: para memoizar o componente inteiro
import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { useAuth } from '../hooks/useAuth';

import api from '../services/api';

// Componentes do Material-UI para interface
// Box: container flexível para layout
// Typography: componente para textos com tipografia padronizada
// FormControl/InputLabel/Select/MenuItem: componentes para formulários e seletores
// Paper: componente com sombra para destacar conteúdo
// Table*: componentes para tabelas de dados
// Snackbar/Alert: componentes para notificações e alertas
// Dialog*: componentes para modais e janelas de diálogo
// Button/IconButton: botões de ação
// Chip: componente para tags e rótulos
// Grid: sistema de grid para layout responsivo
// Card*: componentes para cartões de conteúdo
// CircularProgress: indicador de carregamento
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
  CircularProgress,
  FormHelperText
} from '@mui/material';

// Ícones do Material-UI para identificar visualmente as ações e conteúdos
// Description: ícone de documento/observações
// Event: ícone de evento/agendamento
// Person: ícone de pessoa
// Phone: ícone de telefone
// Assignment: ícone de tarefa/motivo
// AccessTime: ícone de horário
// CheckCircle: ícone de confirmação/sucesso
// Block: ícone de bloqueio
// Edit/Delete: ícones de edição e exclusão
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

// Biblioteca de seleção de datas localizada para português brasileiro
// AdapterDateFns: adaptador para usar a biblioteca date-fns com Material-UI
// LocalizationProvider: provedor de contexto para localização
// DatePicker: componente de seleção de data
// ptBR: localização em português brasileiro
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import ptBR from 'date-fns/locale/pt-BR';

// Componente personalizado da sidebar para navegação
// Contém o menu lateral com as opções do sistema
import Sidebar from '../components/Sidebar';
import {
  HorarioTableRow,
  ModalAgendamento,
  ModalEdicao,
  ModalObservacoes,
  SeletorEntrevistador,
  SeletorData,
  TabelaAgenda
} from '../components/Agenda';

import {
  formatarCPF,
  formatarTelefone,
  motivosAtendimento,
  horariosDisponiveis,
  mensagens,
  criarDataHorario,
  ehFimDeSemana
} from '../utils/agendamentoUtils';

// Constantes da aplicação - movidas para fora do componente para melhor performance
// Mapeamento de cores e labels para diferentes status de agendamento
// Usado para feedback visual consistente no sistema
const STATUS_COLORS = {
  'livre': { color: 'success', label: 'Disponível' },
  'agendado': { color: 'primary', label: 'Agendado' },
  'realizado': { color: 'success', label: 'Realizado' },
  'ausente': { color: 'warning', label: 'Ausente' },
  'bloqueado': { color: 'warning', label: 'Bloqueado' }
};

/**
 * Componente principal da página de agenda dos entrevistadores
 */
const AgendaEntrevistadores = memo(() => {
  // Estados principais da aplicação - otimizados com valores iniciais
  // Inicializa data evitando fins de semana automaticamente
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
  
  // Estados para gerenciamento de dados
  const [entrevistadores, setEntrevistadores] = useState([]);
  const [selectedEntrevistador, setSelectedEntrevistador] = useState('');
  const [agendamentos, setAgendamentos] = useState([]);
  const [bloqueios, setBloqueios] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Estados de feedback - consolidados para melhor performance
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

  // Estados para edição de agendamentos
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

  // 🔒 SEGURANÇA: Dados do usuário via httpOnly cookies
  const { user: authUser, loading: authLoading } = useAuth();
  const user = useMemo(() => authUser || {}, [authUser]);
  const isEntrevistador = useMemo(() => user?.role === 'entrevistador', [user?.role]);

  // Funções helper memoizadas para feedback - evita recriação desnecessária
  const setError = useCallback((message) => {
    setFeedbackState(prev => ({ ...prev, error: message }));
  }, []);

  const setSuccess = useCallback((message) => {
    setFeedbackState(prev => ({ ...prev, success: message }));
  }, []);

  // Handlers de mudança otimizados com formatação automática
  const handleCPFChange = useCallback((valor) => {
    const cpfFormatado = formatarCPF(valor);
    setDadosAgendamento(prev => ({ ...prev, cpf: cpfFormatado }));
  }, []);

  const handleTelefone1Change = useCallback((valor) => {
    const telefoneFormatado = formatarTelefone(valor);
    setDadosAgendamento(prev => ({ ...prev, telefone1: telefoneFormatado }));
  }, []);

  const handleTelefone2Change = useCallback((valor) => {
    const telefoneFormatado = formatarTelefone(valor);
    setDadosAgendamento(prev => ({ ...prev, telefone2: telefoneFormatado }));
  }, []);

  // Função para limpar o formulário de agendamento
  const limparFormulario = useCallback(() => {
    setDadosAgendamento({
      pessoa: '',
      cpf: '',
      telefone1: '',
      telefone2: '',
      motivo: '',
      observacoes: ''
    });
    setHorarioSelecionado('');
  }, []);

  // Função para fechar o modal e limpar o formulário
  const fecharModalAgendamento = useCallback(() => {
    setModalAberto(false);
    limparFormulario();
  }, [limparFormulario]);

  /**
   * Busca todos os entrevistadores disponíveis no sistema
   * Se o usuário logado for um entrevistador, retorna apenas ele mesmo
   * Se for admin ou recepção, mostra todos os entrevistadores
   */
  const fetchEntrevistadores = useCallback(async () => {
    try {
      setLoading(true);
      
      // Se o usuário logado é um entrevistador, usa apenas seus próprios dados
      // Nota: AuthContext usa 'id' (vindo de /auth/me), API usa '_id'
      const userId = user?._id || user?.id;
      if (isEntrevistador && userId) {
        // Normaliza o objeto do usuário para ter _id (compatibilidade com API)
        const userNormalizado = { ...user, _id: userId };
        setEntrevistadores([userNormalizado]);
        setSelectedEntrevistador(userId);
        return;
      }
      
      // Para admin e recepção, busca todos os entrevistadores
      const response = await api.get('/users');
      
      const entrevistadoresFiltrados = response.data.filter(usuario => usuario.role === 'entrevistador');
      setEntrevistadores(entrevistadoresFiltrados);
      
    } catch (error) {
      console.error('Erro ao carregar entrevistadores:', error);
      setError(mensagens.erro.conexaoFalhou);
    } finally {
      setLoading(false);
    }
  }, [user, isEntrevistador, setError]);

  /**
   * Busca todos os agendamentos do entrevistador selecionado
   * Não aplica paginação para mostrar todos os horários na agenda
   * Normaliza a resposta para sempre trabalhar com array consistente
   */
  const fetchAgendamentos = useCallback(async () => {
    if (!selectedEntrevistador) {
      setAgendamentos([]);
      return;
    }
    
    try {
      const response = await api.get(
        `/appointments?entrevistador=${selectedEntrevistador}`
      );      // Normaliza a resposta para sempre trabalhar com array
      // API pode retornar formato {results: []} ou array direto
      let agendamentosData = response.data;
      if (agendamentosData && typeof agendamentosData === 'object' && Array.isArray(agendamentosData.results)) {
        agendamentosData = agendamentosData.results;
      }
      
      setAgendamentos(Array.isArray(agendamentosData) ? agendamentosData : []);
      
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
      setError(mensagens.erro.conexaoFalhou);
    }
  }, [selectedEntrevistador, setError]);

  /**
   * Busca todos os bloqueios de horário do entrevistador selecionado
   * Bloqueios são horários marcados como indisponíveis manualmente
   */
  const fetchBloqueios = useCallback(async () => {
    if (!selectedEntrevistador) {
      setBloqueios([]);
      return;
    }
    
    try {
      const response = await api.get(
        `/blocked-slots?entrevistador=${selectedEntrevistador}`
      );
      
      setBloqueios(response.data || []);
      
    } catch (error) {
      console.error('Erro ao carregar bloqueios:', error);
      setError(mensagens.erro.conexaoFalhou);
    }
  }, [selectedEntrevistador, setError]);

  // Carrega a lista de entrevistadores ao montar o componente
  useEffect(() => {
    fetchEntrevistadores();
  }, [fetchEntrevistadores]);

  // Recarrega agendamentos e bloqueios quando o entrevistador ou data mudam
  // Permite visualizar agenda atualizada sempre que filtros são alterados
  useEffect(() => {
    if (selectedEntrevistador) {
      fetchAgendamentos();
      fetchBloqueios();
    }
  }, [selectedEntrevistador, fetchAgendamentos, fetchBloqueios, data]);

  // Valores computados memoizados para performance
  // Evita recálculos desnecessários durante re-renderizações
  const entrevistadorSelecionado = useMemo(() => 
    entrevistadores.find(e => e._id === selectedEntrevistador), 
    [entrevistadores, selectedEntrevistador]
  );
  
  // Horários disponíveis - usa agenda personalizada do entrevistador ou padrão
  // Importante: inclui horariosDisponiveis nas dependências por ser usado no fallback
  const horariosAgenda = useMemo(() => 
    entrevistadorSelecionado?.agenda?.horariosDisponiveis || horariosDisponiveis,
    [entrevistadorSelecionado?.agenda?.horariosDisponiveis, horariosDisponiveis]
  );

  // Normaliza agendamentos para sempre trabalhar com array - memoizado
  // Garante consistência independente do formato da resposta da API
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
    // Cria objeto Date para o horário específico na data selecionada usando utilitário
    const dataHorario = criarDataHorario(data, horario);

    // Busca agendamento para este horário específico
    const agendamento = agendamentosArray.find(agend => {
      const dataAgendamento = new Date(agend.data);
      return dataAgendamento?.getTime() === dataHorario?.getTime();
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
   * Permite que entrevistadores editem seus próprios agendamentos
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
      await api.put(
        `/appointments/${agendamentoParaEditar._id}`,
        dadosEdicao
      );
      
      setFeedbackState(prev => ({ ...prev, success: 'Agendamento atualizado com sucesso' }));
      fecharModalEdicao();
      await Promise.all([fetchAgendamentos(), fetchBloqueios()]);
    } catch (erro) {
      console.error('Erro ao editar agendamento:', erro);
      setFeedbackState(prev => ({ 
        ...prev, 
        error: erro.response?.data?.message || 'Erro ao editar agendamento'
      }));
    }
  }, [agendamentoParaEditar, dadosEdicao, fecharModalEdicao, fetchAgendamentos, fetchBloqueios]);

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
   * Usa mensagens humanizadas dos utilitários
   */
  const criarAgendamento = useCallback(async () => {
    // Validações básicas com mensagens humanizadas
    if (!dadosAgendamento.pessoa?.trim()) {
      setError(mensagens.erro.camposObrigatorios);
      return;
    }

    // Validação do CPF - verifica se tem 11 dígitos após remover pontuação
    const cpfLimpo = (dadosAgendamento.cpf || '').toString().replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      setError(`CPF inválido. Digite 11 dígitos (atual: ${cpfLimpo.length})`);
      return;
    }

    if (!dadosAgendamento.telefone1?.trim()) {
      setError(mensagens.erro.telefoneInvalido);
      return;
    }

    if (!dadosAgendamento.motivo) {
      setError(mensagens.erro.camposObrigatorios);
      return;
    }

    // Validação do entrevistador e CRAS
    if (!entrevistadorSelecionado?.cras) {
      setError(mensagens.erro.permissaoNegada);
      return;
    }

    try {
      setLoading(true);
      
      // Cria objeto Date para o horário selecionado usando utilitário
      const dataHorario = criarDataHorario(data, horarioSelecionado);

      const dadosParaEnvio = {
        entrevistador: selectedEntrevistador,
        cras: entrevistadorSelecionado.cras._id || entrevistadorSelecionado.cras, // Garantir que seja apenas o ID
        pessoa: dadosAgendamento.pessoa,
        cpf: cpfLimpo, // Usa a variável já limpa
        telefone1: dadosAgendamento.telefone1,
        telefone2: dadosAgendamento.telefone2,
        motivo: dadosAgendamento.motivo,
        data: dataHorario,
        status: 'agendado',
        observacoes: dadosAgendamento.observacoes
      };

      // Envia requisição para criar agendamento
      await api.post('/appointments', dadosParaEnvio);

      // Feedback de sucesso
      setSuccess(mensagens.sucesso.agendamentoCriado);
      setModalAberto(false);
      
      // Limpa o formulário para o próximo agendamento
      limparFormulario();
      
      // Recarrega os dados
      fetchAgendamentos();
      
      // Dispara evento customizado para atualizar outros componentes (Dashboard, etc)
      window.dispatchEvent(new CustomEvent('appointmentChanged', { detail: { action: 'create' } }));
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Ocorreu um erro inesperado ao criar o agendamento. Por favor, tente novamente.';
      setError(`Erro ${error.response?.status || 'desconhecido'}: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [
    dadosAgendamento, 
    entrevistadorSelecionado, 
    selectedEntrevistador, 
    data, 
    horarioSelecionado, 
    fetchAgendamentos,
    limparFormulario,
    setError,
    setSuccess
  ]);

  return (
    <>
      {/* Componente de navegação lateral */}
      <Sidebar />
      
      {/* Loading enquanto autenticação está carregando */}
      {authLoading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
          <CircularProgress />
        </Box>
      ) : (
      /* Container principal da página */
      <Container 
        component="main" 
        maxWidth={false}
        className="main-content"
      >
        {/* Cabeçalho da página com título e descrição */}
        <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Box display="flex" flexDirection="column" alignItems="center" textAlign="center" mb={0} >
            <Box display="flex" alignItems="center" gap={1}>
              <EventIcon color="primary" sx={{ fontSize: 32 }} />
              <Typography variant="h4" className="main-page-title" color="primary" fontWeight="bold">
                {isEntrevistador ? 'Minha Agenda' : 'Agenda dos Entrevistadores'}
              </Typography>
            </Box>
            
            <Typography variant="body1" color="text.secondary" mb={0}>
              {isEntrevistador 
                ? 'Visualize e gerencie seus agendamentos pessoais' 
                : 'Visualize e gerencie os agendamentos dos entrevistadores do sistema'
              }
            </Typography>
          </Box>

          {/* Seleção de entrevistador - aparece apenas para admin e recepção */}
          {!isEntrevistador && (
            <Box>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1} mb={2}>
                <PersonIcon color="primary" />
                Seleções da Agenda
              </Typography>
              
              <Box display="flex" gap={3} alignItems="flex-start" flexWrap="wrap">
                {/* Dropdown para seleção de entrevistador */}
                <Box sx={{ minWidth: 300, flex: 1 }}>
                  <Typography variant="body1" fontWeight="medium" mb={1}>
                    Entrevistador
                  </Typography>
                  <FormControl fullWidth sx={{ maxWidth: 400 }}>
                    <InputLabel>Escolha o entrevistador</InputLabel>
                    <Select
                      value={selectedEntrevistador}
                      label="Escolha o entrevistador"
                      onChange={(e) => setSelectedEntrevistador(e.target.value)}
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
                    {selectedEntrevistador && (
                      <FormHelperText>
                        Visualizando agenda de: {entrevistadores.find(e => e._id === selectedEntrevistador)?.name}
                      </FormHelperText>
                    )}
                  </FormControl>
                </Box>

                {/* Seletor de data - aparece na mesma linha quando entrevistador é selecionado */}
                {selectedEntrevistador && (
                  <Box sx={{ minWidth: 300, flex: 1 }}>
                    <Typography variant="body1" fontWeight="medium" mb={1}>
                      Data da Agenda
                    </Typography>
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                      <DatePicker
                        label="Data da agenda"
                        value={data}
                        onChange={setData}
                        disablePast
                        shouldDisableDate={(date) => ehFimDeSemana(date)}
                        sx={{ maxWidth: 400, width: '100%' }}
                        slotProps={{
                          textField: {
                            helperText: "Apenas dias úteis (segunda a sexta-feira)"
                          }
                        }}
                      />
                    </LocalizationProvider>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </Paper>

        {/* Para entrevistadores, exibe informações do usuário logado */}
        {isEntrevistador && (
          <Card elevation={2} sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <PersonIcon color="primary" />
                Informações do Entrevistador
              </Typography>
              
              {/* Card com informações do entrevistador logado */}
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

        {/* Tabela de horários - exibe apenas se um entrevistador foi selecionado */}
        {selectedEntrevistador && (
          <>
            {/* Estado de carregamento */}
            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center" p={4}>
                <CircularProgress />
                <Typography variant="body1" sx={{ ml: 2 }}>
                  Carregando agenda...
                </Typography>
              </Box>
            ) : (
              /* Tabela principal da agenda */
              <TableContainer component={Paper} sx={{ mt: 1 }}>
                <Table size="small">
                  {/* Cabeçalho da tabela */}
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
                  
                  {/* Corpo da tabela - mapeia todos os horários disponíveis */}
                  <TableBody>
                    {horariosAgenda.map((horario) => {
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

        {/* Modal para criar novo agendamento */}
        <Dialog open={modalAberto} onClose={fecharModalAgendamento} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ pb: 2 }}>
            📅 Novo Agendamento
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {horarioSelecionado} • {data?.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              {/* Campo nome completo - obrigatório */}
              <TextField
                label="👤 Nome Completo"
                value={dadosAgendamento.pessoa}
                onChange={(e) => setDadosAgendamento({...dadosAgendamento, pessoa: e.target.value})}
                fullWidth
                required
                placeholder="Digite o nome completo da pessoa"
                helperText="Nome da pessoa que será atendida"
              />
              
              {/* Campo CPF com formatação automática - obrigatório */}
              <TextField
                label="📋 CPF"
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
                placeholder="Digite o CPF (000.000.000-00)"
                helperText="Digite apenas números, a formatação é automática"
                inputProps={{ maxLength: 14 }}
              />
              
              {/* Campo telefone principal com formatação automática - obrigatório */}
              <TextField
                label="📞 Telefone Principal"
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
                placeholder="Digite o telefone (00) 00000-0000"
                helperText="Número principal para contato"
                inputProps={{ maxLength: 15 }}
              />
              
              {/* Campo telefone alternativo - opcional */}
              <TextField
                label="📞 Telefone Alternativo (Opcional)"
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
                placeholder="Digite o telefone alternativo (00) 00000-0000"
                helperText="Número adicional (opcional)"
                inputProps={{ maxLength: 15 }}
              />
              
              {/* Dropdown para motivo do atendimento - obrigatório */}
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
              
              {/* Campo observações - opcional, texto livre multilinhas */}
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
          
          {/* Botões de ação do modal */}
          <DialogActions sx={{ p: 3 }}>
            <Button 
              onClick={fecharModalAgendamento}
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

        {/* Modal de visualização de observações */}
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
              {/* Nome da pessoa do agendamento */}
              <Typography variant="subtitle1" color="primary" gutterBottom>
                👤 {nomeAgendamentoObservacoes}
              </Typography>
              
              {/* Área de texto das observações com estilo melhorado */}
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
                    whiteSpace: 'pre-wrap', // Preserva quebras de linha
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

        {/* Modal de edição de agendamento - apenas para entrevistadores */}
        <Dialog open={modalEdicaoAberto} onClose={fecharModalEdicao} maxWidth="sm" fullWidth>
          <DialogTitle>
            ✏️ Editar Agendamento
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              {/* Campos editáveis - estrutura similar ao modal de criação */}
              <TextField
                fullWidth
                margin="dense"
                label="👤 Nome Completo"
                value={dadosEdicao.pessoa}
                onChange={(e) => setDadosEdicao({ ...dadosEdicao, pessoa: e.target.value })}
                required
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                margin="dense"
                label="📋 CPF"
                value={dadosEdicao.cpf}
                onChange={(e) => setDadosEdicao({ ...dadosEdicao, cpf: e.target.value })}
                required
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                margin="dense"
                label="📞 Telefone Principal"
                value={dadosEdicao.telefone1}
                onChange={(e) => setDadosEdicao({ ...dadosEdicao, telefone1: e.target.value })}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                margin="dense"
                label="📞 Telefone Alternativo (Opcional)"
                value={dadosEdicao.telefone2}
                onChange={(e) => setDadosEdicao({ ...dadosEdicao, telefone2: e.target.value })}
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

        {/* Snackbars para feedback de erro e sucesso */}
        <Snackbar 
          open={!!feedbackState.error} 
          autoHideDuration={4000} 
          onClose={(event, reason) => {
            if (reason === 'clickaway') return;
            setFeedbackState(prev => ({ ...prev, error: '' }));
          }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{ mb: 2, mr: 2 }}
        >
          <Alert severity="error" onClose={() => setFeedbackState(prev => ({ ...prev, error: '' }))}>
            {feedbackState.error}
          </Alert>
        </Snackbar>

        <Snackbar 
          open={!!feedbackState.success} 
          autoHideDuration={4000} 
          onClose={(event, reason) => {
            if (reason === 'clickaway') return;
            setFeedbackState(prev => ({ ...prev, success: '' }));
          }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{ mb: 2, mr: 2 }}
        >
          <Alert severity="success" onClose={() => setFeedbackState(prev => ({ ...prev, success: '' }))}>
            {feedbackState.success}
          </Alert>
        </Snackbar>
      </Container>
      )}
    </>
  );
});

// Definir displayName para debug
AgendaEntrevistadores.displayName = 'AgendaEntrevistadores';

export default AgendaEntrevistadores;
