import { useState, useCallback, useEffect, useRef } from 'react';
import api from '../services/api';

/**
 * Hook customizado para gerenciar dados do dashboard
 * Busca, filtra e processa dados de agendamentos para exibição
 * @param {object} user - Usuário logado
 * @param {string} viewMode - Modo de visualização ('mensal' ou 'anual')
 * @param {number} selectedMonth - Mês selecionado
 * @param {number} selectedYear - Ano selecionado
 * @param {string} selectedCras - CRAS selecionado
 * @param {string} selectedEntrevistador - Entrevistador selecionado
 * @param {Array} crasList - Lista de CRAS
 * @param {Array} entrevistadoresList - Lista de entrevistadores
 * @returns {object} { chartData, stats, loading, refetch }
 */
export const useDashboardData = ({ 
  user, 
  viewMode, 
  selectedMonth, 
  selectedYear, 
  selectedCras, 
  selectedEntrevistador,
  crasList,
  entrevistadoresList 
}) => {
  const [chartData, setChartData] = useState([]);
  const [stats, setStats] = useState({ realizados: 0, ausentes: 0, agendados: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  
  const isEntrevistador = user?.role === 'entrevistador';
  const isAdmin = user?.role === 'admin';
  const showDashboard = isEntrevistador || isAdmin;
  
  const fetchData = useCallback(async () => {
    if (!showDashboard || !user) return;
    
    setLoading(true);
    try {
      // 🚀 OTIMIZAÇÃO: Usar endpoint de estatísticas agregadas
      const params = { 
        viewMode,
        month: selectedMonth,
        year: selectedYear
      };
      
      if (isEntrevistador) {
        params.entrevistador = user.id;
      } else if (isAdmin) {
        if (selectedEntrevistador !== 'todos') {
          const isValid = entrevistadoresList.some(e => e._id === selectedEntrevistador);
          if (isValid) params.entrevistador = selectedEntrevistador;
        } else if (selectedCras !== 'todos') {
          const isValid = crasList.some(c => c._id === selectedCras);
          if (isValid) params.cras = selectedCras;
        }
      }
      
      // Requisição única com dados agregados do backend
      const response = await api.get('/stats/dashboard', { params });
      
      setChartData(response.data.chartData || []);
      setStats(response.data.stats || { realizados: 0, ausentes: 0, agendados: 0, total: 0 });
      
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Erro ao buscar dados do gráfico:', error);
      }
      setChartData([]);
      setStats({ realizados: 0, ausentes: 0, agendados: 0, total: 0 });
    } finally {
      setLoading(false);
    }
  }, [showDashboard, isEntrevistador, isAdmin, user, viewMode, selectedMonth, selectedYear, selectedCras, selectedEntrevistador, crasList, entrevistadoresList]);
  
  // Ref para evitar vazamento de memória
  const fetchDataRef = useRef(fetchData);
  
  useEffect(() => {
    fetchDataRef.current = fetchData;
  }, [fetchData]);
  
  // Buscar dados inicial
  useEffect(() => {
    if (showDashboard) {
      fetchData();
    }
  }, [showDashboard, fetchData]);
  
  // ⏰ Polling: Atualização automática a cada 30 segundos
  useEffect(() => {
    if (!showDashboard) return;

    const pollingInterval = setInterval(() => {
      if (fetchDataRef.current) {
        fetchDataRef.current();
      }
    }, 30000);
    
    return () => clearInterval(pollingInterval);
  }, [showDashboard]);

  // 👁️ Atualiza quando a aba volta ao foco
  useEffect(() => {
    if (!showDashboard) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && fetchDataRef.current) {
        fetchDataRef.current();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [showDashboard]);

  // 🔄 Escuta eventos de mudança de agendamentos
  useEffect(() => {
    if (!showDashboard) return;

    const handleAppointmentChanged = () => {
      if (fetchDataRef.current) {
        fetchDataRef.current();
      }
    };
    
    window.addEventListener('appointmentChanged', handleAppointmentChanged);
    return () => window.removeEventListener('appointmentChanged', handleAppointmentChanged);
  }, [showDashboard]);
  
  return { chartData, stats, loading, refetch: fetchData };
};
