import { useEffect, useState, useCallback, useMemo } from 'react';
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
  MenuItem,
  Card,
  CardContent,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import DescriptionIcon from '@mui/icons-material/Description';
import EventIcon from '@mui/icons-material/Event';
import ptBR from 'date-fns/locale/pt-BR';

import {
  formatarCPF,
  formatarTelefone,
  motivosAtendimento,
  horariosDisponiveis,
  criarDataHorario
} from '../utils/agendamentoUtils';

const API_BASE_URL = 'http://localhost:5000/api';

// 🚀 Estados iniciais otimizados
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

export default function MinhaAgenda() {
  const navigate = useNavigate();

  // 🔐 Dados do usuário otimizados
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

  // 📅 Estados principais
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
  
  const [agendamentos, setAgendamentos] = useState([]);
  const [bloqueios, setBloqueios] = useState([]);
  const [mensagem, setMensagem] = useState(INITIAL_MESSAGE_STATE);

  // 🎭 Estados de modais
  const [modals, setModals] = useState({
    agendamento: false,
    bloqueio: false,
    exclusao: false,
    observacoes: false,
    edicao: false
  });

  // 📝 Estados de formulários
  const [dadosAgendamento, setDadosAgendamento] = useState(INITIAL_FORM_STATE);
  const [dadosEdicao, setDadosEdicao] = useState(INITIAL_FORM_STATE);

  // 🎯 Estados de contexto
  const [contexto, setContexto] = useState({
    horarioSelecionado: null,
    agendamentoSelecionado: null,
    observacoesVisualizacao: '',
    nomeAgendamentoObservacoes: ''
  });

  // 🚀 Funções utilitárias otimizadas
  const updateModal = useCallback((modalName, isOpen) => {
    setModals(prev => ({ ...prev, [modalName]: isOpen }));
  }, []);

  const mostrarMensagem = useCallback((texto, tipo = 'success') => {
    setMensagem({ visivel: true, texto, tipo });
  }, []);

  // 📱 Handlers de formatação otimizados
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

  // 🔍 Verificação de autenticação
  useEffect(() => {
    if (!token || !usuario || usuario.role !== 'entrevistador') {
      localStorage.clear();
      navigate('/login');
    }
  }, [token, usuario, navigate]);

  // 📊 API calls otimizadas
  const buscarAgendamentos = useCallback(async () => {
    if (!token || !usuarioId) return;
    
    try {
      const { data } = await axios.get(
        `${API_BASE_URL}/appointments?entrevistador=${usuarioId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const agendamentos = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      setAgendamentos(agendamentos);
    } catch (erro) {
      console.error('Erro ao buscar agendamentos:', erro);
      mostrarMensagem('😓 Não foi possível carregar seus agendamentos. Tente novamente.', 'error');
    }
  }, [token, usuarioId, mostrarMensagem]);

  const buscarBloqueios = useCallback(async () => {
    if (!token) return;
    
    try {
      const { data } = await axios.get(
        `${API_BASE_URL}/blocked-slots`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBloqueios(data || []);
    } catch (erro) {
      console.error('Erro ao buscar bloqueios:', erro);
      mostrarMensagem('😓 Não foi possível verificar horários bloqueados. Tente novamente.', 'error');
    }
  }, [token, mostrarMensagem]);

  // 🔄 Carregamento inicial otimizado
  useEffect(() => {
    if (token && usuario) {
      Promise.all([buscarAgendamentos(), buscarBloqueios()]);
    }
  }, [token, usuario, buscarAgendamentos, buscarBloqueios]);

  // 🎯 Verificações de status otimizadas
  const verificarHorarioBloqueado = useCallback((data, horario) => {
    const dataHorario = criarDataHorario(data, horario);
    if (!dataHorario) return false;
    
    return bloqueios.some(bloqueio => {
      const dataBloqueio = new Date(bloqueio.data);
      return dataBloqueio.getTime() === dataHorario.getTime();
    });
  }, [bloqueios]);

  const obterAgendamento = useCallback((data, horario) => {
    if (!data || !horario || !agendamentos.length) return null;
    
    const [hora, minuto] = horario.split(':');
    const dataProcurada = new Date(data);
    dataProcurada.setHours(parseInt(hora, 10), parseInt(minuto, 10), 0, 0);
    
    return agendamentos.find(agendamento => {
      if (agendamento.entrevistador && usuarioId &&
          String(agendamento.entrevistador._id || agendamento.entrevistador) !== String(usuarioId)) {
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
    
    const cpfApenasNumeros = dados.cpf.replace(/\\D/g, '');
    if (cpfApenasNumeros.length !== 11) {
      mostrarMensagem('📋 CPF deve ter exatamente 11 números', 'error');
      return false;
    }
    
    if (!dados.telefone1.trim()) {
      mostrarMensagem('📞 Por favor, informe um telefone para contato', 'error');
      return false;
    }
    
    if (!dados.motivo) {
      mostrarMensagem('🎯 Por favor, selecione o motivo do atendimento', 'error');
      return false;
    }
    
    if (!usuarioCras) {
      mostrarMensagem('❌ Erro: CRAS não identificado para o usuário. Contate o administrador.', 'error');
      return false;
    }
    
    return true;
  }, [mostrarMensagem, usuarioCras]);

  const criarAgendamento = useCallback(async () => {
    if (!validarFormulario(dadosAgendamento)) return;

    try {
      const dataHorario = criarDataHorario(dataSelecionada, contexto.horarioSelecionado);
      if (!dataHorario) throw new Error('Data inválida');

      const dadosParaEnvio = {
        entrevistador: usuarioId,
        cras: usuarioCras,
        pessoa: dadosAgendamento.pessoa,
        cpf: dadosAgendamento.cpf.replace(/\\D/g, ''),
        telefone1: dadosAgendamento.telefone1,
        telefone2: dadosAgendamento.telefone2,
        motivo: dadosAgendamento.motivo,
        data: dataHorario,
        status: 'agendado',
        observacoes: dadosAgendamento.observacoes
      };

      await axios.post(
        `${API_BASE_URL}/appointments`,
        dadosParaEnvio,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      mostrarMensagem('Agendamento criado com sucesso!');
      updateModal('agendamento', false);
      
      // Buscar agendamentos sem bloquear o fechamento do modal
      buscarAgendamentos();
      
    } catch (erro) {
      console.error('Erro ao criar agendamento:', erro);
      mostrarMensagem('😓 Não foi possível criar o agendamento. Tente novamente.', 'error');
    }
  }, [dadosAgendamento, dataSelecionada, contexto.horarioSelecionado, usuarioId, usuarioCras, token, validarFormulario, mostrarMensagem, updateModal, buscarAgendamentos]);

  // ✅ Funções de confirmação otimizadas
  const confirmarPresenca = useCallback(async (agendamento) => {
    if (!agendamento?._id) return;

    try {
      await axios.patch(
        `${API_BASE_URL}/appointments/${agendamento._id}/confirm`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      mostrarMensagem('Presença confirmada com sucesso!');
      buscarAgendamentos();
    } catch (erro) {
      console.error('Erro ao confirmar presença:', erro);
      mostrarMensagem('😓 Não foi possível confirmar a presença. Tente novamente.', 'error');
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

    try {
      await axios.delete(
        `${API_BASE_URL}/appointments/${contexto.agendamentoParaExcluir._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      mostrarMensagem('Agendamento excluído com sucesso!');
      updateModal('exclusao', false);
      buscarAgendamentos();
    } catch (erro) {
      console.error('Erro ao excluir agendamento:', erro);
      mostrarMensagem('😓 Não foi possível excluir o agendamento. Tente novamente.', 'error');
    }
  }, [contexto.agendamentoParaExcluir, token, mostrarMensagem, updateModal, buscarAgendamentos]);

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
          <Box sx={{ mt: 4, mb: 3, textAlign: 'center' }}>
            <Typography variant="h4" component="h1" className="main-page-title" sx={{ fontWeight: 'bold' }}>
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
                  label="Nome da Pessoa"
                  value={dadosAgendamento.pessoa}
                  onChange={(e) => setDadosAgendamento(prev => ({ ...prev, pessoa: e.target.value }))}
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
                />
                <TextField
                  label="Telefone 1"
                  value={dadosAgendamento.telefone1}
                  onChange={(e) => handleTelefoneChange(e.target.value, 'telefone1')}
                  fullWidth
                  required
                  placeholder="(00) 00000-0000"
                />
                <TextField
                  label="Telefone 2 (opcional)"
                  value={dadosAgendamento.telefone2}
                  onChange={(e) => handleTelefoneChange(e.target.value, 'telefone2')}
                  fullWidth
                  placeholder="(00) 00000-0000"
                />
                <FormControl fullWidth required>
                  <InputLabel>Motivo do Atendimento</InputLabel>
                  <Select
                    value={dadosAgendamento.motivo}
                    onChange={(e) => setDadosAgendamento(prev => ({ ...prev, motivo: e.target.value }))}
                  >
                    {motivosAtendimento.map(motivo => (
                      <MenuItem key={motivo} value={motivo}>
                        {motivo}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Observações (opcional)"
                  value={dadosAgendamento.observacoes}
                  onChange={(e) => setDadosAgendamento(prev => ({ ...prev, observacoes: e.target.value }))}
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Digite observações adicionais sobre o agendamento..."
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => updateModal('agendamento', false)}>Cancelar</Button>
              <Button onClick={criarAgendamento} variant="contained">
                Criar Agendamento
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
                Tem certeza que deseja excluir o agendamento de <strong>{contexto.agendamentoSelecionado?.pessoa}</strong>?
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
                  label="Nome da Pessoa"
                  value={dadosEdicao.pessoa}
                  onChange={(e) => setDadosEdicao(prev => ({ ...prev, pessoa: e.target.value }))}
                  fullWidth
                  required
                />
                <TextField
                  label="CPF"
                  value={dadosEdicao.cpf}
                  onChange={(e) => handleCPFChange(e.target.value, true)}
                  fullWidth
                  required
                />
                <TextField
                  label="Telefone 1"
                  value={dadosEdicao.telefone1}
                  onChange={(e) => handleTelefoneChange(e.target.value, 'telefone1', true)}
                  fullWidth
                  required
                />
                <TextField
                  label="Telefone 2 (opcional)"
                  value={dadosEdicao.telefone2}
                  onChange={(e) => handleTelefoneChange(e.target.value, 'telefone2', true)}
                  fullWidth
                />
                <FormControl fullWidth required>
                  <InputLabel>Motivo do Atendimento</InputLabel>
                  <Select
                    value={dadosEdicao.motivo}
                    onChange={(e) => setDadosEdicao(prev => ({ ...prev, motivo: e.target.value }))}
                  >
                    {motivosAtendimento.map(motivo => (
                      <MenuItem key={motivo} value={motivo}>
                        {motivo}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Observações (opcional)"
                  value={dadosEdicao.observacoes}
                  onChange={(e) => setDadosEdicao(prev => ({ ...prev, observacoes: e.target.value }))}
                  fullWidth
                  multiline
                  rows={3}
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
