// Componente Dashboard - Página inicial do sistema CRAS Agendamentos
// Exibe boas-vindas personalizadas e informações do usuário logado
// Para entrevistadores e admin: exibe gráficos de desempenho com filtros por mês/ano
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Avatar,
  Chip,
  Paper,
  Grid
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import FilterListIcon from '@mui/icons-material/FilterList';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';

/**
 * Sanitiza nome do usuário para prevenir XSS e limitar tamanho
 * @param {string} name - Nome do usuário
 * @returns {string} Nome sanitizado
 */
const sanitizeName = (name) => {
  if (!name || typeof name !== 'string') return 'Usuário';
  // Remove caracteres especiais perigosos e limita tamanho
  return name.replace(/[<>"'&\\]/g, '').substring(0, 50).split(' ')[0] || 'Usuário';
};

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
 * Limite máximo de registros para prevenir DoS no frontend
 */
const MAX_APPOINTMENTS_LIMIT = 5000;

/**
 * Componente principal do dashboard
 * Recepção: Boas-vindas simples
 * Entrevistador: Gráficos de desempenho com estatísticas do próprio usuário
 * Admin: Gráficos de desempenho com estatísticas por CRAS (todos os CRAS)
 */
export default function Dashboard() {
  const { user } = useAuth();
  const [crasNome, setCrasNome] = useState('');
  
  // Estados para gráficos (entrevistadores e admin)
  const [viewMode, setViewMode] = useState('mensal'); // 'mensal' ou 'anual'
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedCras, setSelectedCras] = useState('todos'); // Para admin
  const [crasList, setCrasList] = useState([]); // Lista de CRAS para admin
  const [selectedEntrevistador, setSelectedEntrevistador] = useState('todos'); // Para admin
  const [entrevistadoresList, setEntrevistadoresList] = useState([]); // Lista de entrevistadores para admin
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    realizados: 0,
    ausentes: 0,
    agendados: 0,
    total: 0
  });

  const isEntrevistador = user?.role === 'entrevistador';
  const isAdmin = user?.role === 'admin';
  const showDashboard = isEntrevistador || isAdmin;

  // Memoizar arrays estáticos para evitar re-renders desnecessários
  const monthOptions = useMemo(() => 
    Array.from({ length: 12 }, (_, i) => ({
      value: i,
      label: format(new Date(2024, i, 1), 'MMMM', { locale: ptBR })
    })), 
  []);
  
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  }, []);

  // Buscar dados de CRAS e entrevistadores (lista para admin e nome do CRAS do usuário) em paralelo
  useEffect(() => {
    // 🔒 SEGURANÇA: Não fazer requisições se o usuário não está autenticado
    if (!user) return;
    
    async function fetchCrasData() {
      const promises = [];
      
      // Admin precisa da lista de CRAS e entrevistadores
      if (isAdmin) {
        promises.push(
          api.get('/cras')
            .then(res => ({ type: 'crasList', data: res.data || [] }))
            .catch(() => ({ type: 'crasList', data: [] }))
        );
        promises.push(
          api.get('/users')
            .then(res => {
              // Filtrar apenas entrevistadores da lista
              const entrevistadores = (res.data || []).filter(u => u.role === 'entrevistador');
              return { type: 'entrevistadores', data: entrevistadores };
            })
            .catch(() => ({ type: 'entrevistadores', data: [] }))
        );
      }
      
      // Buscar nome do CRAS do usuário
      if (user?.cras && typeof user.cras === 'string') {
        promises.push(
          api.get(`/cras/${user.cras}`)
            .then(res => ({ type: 'name', data: res.data?.nome || user.cras }))
            .catch(() => ({ type: 'name', data: user.cras }))
        );
      }
      
      if (promises.length > 0) {
        const results = await Promise.all(promises);
        results.forEach(result => {
          if (result.type === 'crasList') setCrasList(result.data);
          if (result.type === 'entrevistadores') setEntrevistadoresList(result.data);
          if (result.type === 'name') setCrasNome(result.data);
        });
      }
    }
    fetchCrasData();
  }, [isAdmin, user, user?.cras]);

  // Buscar dados dos gráficos para entrevistadores e admin
  const fetchChartData = useCallback(async () => {
    // 🔒 SEGURANÇA: Não fazer requisições se o usuário não está autenticado
    if (!showDashboard || !user) return;
    
    setLoading(true);
    try {
      // Configurar parâmetros de busca com limite para prevenir DoS
      const params = {
        limit: MAX_APPOINTMENTS_LIMIT
      };
      
      if (isEntrevistador) {
        // Entrevistador vê apenas seus próprios agendamentos
        params.entrevistador = user.id;
      } else if (isAdmin) {
        // Admin pode filtrar por entrevistador específico
        if (selectedEntrevistador !== 'todos') {
          const isValidEntrevistador = entrevistadoresList.some(e => e._id === selectedEntrevistador);
          if (isValidEntrevistador) {
            params.entrevistador = selectedEntrevistador;
          }
        } else {
          // Se não filtrou por entrevistador, pode filtrar por CRAS
          // Validar que selectedCras é válido antes de usar
          if (selectedCras !== 'todos') {
            const isValidCras = crasList.some(c => c._id === selectedCras);
            if (isValidCras) {
              params.cras = selectedCras;
            }
          }
          // Se for 'todos', não enviar parâmetro de cras nem entrevistador
        }
      }
      
      // Buscar agendamentos
      const response = await api.get('/appointments', { params });
      
      // Garantir que temos um array - a API pode retornar { appointments: [...] } ou [...]
      let appointments = [];
      if (Array.isArray(response.data)) {
        appointments = response.data;
      } else if (response.data && Array.isArray(response.data.appointments)) {
        appointments = response.data.appointments;
      } else if (response.data && Array.isArray(response.data.results)) {
        appointments = response.data.results;
      } else if (response.data && typeof response.data === 'object') {
        // Se for objeto, pegar todas as propriedades que sejam arrays
        const keys = Object.keys(response.data);
        for (const key of keys) {
          if (Array.isArray(response.data[key])) {
            appointments = response.data[key];
            break;
          }
        }
      }
      
      // Validar estrutura dos appointments para prevenir dados malformados
      appointments = appointments.filter(isValidAppointment);
      
      // Limitar quantidade para prevenir problemas de performance
      if (appointments.length > MAX_APPOINTMENTS_LIMIT) {
        appointments = appointments.slice(0, MAX_APPOINTMENTS_LIMIT);
      }
      
      // Filtrar por período baseado no viewMode
      if (viewMode === 'mensal') {
        const date = new Date(selectedYear, selectedMonth, 1);
        const startDate = startOfMonth(date);
        const endDate = endOfMonth(date);
        
        appointments = appointments.filter(apt => {
          const aptDate = new Date(apt.data);
          return aptDate >= startDate && aptDate <= endDate;
        });
      } else {
        const startDate = startOfYear(new Date(selectedYear, 0, 1));
        const endDate = endOfYear(new Date(selectedYear, 11, 31));
        
        appointments = appointments.filter(apt => {
          const aptDate = new Date(apt.data);
          return aptDate >= startDate && aptDate <= endDate;
        });
      }
      
      if (viewMode === 'mensal') {
        // Agrupar por semana
        const weekData = {};
        appointments.forEach(apt => {
          const date = new Date(apt.data);
          const weekNum = Math.ceil(date.getDate() / 7);
          const weekLabel = `Semana ${weekNum}`;
          
          if (!weekData[weekLabel]) {
            weekData[weekLabel] = { name: weekLabel, realizados: 0, ausentes: 0, agendados: 0 };
          }
          
          if (apt.status === 'realizado') weekData[weekLabel].realizados++;
          else if (apt.status === 'ausente') weekData[weekLabel].ausentes++;
          else if (apt.status === 'agendado') {
            // Conta como agendado se for do dia atual ou futuro
            const aptDate = new Date(apt.data);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            aptDate.setHours(0, 0, 0, 0);
            if (aptDate >= today) {
              weekData[weekLabel].agendados++;
            }
          }
        });
        
        setChartData(Object.values(weekData));
      } else {
        // Agrupar por mês - criar todos os meses do ano
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
          
          if (apt.status === 'realizado') monthData[monthKey].realizados++;
          else if (apt.status === 'ausente') monthData[monthKey].ausentes++;
          else if (apt.status === 'agendado') {
            const aptDate = new Date(apt.data);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            aptDate.setHours(0, 0, 0, 0);
            if (aptDate >= today) {
              monthData[monthKey].agendados++;
            }
          }
        });
        
        setChartData(Object.values(monthData));
      }

      // Calcular estatísticas totais
      const realizados = appointments.filter(a => a.status === 'realizado').length;
      const ausentes = appointments.filter(a => a.status === 'ausente').length;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const agendados = appointments.filter(a => {
        if (a.status !== 'agendado') return false;
        const aptDate = new Date(a.data);
        aptDate.setHours(0, 0, 0, 0);
        return aptDate >= today; // Inclui hoje e datas futuras
      }).length;

      setStats({
        realizados,
        ausentes,
        agendados,
        total: realizados + ausentes + agendados
      });

    } catch (error) {
      // Só logar erros em ambiente de desenvolvimento
      if (import.meta.env.DEV) {
        console.error('Erro ao buscar dados do gráfico:', error);
      }
      // Resetar dados em caso de erro
      setChartData([]);
      setStats({ realizados: 0, ausentes: 0, agendados: 0, total: 0 });
    } finally {
      setLoading(false);
    }
  }, [showDashboard, isEntrevistador, isAdmin, viewMode, selectedMonth, selectedYear, selectedCras, selectedEntrevistador, user, crasList, entrevistadoresList]);

  // Ref para manter referência estável da função fetch (evita vazamento de memória)
  const fetchChartDataRef = useRef(null);

  // Atualiza a ref quando fetchChartData muda
  useEffect(() => {
    fetchChartDataRef.current = fetchChartData;
  }, [fetchChartData]);

  useEffect(() => {
    if (showDashboard) {
      fetchChartData();
    }
  }, [showDashboard, fetchChartData]);

  // ⏰ Polling: Atualização automática a cada 30 segundos
  // Garante que os números estejam sempre atualizados com alterações de outros usuários
  useEffect(() => {
    if (!showDashboard) return;

    const pollingInterval = setInterval(() => {
      if (fetchChartDataRef.current) {
        fetchChartDataRef.current();
      }
    }, 30000); // 30 segundos
    
    return () => {
      clearInterval(pollingInterval);
    };
  }, [showDashboard]);

  // 👁️ Atualiza quando a aba volta ao foco (visibility change)
  // Garante dados frescos quando usuário retorna à página
  useEffect(() => {
    if (!showDashboard) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && fetchChartDataRef.current) {
        fetchChartDataRef.current();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [showDashboard]);

  // 🔄 Escuta eventos de mudança de agendamentos (exclusão, criação, atualização)
  // Sincroniza dados em tempo real quando outro componente modifica agendamentos
  useEffect(() => {
    if (!showDashboard) return;

    const handleAppointmentChanged = () => {
      if (fetchChartDataRef.current) {
        fetchChartDataRef.current();
      }
    };
    
    window.addEventListener('appointmentChanged', handleAppointmentChanged);
    
    return () => {
      window.removeEventListener('appointmentChanged', handleAppointmentChanged);
    };
  }, [showDashboard]);

  return (
    <>
      <Sidebar />
      <Box 
        component="main" 
        className="main-content"
        sx={{
          background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)',
          minHeight: '100vh'
        }}
      >
        <Box sx={{ 
          width: '100%', 
          maxWidth: 1400, 
          mx: 'auto',
          p: { xs: 2, md: 4 }
        }}>
          {/* Header com boas-vindas */}
          <Paper
            elevation={0}
            className="dashboard-welcome-header"
            sx={{
              p: { xs: 2.5, md: 4 },
              mb: { xs: 2, md: 4 },
              borderRadius: { xs: 3, md: 4 },
              background: 'linear-gradient(135deg, #1E4976 0%, #2d6aa3 50%, #3d8bd4 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                right: 0,
                width: '40%',
                height: '100%',
                background: 'radial-gradient(circle at 70% 50%, rgba(255,255,255,0.1) 0%, transparent 60%)',
                pointerEvents: 'none'
              }
            }}
          >
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: { xs: 2, md: 3 }, 
              flexWrap: 'wrap' 
            }}>
              <Avatar
                sx={{
                  width: { xs: 56, md: 72 },
                  height: { xs: 56, md: 72 },
                  bgcolor: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)',
                  border: '3px solid rgba(255,255,255,0.3)',
                  fontSize: { xs: '1.4rem', md: '1.8rem' },
                  fontWeight: 700
                }}
              >
                {sanitizeName(user?.name)?.charAt(0)?.toUpperCase() || 'U'}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography 
                  variant="h4" 
                  fontWeight={700}
                  sx={{ 
                    mb: 0.5,
                    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' },
                    color: 'white !important',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Olá, {sanitizeName(user?.name)}! 👋
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  gap: { xs: 1, md: 1.5 }, 
                  flexWrap: 'wrap', 
                  alignItems: 'center' 
                }}>
                  <Chip
                    icon={<PersonIcon sx={{ color: 'white !important', fontSize: { xs: 16, md: 20 } }} />}
                    label={user?.role === 'admin' ? 'Administrador' : user?.role === 'entrevistador' ? 'Entrevistador' : 'Recepção'}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      fontWeight: 600,
                      backdropFilter: 'blur(10px)',
                      height: { xs: 28, md: 32 },
                      fontSize: { xs: '0.75rem', md: '0.85rem' },
                      '& .MuiChip-icon': { color: 'white' }
                    }}
                  />
                  <Chip
                    icon={<BusinessIcon sx={{ color: 'white !important', fontSize: { xs: 16, md: 20 } }} />}
                    label={isAdmin ? 'Todos os CRAS' : crasNome || user?.cras || 'N/A'}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      fontWeight: 600,
                      backdropFilter: 'blur(10px)',
                      height: { xs: 28, md: 32 },
                      fontSize: { xs: '0.75rem', md: '0.85rem' },
                      '& .MuiChip-icon': { color: 'white' },
                      maxWidth: { xs: 150, sm: 'none' },
                      '& .MuiChip-label': {
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }
                    }}
                  />
                </Box>
              </Box>
              {showDashboard && (
                <Box sx={{ textAlign: 'right', display: { xs: 'none', md: 'block' } }}>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5, color: 'white !important' }}>
                    {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </Typography>
                  <Typography variant="h5" fontWeight={600} sx={{ color: 'white !important' }}>
                    {format(new Date(), 'yyyy')}
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>

          {/* Gráficos para Entrevistadores e Admin */}
          {showDashboard && (
            <>
              {/* Cards de Estatísticas */}
              <Box 
                className="dashboard-stats-container"
                sx={{ 
                  display: { xs: 'grid', md: 'flex' },
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)' },
                  gridAutoRows: { xs: '1fr' },
                  gap: { xs: 1.5, md: 3 },
                  mb: { xs: 2, md: 4 },
                  mt: { xs: 2, md: 3 },
                  maxWidth: 1400, 
                  mx: 'auto',
                  '& > *': {
                    flex: { md: '1 1 0' },
                    minWidth: { xs: 0, md: 0 },
                    maxWidth: { md: 1400 },
                    width: { xs: '100%' },
                    height: { xs: '100%' }
                  }
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: { xs: 2, md: 3 },
                    borderRadius: { xs: 2, md: 3 },
                    background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: { xs: 110, md: 140 },
                    height: { xs: '100%', md: 'auto' },
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 12px 20px rgba(76, 175, 80, 0.3)'
                    },
                    '&:active': {
                      transform: { xs: 'scale(0.98)', md: 'translateY(-4px)' }
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: -20,
                      right: -20,
                      width: { xs: 60, md: 100 },
                      height: { xs: 60, md: 100 },
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: { xs: 0.5, md: 1 }, 
                    mb: { xs: 1, md: 2 } 
                  }}>
                    <Avatar sx={{ 
                      bgcolor: 'rgba(255,255,255,0.2)', 
                      width: { xs: 32, md: 40 }, 
                      height: { xs: 32, md: 40 } 
                    }}>
                      <CheckCircleOutlineIcon sx={{ fontSize: { xs: 18, md: 24 } }} />
                    </Avatar>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        opacity: 0.9, 
                        fontWeight: 600, 
                        color: 'white',
                        fontSize: { xs: '0.75rem', md: '0.875rem' }
                      }}
                    >
                      Realizados
                    </Typography>
                  </Box>
                  <Typography 
                    variant="h3" 
                    fontWeight={700} 
                    sx={{ 
                      color: 'white !important',
                      fontSize: { xs: '1.75rem', md: '3rem' }
                    }}
                  >
                    {stats.realizados}
                  </Typography>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: { xs: 2, md: 3 },
                    borderRadius: { xs: 2, md: 3 },
                    background: 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)',
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: { xs: 110, md: 140 },
                    height: { xs: '100%', md: 'auto' },
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 12px 20px rgba(255, 152, 0, 0.3)'
                    },
                    '&:active': {
                      transform: { xs: 'scale(0.98)', md: 'translateY(-4px)' }
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: -20,
                      right: -20,
                      width: { xs: 60, md: 100 },
                      height: { xs: 60, md: 100 },
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: { xs: 0.5, md: 1 }, 
                    mb: { xs: 1, md: 2 } 
                  }}>
                    <Avatar sx={{ 
                      bgcolor: 'rgba(255,255,255,0.2)', 
                      width: { xs: 32, md: 40 }, 
                      height: { xs: 32, md: 40 } 
                    }}>
                      <EventBusyIcon sx={{ fontSize: { xs: 18, md: 24 } }} />
                    </Avatar>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        opacity: 0.9, 
                        fontWeight: 600, 
                        color: 'white',
                        fontSize: { xs: '0.75rem', md: '0.875rem' }
                      }}
                    >
                      Ausentes
                    </Typography>
                  </Box>
                  <Typography 
                    variant="h3" 
                    fontWeight={700} 
                    sx={{ 
                      color: 'white !important',
                      fontSize: { xs: '1.75rem', md: '3rem' }
                    }}
                  >
                    {stats.ausentes}
                  </Typography>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: { xs: 2, md: 3 },
                    borderRadius: { xs: 2, md: 3 },
                    background: 'linear-gradient(135deg, #2196f3 0%, #64b5f6 100%)',
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: { xs: 110, md: 140 },
                    height: { xs: '100%', md: 'auto' },
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 12px 20px rgba(33, 150, 243, 0.3)'
                    },
                    '&:active': {
                      transform: { xs: 'scale(0.98)', md: 'translateY(-4px)' }
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: -20,
                      right: -20,
                      width: { xs: 60, md: 100 },
                      height: { xs: 60, md: 100 },
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: { xs: 0.5, md: 1 }, 
                    mb: { xs: 1, md: 2 } 
                  }}>
                    <Avatar sx={{ 
                      bgcolor: 'rgba(255,255,255,0.2)', 
                      width: { xs: 32, md: 40 }, 
                      height: { xs: 32, md: 40 } 
                    }}>
                      <EventAvailableIcon sx={{ fontSize: { xs: 18, md: 24 } }} />
                    </Avatar>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        opacity: 0.9, 
                        fontWeight: 600, 
                        color: 'white !important',
                        fontSize: { xs: '0.75rem', md: '0.875rem' }
                      }}
                    >
                      Agendados
                    </Typography>
                  </Box>
                  <Typography 
                    variant="h3" 
                    fontWeight={700} 
                    sx={{ 
                      color: 'white !important',
                      fontSize: { xs: '1.75rem', md: '3rem' }
                    }}
                  >
                    {stats.agendados}
                  </Typography>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: { xs: 2, md: 3 },
                    borderRadius: { xs: 2, md: 3 },
                    background: 'linear-gradient(135deg, #1E4976 0%, #2d6aa3 100%)',
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: { xs: 110, md: 140 },
                    height: { xs: '100%', md: 'auto' },
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 12px 20px rgba(30, 73, 118, 0.3)'
                    },
                    '&:active': {
                      transform: { xs: 'scale(0.98)', md: 'translateY(-4px)' }
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: -20,
                      right: -20,
                      width: { xs: 60, md: 100 },
                      height: { xs: 60, md: 100 },
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: { xs: 0.5, md: 1 }, 
                    mb: { xs: 1, md: 2 } 
                  }}>
                    <Avatar sx={{ 
                      bgcolor: 'rgba(255,255,255,0.2)', 
                      width: { xs: 32, md: 40 }, 
                      height: { xs: 32, md: 40 } 
                    }}>
                      <AssessmentIcon sx={{ fontSize: { xs: 18, md: 24 } }} />
                    </Avatar>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        opacity: 0.9, 
                        fontWeight: 600, 
                        color: 'white',
                        fontSize: { xs: '0.75rem', md: '0.875rem' }
                      }}
                    >
                      Total
                    </Typography>
                  </Box>
                  <Typography 
                    variant="h3" 
                    fontWeight={700} 
                    sx={{ 
                      color: 'white !important',
                      fontSize: { xs: '1.75rem', md: '3rem' }
                    }}
                  >
                    {stats.total}
                  </Typography>
                </Paper>
              </Box>

              {/* Controles de filtro */}
              <Paper 
                elevation={0}
                sx={{ 
                  mb: 2,
                  borderRadius: '8px 8px 0 0 !important',
                  pl: 3,
                  bgcolor: 'white'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, verticalAlign:'middle' }}>
                  <Avatar sx={{ bgcolor: '#1E4976', width: 40, height: 40 }}>
                    <FilterListIcon />
                  </Avatar>
                  <Typography variant="h6" fontWeight={600} color="#1E4976" sx={{ height: 40, display: 'flex', alignItems: 'center', mb:4, p: 0 }}>
                    Filtros
                  </Typography>
                </Box>
                <Grid container spacing={2} alignItems="center">
                  {/* Filtro de CRAS - apenas para admin */}
                  {isAdmin && (
                    <Grid size={{ xs: 12, md: 3 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>CRAS</InputLabel>
                        <Select
                          value={selectedCras}
                          onChange={(e) => {
                            // Validar que o valor é 'todos' ou um ID válido da lista
                            const value = e.target.value;
                            if (value === 'todos' || crasList.some(c => c._id === value)) {
                              setSelectedCras(value);
                              // Quando muda o CRAS, reseta o entrevistador
                              setSelectedEntrevistador('todos');
                            }
                          }}
                          label="CRAS"
                          sx={{ borderRadius: 2 }}
                        >
                          <MenuItem value="todos">Todos os CRAS</MenuItem>
                          {crasList.map((cras) => (
                            <MenuItem key={cras._id} value={cras._id}>
                              {cras.nome}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  )}
                  
                  {/* Filtro de Entrevistador - apenas para admin */}
                  {isAdmin && (
                    <Grid size={{ xs: 12, md: 3 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Entrevistador</InputLabel>
                        <Select
                          value={selectedEntrevistador}
                          onChange={(e) => {
                            // Validar que o valor é 'todos' ou um ID válido da lista
                            const value = e.target.value;
                            if (value === 'todos' || entrevistadoresList.some(ent => ent._id === value)) {
                              setSelectedEntrevistador(value);
                            }
                          }}
                          label="Entrevistador"
                          sx={{ borderRadius: 2 }}
                        >
                          <MenuItem value="todos">Todos os Entrevistadores</MenuItem>
                          {entrevistadoresList
                            .filter(ent => {
                              // Primeiro filtro: garantir que é entrevistador
                              if (ent.role !== 'entrevistador') return false;
                              // Segundo filtro: filtrar por CRAS se selecionado
                              if (selectedCras === 'todos') return true;
                              // ent.cras pode ser um objeto (se populado) ou uma string (ID)
                              const entCrasId = typeof ent.cras === 'object' && ent.cras?._id ? ent.cras._id : ent.cras;
                              return entCrasId === selectedCras;
                            })
                            .map((entrevistador) => (
                              <MenuItem key={entrevistador._id} value={entrevistador._id}>
                                {entrevistador.name}
                              </MenuItem>
                            ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  )}
                  
                  <Grid size={{ xs: 12, md: isAdmin ? 3 : 4 }}>
                    <ToggleButtonGroup
                      value={viewMode}
                      exclusive
                      onChange={(e, newMode) => newMode && setViewMode(newMode)}
                      fullWidth
                      size="small"
                      sx={{
                        '& .MuiToggleButton-root': {
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600,
                          '&.Mui-selected': {
                            bgcolor: '#1E4976',
                            color: 'white',
                            '&:hover': {
                              bgcolor: '#2d6aa3'
                            }
                          }
                        }
                      }}
                    >
                      <ToggleButton value="mensal">
                        <CalendarMonthIcon sx={{ mr: 1, fontSize: 18 }} />
                        Mensal
                      </ToggleButton>
                      <ToggleButton value="anual">
                        <TrendingUpIcon sx={{ mr: 1, fontSize: 18 }} />
                        Anual
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Grid>
                  
                  {viewMode === 'mensal' && (
                    <Grid size={{ xs: 12, md: isAdmin ? 3 : 4 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Mês</InputLabel>
                        <Select
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(e.target.value)}
                          label="Mês"
                        >
                          {monthOptions.map(({ value, label }) => (
                            <MenuItem key={value} value={value}>
                              {label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  )}
                  
                  <Grid size={{ xs: 12, md: isAdmin ? 3 : 4 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Ano</InputLabel>
                      <Select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        label="Ano"
                        sx={{ borderRadius: 2 }}
                      >
                        {yearOptions.map(year => (
                          <MenuItem key={year} value={year}>{year}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Paper>

              {/* Gráfico */}
              <Paper 
                elevation={0}
                sx={{ 
                  borderRadius: '0 0 8px 8px !important',
                  p: 3,
                  bgcolor: 'white'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: '#1E4976', width: 40, height: 40 }}>
                      {viewMode === 'mensal' ? <CalendarMonthIcon /> : <TrendingUpIcon />}
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} color="#1E4976" sx={{ height: 40, display: 'flex', alignItems: 'center', mb: 4, p: 0 }}>
                      {viewMode === 'mensal' ? 'Desempenho Semanal' : 'Evolução Anual'}
                    </Typography>
                  </Box>
                  {!loading && chartData.length > 0 && (
                    <Chip 
                      label={`${chartData.length} ${viewMode === 'mensal' ? 'semanas' : 'meses'}`}
                      size="small"
                      sx={{ bgcolor: '#e3f2fd', color: '#1E4976', fontWeight: 600 }}
                    />
                  )}
                </Box>
                
                {loading ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 400, gap: 2 }}>
                    <CircularProgress size={50} sx={{ color: '#1E4976' }} />
                    <Typography variant="body2" color="text.secondary">
                      Carregando dados...
                    </Typography>
                  </Box>
                ) : chartData.length === 0 ? (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    minHeight: 400,
                    bgcolor: '#f5f5f5',
                    borderRadius: 3,
                    gap: 2
                  }}>
                    <AssessmentIcon sx={{ fontSize: 64, color: '#bdbdbd' }} />
                    <Typography variant="h6" color="text.secondary">
                      Nenhum dado disponível
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Selecione outro período para visualizar os dados
                    </Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    {viewMode === 'mensal' ? (
                      <BarChart data={chartData} barCategoryGap="20%">
                        <defs>
                          <linearGradient id="colorRealizados" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4caf50" stopOpacity={0.9}/>
                            <stop offset="95%" stopColor="#4caf50" stopOpacity={0.6}/>
                          </linearGradient>
                          <linearGradient id="colorAusentes" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ff9800" stopOpacity={0.9}/>
                            <stop offset="95%" stopColor="#ff9800" stopOpacity={0.6}/>
                          </linearGradient>
                          <linearGradient id="colorAgendados" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2196f3" stopOpacity={0.9}/>
                            <stop offset="95%" stopColor="#2196f3" stopOpacity={0.6}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#666', fontSize: 12 }}
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#666', fontSize: 12 }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: 12, 
                            border: 'none',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                          }}
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: 20 }}
                          iconType="circle"
                        />
                        <Bar dataKey="realizados" fill="url(#colorRealizados)" name="Realizados" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="ausentes" fill="url(#colorAusentes)" name="Ausentes" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="agendados" fill="url(#colorAgendados)" name="Agendados" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    ) : (
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="areaRealizados" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4caf50" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#4caf50" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="areaAusentes" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ff9800" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#ff9800" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="areaAgendados" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2196f3" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#2196f3" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#666', fontSize: 12 }}
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#666', fontSize: 12 }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: 12, 
                            border: 'none',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                          }}
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: 20 }}
                          iconType="circle"
                        />
                        <Area type="monotone" dataKey="realizados" stroke="#4caf50" fill="url(#areaRealizados)" name="Realizados" strokeWidth={3} />
                        <Area type="monotone" dataKey="ausentes" stroke="#ff9800" fill="url(#areaAusentes)" name="Ausentes" strokeWidth={3} />
                        <Area type="monotone" dataKey="agendados" stroke="#2196f3" fill="url(#areaAgendados)" name="Agendados" strokeWidth={3} />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                )}
              </Paper>
            </>
          )}

          {/* Mensagem orientativa para recepção */}
          {!showDashboard && (
            <Paper
              elevation={0}
              sx={{
                p: 4,
                borderRadius: 3,
                bgcolor: 'white'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar sx={{ bgcolor: '#1E4976', width: 48, height: 48 }}>
                  <AssessmentIcon sx={{ fontSize: 28 }} />
                </Avatar>
                <Typography variant="h6" color="text.secondary" sx={{ height: 48, display: 'flex', alignItems: 'center', mb: 4 }}>
                  Bem-vindo ao Sistema de Agendamentos
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 8 }}>
                Escolha uma opção no menu lateral para começar.
              </Typography>
            </Paper>
          )}
        </Box>
      </Box>
    </>
  );
}
