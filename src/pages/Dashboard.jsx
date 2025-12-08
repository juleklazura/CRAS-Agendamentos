// Componente Dashboard - Página inicial do sistema CRAS Agendamentos
// Exibe boas-vindas personalizadas e informações do usuário logado
// Para entrevistadores e admin: exibe gráficos de desempenho com filtros por mês/ano
import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  Grid,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Avatar,
  Chip,
  Paper
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

  // Buscar dados de CRAS (lista para admin e nome do CRAS do usuário) em paralelo
  useEffect(() => {
    async function fetchCrasData() {
      const promises = [];
      
      // Admin precisa da lista de CRAS
      if (isAdmin) {
        promises.push(
          api.get('/cras')
            .then(res => ({ type: 'list', data: res.data || [] }))
            .catch(() => ({ type: 'list', data: [] }))
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
          if (result.type === 'list') setCrasList(result.data);
          if (result.type === 'name') setCrasNome(result.data);
        });
      }
    }
    fetchCrasData();
  }, [isAdmin, user?.cras]);

  // Buscar dados dos gráficos para entrevistadores e admin
  const fetchChartData = useCallback(async () => {
    if (!showDashboard) return;
    
    setLoading(true);
    try {
      // Configurar parâmetros de busca
      const params = {};
      
      if (isEntrevistador) {
        // Entrevistador vê apenas seus próprios agendamentos
        params.entrevistador = user.id;
      } else if (isAdmin) {
        // Admin pode filtrar por CRAS específico ou ver todos
        if (selectedCras !== 'todos') {
          params.cras = selectedCras;
        }
        // Se for 'todos', não enviar parâmetro de cras nem entrevistador
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
            // Conta como agendado se for futuro, senão ignora
            if (new Date(apt.data) > new Date()) {
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
            if (new Date(apt.data) > new Date()) {
              monthData[monthKey].agendados++;
            }
          }
        });
        
        setChartData(Object.values(monthData));
      }

      // Calcular estatísticas totais
      const realizados = appointments.filter(a => a.status === 'realizado').length;
      const ausentes = appointments.filter(a => a.status === 'ausente').length;
      const agendados = appointments.filter(a => 
        a.status === 'agendado' && new Date(a.data) > new Date()
      ).length;

      setStats({
        realizados,
        ausentes,
        agendados,
        total: realizados + ausentes + agendados
      });

    } catch (error) {
      console.error('Erro ao buscar dados do gráfico:', error);
    } finally {
      setLoading(false);
    }
  }, [showDashboard, isEntrevistador, isAdmin, viewMode, selectedMonth, selectedYear, selectedCras, user?.id]);

  useEffect(() => {
    if (showDashboard) {
      fetchChartData();
    }
  }, [showDashboard, fetchChartData]);

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
            sx={{
              p: { xs: 3, md: 4 },
              mb: 4,
              borderRadius: 4,
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
              <Avatar
                sx={{
                  width: 72,
                  height: 72,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)',
                  border: '3px solid rgba(255,255,255,0.3)',
                  fontSize: '1.8rem',
                  fontWeight: 700
                }}
              >
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography 
                  variant="h4" 
                  fontWeight={700}
                  sx={{ 
                    mb: 0.5,
                    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    fontSize: { xs: '1.5rem', md: '2rem' },
                    color: 'white !important'
                  }}
                >
                  Olá, {user?.name?.split(' ')[0] || 'Usuário'}! 👋
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Chip
                    icon={<PersonIcon sx={{ color: 'white !important' }} />}
                    label={user?.role === 'admin' ? 'Administrador' : user?.role === 'entrevistador' ? 'Entrevistador' : 'Recepção'}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      fontWeight: 600,
                      backdropFilter: 'blur(10px)',
                      '& .MuiChip-icon': { color: 'white' }
                    }}
                  />
                  <Chip
                    icon={<BusinessIcon sx={{ color: 'white !important' }} />}
                    label={isAdmin ? 'Todos os CRAS' : crasNome || user?.cras || 'N/A'}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      fontWeight: 600,
                      backdropFilter: 'blur(10px)',
                      '& .MuiChip-icon': { color: 'white' }
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
                sx={{ 
                  display: 'flex',
                  gap: 3,
                  mb: 4,
                  mt:3,
                  maxWidth: 1400, 
                  mx: 'auto',
                  '& > *': {
                    flex: '1 1 0',
                    minWidth: 0,
                    maxWidth: 1400
                  }
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: 140,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 12px 20px rgba(76, 175, 80, 0.3)'
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: -20,
                      right: -20,
                      width: 100,
                      height: 100,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 40, height: 40 }}>
                      <CheckCircleOutlineIcon sx={{ fontSize: 24 }} />
                    </Avatar>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 600, color: 'white' }}>
                      Realizados
                    </Typography>
                  </Box>
                  <Typography variant="h3" fontWeight={700} sx={{ color: 'white !important' }}>
                    {stats.realizados}
                  </Typography>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)',
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: 140,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 12px 20px rgba(255, 152, 0, 0.3)'
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: -20,
                      right: -20,
                      width: 100,
                      height: 100,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 40, height: 40 }}>
                      <EventBusyIcon sx={{ fontSize: 24 }} />
                    </Avatar>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 600, color: 'white' }}>
                      Ausentes
                    </Typography>
                  </Box>
                  <Typography variant="h3" fontWeight={700} sx={{ color: 'white !important' }}>
                    {stats.ausentes}
                  </Typography>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #2196f3 0%, #64b5f6 100%)',
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: 140,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 12px 20px rgba(33, 150, 243, 0.3)'
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: -20,
                      right: -20,
                      width: 100,
                      height: 100,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 40, height: 40 }}>
                      <EventAvailableIcon sx={{ fontSize: 24 }} />
                    </Avatar>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 600, color: 'white !important' }}>
                      Agendados
                    </Typography>
                  </Box>
                  <Typography variant="h3" fontWeight={700} sx={{ color: 'white !important' }}>
                    {stats.agendados}
                  </Typography>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #1E4976 0%, #2d6aa3 100%)',
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: 140,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 12px 20px rgba(30, 73, 118, 0.3)'
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: -20,
                      right: -20,
                      width: 100,
                      height: 100,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 40, height: 40 }}>
                      <AssessmentIcon sx={{ fontSize: 24 }} />
                    </Avatar>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 600, color: 'white' }}>
                      Total
                    </Typography>
                  </Box>
                  <Typography variant="h3" fontWeight={700} sx={{ color: 'white !important'  }}>
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
                    <Grid item xs={12} md={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>CRAS</InputLabel>
                        <Select
                          value={selectedCras}
                          onChange={(e) => setSelectedCras(e.target.value)}
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
                  
                  <Grid item xs={12} md={isAdmin ? 3 : 4}>
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
                    <Grid item xs={12} md={isAdmin ? 3 : 4}>
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
                  
                  <Grid item xs={12} md={isAdmin ? 3 : 4}>
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
