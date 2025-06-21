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

export default function MinhaAgenda() {
  const navigate = useNavigate();
  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const [agendamentos, setAgendamentos] = useState([]);
  const [bloqueios, setBloqueios] = useState([]);
  
  // Estados para bloqueio
  const [modalBloqueioAberto, setModalBloqueioAberto] = useState(false);
  const [horarioParaBloqueio, setHorarioParaBloqueio] = useState(null);
  
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

  // Função para lidar com mudança no CPF
  const handleCPFChange = (valor) => {
    const cpfFormatado = formatarCPF(valor);
    setDadosAgendamento({...dadosAgendamento, cpf: cpfFormatado});
  };

  // Função para lidar com mudança no telefone 1
  const handleTelefone1Change = (valor) => {
    const telefoneFormatado = formatarTelefone(valor);
    setDadosAgendamento({...dadosAgendamento, telefone1: telefoneFormatado});
  };

  // Função para lidar com mudança no telefone 2
  const handleTelefone2Change = (valor) => {
    const telefoneFormatado = formatarTelefone(valor);
    setDadosAgendamento({...dadosAgendamento, telefone2: telefoneFormatado});
  };

  // Função para exibir CPF formatado
  const exibirCPFFormatado = (cpf) => {
    if (!cpf) return '-';
    // Se já está formatado, retorna como está
    if (cpf.includes('.')) return cpf;
    // Se não está formatado, aplica a formatação
    return formatarCPF(cpf);
  };

  // Verificar autenticação
  useEffect(() => {
    if (!token || !usuario || usuario.role !== 'entrevistador') {
      localStorage.clear();
      navigate('/login');
    }
  }, [token, usuario, navigate]);

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

  // Função auxiliar para criar data com horário
  const criarDataHorario = useCallback((data, horario) => {
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
  }, []);

  // Buscar agendamentos
  const buscarAgendamentos = useCallback(async () => {
    if (!token || !usuario?.id) return;
    try {
      const resposta = await axios.get(
        `http://localhost:5000/api/appointments?entrevistador=${usuario.id}`,
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
  }, [token, usuario?.id]);

  // Buscar bloqueios
  const buscarBloqueios = useCallback(async () => {
    if (!token) return;
    
    try {
      const resposta = await axios.get(
        'http://localhost:5000/api/blocked-slots',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBloqueios(resposta.data || []);
    } catch (erro) {
      console.error('Erro ao buscar bloqueios:', erro);
      mostrarMensagem('Erro ao carregar bloqueios', 'error');
    }
  }, [token]);

  // Carregar dados iniciais
  useEffect(() => {
    if (!token || !usuario) return;
    
    buscarAgendamentos();
    buscarBloqueios();
  }, [token, usuario, buscarAgendamentos, buscarBloqueios]);

  // Verificar status dos horários
  const verificarHorarioBloqueado = useCallback((data, horario) => {
    const dataHorario = criarDataHorario(data, horario);
    if (!dataHorario) return false;
    
    return bloqueios.some(b => {
      const dataBloqueio = new Date(b.data);
      return dataBloqueio.getTime() === dataHorario.getTime();
    });
  }, [bloqueios, criarDataHorario]);

  // Função simplificada para depuração
  const obterAgendamento = useCallback((data, horario) => {
    if (!data || !horario || !agendamentos.length) return null;
    // Criar data/hora procurada
    const [hora, minuto] = horario.split(':');
    const dataProcurada = new Date(data);
    dataProcurada.setHours(parseInt(hora, 10), parseInt(minuto, 10), 0, 0);
    // Procurar agendamento que corresponde
    return agendamentos.find(agendamento => {
      // Comparar IDs como string para garantir compatibilidade
      if (agendamento.entrevistador && usuario?.id &&
          String(agendamento.entrevistador._id || agendamento.entrevistador) !== String(usuario.id)) {
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
  }, [agendamentos, usuario?.id]);

  const verificarHorarioAgendado = useCallback((data, horario) => {
    return !!obterAgendamento(data, horario);
  }, [obterAgendamento]);

  // Funções para bloqueio
  const abrirModalBloqueio = (horario) => {
    setHorarioParaBloqueio(horario);
    setModalBloqueioAberto(true);
  };

  const bloquearHorario = async () => {
    try {
      const dataHorario = criarDataHorario(dataSelecionada, horarioParaBloqueio);
      if (!dataHorario) throw new Error('Data inválida');

      await axios.post(
        'http://localhost:5000/api/blocked-slots',
        { data: dataHorario, motivo: 'Bloqueio manual' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      mostrarMensagem('Horário bloqueado com sucesso');
      await buscarBloqueios();
      setModalBloqueioAberto(false);
    } catch (erro) {
      console.error('Erro ao bloquear horário:', erro);
      mostrarMensagem('Erro ao bloquear horário', 'error');
    }
  };

  const desbloquearHorario = async () => {
    try {
      const dataHorario = criarDataHorario(dataSelecionada, horarioParaBloqueio);
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
      setModalBloqueioAberto(false);
    } catch (erro) {
      console.error('Erro ao desbloquear horário:', erro);
      mostrarMensagem('Erro ao desbloquear horário', 'error');
    }
  };

  // Funções para agendamento
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

  const criarAgendamento = async () => {
    // Validações
    if (!dadosAgendamento.pessoa.trim()) {
      mostrarMensagem('Nome da pessoa é obrigatório', 'error');
      return;
    }
    if (!dadosAgendamento.cpf.trim()) {
      mostrarMensagem('CPF é obrigatório', 'error');
      return;
    }
    
    // Validar se CPF tem 11 dígitos (removendo formatação)
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
          entrevistador: usuario.id,
          cras: usuario.cras,
          pessoa: dadosAgendamento.pessoa,
          cpf: cpfApenasNumeros, // Enviar apenas os números
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
      mostrarMensagem('Erro ao criar agendamento', 'error');
    }
  };

  // Funções para exclusão
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

  // Função para confirmar presença
  const confirmarPresenca = async (agendamento) => {
    if (!agendamento?._id) {
      mostrarMensagem('Agendamento inválido', 'error');
      return;
    }

    try {
      console.log('Confirmando presença para:', agendamento._id);
      
      const response = await axios.patch(
        `http://localhost:5000/api/appointments/${agendamento._id}/confirm`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Resposta da confirmação:', response.data);
      mostrarMensagem('Presença confirmada com sucesso!');
      await buscarAgendamentos();
    } catch (erro) {
      console.error('Erro ao confirmar presença:', erro);
      console.error('Response:', erro.response?.data);
      console.error('Status:', erro.response?.status);
      mostrarMensagem(
        erro.response?.data?.message || 'Erro ao confirmar presença', 
        'error'
      );
    }
  };

  // Função para remover confirmação de presença
  const removerConfirmacao = async (agendamento) => {
    if (!agendamento?._id) {
      mostrarMensagem('Agendamento inválido', 'error');
      return;
    }

    try {
      console.log('Removendo confirmação para:', agendamento._id);
      
      const response = await axios.patch(
        `http://localhost:5000/api/appointments/${agendamento._id}/unconfirm`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Resposta da remoção:', response.data);
      mostrarMensagem('Confirmação removida com sucesso!');
      await buscarAgendamentos();
    } catch (erro) {
      console.error('Erro ao remover confirmação:', erro);
      mostrarMensagem(
        erro.response?.data?.message || 'Erro ao remover confirmação', 
        'error'
      );
    }
  };

  // Função para abrir modal de observações
  const abrirModalObservacoes = (agendamento) => {
    setObservacoesVisualizacao(agendamento?.observacoes || 'Nenhuma observação registrada');
    setNomeAgendamentoObservacoes(agendamento?.pessoa || 'Agendamento');
    setModalObservacoesAberto(true);
  };

  // Funções para edição
  const abrirModalEdicao = (agendamento) => {
    setAgendamentoParaEditar(agendamento);
    setDadosEdicao({
      pessoa: agendamento.pessoa || '',
      cpf: formatarCPF(agendamento.cpf || ''),
      telefone1: formatarTelefone(agendamento.telefone1 || ''),
      telefone2: formatarTelefone(agendamento.telefone2 || ''),
      motivo: agendamento.motivo || '',
      observacoes: agendamento.observacoes || ''
    });
    setModalEdicaoAberto(true);
  };

  const salvarEdicao = async () => {
    if (!agendamentoParaEditar) return;

    // Validações
    if (!dadosEdicao.pessoa.trim()) {
      mostrarMensagem('Nome da pessoa é obrigatório', 'error');
      return;
    }
    if (!dadosEdicao.cpf.trim()) {
      mostrarMensagem('CPF é obrigatório', 'error');
      return;
    }
    
    const cpfApenasNumeros = dadosEdicao.cpf.replace(/\D/g, '');
    if (cpfApenasNumeros.length !== 11) {
      mostrarMensagem('CPF deve ter 11 dígitos', 'error');
      return;
    }
    
    if (!dadosEdicao.telefone1.trim()) {
      mostrarMensagem('Pelo menos um telefone é obrigatório', 'error');
      return;
    }

    if (!dadosEdicao.motivo) {
      mostrarMensagem('Motivo é obrigatório', 'error');
      return;
    }

    try {
      await axios.put(
        `http://localhost:5000/api/appointments/${agendamentoParaEditar._id}`,
        {
          pessoa: dadosEdicao.pessoa,
          cpf: cpfApenasNumeros,
          telefone1: dadosEdicao.telefone1,
          telefone2: dadosEdicao.telefone2,
          motivo: dadosEdicao.motivo,
          observacoes: dadosEdicao.observacoes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      mostrarMensagem('Agendamento editado com sucesso!');
      await buscarAgendamentos();
      setModalEdicaoAberto(false);
      setAgendamentoParaEditar(null);
    } catch (erro) {
      console.error('Erro ao editar agendamento:', erro);
      mostrarMensagem('Erro ao editar agendamento', 'error');
    }
  };

  // Funções para lidar com mudanças nos campos de edição
  const handleEdicaoCPFChange = (valor) => {
    const cpfFormatado = formatarCPF(valor);
    setDadosEdicao({...dadosEdicao, cpf: cpfFormatado});
  };

  const handleEdicaoTelefone1Change = (valor) => {
    const telefoneFormatado = formatarTelefone(valor);
    setDadosEdicao({...dadosEdicao, telefone1: telefoneFormatado});
  };

  const handleEdicaoTelefone2Change = (valor) => {
    const telefoneFormatado = formatarTelefone(valor);
    setDadosEdicao({...dadosEdicao, telefone2: telefoneFormatado});
  };

  const mostrarMensagem = (texto, tipo = 'success') => {
    setMensagem({
      visivel: true,
      texto,
      tipo
    });
  };

  if (!token || !usuario) {
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
        <Typography variant="h4" mb={2} id="titulominhaagenda">
          Minha Agenda
        </Typography>
        
        <Typography variant="subtitle1" mb={2} color="text.secondary">
          Entrevistador: {usuario?.name || 'Carregando...'}
        </Typography>

        <Box mb={3}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
            <DatePicker
              label="Escolha o dia"
              value={dataSelecionada}
              onChange={(novaData) => setDataSelecionada(novaData || new Date())}
              disablePast
              shouldDisableDate={(data) => data.getDay() === 0 || data.getDay() === 6}
              sx={{ bgcolor: '#fff' }}
            />
          </LocalizationProvider>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Horário</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Nome</TableCell>
                <TableCell>CPF</TableCell>
                <TableCell>Telefones</TableCell>
                <TableCell>Motivo</TableCell>
                <TableCell>Observações</TableCell>
                <TableCell>Criado Por</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {HORARIOS_DISPONIVEIS.map(horario => {
                const agendado = verificarHorarioAgendado(dataSelecionada, horario);
                const bloqueado = verificarHorarioBloqueado(dataSelecionada, horario);
                const agendamento = obterAgendamento(dataSelecionada, horario);

                return (
                  <TableRow 
                    key={horario}
                    sx={{
                      backgroundColor: agendamento?.status === 'realizado' ? '#e8f5e8' : 'inherit'
                    }}
                  >
                    <TableCell>{horario}</TableCell>
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
                         'Livre'}
                      </Typography>
                    </TableCell>
                    <TableCell>{agendamento?.pessoa || '-'}</TableCell>
                    <TableCell>{exibirCPFFormatado(agendamento?.cpf)}</TableCell>
                    <TableCell>
                      {agendamento ? (
                        <>
                          {agendamento.telefone1}
                          {agendamento.telefone2 && <br />}
                          {agendamento.telefone2}
                        </>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{agendamento?.motivo || '-'}</TableCell>
                    <TableCell>
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
                    <TableCell>{agendamento?.createdBy?.name || '-'}</TableCell>
                    <TableCell align="center">
                      <Box display="flex" gap={1} justifyContent="center">
                        {!agendado && !bloqueado && (
                          <Button
                            variant="contained"
                            color="primary"
                            size="small"
                            onClick={() => abrirModalAgendamento(horario)}
                          >
                            Agendar
                          </Button>
                        )}
                        {!agendado && (
                          <Button
                            variant="outlined"
                            color={bloqueado ? "success" : "warning"}
                            size="small"
                            onClick={() => abrirModalBloqueio(horario)}
                          >
                            {bloqueado ? "Desbloquear" : "Bloquear"}
                          </Button>
                        )}
                        {agendado && (
                          <>
                            {agendamento?.status !== 'realizado' ? (
                              <IconButton
                                color="success"
                                size="small"
                                onClick={() => confirmarPresenca(agendamento)}
                                title="Confirmar presença"
                              >
                                <CheckCircleIcon fontSize="inherit" />
                              </IconButton>
                            ) : (
                              <IconButton
                                color="warning"
                                size="small"
                                onClick={() => removerConfirmacao(agendamento)}
                                title="Remover confirmação"
                              >
                                <CancelIcon fontSize="inherit" />
                              </IconButton>
                            )}
                            <IconButton
                              color="primary"
                              size="small"
                              onClick={() => abrirModalEdicao(agendamento)}
                              title="Editar agendamento"
                            >
                              <EditIcon fontSize="inherit" />
                            </IconButton>
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => abrirModalExclusao(agendamento)}
                              title="Excluir agendamento"
                            >
                              <DeleteIcon fontSize="inherit" />
                            </IconButton>
                          </>
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
          open={modalAgendamentoAberto} 
          onClose={() => setModalAgendamentoAberto(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Criar Agendamento - {horarioParaAgendamento} em {dataSelecionada?.toLocaleDateString('pt-BR')}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
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
                label="Telefone 1"
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
                helperText="Digite apenas números, a formatação é automática"
                inputProps={{ maxLength: 15 }}
              />
              <TextField
                label="Telefone 2 (opcional)"
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

        {/* Modal de Bloqueio */}
        <Dialog open={modalBloqueioAberto} onClose={() => setModalBloqueioAberto(false)}>
          <DialogTitle>
            {verificarHorarioBloqueado(dataSelecionada, horarioParaBloqueio) 
              ? "Desbloquear Horário" 
              : "Bloquear Horário"}
          </DialogTitle>
          <DialogContent>
            Confirma {verificarHorarioBloqueado(dataSelecionada, horarioParaBloqueio) ? "desbloqueio" : "bloqueio"} do 
            horário {horarioParaBloqueio}?
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setModalBloqueioAberto(false)}>Cancelar</Button>
            <Button 
              onClick={verificarHorarioBloqueado(dataSelecionada, horarioParaBloqueio) 
                ? desbloquearHorario 
                : bloquearHorario}
              color={verificarHorarioBloqueado(dataSelecionada, horarioParaBloqueio) 
                ? "success" 
                : "warning"}
            >
              Confirmar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal de Exclusão */}
        <Dialog 
          open={modalExclusaoAberto} 
          onClose={() => setModalExclusaoAberto(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Excluir Agendamento
          </DialogTitle>
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
        <Dialog 
          open={modalEdicaoAberto} 
          onClose={() => setModalEdicaoAberto(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            ✏️ Editar Agendamento
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Nome da Pessoa"
                value={dadosEdicao.pessoa}
                onChange={(e) => setDadosEdicao({...dadosEdicao, pessoa: e.target.value})}
                fullWidth
                required
              />
              <TextField
                label="CPF"
                value={dadosEdicao.cpf}
                onChange={(e) => handleEdicaoCPFChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && dadosEdicao.cpf.length > 0) {
                    const ultimoChar = dadosEdicao.cpf[dadosEdicao.cpf.length - 1];
                    if (ultimoChar === '.' || ultimoChar === '-') {
                      e.preventDefault();
                      const novoValor = dadosEdicao.cpf.slice(0, -1);
                      handleEdicaoCPFChange(novoValor);
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
                label="Telefone 1"
                value={dadosEdicao.telefone1}
                onChange={(e) => handleEdicaoTelefone1Change(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && dadosEdicao.telefone1.length > 0) {
                    const ultimoChar = dadosEdicao.telefone1[dadosEdicao.telefone1.length - 1];
                    if (ultimoChar === '(' || ultimoChar === ')' || ultimoChar === ' ' || ultimoChar === '-') {
                      e.preventDefault();
                      const novoValor = dadosEdicao.telefone1.slice(0, -1);
                      handleEdicaoTelefone1Change(novoValor);
                    }
                  }
                }}
                fullWidth
                required
                placeholder="(00) 00000-0000"
                helperText="Digite apenas números, a formatação é automática"
                inputProps={{ maxLength: 15 }}
              />
              <TextField
                label="Telefone 2 (opcional)"
                value={dadosEdicao.telefone2}
                onChange={(e) => handleEdicaoTelefone2Change(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && dadosEdicao.telefone2.length > 0) {
                    const ultimoChar = dadosEdicao.telefone2[dadosEdicao.telefone2.length - 1];
                    if (ultimoChar === '(' || ultimoChar === ')' || ultimoChar === ' ' || ultimoChar === '-') {
                      e.preventDefault();
                      const novoValor = dadosEdicao.telefone2.slice(0, -1);
                      handleEdicaoTelefone2Change(novoValor);
                    }
                  }
                }}
                fullWidth
                placeholder="(00) 00000-0000"
                inputProps={{ maxLength: 15 }}
              />
              <FormControl fullWidth required>
                <InputLabel>Motivo do Agendamento</InputLabel>
                <Select
                  value={dadosEdicao.motivo}
                  onChange={(e) => setDadosEdicao({...dadosEdicao, motivo: e.target.value})}
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
                value={dadosEdicao.observacoes}
                onChange={(e) => setDadosEdicao({...dadosEdicao, observacoes: e.target.value})}
                fullWidth
                multiline
                rows={3}
                placeholder="Digite observações adicionais sobre o agendamento..."
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setModalEdicaoAberto(false)}>Cancelar</Button>
            <Button onClick={salvarEdicao} variant="contained">
              Salvar Alterações
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={mensagem.visivel} autoHideDuration={6000} onClose={() => setMensagem({ ...mensagem, visivel: false })}>
          <Alert 
            severity={mensagem.tipo}
            onClose={() => setMensagem(m => ({ ...m, visivel: false }))}
          >
            {mensagem.texto}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}
