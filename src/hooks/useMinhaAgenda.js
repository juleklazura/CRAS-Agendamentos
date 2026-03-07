import { useState, useCallback, useEffect } from 'react';
import api from '../services/api';
import { formatarCPF, formatarTelefone, criarDataHorario } from '../utils/agendamentoUtils';
import { formatarDataLocal } from '../utils/formatters';

const INITIAL_FORM_STATE = {
  pessoa: '',
  cpf: '',
  telefone1: '',
  telefone2: '',
  motivo: '',
  observacoes: ''
};

const INITIAL_MESSAGE_STATE = { 
  visivel: false, 
  texto: '', 
  tipo: 'success' 
};

const MESSAGES = {
  SUCCESS: {
    AGENDAMENTO_CRIADO: 'Agendamento criado com sucesso',
    AGENDAMENTO_EXCLUIDO: 'Agendamento excluído com sucesso',
    PRESENCA_CONFIRMADA: 'Presença confirmada com sucesso!',
    PRESENCA_REMOVIDA: 'Confirmação de presença removida!'
  },
  ERROR: {
    AGENDAMENTO_CRIACAO: 'Não foi possível criar o agendamento. Tente novamente.',
    AGENDAMENTO_EXCLUSAO: 'Não foi possível excluir o agendamento. Tente novamente.',
    CARREGAR_DADOS: 'Não foi possível carregar os dados. Tente novamente.'
  }
};

const INITIAL_LOADING_STATE = {
  agendamentos: false,
  creating: false,
  updating: false,
  deleting: false,
  confirming: false
};

export default function useMinhaAgenda(usuarioId, usuarioCras) {
  const [dataSelecionada, setDataSelecionada] = useState(() => {
    const hoje = new Date();
    if (hoje.getDay() === 0) {
      const segunda = new Date(hoje);
      segunda.setDate(hoje.getDate() + 1);
      return segunda;
    } else if (hoje.getDay() === 6) {
      const segunda = new Date(hoje);
      segunda.setDate(hoje.getDate() + 2);
      return segunda;
    }
    return hoje;
  });
  
  const [agendamentos, setAgendamentos] = useState([]);
  const [bloqueios, setBloqueios] = useState([]);
  const [mensagem, setMensagem] = useState(INITIAL_MESSAGE_STATE);
  const [loading, setLoading] = useState(INITIAL_LOADING_STATE);
  const [modals, setModals] = useState({
    agendamento: false,
    bloqueio: false,
    exclusao: false,
    observacoes: false,
    edicao: false
  });
  const [dadosAgendamento, setDadosAgendamento] = useState(INITIAL_FORM_STATE);
  const [dadosEdicao, setDadosEdicao] = useState(INITIAL_FORM_STATE);
  const [contexto, setContexto] = useState({
    horarioSelecionado: null,
    agendamentoParaEditar: null,
    agendamentoParaExcluir: null,
    horarioParaBloqueio: null,
    observacoesVisualizacao: '',
    nomeAgendamentoObservacoes: ''
  });

  const updateModal = useCallback((modalName, isOpen) => {
    setModals(prev => ({ ...prev, [modalName]: isOpen }));
  }, []);

  const mostrarMensagem = useCallback((texto, tipo = 'success') => {
    setMensagem({ visivel: true, texto, tipo });
    const delay = tipo === 'error' ? 4000 : tipo === 'success' ? 3000 : 5000;
    setTimeout(() => {
      setMensagem(prev => ({ ...prev, visivel: false }));
    }, delay);
  }, []);

  const updateLoading = useCallback((key, value) => {
    setLoading(prev => ({ ...prev, [key]: value }));
  }, []);

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

  const buscarAgendamentos = useCallback(async () => {
    if (!usuarioId) return;
    
    try {
      const dataFormatada = formatarDataLocal(dataSelecionada);
      const { data } = await api.get(`/appointments?entrevistador=${usuarioId}&data=${dataFormatada}`);
      const agendamentos = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      setAgendamentos(agendamentos);
    } catch (erro) {
      console.error('Erro ao buscar agendamentos:', erro);
      mostrarMensagem('Não foi possível carregar seus agendamentos. Tente novamente.', 'error');
    }
  }, [usuarioId, dataSelecionada, mostrarMensagem]);

  const buscarBloqueios = useCallback(async () => {
    try {
      const { data } = await api.get(`/blocked-slots`);
      setBloqueios(data || []);
    } catch (erro) {
      console.error('Erro ao buscar bloqueios:', erro);
      mostrarMensagem('Não foi possível verificar horários bloqueados. Tente novamente.', 'error');
    }
  }, [mostrarMensagem]);

  useEffect(() => {
    if (usuarioId) {
      Promise.all([buscarAgendamentos(), buscarBloqueios()]);
    }
  }, [usuarioId, buscarAgendamentos, buscarBloqueios]);

  const verificarHorarioBloqueado = useCallback((data, horario) => {
    const dataHorario = criarDataHorario(data, horario);
    if (!dataHorario) return false;
    
    return bloqueios.some(bloqueio => {
      const dataBloqueio = new Date(bloqueio.data);
      return (
        dataBloqueio.getFullYear() === dataHorario.getFullYear() &&
        dataBloqueio.getMonth() === dataHorario.getMonth() &&
        dataBloqueio.getDate() === dataHorario.getDate() &&
        dataBloqueio.getHours() === dataHorario.getHours() &&
        dataBloqueio.getMinutes() === dataHorario.getMinutes()
      );
    });
  }, [bloqueios]);

  const obterBloqueio = useCallback((data, horario) => {
    const dataHorario = criarDataHorario(data, horario);
    if (!dataHorario) return null;
    
    return bloqueios.find(bloqueio => {
      const dataBloqueio = new Date(bloqueio.data);
      return (
        dataBloqueio.getFullYear() === dataHorario.getFullYear() &&
        dataBloqueio.getMonth() === dataHorario.getMonth() &&
        dataBloqueio.getDate() === dataHorario.getDate() &&
        dataBloqueio.getHours() === dataHorario.getHours() &&
        dataBloqueio.getMinutes() === dataHorario.getMinutes()
      );
    });
  }, [bloqueios]);

  const obterAgendamento = useCallback((data, horario) => {
    if (!data || !horario || !agendamentos.length) return null;
    
    const [hora, minuto] = horario.split(':');
    const dataProcurada = new Date(data);
    dataProcurada.setHours(parseInt(hora, 10), parseInt(minuto, 10), 0, 0);
    
    return agendamentos.find(agendamento => {
      if (agendamento.entrevistador && usuarioId &&
          String(agendamento.entrevistador.id || agendamento.entrevistador) !== String(usuarioId)) {
        return false;
      }
      
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

  const validarFormulario = useCallback((dados) => {
    if (!dados.pessoa.trim()) {
      mostrarMensagem('👤 Por favor, informe o nome completo do cidadão', 'error');
      return false;
    }
    if (!dados.cpf.trim()) {
      mostrarMensagem('📋 Por favor, informe o CPF do cidadão', 'error');
      return false;
    }
    
    const cpfApenasNumeros = dados.cpf.replace(/\D/g, '');
    if (cpfApenasNumeros.length !== 11) {
      mostrarMensagem('CPF deve ter exatamente 11 números', 'error');
      return false;
    }
    
    if (!dados.telefone1.trim()) {
      mostrarMensagem('Por favor, informe um telefone para contato', 'error');
      return false;
    }
    
    if (!dados.motivo) {
      mostrarMensagem('Por favor, selecione o motivo do atendimento', 'error');
      return false;
    }
    
    if (!usuarioCras) {
      mostrarMensagem('Erro: CRAS não identificado para o usuário. Contate o administrador.', 'error');
      return false;
    }
    
    return true;
  }, [mostrarMensagem, usuarioCras]);

  const criarAgendamento = useCallback(async () => {
    if (!validarFormulario(dadosAgendamento)) return;

    updateLoading('creating', true);
    try {
      const dataHorario = criarDataHorario(dataSelecionada, contexto.horarioSelecionado);
      if (!dataHorario) throw new Error('Data inválida');

      const dadosParaEnvio = {
        entrevistador: usuarioId,
        cras: usuarioCras,
        pessoa: dadosAgendamento.pessoa,
        cpf: dadosAgendamento.cpf.replace(/\D/g, ''),
        telefone1: dadosAgendamento.telefone1,
        telefone2: dadosAgendamento.telefone2,
        motivo: dadosAgendamento.motivo,
        data: dataHorario,
        status: 'agendado',
        observacoes: dadosAgendamento.observacoes
      };

      await api.post(`/appointments`, dadosParaEnvio);

      mostrarMensagem(MESSAGES.SUCCESS.AGENDAMENTO_CRIADO);
      updateModal('agendamento', false);
      setDadosAgendamento(INITIAL_FORM_STATE);
      buscarAgendamentos();
      
    } catch (erro) {
      console.error('Erro ao criar agendamento:', erro);
      const mensagemErro = erro.response?.data?.message || MESSAGES.ERROR.AGENDAMENTO_CRIACAO;
      mostrarMensagem(mensagemErro, 'error');
    } finally {
      updateLoading('creating', false);
    }
  }, [dadosAgendamento, dataSelecionada, contexto.horarioSelecionado, usuarioId, usuarioCras, validarFormulario, mostrarMensagem, updateModal, updateLoading, buscarAgendamentos]);

  const confirmarPresenca = useCallback(async (agendamento) => {
    if (!agendamento?.id) return;

    try {
      await api.patch(`/appointments/${agendamento.id}/confirm`, {});
      mostrarMensagem('Presença confirmada com sucesso!');
      buscarAgendamentos();
      window.dispatchEvent(new CustomEvent('appointmentChanged', { detail: { action: 'confirm' } }));
    } catch (erro) {
      console.error('Erro ao confirmar presença:', erro);
      mostrarMensagem('Não foi possível confirmar a presença. Tente novamente.', 'error');
    }
  }, [mostrarMensagem, buscarAgendamentos]);

  const removerConfirmacao = useCallback(async (agendamento) => {
    if (!agendamento?.id) return;

    try {
      await api.patch(`/appointments/${agendamento.id}/unconfirm`, {});
      mostrarMensagem('Confirmação removida com sucesso!');
      buscarAgendamentos();
      window.dispatchEvent(new CustomEvent('appointmentChanged', { detail: { action: 'unconfirm' } }));
    } catch (erro) {
      console.error('Erro ao remover confirmação:', erro);
      mostrarMensagem('Não foi possível remover a confirmação. Tente novamente.', 'error');
    }
  }, [mostrarMensagem, buscarAgendamentos]);

  const marcarAusente = useCallback(async (agendamento) => {
    if (!agendamento?.id) return;

    try {
      await api.patch(`/appointments/${agendamento.id}`, { status: 'ausente' });
      mostrarMensagem('Marcado como ausente!');
      buscarAgendamentos();
    } catch (erro) {
      console.error('Erro ao marcar como ausente:', erro);
      mostrarMensagem('Não foi possível marcar como ausente. Tente novamente.', 'error');
    }
  }, [mostrarMensagem, buscarAgendamentos]);

  const excluirAgendamento = useCallback(async () => {
    if (!contexto.agendamentoParaExcluir) return;

    updateLoading('deleting', true);
    try {
      await api.delete(`/appointments/${contexto.agendamentoParaExcluir.id}`);
      mostrarMensagem(MESSAGES.SUCCESS.AGENDAMENTO_EXCLUIDO);
      updateModal('exclusao', false);
      buscarAgendamentos();
      window.dispatchEvent(new CustomEvent('appointmentChanged', { detail: { action: 'delete' } }));
    } catch (erro) {
      console.error('Erro ao excluir agendamento:', erro);
      mostrarMensagem(MESSAGES.ERROR.AGENDAMENTO_EXCLUSAO, 'error');
    } finally {
      updateLoading('deleting', false);
    }
  }, [contexto.agendamentoParaExcluir, mostrarMensagem, updateModal, updateLoading, buscarAgendamentos]);

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

      await api.put(`/appointments/${contexto.agendamentoParaEditar.id}`, dadosParaEdicao);
      mostrarMensagem('Agendamento atualizado com sucesso');
      updateModal('edicao', false);
      buscarAgendamentos();
    } catch (erro) {
      console.error('Erro ao editar agendamento:', erro);
      mostrarMensagem('Não foi possível editar o agendamento. Tente novamente.', 'error');
    }
  }, [dadosEdicao, contexto.agendamentoParaEditar, validarFormulario, mostrarMensagem, updateModal, buscarAgendamentos]);

  const criarBloqueio = useCallback(async () => {
    try {
      const dataHorario = criarDataHorario(dataSelecionada, contexto.horarioParaBloqueio);
      await api.post(`/blocked-slots`, { data: dataHorario, motivo: 'Horário bloqueado pelo entrevistador' });
      mostrarMensagem('Horário bloqueado com sucesso');
      updateModal('bloqueio', false);
      buscarBloqueios();
    } catch (erro) {
      console.error('Erro ao bloquear horário:', erro);
      const mensagem = erro.response?.data?.message || 'Não foi possível bloquear este horário';
      mostrarMensagem(`${mensagem}. Tente novamente.`, 'error');
    }
  }, [dataSelecionada, contexto.horarioParaBloqueio, mostrarMensagem, updateModal, buscarBloqueios]);

  const desbloquearHorario = useCallback(async (horario) => {
    try {
      const bloqueio = obterBloqueio(dataSelecionada, horario);
      
      if (!bloqueio) {
        mostrarMensagem('Bloqueio não encontrado.', 'error');
        return;
      }

      await api.delete(`/blocked-slots/${bloqueio.id}`);
      mostrarMensagem('Horário desbloqueado com sucesso!');
      buscarBloqueios();
    } catch (erro) {
      console.error('Erro ao desbloquear horário:', erro);
      const mensagem = erro.response?.data?.message || 'Não foi possível desbloquear este horário';
      mostrarMensagem(`${mensagem}. Tente novamente.`, 'error');
    }
  }, [dataSelecionada, mostrarMensagem, buscarBloqueios, obterBloqueio]);

  return {
    dataSelecionada,
    setDataSelecionada,
    agendamentos,
    mensagem,
    setMensagem,
    loading,
    modals,
    updateModal,
    dadosAgendamento,
    setDadosAgendamento,
    dadosEdicao,
    setDadosEdicao,
    contexto,
    setContexto,
    handleCPFChange,
    handleTelefoneChange,
    verificarHorarioBloqueado,
    obterAgendamento,
    criarAgendamento,
    confirmarPresenca,
    removerConfirmacao,
    marcarAusente,
    excluirAgendamento,
    salvarEdicao,
    criarBloqueio,
    desbloquearHorario
  };
}
