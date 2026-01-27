import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import useAgendaRecepcao from '../hooks/useAgendaRecepcao';
import Sidebar from '../components/Sidebar';
import AgendaRecepcaoHeader from '../components/AgendaRecepcao/AgendaRecepcaoHeader';
import SeletorEntrevistador from '../components/AgendaRecepcao/SeletorEntrevistador';
import TabelaHorarios from '../components/AgendaRecepcao/TabelaHorarios';
import ModalAgendamento from '../components/AgendaRecepcao/ModalAgendamento';
import ModalEdicao from '../components/AgendaRecepcao/ModalEdicao';
import ModalConfirmacao from '../components/AgendaRecepcao/ModalConfirmacao';
import ModalObservacoes from '../components/AgendaRecepcao/ModalObservacoes';
import { Box, Snackbar, Alert, CircularProgress } from '@mui/material';


export default function AgendaRecepcao() {
  const navigate = useNavigate();
  const { user: usuario, loading: authLoading } = useAuth();
  
  // Estados para mensagens
  const [mensagem, setMensagem] = useState({ 
    visivel: false, 
    texto: '', 
    tipo: 'success' 
  });

  const mostrarMensagem = useCallback((texto, tipo = 'success') => {
    setMensagem({ visivel: true, texto, tipo });
  }, []);

  // Hook customizado com toda a lógica de agendamentos
  const {
    dataSelecionada,
    setDataSelecionada,
    entrevistadores,
    entrevistadorSelecionado,
    setEntrevistadorSelecionado,
    crasInfo,
    loading,
    criarAgendamento,
    excluirAgendamento,
    confirmarPresenca,
    removerConfirmacao,
    marcarAusente,
    editarAgendamento,
    obterAgendamento,
    verificarHorarioBloqueado
  } = useAgendaRecepcao(usuario, mostrarMensagem);
  
  // Estados para modais
  const [modalAgendamentoAberto, setModalAgendamentoAberto] = useState(false);
  const [modalExclusaoAberto, setModalExclusaoAberto] = useState(false);
  const [modalObservacoesAberto, setModalObservacoesAberto] = useState(false);
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  
  // Estados para dados dos formulários
  const [dadosAgendamento, setDadosAgendamento] = useState({
    pessoa: '',
    cpf: '',
    telefone1: '',
    telefone2: '',
    motivo: '',
    observacoes: ''
  });
  const [dadosEdicao, setDadosEdicao] = useState({
    pessoa: '',
    cpf: '',
    telefone1: '',
    telefone2: '',
    motivo: '',
    observacoes: ''
  });
  
  // Estados para seleções temporárias
  const [horarioParaAgendamento, setHorarioParaAgendamento] = useState(null);
  const [agendamentoParaExcluir, setAgendamentoParaExcluir] = useState(null);
  const [agendamentoParaEditar, setAgendamentoParaEditar] = useState(null);
  const [observacoesVisualizacao, setObservacoesVisualizacao] = useState('');
  const [nomeAgendamentoObservacoes, setNomeAgendamentoObservacoes] = useState('');

  // Verificação de permissão
  useEffect(() => {
    if (usuario?.role !== 'recepcao') {
      mostrarMensagem('🔒 Acesso restrito à equipe de recepção', 'error');
      navigate('/dashboard');
    }
  }, [usuario, navigate, mostrarMensagem]);


  // Handlers de modais
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

  const handleCriarAgendamento = async () => {
    const sucesso = await criarAgendamento(dadosAgendamento, horarioParaAgendamento);
    if (sucesso) {
      setModalAgendamentoAberto(false);
      setDadosAgendamento({
        pessoa: '',
        cpf: '',
        telefone1: '',
        telefone2: '',
        motivo: '',
        observacoes: ''
      });
    }
  };

  const abrirModalExclusao = (agendamento) => {
    setAgendamentoParaExcluir(agendamento);
    setModalExclusaoAberto(true);
  };

  const confirmarExclusao = async () => {
    if (!agendamentoParaExcluir) return;
    const sucesso = await excluirAgendamento(agendamentoParaExcluir._id);
    if (sucesso) {
      setModalExclusaoAberto(false);
      setAgendamentoParaExcluir(null);
    }
  };

  const abrirModalObservacoes = (agendamento) => {
    setObservacoesVisualizacao(agendamento?.observacoes || 'Nenhuma observação registrada');
    setNomeAgendamentoObservacoes(agendamento?.pessoa || 'Agendamento');
    setModalObservacoesAberto(true);
  };

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

  const handleEditarAgendamento = async () => {
    if (!agendamentoParaEditar?._id) {
      mostrarMensagem('Agendamento inválido para edição', 'error');
      return;
    }
    const sucesso = await editarAgendamento(agendamentoParaEditar._id, dadosEdicao);
    if (sucesso) {
      fecharModalEdicao();
    }
  };


  return (
    <>
      <Sidebar />
      
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
          <AgendaRecepcaoHeader crasInfo={crasInfo} />

          <SeletorEntrevistador
            entrevistadores={entrevistadores}
            entrevistadorSelecionado={entrevistadorSelecionado}
            setEntrevistadorSelecionado={setEntrevistadorSelecionado}
            dataSelecionada={dataSelecionada}
            setDataSelecionada={setDataSelecionada}
            crasInfo={crasInfo}
            usuario={usuario}
          />

          {entrevistadorSelecionado && dataSelecionada && (
            <TabelaHorarios
              dataSelecionada={dataSelecionada}
              obterAgendamento={obterAgendamento}
              verificarHorarioBloqueado={verificarHorarioBloqueado}
              onAbrirModalAgendamento={abrirModalAgendamento}
              onConfirmarPresenca={confirmarPresenca}
              onMarcarAusente={marcarAusente}
              onRemoverConfirmacao={removerConfirmacao}
              onAbrirModalEdicao={abrirModalEdicao}
              onAbrirModalExclusao={abrirModalExclusao}
              onAbrirModalObservacoes={abrirModalObservacoes}
            />
          )}

          <ModalAgendamento
            aberto={modalAgendamentoAberto}
            onFechar={() => setModalAgendamentoAberto(false)}
            onSalvar={handleCriarAgendamento}
            dadosAgendamento={dadosAgendamento}
            setDadosAgendamento={setDadosAgendamento}
            horarioParaAgendamento={horarioParaAgendamento}
            dataSelecionada={dataSelecionada}
            loading={loading}
          />

          <ModalEdicao
            aberto={modalEdicaoAberto}
            onFechar={fecharModalEdicao}
            onSalvar={handleEditarAgendamento}
            dadosEdicao={dadosEdicao}
            setDadosEdicao={setDadosEdicao}
          />

          <ModalConfirmacao
            aberto={modalExclusaoAberto}
            onFechar={() => setModalExclusaoAberto(false)}
            onConfirmar={confirmarExclusao}
            titulo="Excluir Agendamento"
            mensagem={
              <>
                Tem certeza que deseja excluir o agendamento de <strong>{agendamentoParaExcluir?.pessoa}</strong> para o dia <strong>{dataSelecionada?.toLocaleDateString('pt-BR')}</strong>?
              </>
            }
            textoConfirmar="Excluir"
            corConfirmar="error"
          />

          <ModalObservacoes
            aberto={modalObservacoesAberto}
            onFechar={() => setModalObservacoesAberto(false)}
            observacoes={observacoesVisualizacao}
            nomeAgendamento={nomeAgendamentoObservacoes}
          />

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
