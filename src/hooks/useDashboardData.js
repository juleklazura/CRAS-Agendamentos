import { useState, useCallback, useEffect, useRef } from 'react';
import api from '../services/api';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Limite máximo de registros para prevenir DoS no frontend
 */
const MAX_APPOINTMENTS_LIMIT = 5000;

/**
 * Valida se um appointment tem estrutura válida
 * @param {object} apt - Objeto de agendamento
 * @returns {boolean} Se é válido
 */
const isValidAppointment = (apt) => {
  if (!apt || typeof apt !== 'object') return false;
  if (!apt.data || typeof apt.data !== 'string') return false;
  if (!apt.status || typeof apt.status !== 'string') return false;
  const validStatuses = ['realizado', 'ausente', 'agendado', 'cancelado'];
  return validStatuses.includes(apt.status);
};

/**
 * Normaliza a resposta da API para sempre retornar um array
 * @param {object} response - Resposta da API
 * @returns {Array} Array de appointments
 */
const normalizeAppointments = (response) => {
  if (Array.isArray(response.data)) return response.data;
  if (response.data?.appointments) return response.data.appointments;
  if (response.data?.results) return response.data.results;
  
  const keys = Object.keys(response.data || {});
  for (const key of keys) {
    if (Array.isArray(response.data[key])) return response.data[key];
  }
  return [];
};

/**
 * Filtra appointments por período
 * @param {Array} appointments - Array de appointments
 * @param {string} viewMode - Modo de visualização ('mensal' ou 'anual')
 * @param {number} selectedMonth - Mês selecionado
 * @param {number} selectedYear - Ano selecionado
 * @returns {Array} Appointments filtrados
 */
const filterByPeriod = (appointments, viewMode, selectedMonth, selectedYear) => {
  if (viewMode === 'mensal') {
    const date = new Date(selectedYear, selectedMonth, 1);
    const startDate = startOfMonth(date);
    const endDate = endOfMonth(date);
    
    return appointments.filter(apt => {
      const aptDate = new Date(apt.data);
      return aptDate >= startDate && aptDate <= endDate;
    });
  }
  
  const startDate = startOfYear(new Date(selectedYear, 0, 1));
  const endDate = endOfYear(new Date(selectedYear, 11, 31));
  
  return appointments.filter(apt => {
    const aptDate = new Date(apt.data);
    return aptDate >= startDate && aptDate <= endDate;
  });
};

/**
 * Agrupa appointments por semana
 * @param {Array} appointments - Array de appointments
 * @returns {Array} Dados agrupados por semana
 */
const groupByWeek = (appointments) => {
  const weekData = {};
  
  appointments.forEach(apt => {
    const date = new Date(apt.data);
    const weekNum = Math.ceil(date.getDate() / 7);
    const weekLabel = `Semana ${weekNum}`;
    
    if (!weekData[weekLabel]) {
      weekData[weekLabel] = { name: weekLabel, realizados: 0, ausentes: 0, agendados: 0 };
    }
    
    if (apt.status === 'realizado') {
      weekData[weekLabel].realizados++;
    } else if (apt.status === 'ausente') {
      weekData[weekLabel].ausentes++;
    } else if (apt.status === 'agendado') {
      const aptDate = new Date(apt.data);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      aptDate.setHours(0, 0, 0, 0);
      if (aptDate >= today) {
        weekData[weekLabel].agendados++;
      }
    }
  });
  
  return Object.values(weekData);
};

/**
 * Agrupa appointments por mês
 * @param {Array} appointments - Array de appointments
 * @param {number} selectedYear - Ano selecionado
 * @returns {Array} Dados agrupados por mês
 */
const groupByMonth = (appointments, selectedYear) => {
  const monthData = {};
  const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  
  // Inicializar todos os meses
  monthNames.forEach((month, index) => {
    monthData[month] = { 
      name: format(new Date(selectedYear, index, 1), 'MMM', { locale: ptBR }), 
      realizados: 0, 
      ausentes: 0, 
      agendados: 0 
    };
  });
  
  // Preencher com dados reais
  appointments.forEach(apt => {
    const date = new Date(apt.data);
    const monthIndex = date.getMonth();
    const monthKey = monthNames[monthIndex];
    
    if (apt.status === 'realizado') {
      monthData[monthKey].realizados++;
    } else if (apt.status === 'ausente') {
      monthData[monthKey].ausentes++;
    } else if (apt.status === 'agendado') {
      const aptDate = new Date(apt.data);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      aptDate.setHours(0, 0, 0, 0);
      if (aptDate >= today) {
        monthData[monthKey].agendados++;
      }
    }
  });
  
  return Object.values(monthData);
};

/**
 * Calcula estatísticas totais
 * @param {Array} appointments - Array de appointments
 * @returns {object} Estatísticas { realizados, ausentes, agendados, total }
 */
const calculateStats = (appointments) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const realizados = appointments.filter(a => a.status === 'realizado').length;
  const ausentes = appointments.filter(a => a.status === 'ausente').length;
  const agendados = appointments.filter(a => {
    if (a.status !== 'agendado') return false;
    const aptDate = new Date(a.data);
    aptDate.setHours(0, 0, 0, 0);
    return aptDate >= today;
  }).length;
  
  return { 
    realizados, 
    ausentes, 
    agendados, 
    total: realizados + ausentes + agendados 
  };
};

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
      const params = { limit: MAX_APPOINTMENTS_LIMIT };
      
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
      
      const response = await api.get('/appointments', { params });
      let appointments = normalizeAppointments(response);
      
      appointments = appointments
        .filter(isValidAppointment)
        .slice(0, MAX_APPOINTMENTS_LIMIT);
      
      appointments = filterByPeriod(appointments, viewMode, selectedMonth, selectedYear);
      
      const grouped = viewMode === 'mensal' 
        ? groupByWeek(appointments)
        : groupByMonth(appointments, selectedYear);
      
      setChartData(grouped);
      setStats(calculateStats(appointments));
      
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
