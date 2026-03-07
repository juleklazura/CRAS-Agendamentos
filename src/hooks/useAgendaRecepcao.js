import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { criarDataHorario, validarCPF, validarTelefone } from '../utils/agendamentoUtils';
import { formatarDataLocal } from '../utils/formatters';

export default function useAgendaRecepcao(usuario, mostrarMensagem) {
  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const [agendamentos, setAgendamentos] = useState([]);
  const [entrevistadores, setEntrevistadores] = useState([]);
  const [entrevistadorSelecionado, setEntrevistadorSelecionado] = useState('');
  const [crasInfo, setCrasInfo] = useState(null);
  const [bloqueios, setBloqueios] = useState([]);
  const [loading, setLoading] = useState(false);

  // Buscar informações do CRAS
  const buscarCrasInfo = useCallback(async () => {
    try {
      const response = await api.get(`/cras/${usuario.cras}`);
      setCrasInfo(response.data);
    } catch (erro) {
      console.error('Erro ao buscar informações do CRAS:', erro);
    }
  }, [usuario.cras]);

  // Buscar entrevistadores do CRAS
  const buscarEntrevistadores = useCallback(async () => {
    try {
      const response = await api.get(`/users/entrevistadores/cras/${usuario.cras}`);
      setEntrevistadores(response.data);
      
      if (response.data.length === 1) {
        setEntrevistadorSelecionado(response.data[0].id);
      } else if (response.data.length === 0) {
        mostrarMensagem('Nenhum entrevistador encontrado para este CRAS. ID: ' + usuario.cras, 'error');
      }
    } catch (erro) {
      mostrarMensagem('Erro ao carregar entrevistadores: ' + (erro.response?.data?.message || erro.message), 'error');
    }
  }, [usuario.cras, mostrarMensagem]);

  // Buscar bloqueios do entrevistador
  const buscarBloqueios = useCallback(async () => {
    if (!entrevistadorSelecionado) return;
    try {
      const resposta = await api.get(`/blocked-slots?entrevistador=${entrevistadorSelecionado}`);
      setBloqueios(resposta.data || []);
    } catch (erro) {
      console.error('Erro ao buscar bloqueios:', erro);
      mostrarMensagem('Erro ao carregar bloqueios', 'error');
    }
  }, [entrevistadorSelecionado, mostrarMensagem]);

  // Buscar agendamentos do entrevistador
  const buscarAgendamentos = useCallback(async () => {
    if (!entrevistadorSelecionado) return;
    try {
      const dataFormatada = formatarDataLocal(dataSelecionada);
      const resposta = await api.get(`/appointments?entrevistador=${entrevistadorSelecionado}&data=${dataFormatada}`);
      let data = resposta.data;
      if (data && typeof data === 'object' && Array.isArray(data.results)) {
        data = data.results;
      }
      setAgendamentos(Array.isArray(data) ? data : []);
    } catch (erro) {
      console.error('Erro ao buscar agendamentos:', erro);
      mostrarMensagem('Erro ao carregar agendamentos', 'error');
    }
  }, [entrevistadorSelecionado, dataSelecionada, mostrarMensagem]);

  // Criar agendamento
  const criarAgendamento = async (dadosAgendamento, horarioParaAgendamento) => {
    if (!dadosAgendamento.pessoa.trim()) {
      mostrarMensagem('⚠️ Por favor, preencha todos os campos obrigatórios.', 'error');
      return false;
    }
    
    const validacaoCPF = validarCPF(dadosAgendamento.cpf);
    if (!validacaoCPF.valido) {
      mostrarMensagem(validacaoCPF.mensagem, 'error');
      return false;
    }
    
    const validacaoTelefone = validarTelefone(dadosAgendamento.telefone1);
    if (!validacaoTelefone.valido) {
      mostrarMensagem(validacaoTelefone.mensagem, 'error');
      return false;
    }
    
    if (!dadosAgendamento.motivo) {
      mostrarMensagem('🎯 Por favor, selecione o motivo do atendimento', 'error');
      return false;
    }
    
    setLoading(true);
    try {
      const dataHorario = criarDataHorario(dataSelecionada, horarioParaAgendamento);
      if (!dataHorario) throw new Error('Data inválida');
      
      const cpfApenasNumeros = dadosAgendamento.cpf.replace(/\D/g, '');
      
      await api.post('/appointments', {
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
      });
      
      mostrarMensagem('Agendamento criado com sucesso', 'success');
      await buscarAgendamentos();
      return true;
    } catch (erro) {
      console.error('Erro ao criar agendamento:', erro);
      const mensagemErro = erro.response?.data?.message || 
        '😔 Ops! Algo deu errado ao criar o agendamento. Tente novamente.';
      mostrarMensagem(mensagemErro, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Excluir agendamento
  const excluirAgendamento = async (agendamentoId) => {
    try {
      await api.delete(`/appointments/${agendamentoId}`);
      mostrarMensagem('Agendamento excluído com sucesso');
      await buscarAgendamentos();
      window.dispatchEvent(new CustomEvent('appointmentChanged', { detail: { action: 'delete' } }));
      return true;
    } catch (erro) {
      console.error('Erro ao excluir agendamento:', erro);
      mostrarMensagem('Erro ao excluir agendamento', 'error');
      return false;
    }
  };

  // Confirmar presença
  const confirmarPresenca = async (agendamento) => {
    try {
      await api.patch(`/appointments/${agendamento.id}/confirm`, {});
      mostrarMensagem('Presença confirmada com sucesso!');
      await buscarAgendamentos();
      window.dispatchEvent(new CustomEvent('appointmentChanged', { detail: { action: 'confirm' } }));
    } catch (erro) {
      console.error('Erro ao confirmar presença:', erro);
      mostrarMensagem('Erro ao confirmar presença', 'error');
    }
  };

  // Remover confirmação
  const removerConfirmacao = async (agendamento) => {
    if (!agendamento?.id) {
      mostrarMensagem('Agendamento inválido', 'error');
      return;
    }
    try {
      await api.patch(`/appointments/${agendamento.id}/unconfirm`, {});
      mostrarMensagem('Confirmação removida com sucesso!');
      await buscarAgendamentos();
      window.dispatchEvent(new CustomEvent('appointmentChanged', { detail: { action: 'unconfirm' } }));
    } catch (erro) {
      console.error('Erro ao remover confirmação:', erro);
      mostrarMensagem('Erro ao remover confirmação', 'error');
    }
  };

  // Marcar como ausente
  const marcarAusente = async (agendamento) => {
    if (!agendamento?.id) {
      mostrarMensagem('Agendamento inválido', 'error');
      return;
    }
    try {
      await api.patch(`/appointments/${agendamento.id}`, { status: 'ausente' });
      mostrarMensagem('Marcado como ausente!');
      await buscarAgendamentos();
    } catch (erro) {
      console.error('Erro ao marcar como ausente:', erro);
      mostrarMensagem('Erro ao marcar como ausente', 'error');
    }
  };

  // Editar agendamento
  const editarAgendamento = async (agendamentoId, dadosEdicao) => {
    if (!dadosEdicao.pessoa?.trim() || !dadosEdicao.cpf?.trim()) {
      mostrarMensagem('Nome da pessoa e CPF são obrigatórios', 'error');
      return false;
    }

    try {
      await api.put(`/appointments/${agendamentoId}`, dadosEdicao);
      mostrarMensagem('Agendamento atualizado com sucesso');
      await buscarAgendamentos();
      return true;
    } catch (erro) {
      console.error('Erro ao editar agendamento:', erro);
      mostrarMensagem(
        erro.response?.data?.message || 'Erro ao editar agendamento',
        'error'
      );
      return false;
    }
  };

  // Obter agendamento de um horário
  const obterAgendamento = (horario) => {
    const dataHorario = criarDataHorario(dataSelecionada, horario);
    if (!dataHorario) return null;
    return agendamentos.find(agendamento => {
      if (agendamento.entrevistador && entrevistadorSelecionado &&
          String(agendamento.entrevistador.id || agendamento.entrevistador) !== String(entrevistadorSelecionado)) {
        return false;
      }
      const dataAgendamento = new Date(agendamento.data);
      return (
        dataAgendamento.getFullYear() === dataHorario.getFullYear() &&
        dataAgendamento.getMonth() === dataHorario.getMonth() &&
        dataAgendamento.getDate() === dataHorario.getDate() &&
        dataAgendamento.getHours() === dataHorario.getHours() &&
        dataAgendamento.getMinutes() === dataHorario.getMinutes()
      );
    });
  };

  // Verificar se horário está bloqueado
  const verificarHorarioBloqueado = (horario) => {
    const dataHorario = criarDataHorario(dataSelecionada, horario);
    if (!dataHorario) return false;
    return bloqueios.some(b => {
      const dataBloqueio = new Date(b.data);
      return (
        dataBloqueio.getFullYear() === dataHorario.getFullYear() &&
        dataBloqueio.getMonth() === dataHorario.getMonth() &&
        dataBloqueio.getDate() === dataHorario.getDate() &&
        dataBloqueio.getHours() === dataHorario.getHours() &&
        dataBloqueio.getMinutes() === dataHorario.getMinutes()
      );
    });
  };

  // Efeitos
  useEffect(() => {
    if (usuario?.cras) {
      buscarCrasInfo();
      buscarEntrevistadores();
    }
  }, [buscarCrasInfo, buscarEntrevistadores, usuario?.cras]);

  useEffect(() => {
    const hoje = new Date();
    if (hoje.getDay() === 0) {
      const segunda = new Date(hoje);
      segunda.setDate(hoje.getDate() + 1);
      setDataSelecionada(segunda);
    } else if (hoje.getDay() === 6) {
      const segunda = new Date(hoje);
      segunda.setDate(hoje.getDate() + 2);
      setDataSelecionada(segunda);
    }
  }, []);

  useEffect(() => {
    if (entrevistadorSelecionado) {
      buscarAgendamentos();
      buscarBloqueios();
    }
  }, [buscarAgendamentos, buscarBloqueios, dataSelecionada, entrevistadorSelecionado]);

  return {
    // Estados
    dataSelecionada,
    setDataSelecionada,
    agendamentos,
    entrevistadores,
    entrevistadorSelecionado,
    setEntrevistadorSelecionado,
    crasInfo,
    bloqueios,
    loading,
    
    // Funções
    criarAgendamento,
    excluirAgendamento,
    confirmarPresenca,
    removerConfirmacao,
    marcarAusente,
    editarAgendamento,
    obterAgendamento,
    verificarHorarioBloqueado,
    buscarAgendamentos
  };
}
