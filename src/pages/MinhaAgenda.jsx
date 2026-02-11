import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Snackbar, Alert, CircularProgress } from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers';
import ptBR from 'date-fns/locale/pt-BR';

import { useAuth } from '../hooks/useAuth';
import useMinhaAgenda from '../hooks/useMinhaAgenda';
import Sidebar from '../components/Sidebar';
import {
  MinhaAgendaHeader,
  SeletorData,
  TabelaAgenda,
  ModalAgendamento,
  ModalEdicao,
  ModalBloqueio,
  ModalObservacoes
} from '../components/MinhaAgenda';
import { ConfirmDialog } from '../components/UI';

const INITIAL_MESSAGE_STATE = { 
  visivel: false, 
  texto: '', 
  tipo: 'success' 
};

export default function MinhaAgenda() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const { usuarioId, usuarioCras } = useMemo(() => ({
    usuarioId: user?.id,
    usuarioCras: user?.cras
  }), [user]);

  const {
    dataSelecionada,
    setDataSelecionada,
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
  } = useMinhaAgenda(usuarioId, usuarioCras);

  useEffect(() => {
    if (!user || user.role !== 'entrevistador') {
      localStorage.clear();
      navigate('/login');
    }
  }, [user, navigate]);

  if (authLoading || !user) {
    return (
      <Box sx={{ display: 'flex' }}>
        <Sidebar />
        <Box sx={{ flexGrow: 1, p: 3, textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Sidebar />
      <Box className="main-content">
        <MinhaAgendaHeader />
        
        <SeletorData 
          dataSelecionada={dataSelecionada}
          onChange={setDataSelecionada}
        />

        <TabelaAgenda 
          dataSelecionada={dataSelecionada}
          obterAgendamento={obterAgendamento}
          verificarHorarioBloqueado={verificarHorarioBloqueado}
          onAgendar={(horario) => {
            setContexto(prev => ({ ...prev, horarioSelecionado: horario }));
            updateModal('agendamento', true);
          }}
          onConfirmarPresenca={confirmarPresenca}
          onMarcarAusente={marcarAusente}
          onRemoverConfirmacao={removerConfirmacao}
          onEditar={(agendamento) => {
            setDadosEdicao({ ...agendamento });
            setContexto(prev => ({ ...prev, agendamentoParaEditar: agendamento }));
            updateModal('edicao', true);
          }}
          onExcluir={(agendamento) => {
            setContexto(prev => ({ ...prev, agendamentoParaExcluir: agendamento }));
            updateModal('exclusao', true);
          }}
          onBloquear={(horario) => {
            setContexto(prev => ({ ...prev, horarioParaBloqueio: horario }));
            updateModal('bloqueio', true);
          }}
          onDesbloquear={desbloquearHorario}
          onVisualizarObservacoes={(agendamento) => {
            setContexto(prev => ({ 
              ...prev, 
              observacoesVisualizacao: agendamento.observacoes,
              nomeAgendamentoObservacoes: agendamento.pessoa
            }));
            updateModal('observacoes', true);
          }}
        />

        <ModalAgendamento 
          open={modals.agendamento}
          onClose={() => updateModal('agendamento', false)}
          dadosAgendamento={dadosAgendamento}
          setDadosAgendamento={setDadosAgendamento}
          horarioSelecionado={contexto.horarioSelecionado}
          dataSelecionada={dataSelecionada}
          onCriar={criarAgendamento}
          loading={loading.creating}
          onCPFChange={handleCPFChange}
          onTelefoneChange={handleTelefoneChange}
        />

        <ModalEdicao 
          open={modals.edicao}
          onClose={() => updateModal('edicao', false)}
          dadosEdicao={dadosEdicao}
          setDadosEdicao={setDadosEdicao}
          onSalvar={salvarEdicao}
          onCPFChange={handleCPFChange}
          onTelefoneChange={handleTelefoneChange}
        />

        <ModalBloqueio 
          open={modals.bloqueio}
          onClose={() => updateModal('bloqueio', false)}
          horarioParaBloqueio={contexto.horarioParaBloqueio}
          dataSelecionada={dataSelecionada}
          onConfirmar={criarBloqueio}
        />

        <ConfirmDialog
          open={modals.exclusao}
          onCancel={() => updateModal('exclusao', false)}
          onConfirm={excluirAgendamento}
          title="Excluir Agendamento"
          message={
            contexto.agendamentoParaExcluir?.pessoa
              ? <>Tem certeza que deseja excluir o agendamento de <strong>{contexto.agendamentoParaExcluir.pessoa}</strong>? Esta ação não pode ser desfeita.</>
              : 'Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.'
          }
          confirmText="Excluir"
          severity="error"
        />

        <ModalObservacoes 
          open={modals.observacoes}
          onClose={() => updateModal('observacoes', false)}
          nomeAgendamento={contexto.nomeAgendamentoObservacoes}
          observacoes={contexto.observacoesVisualizacao}
        />

        <Snackbar
          open={mensagem.visivel}
          autoHideDuration={4000}
          onClose={(event, reason) => {
            if (reason === 'clickaway') return;
            setMensagem(INITIAL_MESSAGE_STATE);
          }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{ mb: 2, mr: 2 }}
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
