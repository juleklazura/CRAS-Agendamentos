/**
 * useAgenda - Hook customizado para gerenciar a lógica da Agenda
 * 
 * Extrai toda a lógica de estado e efeitos do componente Agenda.jsx
 * Facilita testes, manutenção e reutilização
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from './useAuth';
import api from '../services/api';
import {
  formatarCPF,
  formatarTelefone,
  mensagens,
  criarDataHorario,
  horariosDisponiveis,
  validarCPF,
  validarTelefone
} from '../utils/agendamentoUtils';

// Estado inicial do formulário de agendamento
const INITIAL_FORM_STATE = {
  pessoa: '',
  cpf: '',
  telefone1: '',
  telefone2: '',
  motivo: '',
  observacoes: ''
};

// Estado inicial de feedback
const INITIAL_FEEDBACK_STATE = { error: '', success: '' };

/**
 * Hook principal para gerenciar agenda
 */
export default function useAgenda() {
  // ===== AUTENTICAÇÃO =====
  const { user: authUser, loading: authLoading } = useAuth();
  const user = useMemo(() => authUser || {}, [authUser]);
  const isEntrevistador = useMemo(() => user?.role === 'entrevistador', [user?.role]);

  // ===== ESTADOS PRINCIPAIS =====
  const [data, setData] = useState(() => {
    const hoje = new Date();
    const diaSemana = hoje.getDay();
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

  // ===== ESTADOS DE FEEDBACK =====
  const [feedbackState, setFeedbackState] = useState(INITIAL_FEEDBACK_STATE);

  // ===== ESTADOS DOS MODAIS =====
  const [modals, setModals] = useState({
    agendamento: false,
    edicao: false,
    observacoes: false
  });

  const [horarioSelecionado, setHorarioSelecionado] = useState('');
  const [dadosAgendamento, setDadosAgendamento] = useState(INITIAL_FORM_STATE);
  const [dadosEdicao, setDadosEdicao] = useState(INITIAL_FORM_STATE);
  const [agendamentoParaEditar, setAgendamentoParaEditar] = useState(null);
  const [observacoesVisualizacao, setObservacoesVisualizacao] = useState('');
  const [nomeAgendamentoObservacoes, setNomeAgendamentoObservacoes] = useState('');

  // ===== FUNÇÕES DE FEEDBACK =====
  const setError = useCallback((message) => {
    setFeedbackState(prev => ({ ...prev, error: message }));
  }, []);

  const setSuccess = useCallback((message) => {
    setFeedbackState(prev => ({ ...prev, success: message }));
  }, []);

  const clearError = useCallback(() => {
    setFeedbackState(prev => ({ ...prev, error: '' }));
  }, []);

  const clearSuccess = useCallback(() => {
    setFeedbackState(prev => ({ ...prev, success: '' }));
  }, []);

  // ===== FUNÇÕES DE FORMATAÇÃO =====
  const handleCPFChange = useCallback((valor, isEdicao = false) => {
    const cpfFormatado = formatarCPF(valor);
    if (isEdicao) {
      setDadosEdicao(prev => ({ ...prev, cpf: cpfFormatado }));
    } else {
      setDadosAgendamento(prev => ({ ...prev, cpf: cpfFormatado }));
    }
  }, []);

  const handleTelefoneChange = useCallback((valor, campo, isEdicao = false) => {
    const telefoneFormatado = formatarTelefone(valor);
    if (isEdicao) {
      setDadosEdicao(prev => ({ ...prev, [campo]: telefoneFormatado }));
    } else {
      setDadosAgendamento(prev => ({ ...prev, [campo]: telefoneFormatado }));
    }
  }, []);

  // ===== FUNÇÕES DE MODAL =====
  const abrirModal = useCallback((modalName) => {
    setModals(prev => ({ ...prev, [modalName]: true }));
  }, []);

  const fecharModal = useCallback((modalName) => {
    setModals(prev => ({ ...prev, [modalName]: false }));
  }, []);

  const limparFormulario = useCallback(() => {
    setDadosAgendamento(INITIAL_FORM_STATE);
    setHorarioSelecionado('');
  }, []);

  const fecharModalAgendamento = useCallback(() => {
    fecharModal('agendamento');
    limparFormulario();
  }, [fecharModal, limparFormulario]);

  const abrirModalAgendamento = useCallback((horario) => {
    setHorarioSelecionado(horario);
    abrirModal('agendamento');
  }, [abrirModal]);

  const abrirModalObservacoes = useCallback((agendamento) => {
    setObservacoesVisualizacao(agendamento?.observacoes || 'Nenhuma observação registrada');
    setNomeAgendamentoObservacoes(agendamento?.pessoa || 'Paciente');
    abrirModal('observacoes');
  }, [abrirModal]);

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
    abrirModal('edicao');
  }, [abrirModal]);

  const fecharModalEdicao = useCallback(() => {
    fecharModal('edicao');
    setAgendamentoParaEditar(null);
    setDadosEdicao(INITIAL_FORM_STATE);
  }, [fecharModal]);

  // ===== FUNÇÕES DE API =====
  const fetchEntrevistadores = useCallback(async () => {
    try {
      setLoading(true);
      const userId = user?._id || user?.id;
      
      if (isEntrevistador && userId) {
        const userNormalizado = { ...user, _id: userId };
        setEntrevistadores([userNormalizado]);
        setSelectedEntrevistador(userId);
        return;
      }
      
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

  const fetchAgendamentos = useCallback(async () => {
    if (!selectedEntrevistador || !data) {
      setAgendamentos([]);
      return;
    }
    
    try {
      const dataFormatada = data.toISOString().split('T')[0];
      const response = await api.get(
        `/appointments?entrevistador=${selectedEntrevistador}&data=${dataFormatada}`
      );
      
      let agendamentosData = response.data;
      if (agendamentosData?.results && Array.isArray(agendamentosData.results)) {
        agendamentosData = agendamentosData.results;
      }
      
      setAgendamentos(Array.isArray(agendamentosData) ? agendamentosData : []);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
      setError(mensagens.erro.conexaoFalhou);
    }
  }, [selectedEntrevistador, data, setError]);

  const fetchBloqueios = useCallback(async () => {
    if (!selectedEntrevistador) {
      setBloqueios([]);
      return;
    }
    
    try {
      const response = await api.get(`/blocked-slots?entrevistador=${selectedEntrevistador}`);
      setBloqueios(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar bloqueios:', error);
      setError(mensagens.erro.conexaoFalhou);
    }
  }, [selectedEntrevistador, setError]);

  // ===== VALORES COMPUTADOS =====
  const entrevistadorSelecionado = useMemo(() => 
    entrevistadores.find(e => e._id === selectedEntrevistador), 
    [entrevistadores, selectedEntrevistador]
  );

  // ===== FUNÇÕES DE CRUD =====
  const criarAgendamento = useCallback(async () => {
    // Validações
    if (!dadosAgendamento.pessoa.trim()) {
      setError('👤 Por favor, informe o nome completo do cidadão');
      return;
    }

    const validacaoCPF = validarCPF(dadosAgendamento.cpf);
    if (!validacaoCPF.valido) {
      setError(validacaoCPF.mensagem);
      return;
    }

    const validacaoTelefone = validarTelefone(dadosAgendamento.telefone1);
    if (!validacaoTelefone.valido) {
      setError(validacaoTelefone.mensagem);
      return;
    }

    if (!dadosAgendamento.motivo) {
      setError('🎯 Por favor, selecione o motivo do atendimento');
      return;
    }

    // Pega o CRAS do entrevistador selecionado (não do usuário logado)
    const crasId = entrevistadorSelecionado?.cras?._id || entrevistadorSelecionado?.cras;
    if (!crasId) {
      setError('⚠️ O entrevistador selecionado não possui CRAS vinculado');
      return;
    }

    setLoading(true);
    try {
      const dataHorario = criarDataHorario(data, horarioSelecionado);
      if (!dataHorario) throw new Error('Data inválida');

      const cpfApenasNumeros = dadosAgendamento.cpf.replace(/\D/g, '');
      
      await api.post('/appointments', {
        entrevistador: selectedEntrevistador,
        cras: crasId,
        pessoa: dadosAgendamento.pessoa,
        cpf: cpfApenasNumeros,
        telefone1: dadosAgendamento.telefone1,
        telefone2: dadosAgendamento.telefone2,
        motivo: dadosAgendamento.motivo,
        data: dataHorario,
        status: 'agendado',
        observacoes: dadosAgendamento.observacoes
      });

      setSuccess('✅ Agendamento criado com sucesso!');
      fecharModalAgendamento();
      fetchAgendamentos();
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      const mensagemErro = error.response?.data?.message || mensagens.erro.conexaoFalhou;
      setError(mensagemErro);
    } finally {
      setLoading(false);
    }
  }, [dadosAgendamento, data, horarioSelecionado, selectedEntrevistador, entrevistadorSelecionado, setError, setSuccess, fecharModalAgendamento, fetchAgendamentos]);

  const salvarEdicao = useCallback(async () => {
    if (!agendamentoParaEditar) return;

    if (!dadosEdicao.pessoa?.trim() || !dadosEdicao.cpf?.trim()) {
      setError('Nome e CPF são obrigatórios');
      return;
    }

    setLoading(true);
    try {
      await api.put(`/appointments/${agendamentoParaEditar._id}`, {
        pessoa: dadosEdicao.pessoa,
        cpf: dadosEdicao.cpf.replace(/\D/g, ''),
        telefone1: dadosEdicao.telefone1,
        telefone2: dadosEdicao.telefone2,
        motivo: dadosEdicao.motivo,
        observacoes: dadosEdicao.observacoes
      });

      setSuccess('✅ Agendamento atualizado com sucesso!');
      fecharModalEdicao();
      fetchAgendamentos();
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error);
      setError(error.response?.data?.message || 'Erro ao atualizar agendamento');
    } finally {
      setLoading(false);
    }
  }, [agendamentoParaEditar, dadosEdicao, setError, setSuccess, fecharModalEdicao, fetchAgendamentos]);

  // ===== VALORES COMPUTADOS (continuação) =====
  const horariosAgenda = useMemo(() => 
    entrevistadorSelecionado?.agenda?.horariosDisponiveis || horariosDisponiveis,
    [entrevistadorSelecionado?.agenda?.horariosDisponiveis]
  );

  const agendamentosArray = useMemo(() => {
    if (Array.isArray(agendamentos)) return agendamentos;
    if (agendamentos?.results) return agendamentos.results;
    return [];
  }, [agendamentos]);

  const getStatusHorarioDetalhado = useCallback((horario) => {
    const dataHorario = criarDataHorario(data, horario);
    if (!dataHorario) return { status: 'livre', agendamento: null, bloqueio: null };

    const agendamento = agendamentosArray.find(agend => {
      const dataAgendamento = new Date(agend.data);
      return (
        dataAgendamento.getFullYear() === dataHorario.getFullYear() &&
        dataAgendamento.getMonth() === dataHorario.getMonth() &&
        dataAgendamento.getDate() === dataHorario.getDate() &&
        dataAgendamento.getHours() === dataHorario.getHours() &&
        dataAgendamento.getMinutes() === dataHorario.getMinutes()
      );
    });

    if (agendamento) {
      return { status: agendamento.status || 'agendado', agendamento, bloqueio: null };
    }

    const bloqueio = bloqueios.find(bloq => {
      const dataBloqueio = new Date(bloq.data);
      return (
        dataBloqueio.getFullYear() === dataHorario.getFullYear() &&
        dataBloqueio.getMonth() === dataHorario.getMonth() &&
        dataBloqueio.getDate() === dataHorario.getDate() &&
        dataBloqueio.getHours() === dataHorario.getHours() &&
        dataBloqueio.getMinutes() === dataHorario.getMinutes()
      );
    });

    if (bloqueio) {
      return { status: 'bloqueado', agendamento: null, bloqueio };
    }

    return { status: 'livre', agendamento: null, bloqueio: null };
  }, [data, agendamentosArray, bloqueios]);

  // ===== EFEITOS =====
  useEffect(() => {
    fetchEntrevistadores();
  }, [fetchEntrevistadores]);

  useEffect(() => {
    if (selectedEntrevistador) {
      fetchAgendamentos();
      fetchBloqueios();
    }
  }, [selectedEntrevistador, fetchAgendamentos, fetchBloqueios, data]);

  // ===== RETORNO =====
  return {
    // Autenticação
    user,
    authLoading,
    isEntrevistador,

    // Estados principais
    data,
    setData,
    entrevistadores,
    selectedEntrevistador,
    setSelectedEntrevistador,
    loading,

    // Horários e status
    horariosAgenda,
    getStatusHorarioDetalhado,

    // Feedback
    feedbackState,
    setFeedbackState,
    clearError,
    clearSuccess,

    // Modal de agendamento
    modalAberto: modals.agendamento,
    horarioSelecionado,
    dadosAgendamento,
    setDadosAgendamento,
    abrirModalAgendamento,
    fecharModalAgendamento,
    handleCPFChange,
    handleTelefoneChange,
    criarAgendamento,

    // Modal de edição
    modalEdicaoAberto: modals.edicao,
    dadosEdicao,
    setDadosEdicao,
    abrirModalEdicao,
    fecharModalEdicao,
    salvarEdicao,

    // Modal de observações
    modalObservacoesAberto: modals.observacoes,
    observacoesVisualizacao,
    nomeAgendamentoObservacoes,
    abrirModalObservacoes,
    fecharModalObservacoes: () => fecharModal('observacoes'),

    // Entrevistador selecionado
    entrevistadorSelecionado
  };
}
