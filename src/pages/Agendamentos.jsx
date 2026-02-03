/**
 * 🚀 Página de Agendamentos - Arquitetura Modular e Escalável
 * 
 * Separação de Responsabilidades:
 * - AgendamentosHeader: Título e descrição
 * - AgendamentosFilters: Busca e exportação
 * - AgendamentosTable: Tabela com dados
 * - AgendamentoRow: Linha individual (memoizado)
 * - AgendamentosPagination: Controle de paginação
 * - AgendamentosNotifications: Mensagens de erro/sucesso
 * - useAgendamentoActions: Lógica de negócio
 * 
 * Benefícios:
 * - Componentes testáveis isoladamente
 * - Re-renders otimizados com React.memo
 * - Código limpo e manutenível
 * - Fácil adicionar novos recursos
 */
import { useRef, useState, useCallback } from 'react';
import { CircularProgress, Box } from '@mui/material';

import { useAuth } from '../hooks/useAuth';
import { useAgendamentos } from '../hooks/useAgendamentos';
import { useAgendamentoActions, canDeleteAgendamento } from '../hooks/useAgendamentoActions';

import Sidebar from '../components/Sidebar';
import AgendamentosHeader from '../components/Agendamentos/AgendamentosHeader';
import AgendamentosFilters from '../components/Agendamentos/AgendamentosFilters';
import AgendamentosTable from '../components/Agendamentos/AgendamentosTable';
import AgendamentosPagination from '../components/Agendamentos/AgendamentosPagination';
import AgendamentosNotifications from '../components/Agendamentos/AgendamentosNotifications';
import ModalConfirmacao from '../components/Agendamentos/ModalConfirmacao';
import ModalObservacoes from '../components/Agendamentos/ModalObservacoes';

import { sanitizeText } from '../utils/formatters';

/**
 * Componente principal - Orquestração de componentes modulares
 */
export default function Agendamentos() {
  const { user } = useAuth();
  const searchInputRef = useRef(null);
  
  // Hook de dados de agendamentos
  const {
    agendamentos,
    loading,
    error,
    success,
    search,
    setSearch,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    total,
    paginatedAgendamentos,
    deleteAgendamento,
    clearMessages,
    orderBy,
    order,
    handleSort
  } = useAgendamentos(user);
  
  // Hook de ações (exportação, auditoria, autorização)
  const { handleExport } = useAgendamentoActions(user, agendamentos);
  
  // Estados locais apenas para UI de modais
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [modalObservacoesAberto, setModalObservacoesAberto] = useState(false);
  const [observacoesVisualizacao, setObservacoesVisualizacao] = useState('');
  const [nomeAgendamentoObservacoes, setNomeAgendamentoObservacoes] = useState('');
  
  /**
   * Handler de exclusão com callback memoizado
   */
  const handleDelete = useCallback((id, agendamento) => {
    setDeleteTarget({ id, agendamento });
    setConfirmOpen(true);
  }, []);
  
  /**
   * Confirma exclusão com proteção contra race condition
   */
  const confirmDelete = useCallback(async () => {
    if (!deleteTarget || deleting) return;
    
    setDeleting(true);
    try {
      await deleteAgendamento(deleteTarget.id, deleteTarget.agendamento);
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleting, deleteAgendamento]);

  /**
   * Exportação com tratamento de erros
   */
  const handleExportClick = useCallback(async () => {
    const result = await handleExport();
    if (!result.success && result.error) {
      alert(result.error);
    }
  }, [handleExport]);

  /**
   * Abre modal de observações com dados sanitizados
   */
  const abrirModalObservacoes = useCallback((agendamento) => {
    setObservacoesVisualizacao(
      sanitizeText(agendamento?.observacoes || 'Nenhuma observação registrada')
    );
    setNomeAgendamentoObservacoes(
      sanitizeText(agendamento?.pessoa || 'Agendamento')
    );
    setModalObservacoesAberto(true);
  }, []);
  
  /**
   * Handler de mudança de página memoizado
   */
  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
  }, [setPage]);
  
  /**
   * Handler de mudança de linhas por página memoizado
   */
  const handleRowsPerPageChange = useCallback((newRowsPerPage) => {
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  }, [setPage, setRowsPerPage]);

  return (
    <>
      <Sidebar />
      <Box 
        component="main" 
        className="main-content"
        sx={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          maxWidth: 1200,
          margin: '0 auto',
          padding: { xs: 2, md: 3 }
        }}
      >
        {/* Cabeçalho */}
        <AgendamentosHeader />

        {/* Conteúdo Principal */}
        <Box sx={{ width: '100%' }}>
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress aria-label="Carregando agendamentos" />
            </Box>
          ) : (
            <>
              {/* Filtros e Exportação */}
              <AgendamentosFilters
                search={search}
                onSearchChange={setSearch}
                onExport={handleExportClick}
                searchInputRef={searchInputRef}
                disabled={loading}
              />

              {/* Tabela de Dados */}
              <AgendamentosTable
                agendamentos={paginatedAgendamentos}
                loading={loading}
                search={search}
                rowsPerPage={rowsPerPage}
                orderBy={orderBy}
                order={order}
                onSort={handleSort}
                canDeleteFn={canDeleteAgendamento}
                onDelete={handleDelete}
                onViewObservacoes={abrirModalObservacoes}
                deleting={deleting}
                user={user}
              />
              
              {/* Paginação */}
              <AgendamentosPagination
                total={total}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={handlePageChange}
                onRowsPerPageChange={handleRowsPerPageChange}
              />
            </>
          )}
        </Box>

        {/* Modais */}
        <ModalConfirmacao
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={confirmDelete}
          loading={deleting}
        />

        <ModalObservacoes
          open={modalObservacoesAberto}
          onClose={() => setModalObservacoesAberto(false)}
          observacoes={observacoesVisualizacao}
          nomePessoa={nomeAgendamentoObservacoes}
        />

        {/* Notificações */}
        <AgendamentosNotifications
          error={error}
          success={success}
          onClose={clearMessages}
        />
      </Box>
    </>
  );
}
