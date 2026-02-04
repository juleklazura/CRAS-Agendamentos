/**
 * useLogs - Hook customizado para gerenciar logs do sistema
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import api from '../services/api';
import { exportToCSV } from '../utils/csvExport';

export default function useLogs() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedLog, setSelectedLog] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Buscar logs do servidor
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/logs');
      const logsOrdenados = res.data.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      setLogs(logsOrdenados);
    } catch {
      setError('Erro ao buscar logs');
    }
    setLoading(false);
  }, []);

  // Carregar logs ao montar
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Filtrar logs
  const filteredLogs = useMemo(() => {
    const searchLower = search.toLowerCase();
    return logs.filter(l =>
      (l.user?.name || '').toLowerCase().includes(searchLower) ||
      (l.cras?.nome || '').toLowerCase().includes(searchLower) ||
      l.action.toLowerCase().includes(searchLower) ||
      (l.details || '').toLowerCase().includes(searchLower)
    );
  }, [logs, search]);

  // Logs paginados
  const paginatedLogs = useMemo(() => {
    return filteredLogs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredLogs, page, rowsPerPage]);

  // Exportar para CSV
  const exportLogs = useCallback(() => {
    const data = logs.map(l => ({
      Usuário: l.user?.name || '-',
      CRAS: l.cras?.nome || '-',
      Ação: l.action,
      Detalhes: l.details,
      Data: l.date ? new Date(l.date).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) : '-'
    }));
    exportToCSV(data, 'logs.csv');
  }, [logs]);

  // Handlers de modal
  const openModal = useCallback((log) => {
    setSelectedLog(log);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setSelectedLog(null);
  }, []);

  // Handlers de paginação
  const handlePageChange = useCallback((_, newPage) => {
    setPage(newPage);
  }, []);

  const handleRowsPerPageChange = useCallback((e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  }, []);

  // Limpar erro
  const clearError = useCallback(() => setError(''), []);

  return {
    // Estado
    logs,
    filteredLogs,
    paginatedLogs,
    loading,
    error,
    search,
    page,
    rowsPerPage,
    selectedLog,
    modalOpen,

    // Ações
    setSearch,
    exportLogs,
    openModal,
    closeModal,
    handlePageChange,
    handleRowsPerPageChange,
    clearError,
    refetch: fetchLogs
  };
}
