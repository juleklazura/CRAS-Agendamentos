/**
 * Página principal da agenda de entrevistadores
 * Versão refatorada e modularizada
 */

import React, { memo } from 'react';
import { Box, Container, CircularProgress, Snackbar, Alert } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ptBR from 'date-fns/locale/pt-BR';

// Componentes
import Sidebar from '../components/Sidebar';
import {
  AgendaHeader,
  AgendaFilters,
  AgendaTable,
  EntrevistadorInfo,
  ModalAgendamento,
  ModalEdicao,
  ModalObservacoes
} from '../components/Agenda';

// Hook customizado com toda a lógica da agenda
import useAgenda from '../hooks/useAgenda';

/**
 * Componente principal da página de agenda
 * Utiliza composição de componentes menores e hook customizado
 */
const AgendaEntrevistadores = memo(() => {
  // Hook com toda a lógica e estados da agenda
  const {
    // Autenticação
    user,
    isEntrevistador,
    authLoading,
    
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
    clearError,
    clearSuccess,
    
    // Modal de agendamento
    modalAberto,
    horarioSelecionado,
    dadosAgendamento,
    setDadosAgendamento,
    abrirModalAgendamento,
    fecharModalAgendamento,
    criarAgendamento,

    // Modal de edição
    modalEdicaoAberto,
    dadosEdicao,
    setDadosEdicao,
    abrirModalEdicao,
    fecharModalEdicao,
    salvarEdicao,

    // Modal de observações
    modalObservacoesAberto,
    observacoesVisualizacao,
    nomeAgendamentoObservacoes,
    abrirModalObservacoes,
    fecharModalObservacoes
  } = useAgenda();

  // Loading de autenticação
  if (authLoading) {
    return (
      <>
        <Sidebar />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
          <CircularProgress />
        </Box>
      </>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Sidebar />
      
      <Container component="main" maxWidth={false} className="main-content">
        {/* Cabeçalho com título e descrição */}
        <AgendaHeader isEntrevistador={isEntrevistador} />

        {/* Filtros: seleção de entrevistador e data (apenas para admin/recepção) */}
        {!isEntrevistador && (
          <AgendaFilters
            entrevistadores={entrevistadores}
            selectedEntrevistador={selectedEntrevistador}
            onEntrevistadorChange={setSelectedEntrevistador}
            data={data}
            onDataChange={setData}
            loading={loading}
          />
        )}

        {/* Informações do entrevistador logado */}
        {isEntrevistador && <EntrevistadorInfo user={user} />}

        {/* Tabela de horários */}
        {selectedEntrevistador && (
          <AgendaTable
            horariosAgenda={horariosAgenda}
            getStatusHorarioDetalhado={getStatusHorarioDetalhado}
            abrirModalObservacoes={abrirModalObservacoes}
            abrirModalAgendamento={abrirModalAgendamento}
            abrirModalEdicao={abrirModalEdicao}
            isEntrevistador={isEntrevistador}
            loading={loading}
          />
        )}

        {/* Modal de criação de agendamento */}
        <ModalAgendamento
          aberto={modalAberto}
          onFechar={fecharModalAgendamento}
          onSalvar={criarAgendamento}
          horarioSelecionado={horarioSelecionado}
          data={data}
          dadosAgendamento={dadosAgendamento}
          setDadosAgendamento={setDadosAgendamento}
          loading={loading}
        />

        {/* Modal de visualização de observações */}
        <ModalObservacoes
          aberto={modalObservacoesAberto}
          onFechar={fecharModalObservacoes}
          observacoes={observacoesVisualizacao}
          nomeAgendamento={nomeAgendamentoObservacoes}
        />

        {/* Modal de edição de agendamento */}
        <ModalEdicao
          aberto={modalEdicaoAberto}
          onFechar={fecharModalEdicao}
          onSalvar={salvarEdicao}
          dadosEdicao={dadosEdicao}
          setDadosEdicao={setDadosEdicao}
        />

        {/* Snackbars para feedback */}
        <Snackbar 
          open={!!feedbackState.error} 
          autoHideDuration={4000} 
          onClose={clearError}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity="error" onClose={clearError}>
            {feedbackState.error}
          </Alert>
        </Snackbar>

        <Snackbar 
          open={!!feedbackState.success} 
          autoHideDuration={4000} 
          onClose={clearSuccess}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity="success" onClose={clearSuccess}>
            {feedbackState.success}
          </Alert>
        </Snackbar>
      </Container>
    </LocalizationProvider>
  );
});

AgendaEntrevistadores.displayName = 'AgendaEntrevistadores';

export default AgendaEntrevistadores;
