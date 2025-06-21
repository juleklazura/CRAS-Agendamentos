import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
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
  MenuItem
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import DescriptionIcon from '@mui/icons-material/Description';
import ptBR from 'date-fns/locale/pt-BR';

const HORARIOS_DISPONIVEIS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', 
  '16:00', '16:30'
];

const MOTIVOS_AGENDAMENTO = [
  { value: 'Atualização', label: 'Atualização' },
  { value: 'Inclusão', label: 'Inclusão' },
  { value: 'Transferência', label: 'Transferência' },
  { value: 'Orientações', label: 'Orientações' }
];

export default function AgendaRecepcao() {
  const navigate = useNavigate();
  
  // Estados principais
  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const [agendamentos, setAgendamentos] = useState([]);
  
  // Estados para entrevistadores
  const [entrevistadores, setEntrevistadores] = useState([]);
  const [entrevistadorSelecionado, setEntrevistadorSelecionado] = useState('');
  const [crasInfo, setCrasInfo] = useState(null);
  
  // Estados para agendamento
  const [modalAgendamentoAberto, setModalAgendamentoAberto] = useState(false);
  const [horarioParaAgendamento, setHorarioParaAgendamento] = useState(null);
  const [dadosAgendamento, setDadosAgendamento] = useState({
    pessoa: '',
    cpf: '',
    telefone1: '',
    telefone2: '',
    motivo: '',
    observacoes: ''
  });
  
  // Estados para exclusão
  const [modalExclusaoAberto, setModalExclusaoAberto] = useState(false);
  const [agendamentoParaExcluir, setAgendamentoParaExcluir] = useState(null);
  
  // Estados para modal de observações
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
  
  const [mensagem, setMensagem] = useState({ visivel: false, texto: '', tipo: 'success' });

  const token = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('user'));

  // Verificar se é recepção
  useEffect(() => {
    if (usuario?.role !== 'recepcao') {
      navigate('/dashboard');
    }
  }, [usuario, navigate]);

  // Buscar informações do CRAS
  const buscarCrasInfo = useCallback(async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/cras/${usuario.cras}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCrasInfo(response.data);
    } catch (erro) {
      console.error('Erro ao buscar informações do CRAS:', erro);
    }
  }, [usuario.cras, token]);

  // Buscar entrevistadores do CRAS
  const buscarEntrevistadores = useCallback(async () => {
    try {
      const url = `http://localhost:5000/api/users/entrevistadores/cras/${usuario.cras}`;
      
      const response = await axios.get(url, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      setEntrevistadores(response.data);
      
      // Se só tem um entrevistador, seleciona automaticamente
      if (response.data.length === 1) {
        setEntrevistadorSelecionado(response.data[0]._id);
      } else if (response.data.length === 0) {
        mostrarMensagem('Nenhum entrevistador encontrado para este CRAS. ID: ' + usuario.cras, 'error');
      }
    } catch (erro) {
      console.error('=== ERRO DETALHADO ===');
      console.error('Erro ao buscar entrevistadores:', erro);
      console.error('Status:', erro.response?.status);
      console.error('Dados do erro:', erro.response?.data);
      console.error('Headers:', erro.config?.headers);
      mostrarMensagem('Erro ao carregar entrevistadores: ' + (erro.response?.data?.message || erro.message), 'error');
    }
  }, [usuario.cras, token]);

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

  // Funções de formatação (mesmas da MinhaAgenda)
  // Função utilitária para formatar CPF
  const formatarCPF = (valor) => {
    if (!valor) return '';
    const apenasNumeros = valor.replace(/\D/g, '');
    if (apenasNumeros.length !== 11) return valor;
    return apenasNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Função utilitária para formatar telefone
  const formatarTelefone = (valor) => {
    if (!valor) return '';
    const apenasNumeros = valor.replace(/\D/g, '');
    if (apenasNumeros.length <= 10) {
      return apenasNumeros.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return apenasNumeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const handleCPFChange = (valor) => {
    setDadosAgendamento({...dadosAgendamento, cpf: formatarCPF(valor)});
  };

  const handleTelefone1Change = (valor) => {
    setDadosAgendamento({...dadosAgendamento, telefone1: formatarTelefone(valor)});
  };

  const handleTelefone2Change = (valor) => {
    setDadosAgendamento({...dadosAgendamento, telefone2: formatarTelefone(valor)});
  };

  const exibirCPFFormatado = (cpf) => {
    if (!cpf) return '-';
    if (cpf.includes('.')) return cpf;
    return formatarCPF(cpf);
  };

  // Buscar bloqueios do entrevistador selecionado
  const [bloqueios, setBloqueios] = useState([]);
  const buscarBloqueios = useCallback(async () => {
    if (!token || !entrevistadorSelecionado) return;
    try {
      const resposta = await axios.get(
        `http://localhost:5000/api/blocked-slots?entrevistador=${entrevistadorSelecionado}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBloqueios(resposta.data || []);
    } catch (erro) {
      console.error('Erro ao buscar bloqueios:', erro);
      mostrarMensagem('Erro ao carregar bloqueios', 'error');
    }
  }, [token, entrevistadorSelecionado]);

  // Buscar agendamentos igual MinhaAgenda (todos do entrevistador, sem paginação)
  const buscarAgendamentos = useCallback(async () => {
    if (!token || !entrevistadorSelecionado) return;
    try {
      const resposta = await axios.get(
        `http://localhost:5000/api/appointments?entrevistador=${entrevistadorSelecionado}`,
        { headers: { Authorization: `Bearer ${token}` } }
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
  }, [token, entrevistadorSelecionado]);

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

  // Função para bloquear horário
  const bloquearHorario = async (horario) => {
    try {
      const dataHorario = criarDataHorario(dataSelecionada, horario);
      if (!dataHorario) throw new Error('Data inválida');
      await axios.post(
        'http://localhost:5000/api/blocked-slots',
        { data: dataHorario, motivo: 'Bloqueio manual', entrevistador: entrevistadorSelecionado },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      mostrarMensagem('Horário bloqueado com sucesso');
      await buscarBloqueios();
    } catch (erro) {
      console.error('Erro ao bloquear horário:', erro);
      mostrarMensagem('Erro ao bloquear horário', 'error');
    }
  };

  // Função para desbloquear horário
  const desbloquearHorario = async (horario) => {
    try {
      const dataHorario = criarDataHorario(dataSelecionada, horario);
      if (!dataHorario) throw new Error('Data inválida');
      const bloqueio = bloqueios.find(b => new Date(b.data).getTime() === dataHorario.getTime());
      if (bloqueio) {
        await axios.delete(
          `http://localhost:5000/api/blocked-slots/${bloqueio._id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        mostrarMensagem('Horário desbloqueado com sucesso');
        await buscarBloqueios();
      }
    } catch (erro) {
      console.error('Erro ao desbloquear horário:', erro);
      mostrarMensagem('Erro ao desbloquear horário', 'error');
    }
  };

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
  const criarAgendamento = async () => {
    if (!dadosAgendamento.pessoa.trim()) {
      mostrarMensagem('Nome da pessoa é obrigatório', 'error');
      return;
    }
    if (!dadosAgendamento.cpf.trim()) {
      mostrarMensagem('CPF é obrigatório', 'error');
      return;
    }
    const cpfApenasNumeros = dadosAgendamento.cpf.replace(/\D/g, '');
    if (cpfApenasNumeros.length !== 11) {
      mostrarMensagem('CPF deve ter 11 dígitos', 'error');
      return;
    }
    if (!dadosAgendamento.telefone1.trim()) {
      mostrarMensagem('Pelo menos um telefone é obrigatório', 'error');
      return;
    }
    if (!dadosAgendamento.motivo) {
      mostrarMensagem('Motivo é obrigatório', 'error');
      return;
    }
    try {
      const dataHorario = criarDataHorario(dataSelecionada, horarioParaAgendamento);
      if (!dataHorario) throw new Error('Data inválida');
      await axios.post(
        'http://localhost:5000/api/appointments',
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
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      mostrarMensagem('Agendamento criado com sucesso!');
      await buscarAgendamentos();
      setModalAgendamentoAberto(false);
    } catch (erro) {
      console.error('Erro ao criar agendamento:', erro);
      if (erro.response && erro.response.data && erro.response.data.message) {
        mostrarMensagem('Erro ao criar agendamento: ' + erro.response.data.message, 'error');
      } else {
        mostrarMensagem('Erro ao criar agendamento', 'error');
      }
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
      await axios.delete(
        `http://localhost:5000/api/appointments/${agendamentoParaExcluir._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      mostrarMensagem('Agendamento excluído com sucesso!');
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
      await axios.patch(
        `http://localhost:5000/api/appointments/${agendamento._id}/confirm`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
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
      await axios.patch(
        `http://localhost:5000/api/appointments/${agendamento._id}/unconfirm`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      mostrarMensagem('Confirmação removida com sucesso!');
      await buscarAgendamentos();
    } catch (erro) {
      console.error('Erro ao remover confirmação:', erro);
      mostrarMensagem('Erro ao remover confirmação', 'error');
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
      await axios.put(
        `http://localhost:5000/api/appointments/${agendamentoParaEditar._id}`,
        dadosEdicao,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      mostrarMensagem('Agendamento editado com sucesso!');
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

  const mostrarMensagem = (texto, tipo = 'success') => {
    setMensagem({ visivel: true, texto, tipo });
  };

  // Função auxiliar para criar data com horário (igual MinhaAgenda)
  const criarDataHorario = (data, horario) => {
    if (!data || !horario) return null;
    try {
      const [hora, minuto] = horario.split(':');
      const dataCompleta = new Date(data);
      dataCompleta.setHours(parseInt(hora, 10), parseInt(minuto, 10), 0, 0);
      return dataCompleta;
    } catch (erro) {
      console.error('Erro ao criar data:', erro);
      return null;
    }
  };

  return (
    <Box display="flex" sx={{ minHeight: '100vh', background: '#fff' }}>
      <Sidebar />
      <Box 
        flex={1} 
        p={3} 
        sx={{ 
          width: '100%',
          maxWidth: 1200,
          margin: { xs: 0, md: '0 auto' },
          marginLeft: { md: '240px' },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: '#fff',
          minHeight: '100vh'
        }}
      >
        <Typography variant="h4" gutterBottom color="primary">
          Agenda da Recepção - {crasInfo?.nome || 'Carregando...'}
        </Typography>

        {/* Seletor de Entrevistador */}
        <Paper elevation={2} sx={{ p: 3, mb: 3, width: '100%', maxWidth: 'none' }}>
          <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }}>
            Selecionar Entrevistador
          </Typography>
          {entrevistadores.length === 0 ? (
            <Typography color="warning.main">
              Nenhum entrevistador encontrado para este CRAS. 
              Verifique se existem entrevistadores cadastrados para o CRAS: {crasInfo?.nome || usuario?.cras}
            </Typography>
          ) : (
            <>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Entrevistador</InputLabel>
                <Select
                  value={entrevistadorSelecionado}
                  onChange={(e) => setEntrevistadorSelecionado(e.target.value)}
                  label="Entrevistador"
                >
                  {entrevistadores.map((entrevistador) => (
                    <MenuItem key={entrevistador._id} value={entrevistador._id}>
                      {entrevistador.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>          
          {entrevistadorSelecionado && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 1 }}>
              Visualizando agenda de: {entrevistadores.find(e => e._id === entrevistadorSelecionado)?.name}
            </Typography>
          )}
            </>
          )}
        </Paper>

        {entrevistadorSelecionado && (
          <>
            {/* Seletor de Data */}
            <Paper elevation={2} sx={{ p: 3, mb: 3, width: '100%', maxWidth: 'none' }}>
              <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }}>
                Selecionar Data
              </Typography>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                <Box display="flex" justifyContent="center">
                  <DatePicker
                    label="Data"
                    value={dataSelecionada}
                    onChange={setDataSelecionada}
                    renderInput={(params) => <TextField {...params} sx={{ maxWidth: 400 }} />}
                    minDate={new Date()}
                    shouldDisableDate={(data) => data.getDay() === 0 || data.getDay() === 6}
                  />
                </Box>
              </LocalizationProvider>
            </Paper>

            {/* Tabela de Horários */}
            <Paper elevation={2} sx={{ width: '100%', maxWidth: 1200, mt: 2 }}>
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
                    {HORARIOS_DISPONIVEIS.map((horario) => {
                      const agendamento = obterAgendamento(horario);
                      const agendado = !!agendamento;
                      const bloqueado = verificarHorarioBloqueado(horario);
                      return (
                        <TableRow
                          key={horario}
                          sx={{
                            backgroundColor: agendamento?.status === 'realizado' ? '#e8f5e8' : bloqueado ? '#fff3e0' : 'inherit'
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
                                agendado ? 'primary.main' :
                                bloqueado ? 'warning.main' :
                                'success.main'
                              }
                            >
                              {agendado && agendamento?.status === 'realizado' ? 'Realizado' :
                               agendado ? 'Agendado' :
                               bloqueado ? 'Bloqueado' :
                               'Livre'}
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
                                  variant="outlined"
                                  size="small"
                                  onClick={() => abrirModalAgendamento(horario)}
                                  disabled={dataSelecionada.getDay() === 0 || dataSelecionada.getDay() === 6}
                                >
                                  Agendar
                                </Button>
                              ) : null}
                              {!agendado && !bloqueado ? (
                                <Button
                                  variant="outlined"
                                  size="small"
                                  color="warning"
                                  onClick={() => bloquearHorario(horario)}
                                  disabled={dataSelecionada.getDay() === 0 || dataSelecionada.getDay() === 6}
                                >
                                  Bloquear
                                </Button>
                              ) : null}
                              {bloqueado && !agendado ? (
                                <Button
                                  variant="outlined"
                                  size="small"
                                  color="success"
                                  onClick={() => desbloquearHorario(horario)}
                                >
                                  Desbloquear
                                </Button>
                              ) : null}
                              {agendado ? (
                                <>
                                  {agendamento?.status !== 'realizado' ? (
                                    <IconButton
                                      color="success"
                                      size="small"
                                      onClick={() => confirmarPresenca(agendamento)}
                                      title="Confirmar presença"
                                    >
                                      <CheckCircleIcon fontSize="small" />
                                    </IconButton>
                                  ) : (
                                    <IconButton
                                      color="warning"
                                      size="small"
                                      onClick={() => removerConfirmacao(agendamento)}
                                      title="Remover confirmação"
                                    >
                                      <CancelIcon fontSize="small" />
                                    </IconButton>
                                  )}
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
          <DialogTitle>
            Criar Agendamento - {horarioParaAgendamento}
          </DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} sx={{ mt: 1 }}>
              <TextField
                label="Nome da Pessoa"
                value={dadosAgendamento.pessoa}
                onChange={(e) => setDadosAgendamento({...dadosAgendamento, pessoa: e.target.value})}
                fullWidth
                required
              />
              <TextField
                label="CPF"
                value={dadosAgendamento.cpf}
                onChange={(e) => handleCPFChange(e.target.value)}
                fullWidth
                required
                placeholder="000.000.000-00"
                helperText="Digite apenas números, a formatação é automática"
                inputProps={{ maxLength: 14 }}
              />
              <TextField
                label="Telefone 1"
                value={dadosAgendamento.telefone1}
                onChange={(e) => handleTelefone1Change(e.target.value)}
                fullWidth
                required
                placeholder="(00) 00000-0000"
                helperText="Digite apenas números, a formatação é automática"
                inputProps={{ maxLength: 15 }}
              />
              <TextField
                label="Telefone 2 (opcional)"
                value={dadosAgendamento.telefone2}
                onChange={(e) => handleTelefone2Change(e.target.value)}
                fullWidth
                placeholder="(00) 00000-0000"
                inputProps={{ maxLength: 15 }}
              />
              <FormControl fullWidth required>
                <InputLabel>Motivo do Agendamento</InputLabel>
                <Select
                  value={dadosAgendamento.motivo}
                  onChange={(e) => setDadosAgendamento({...dadosAgendamento, motivo: e.target.value})}
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
                label="Observações (opcional)"
                value={dadosAgendamento.observacoes}
                onChange={(e) => setDadosAgendamento({...dadosAgendamento, observacoes: e.target.value})}
                fullWidth
                multiline
                rows={3}
                placeholder="Digite observações adicionais sobre o agendamento..."
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setModalAgendamentoAberto(false)}>Cancelar</Button>
            <Button onClick={criarAgendamento} variant="contained">
              Criar Agendamento
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal de Exclusão */}
        <Dialog open={modalExclusaoAberto} onClose={() => setModalExclusaoAberto(false)} maxWidth="sm" fullWidth>
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

        {/* Snackbar para mensagens */}
        <Snackbar
          open={mensagem.visivel}
          autoHideDuration={6000}
          onClose={() => setMensagem({ ...mensagem, visivel: false })}
        >
          <Alert severity={mensagem.tipo} onClose={() => setMensagem({ ...mensagem, visivel: false })}>
            {mensagem.texto}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}
