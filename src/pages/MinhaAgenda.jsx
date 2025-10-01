// Hooks do React para gerenciamento de estado e efeitos
// useEffect: executa efeitos colaterais (chamadas de API, listeners)
// useState: gerencia estado local do componente
// useCallback: memoiza funções para evitar recriação desnecessária
// useMemo: memoiza valores computados para otimizar performance
import { useEffect, useState, useCallback, useMemo } from 'react';

// Hook de navegação do React Router para redirecionamentos
import { useNavigate } from 'react-router-dom';

// Cliente HTTP para comunicação com o backend
import axios from 'axios';

// Componente da sidebar para navegação lateral
import Sidebar from '../components/Sidebar';
// Componentes da biblioteca Material-UI para interface de usuário
// Box: container flexível para layout
// Typography: textos com tipografia padronizada
// Button: botões de ação
// Dialog*: componentes para modais e janelas de diálogo
// Snackbar/Alert: notificações e mensagens de feedback
// Table*: componentes para exibição tabular de dados
// TextField: campos de entrada de texto
// FormControl/Select: componentes de formulário e seletores
// Card*: componentes para organizar conteúdo em cartões
// CircularProgress: indicador visual de carregamento
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
  Card,
  CardContent,
  CircularProgress,
} from '@mui/material';
// Biblioteca de seleção de datas com localização brasileira
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';

// Ícones para as ações da interface
// DeleteIcon: exclusão de registros
// CheckCircleIcon: confirmação de presença
// CancelIcon: cancelamento de ações
// EditIcon: edição de registros
// DescriptionIcon: visualização de observações
// EventIcon: representação de eventos/agendamentos
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import DescriptionIcon from '@mui/icons-material/Description';
import EventIcon from '@mui/icons-material/Event';

// Localização em português brasileiro para o date picker
import ptBR from 'date-fns/locale/pt-BR';

// Utilitários compartilhados para regras de negócio
// formatarCPF/formatarTelefone: formatação de dados de contato
// motivosAtendimento: lista dos motivos de atendimento disponíveis
// horariosDisponiveis: lista dos horários de funcionamento
// criarDataHorario: cria objeto Date combinando data e horário
import {
  formatarCPF,
  formatarTelefone,
  motivosAtendimento,
  horariosDisponiveis,
  criarDataHorario
} from '../utils/agendamentoUtils';

// Configuração de URL base da API
// Usa variável de ambiente se disponível, senão usa localhost como fallback
// Isso permite facilitar deploy em diferentes ambientes
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Estados iniciais para otimizar renderizações
// Definir objetos constantes evita recriação desnecessária a cada render
const INITIAL_FORM_STATE = {
  pessoa: '',
  cpf: '',
  telefone1: '',
  telefone2: '',
  motivo: '',
  observacoes: ''
};

// Estado inicial para mensagens de feedback ao usuário
const INITIAL_MESSAGE_STATE = { 
  visivel: false, 
  texto: '', 
  tipo: 'success' 
};

// Mensagens padronizadas do sistema para feedback consistente
// Centralizar as mensagens facilita manutenção e internacionalização futura
const MESSAGES = {
  SUCCESS: {
    AGENDAMENTO_CRIADO: 'Agendamento criado com sucesso!',
    AGENDAMENTO_EXCLUIDO: 'Agendamento excluído com sucesso!',
    AGENDAMENTO_EDITADO: 'Agendamento editado com sucesso!',
    PRESENCA_CONFIRMADA: 'Presença confirmada com sucesso!',
    PRESENCA_REMOVIDA: 'Confirmação de presença removida!'
  },
  ERROR: {
    AGENDAMENTO_CRIACAO: 'Não foi possível criar o agendamento. Tente novamente.',
    AGENDAMENTO_EXCLUSAO: 'Não foi possível excluir o agendamento. Tente novamente.',
    AGENDAMENTO_EDICAO: 'Não foi possível editar o agendamento. Tente novamente.',
    CARREGAR_DADOS: 'Não foi possível carregar os dados. Tente novamente.',
    VALIDACAO_FORMULARIO: 'Por favor, verifique os campos obrigatórios.'
  }
};

// Estados de loading granulares para controlar carregamento de ações específicas
// Permite mostrar feedback visual específico para cada operação
const INITIAL_LOADING_STATE = {
  agendamentos: false,  // carregamento da lista de agendamentos
  creating: false,      // criação de novo agendamento
  updating: false,      // atualização de agendamento existente
  deleting: false,      // exclusão de agendamento
  confirming: false     // confirmação de presença
};

// Componente principal da agenda pessoal do entrevistador
// Permite ao usuário gerenciar seus próprios agendamentos e bloqueios
export default function MinhaAgenda() {
  const navigate = useNavigate();

  // Dados do usuário otimizados com useMemo
  // Evita re-parse do localStorage a cada render
  const { token, usuario, usuarioId, usuarioCras } = useMemo(() => {
    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('user') || 'null');
    return {
      token,
      usuario,
      usuarioId: usuario?.id,
      usuarioCras: usuario?.cras
    };
  }, []);

  // Estado para data selecionada com lógica inteligente de inicialização
  // Se for fim de semana, automaticamente seleciona a próxima segunda-feira
  const [dataSelecionada, setDataSelecionada] = useState(() => {
    const hoje = new Date();
    // Se for fim de semana, já seleciona próxima segunda
    if (hoje.getDay() === 0) { // domingo
      const segunda = new Date(hoje);
      segunda.setDate(hoje.getDate() + 1);
      return segunda;
    } else if (hoje.getDay() === 6) { // sábado
      const segunda = new Date(hoje);
      segunda.setDate(hoje.getDate() + 2);
      return segunda;
    }
    return hoje;
  });
  
  // Estados principais para gerenciamento de dados
  const [agendamentos, setAgendamentos] = useState([]);  // lista de agendamentos do dia
  const [bloqueios, setBloqueios] = useState([]);        // lista de horários bloqueados
  const [mensagem, setMensagem] = useState(INITIAL_MESSAGE_STATE);  // mensagens de feedback
  const [loading, setLoading] = useState(INITIAL_LOADING_STATE);    // estados de carregamento

  // Estados para controle de modais
  // Organizar em objeto facilita gerenciamento de múltiplos modais
  const [modals, setModals] = useState({
    agendamento: false,  // modal de criação/edição de agendamento
    bloqueio: false,     // modal de bloqueio de horário
    exclusao: false,     // modal de confirmação de exclusão
    observacoes: false,  // modal de visualização de observações
    edicao: false        // modal de edição de agendamento
  });

  // Estados de formulários separados para criação e edição
  // Manter separados evita conflitos entre ações simultâneas
  const [dadosAgendamento, setDadosAgendamento] = useState(INITIAL_FORM_STATE);
  const [dadosEdicao, setDadosEdicao] = useState(INITIAL_FORM_STATE);

  // Estados de contexto para ações específicas
  // Armazena informações temporárias necessárias para operações
  const [contexto, setContexto] = useState({
    horarioSelecionado: null,        // horário clicado pelo usuário
    agendamentoSelecionado: null,    // agendamento sendo editado/excluído
    observacoesVisualizacao: '',     // texto das observações no modal
    nomeAgendamentoObservacoes: ''   // nome da pessoa para contexto no modal
  });

  // Funções utilitárias otimizadas com useCallback para performance
  
  // Helper para atualizar estado de modais de forma eficiente
  const updateModal = useCallback((modalName, isOpen) => {
    setModals(prev => ({ ...prev, [modalName]: isOpen }));
  }, []);

  // Função para exibir mensagens com auto-hide inteligente
  // Duração varia conforme tipo: erro = 4s, sucesso = 3s, outros = 5s
  const mostrarMensagem = useCallback((texto, tipo = 'success') => {
    setMensagem({ visivel: true, texto, tipo });
    
    // Auto-hide inteligente baseado no tipo da mensagem
    const delay = tipo === 'error' ? 4000 : tipo === 'success' ? 3000 : 5000;
    setTimeout(() => {
      setMensagem(prev => ({ ...prev, visivel: false }));
    }, delay);
  }, []);

  // Helper para gerenciar estados de loading granulares
  const updateLoading = useCallback((key, value) => {
    setLoading(prev => ({ ...prev, [key]: value }));
  }, []);

  // Handlers de formatação otimizados para campos de entrada
  
  // Handler para formatação automática de CPF (xxx.xxx.xxx-xx)
  const handleCPFChange = useCallback((valor, isEdicao = false) => {
    const cpfFormatado = formatarCPF(valor);
    if (isEdicao) {
      setDadosEdicao(prev => ({ ...prev, cpf: cpfFormatado }));
    } else {
      setDadosAgendamento(prev => ({ ...prev, cpf: cpfFormatado }));
    }
  }, []);

  // Handler para formatação automática de telefone ((xx) xxxxx-xxxx)
  const handleTelefoneChange = useCallback((valor, campo, isEdicao = false) => {
    const telefoneFormatado = formatarTelefone(valor);
    if (isEdicao) {
      setDadosEdicao(prev => ({ ...prev, [campo]: telefoneFormatado }));
    } else {
      setDadosAgendamento(prev => ({ ...prev, [campo]: telefoneFormatado }));
    }
  }, []);

  // Verificação de autenticação e autorização
  // Garante que apenas entrevistadores autenticados acessem esta página
  useEffect(() => {
    if (!token || !usuario || usuario.role !== 'entrevistador') {
      localStorage.clear();  // Limpa dados inválidos
      navigate('/login');    // Redireciona para login
    }
  }, [token, usuario, navigate]);

  // Funções de API otimizadas para comunicação com o backend
  
  // Função para buscar agendamentos do usuário logado
  const buscarAgendamentos = useCallback(async () => {
    if (!token || !usuarioId) return;
    
    try {
      // Busca apenas agendamentos do entrevistador logado
      const { data } = await axios.get(
        `${API_BASE_URL}/appointments?entrevistador=${usuarioId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Normaliza resposta da API - pode vir como results ou array direto
      const agendamentos = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      setAgendamentos(agendamentos);
    } catch (erro) {
      console.error('Erro ao buscar agendamentos:', erro);
      mostrarMensagem('Não foi possível carregar seus agendamentos. Tente novamente.', 'error');
    }
  }, [token, usuarioId, mostrarMensagem]);

  // Função para buscar horários bloqueados do sistema
  const buscarBloqueios = useCallback(async () => {
    if (!token) return;
    
    try {
      // Busca todos os bloqueios ativos no sistema
      const { data } = await axios.get(
        `${API_BASE_URL}/blocked-slots`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBloqueios(data || []);
    } catch (erro) {
      console.error('Erro ao buscar bloqueios:', erro);
      mostrarMensagem('Não foi possível verificar horários bloqueados. Tente novamente.', 'error');
    }
  }, [token, mostrarMensagem]);

  // Carregamento inicial otimizado
  // Executa busca de dados assim que o usuário e token estiverem disponíveis
  useEffect(() => {
    if (token && usuario) {
      // Executa as duas buscas em paralelo para melhor performance
      Promise.all([buscarAgendamentos(), buscarBloqueios()]);
    }
  }, [token, usuario, buscarAgendamentos, buscarBloqueios]);

  // Verifica se um horário específico está bloqueado
  // Compara timestamp exato para determinar bloqueio
  const verificarHorarioBloqueado = useCallback((data, horario) => {
    const dataHorario = criarDataHorario(data, horario);
    if (!dataHorario) return false;
    
    return bloqueios.some(bloqueio => {
      const dataBloqueio = new Date(bloqueio.data);
      return dataBloqueio.getTime() === dataHorario.getTime();
    });
  }, [bloqueios]);

  // Busca agendamento específico para uma data e horário
  // Faz comparação precisa de data/hora e filtra por entrevistador
  const obterAgendamento = useCallback((data, horario) => {
    if (!data || !horario || !agendamentos.length) return null;
    
    // Constrói objeto Date preciso para comparação
    const [hora, minuto] = horario.split(':');
    const dataProcurada = new Date(data);
    dataProcurada.setHours(parseInt(hora, 10), parseInt(minuto, 10), 0, 0);
    
    return agendamentos.find(agendamento => {
      // Filtra apenas agendamentos do entrevistador logado
      if (agendamento.entrevistador && usuarioId &&
          String(agendamento.entrevistador._id || agendamento.entrevistador) !== String(usuarioId)) {
        return false;
      }
      
      // Compara data e hora com precisão total
      const dataAgendamento = new Date(agendamento.data);
      return (
        dataAgendamento.getFullYear() === dataProcurada.getFullYear() &&
        dataAgendamento.getMonth() === dataProcurada.getMonth() &&
        dataAgendamento.getDate() === dataProcurada.getDate() &&
        dataAgendamento.getHours() === dataProcurada.getHours() &&
        dataAgendamento.getMinutes() === dataProcurada.getMinutes()
      );
    });
  }, [agendamentos, usuarioId]);

  // 🗓️ Funções de agendamento otimizadas
  const validarFormulario = useCallback((dados) => {
    if (!dados.pessoa.trim()) {
      mostrarMensagem('👤 Por favor, informe o nome completo do cidadão', 'error');
      return false;
    }
    if (!dados.cpf.trim()) {
      mostrarMensagem('📋 Por favor, informe o CPF do cidadão', 'error');
      return false;
    }
    
    // Validação de CPF - deve ter exatamente 11 dígitos
    const cpfApenasNumeros = dados.cpf.replace(/\D/g, '');
    if (cpfApenasNumeros.length !== 11) {
      mostrarMensagem('CPF deve ter exatamente 11 números', 'error');
      return false;
    }
    
    // Validação de telefone obrigatório
    if (!dados.telefone1.trim()) {
      mostrarMensagem('Por favor, informe um telefone para contato', 'error');
      return false;
    }
    
    // Validação de motivo obrigatório
    if (!dados.motivo) {
      mostrarMensagem('Por favor, selecione o motivo do atendimento', 'error');
      return false;
    }
    
    // Validação de CRAS do usuário
    if (!usuarioCras) {
      mostrarMensagem('Erro: CRAS não identificado para o usuário. Contate o administrador.', 'error');
      return false;
    }
    
    return true;
  }, [mostrarMensagem, usuarioCras]);

  // Função principal para criar novo agendamento
  // Valida dados, monta payload e envia para API
  const criarAgendamento = useCallback(async () => {
    if (!validarFormulario(dadosAgendamento)) return;

    updateLoading('creating', true);
    try {
      // Cria objeto Date preciso combinando data e horário
      const dataHorario = criarDataHorario(dataSelecionada, contexto.horarioSelecionado);
      if (!dataHorario) throw new Error('Data inválida');

      // Monta payload para envio à API
      const dadosParaEnvio = {
        entrevistador: usuarioId,
        cras: usuarioCras,
        pessoa: dadosAgendamento.pessoa,
        cpf: dadosAgendamento.cpf.replace(/\\D/g, ''),  // Remove formatação
        telefone1: dadosAgendamento.telefone1,
        telefone2: dadosAgendamento.telefone2,
        motivo: dadosAgendamento.motivo,
        data: dataHorario,
        status: 'agendado',
        observacoes: dadosAgendamento.observacoes
      };

      // Envia requisição para criar agendamento na API
      await axios.post(
        `${API_BASE_URL}/appointments`,
        dadosParaEnvio,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Feedback de sucesso e fechamento do modal
      mostrarMensagem(MESSAGES.SUCCESS.AGENDAMENTO_CRIADO);
      updateModal('agendamento', false);
      
      // Atualiza lista de agendamentos sem bloquear o fechamento do modal
      buscarAgendamentos();
      
    } catch (erro) {
      console.error('Erro ao criar agendamento:', erro);
      mostrarMensagem(MESSAGES.ERROR.AGENDAMENTO_CRIACAO, 'error');
    } finally {
      // Sempre remove o loading, independente de sucesso ou erro
      updateLoading('creating', false);
    }
  }, [dadosAgendamento, dataSelecionada, contexto.horarioSelecionado, usuarioId, usuarioCras, token, validarFormulario, mostrarMensagem, updateModal, updateLoading, buscarAgendamentos]);

  // Funções de confirmação otimizadas para controle de presença
  
  // Função para confirmar presença do usuário em agendamento
  // Atualiza status do agendamento para 'realizado'
  const confirmarPresenca = useCallback(async (agendamento) => {
    if (!agendamento?._id) return;

    try {
      // Chama endpoint específico para confirmação de presença
      await axios.patch(
        `${API_BASE_URL}/appointments/${agendamento._id}/confirm`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      mostrarMensagem('Presença confirmada com sucesso!');
      buscarAgendamentos();  // Atualiza lista para refletir mudança
    } catch (erro) {
      console.error('Erro ao confirmar presença:', erro);
      mostrarMensagem('Não foi possível confirmar a presença. Tente novamente.', 'error');
    }
  }, [token, mostrarMensagem, buscarAgendamentos]);

  const removerConfirmacao = useCallback(async (agendamento) => {
    if (!agendamento?._id) return;

    try {
      await axios.patch(
        `${API_BASE_URL}/appointments/${agendamento._id}/unconfirm`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      mostrarMensagem('Confirmação removida com sucesso!');
      buscarAgendamentos();
    } catch (erro) {
      console.error('Erro ao remover confirmação:', erro);
      mostrarMensagem('😓 Não foi possível remover a confirmação. Tente novamente.', 'error');
    }
  }, [token, mostrarMensagem, buscarAgendamentos]);

  const excluirAgendamento = useCallback(async () => {
    if (!contexto.agendamentoParaExcluir) return;

    updateLoading('deleting', true);
    try {
      await axios.delete(
        `${API_BASE_URL}/appointments/${contexto.agendamentoParaExcluir._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      mostrarMensagem(MESSAGES.SUCCESS.AGENDAMENTO_EXCLUIDO);
      updateModal('exclusao', false);
      buscarAgendamentos();
    } catch (erro) {
      console.error('Erro ao excluir agendamento:', erro);
      mostrarMensagem(MESSAGES.ERROR.AGENDAMENTO_EXCLUSAO, 'error');
    } finally {
      updateLoading('deleting', false);
    }
  }, [contexto.agendamentoParaExcluir, token, mostrarMensagem, updateModal, updateLoading, buscarAgendamentos]);

  const salvarEdicao = useCallback(async () => {
    if (!validarFormulario(dadosEdicao) || !contexto.agendamentoParaEditar) return;

    try {
      const dadosParaEdicao = {
        pessoa: dadosEdicao.pessoa,
        cpf: dadosEdicao.cpf.replace(/\D/g, ''),
        telefone1: dadosEdicao.telefone1,
        telefone2: dadosEdicao.telefone2,
        motivo: dadosEdicao.motivo,
        observacoes: dadosEdicao.observacoes
      };

      await axios.put(
        `${API_BASE_URL}/appointments/${contexto.agendamentoParaEditar._id}`,
        dadosParaEdicao,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      mostrarMensagem('Agendamento editado com sucesso!');
      updateModal('edicao', false);
      buscarAgendamentos();
    } catch (erro) {
      console.error('Erro ao editar agendamento:', erro);
      mostrarMensagem('😓 Não foi possível editar o agendamento. Tente novamente.', 'error');
    }
  }, [dadosEdicao, contexto.agendamentoParaEditar, token, validarFormulario, mostrarMensagem, updateModal, buscarAgendamentos]);

  const criarBloqueio = useCallback(async () => {
    try {
      const dataHorario = criarDataHorario(dataSelecionada, contexto.horarioParaBloqueio);
      
      await axios.post(
        `${API_BASE_URL}/blocked-slots`,
        { data: dataHorario },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      mostrarMensagem('Horário bloqueado com sucesso');
      updateModal('bloqueio', false);
      buscarBloqueios();
    } catch (erro) {
      console.error('Erro ao bloquear horário:', erro);
      mostrarMensagem('😓 Não foi possível bloquear este horário. Tente novamente.', 'error');
    }
  }, [dataSelecionada, contexto.horarioParaBloqueio, token, mostrarMensagem, updateModal, buscarBloqueios]);

  // 🚫 Early return se não autenticado
  if (!token || !usuario) {
    return (
      <Box sx={{ display: 'flex' }}>
        <Sidebar />
        <Box sx={{ flexGrow: 1, p: 3, textAlign: 'center' }}>
          <Typography variant="h6">Carregando...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Sidebar />
      <Box className="main-content">
          {/* Header */}
          <Box sx={{ 
            mt: { xs: 1, sm: 2, md: 4 }, 
            mb: { xs: 2, sm: 3, md: 3 }, 
            textAlign: 'center',
            pt: { xs: 1, sm: 0 },
            position: 'relative',
            zIndex: 1
          }}>
            <Typography 
              variant="h4" 
              component="h1" 
              className="main-page-title" 
              sx={{ 
                fontFamily: 'Poppins, Roboto, Arial, sans-serif',
                fontWeight: 700,
                fontSize: {
                  xs: '1.8rem',
                  sm: '2.2rem',
                  md: '2.5rem',
                  lg: '2.8rem'
                },
                background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                letterSpacing: '0.5px',
                lineHeight: 1.2,
                position: 'relative',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  bottom: '-8px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: { xs: '60px', sm: '80px' },
                  height: '3px',
                  background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                  borderRadius: '2px'
                }
              }}
            >
              📅 Minha Agenda
            </Typography>
          </Box>

          {/* Seletor de Data */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <Card sx={{ minWidth: 300, maxWidth: 400 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                  <DatePicker
                    label="Selecionar Data"
                    value={dataSelecionada}
                    onChange={setDataSelecionada}
                    shouldDisableDate={(date) => {
                      const day = date.getDay();
                      return day === 0 || day === 6; // Desabilitar fins de semana
                    }}
                    slotProps={{
                      textField: { size: 'small' }
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Tabela de Agendamentos */}
          <TableContainer component={Paper} sx={{ 
            width: '100%',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            overflow: 'hidden',
            border: '1px solid rgba(0, 0, 0, 0.08)'
          }}>
            <Table sx={{ width: '100%' }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                  <TableCell sx={{ fontWeight: 'bold', color: '#1E4976' }}>Horário</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#1E4976' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#1E4976' }}>Nome</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#1E4976' }}>CPF</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#1E4976' }}>Telefones</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#1E4976' }}>Motivo</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#1E4976' }}>Observações</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', color: '#1E4976' }}>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {horariosDisponiveis.map(horario => {
                  const agendamento = obterAgendamento(dataSelecionada, horario);
                  const bloqueado = verificarHorarioBloqueado(dataSelecionada, horario);
                  const agendado = !!agendamento;

                  return (
                    <TableRow 
                      key={horario}
                      sx={{
                        backgroundColor: agendamento?.status === 'realizado' ? '#e8f5e8' : 'inherit'
                      }}
                    >
                      <TableCell sx={{ fontWeight: 'bold' }}>{horario}</TableCell>
                      <TableCell>
                        <Typography
                          color={
                            agendado && agendamento?.status === 'realizado' ? 'success.main' :
                            agendado ? 'primary.main' :
                            bloqueado ? 'warning.main' :
                            'success.main'
                          }
                        >
                          {agendado && agendamento?.status === 'realizado' ? 'Realizado' :
                           agendado ? 'Agendado' :
                           bloqueado ? 'Bloqueado' :
                           'Disponível'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {agendamento ? agendamento.pessoa : '-'}
                      </TableCell>
                      <TableCell>
                        {agendamento ? formatarCPF(agendamento.cpf) : '-'}
                      </TableCell>
                      <TableCell>
                        {agendamento ? (
                          <Box>
                            <Typography variant="body2">{formatarTelefone(agendamento.telefone1)}</Typography>
                            {agendamento.telefone2 && (
                              <Typography variant="body2">{formatarTelefone(agendamento.telefone2)}</Typography>
                            )}
                          </Box>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {agendamento ? agendamento.motivo : '-'}
                      </TableCell>
                      <TableCell>
                        {agendamento?.observacoes ? (
                          <IconButton 
                            size="small" 
                            onClick={() => {
                              setContexto(prev => ({ 
                                ...prev, 
                                observacoesVisualizacao: agendamento.observacoes,
                                nomeAgendamentoObservacoes: agendamento.pessoa
                              }));
                              updateModal('observacoes', true);
                            }}
                          >
                            <DescriptionIcon fontSize="small" />
                          </IconButton>
                        ) : '-'}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          {!agendado && !bloqueado && (
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => {
                                setContexto(prev => ({ ...prev, horarioSelecionado: horario }));
                                updateModal('agendamento', true);
                              }}
                            >
                              Agendar
                            </Button>
                          )}
                          
                          {agendado && (
                            <>
                              {agendamento.status !== 'realizado' && (
                                <IconButton 
                                  size="small" 
                                  onClick={() => confirmarPresenca(agendamento)}
                                  sx={{ color: 'success.main' }}
                                  title="Confirmar Presença"
                                >
                                  <CheckCircleIcon fontSize="small" />
                                </IconButton>
                              )}
                              
                              {agendamento.status === 'realizado' && (
                                <IconButton 
                                  size="small" 
                                  onClick={() => removerConfirmacao(agendamento)}
                                  sx={{ color: 'warning.main' }}
                                  title="Remover Confirmação"
                                >
                                  <CancelIcon fontSize="small" />
                                </IconButton>
                              )}
                              
                              <IconButton 
                                size="small" 
                                onClick={() => {
                                  setDadosEdicao({ ...agendamento });
                                  setContexto(prev => ({ 
                                    ...prev, 
                                    agendamentoParaEditar: agendamento
                                  }));
                                  updateModal('edicao', true);
                                }}
                                sx={{ color: 'primary.main' }}
                                title="Editar"
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              
                              <IconButton 
                                size="small" 
                                onClick={() => {
                                  setContexto(prev => ({ ...prev, agendamentoParaExcluir: agendamento }));
                                  updateModal('exclusao', true);
                                }}
                                sx={{ color: 'error.main' }}
                                title="Excluir"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </>
                          )}
                          
                          {!agendado && !bloqueado && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="warning"
                              onClick={() => {
                                setContexto(prev => ({ ...prev, horarioParaBloqueio: horario }));
                                updateModal('bloqueio', true);
                              }}
                            >
                              Bloquear
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Modal de Agendamento */}
          <Dialog 
            open={modals.agendamento} 
            onClose={() => updateModal('agendamento', false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              Criar Agendamento - {contexto.horarioSelecionado} em {dataSelecionada?.toLocaleDateString('pt-BR')}
            </DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <TextField
                  label="👤 Nome Completo"
                  value={dadosAgendamento.pessoa}
                  onChange={(e) => setDadosAgendamento(prev => ({ ...prev, pessoa: e.target.value }))}
                  fullWidth
                  required
                  placeholder="Digite o nome completo da pessoa"
                  helperText="Nome da pessoa que será atendida"
                />
                <TextField
                  label="📋 CPF"
                  value={dadosAgendamento.cpf}
                  onChange={(e) => handleCPFChange(e.target.value)}
                  fullWidth
                  required
                  placeholder="Digite o CPF (000.000.000-00)"
                  helperText="Digite apenas números, a formatação é automática"
                  inputProps={{ maxLength: 14 }}
                />
                <TextField
                  label="📞 Telefone Principal"
                  value={dadosAgendamento.telefone1}
                  onChange={(e) => handleTelefoneChange(e.target.value, 'telefone1')}
                  fullWidth
                  required
                  placeholder="Digite o telefone (00) 00000-0000"
                  helperText="Número principal para contato"
                  inputProps={{ maxLength: 15 }}
                />
                <TextField
                  label="📞 Telefone Alternativo (Opcional)"
                  value={dadosAgendamento.telefone2}
                  onChange={(e) => handleTelefoneChange(e.target.value, 'telefone2')}
                  fullWidth
                  placeholder="Digite o telefone alternativo (00) 00000-0000"
                  helperText="Número adicional (opcional)"
                  inputProps={{ maxLength: 15 }}
                />
                <FormControl fullWidth required>
                  <InputLabel>🎯 Motivo do atendimento</InputLabel>
                  <Select
                    value={dadosAgendamento.motivo}
                    onChange={(e) => setDadosAgendamento(prev => ({ ...prev, motivo: e.target.value }))}
                    label="🎯 Motivo do atendimento"
                  >
                    {motivosAtendimento.map(motivo => (
                      <MenuItem key={motivo} value={motivo}>
                        {motivo}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="📝 Observações (Opcional)"
                  value={dadosAgendamento.observacoes}
                  onChange={(e) => setDadosAgendamento(prev => ({ ...prev, observacoes: e.target.value }))}
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Digite observações adicionais (opcional)"
                  helperText="Campo opcional para detalhes específicos"
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => updateModal('agendamento', false)}>Cancelar</Button>
              <Button 
                onClick={criarAgendamento} 
                variant="contained"
                disabled={loading.creating}
                startIcon={loading.creating ? <CircularProgress size={20} /> : <CheckCircleIcon />}
              >
                {loading.creating ? '💾 Criando...' : 'Criar Agendamento'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Modal de Bloqueio */}
          <Dialog 
            open={modals.bloqueio} 
            onClose={() => updateModal('bloqueio', false)}
          >
            <DialogTitle>Bloquear Horário</DialogTitle>
            <DialogContent>
              <Typography>
                Deseja bloquear o horário {contexto.horarioSelecionado} do dia {dataSelecionada?.toLocaleDateString('pt-BR')}?
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => updateModal('bloqueio', false)}>Cancelar</Button>
              <Button onClick={criarBloqueio} variant="contained" color="warning">
                Bloquear
              </Button>
            </DialogActions>
          </Dialog>

          {/* Modal de Exclusão */}
          <Dialog 
            open={modals.exclusao} 
            onClose={() => updateModal('exclusao', false)}
          >
            <DialogTitle>Excluir Agendamento</DialogTitle>
            <DialogContent>
              <Typography>
                Tem certeza que deseja excluir o agendamento de <strong>{contexto.agendamentoParaExcluir?.pessoa}</strong>?
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => updateModal('exclusao', false)}>Cancelar</Button>
              <Button onClick={excluirAgendamento} variant="contained" color="error">
                Excluir
              </Button>
            </DialogActions>
          </Dialog>

          {/* Modal de Observações */}
          <Dialog 
            open={modals.observacoes} 
            onClose={() => updateModal('observacoes', false)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              Observações - {contexto.nomeAgendamentoObservacoes}
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {contexto.observacoesVisualizacao}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => updateModal('observacoes', false)}>Fechar</Button>
            </DialogActions>
          </Dialog>

          {/* Modal de Edição */}
          <Dialog 
            open={modals.edicao} 
            onClose={() => updateModal('edicao', false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Editar Agendamento</DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <TextField
                  label="👤 Nome Completo"
                  value={dadosEdicao.pessoa}
                  onChange={(e) => setDadosEdicao(prev => ({ ...prev, pessoa: e.target.value }))}
                  fullWidth
                  required
                  placeholder="Digite o nome completo da pessoa"
                  helperText="Nome da pessoa que será atendida"
                />
                <TextField
                  label="📋 CPF"
                  value={dadosEdicao.cpf}
                  onChange={(e) => handleCPFChange(e.target.value, true)}
                  fullWidth
                  required
                  placeholder="Digite o CPF (000.000.000-00)"
                  helperText="Digite apenas números, a formatação é automática"
                  inputProps={{ maxLength: 14 }}
                />
                <TextField
                  label="📞 Telefone Principal"
                  value={dadosEdicao.telefone1}
                  onChange={(e) => handleTelefoneChange(e.target.value, 'telefone1', true)}
                  fullWidth
                  required
                  placeholder="Digite o telefone (00) 00000-0000"
                  helperText="Número principal para contato"
                  inputProps={{ maxLength: 15 }}
                />
                <TextField
                  label="📞 Telefone Alternativo (Opcional)"
                  value={dadosEdicao.telefone2}
                  onChange={(e) => handleTelefoneChange(e.target.value, 'telefone2', true)}
                  fullWidth
                  placeholder="Digite o telefone alternativo (00) 00000-0000"
                  helperText="Número adicional (opcional)"
                  inputProps={{ maxLength: 15 }}
                />
                <FormControl fullWidth required>
                  <InputLabel>🎯 Motivo do atendimento</InputLabel>
                  <Select
                    value={dadosEdicao.motivo}
                    onChange={(e) => setDadosEdicao(prev => ({ ...prev, motivo: e.target.value }))}
                    label="🎯 Motivo do atendimento"
                  >
                    {motivosAtendimento.map(motivo => (
                      <MenuItem key={motivo} value={motivo}>
                        {motivo}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="📝 Observações (Opcional)"
                  value={dadosEdicao.observacoes}
                  onChange={(e) => setDadosEdicao(prev => ({ ...prev, observacoes: e.target.value }))}
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Digite observações adicionais (opcional)"
                  helperText="Campo opcional para detalhes específicos"
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => updateModal('edicao', false)}>Cancelar</Button>
              <Button onClick={salvarEdicao} variant="contained">
                Salvar Alterações
              </Button>
            </DialogActions>
          </Dialog>

          {/* Snackbar para mensagens */}
          <Snackbar
            open={mensagem.visivel}
            autoHideDuration={4000}
            onClose={() => setMensagem(INITIAL_MESSAGE_STATE)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert 
              severity={mensagem.tipo} 
              onClose={() => setMensagem(INITIAL_MESSAGE_STATE)}
              sx={{ width: '100%' }}
            >
              {mensagem.texto}
            </Alert>
          </Snackbar>
        </Box>
    </LocalizationProvider>
  );
}
