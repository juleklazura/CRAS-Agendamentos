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
  ToggleButtonGroup
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
  ResponsiveContainer
} from 'recharts';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
      >
        <Box sx={{ 
          width: '100%', 
          maxWidth: 1200, 
          mx: 'auto',
          p: 3
        }}>
          {/* Título de boas-vindas */}
          <Typography 
            variant="h4" 
            gutterBottom
            sx={{ color: '#1E4976', mb: 1, textAlign: 'center' }}
          >
            Bem-vindo, {user?.name || 'Usuário'}!
          </Typography>
          
          <Typography variant="body1" sx={{ color: '#1E4976', mb: 0.5, textAlign: 'center' }}>
            Seu papel: <strong>{user?.role === 'admin' ? 'Administrador' : user?.role === 'entrevistador' ? 'Entrevistador' : 'Recepção'}</strong>
          </Typography>
          
          <Typography variant="body1" sx={{ color: '#1E4976', mb: 4, textAlign: 'center' }}>
            {isAdmin ? 'Todos os CRAS' : <>CRAS: <strong>{crasNome || user?.cras || 'N/A'}</strong></>}
          </Typography>

          {/* Gráficos para Entrevistadores e Admin */}
          {showDashboard && (
            <>
              {/* Controles de filtro */}
              <Card 
              elevation={3}
              sx={{ 
                mb: 4,
                borderRadius: 3,
                overflow: 'hidden',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography 
                  variant="h6" 
                  gutterBottom 
                  fontWeight={600}
                  color="#1E4976"
                  sx={{ mb: 3 }}
                >
                  🔍 Filtros
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  {/* Filtro de CRAS - apenas para admin */}
                  {isAdmin && (
                    <Grid item xs={12} md={3}>
                      <FormControl fullWidth>
                        <InputLabel>CRAS</InputLabel>
                        <Select
                          value={selectedCras}
                          onChange={(e) => setSelectedCras(e.target.value)}
                          label="CRAS"
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
                    >
                      <ToggleButton value="mensal">Mensal</ToggleButton>
                      <ToggleButton value="anual">Anual</ToggleButton>
                    </ToggleButtonGroup>
                  </Grid>
                  
                  {viewMode === 'mensal' && (
                    <Grid item xs={12} md={isAdmin ? 3 : 4}>
                      <FormControl fullWidth>
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
                    <FormControl fullWidth>
                      <InputLabel>Ano</InputLabel>
                      <Select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        label="Ano"
                      >
                        {yearOptions.map(year => (
                          <MenuItem key={year} value={year}>{year}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Cards de Estatísticas */}
            <Card
              elevation={3}
              sx={{ 
                my: 4,
                borderRadius: 3,
                overflow: 'hidden',
                width: '100%',
                boxSizing: 'border-box',
                bgcolor: 'transparent',
                boxShadow: 'none'
              }}
            >
              <Box sx={{ display: 'flex', gap: 4 }}>
                <Card 
                  elevation={3}
                  sx={{ 
                    bgcolor: '#e8f5e9',
                    flex: 1,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 6
                    }
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <Typography 
                      variant="subtitle2" 
                      color="success.main" 
                      fontWeight={600}
                      sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.75rem' }}
                    >
                      Realizados
                    </Typography>
                    <Typography 
                      variant="h3" 
                      color="success.dark"
                      fontWeight="bold"
                    >
                      {stats.realizados}
                    </Typography>
                  </CardContent>
                </Card>

                <Card 
                  elevation={3}
                  sx={{ 
                    bgcolor: '#fff9c4',
                    flex: 1,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 6
                    }
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <Typography 
                      variant="subtitle2" 
                      color="warning.main" 
                      fontWeight={600}
                      sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.75rem' }}
                    >
                      Ausentes
                    </Typography>
                    <Typography 
                      variant="h3" 
                      color="warning.dark"
                      fontWeight="bold"
                    >
                      {stats.ausentes}
                    </Typography>
                  </CardContent>
                </Card>

                <Card 
                  elevation={3}
                  sx={{ 
                    bgcolor: '#e3f2fd',
                    flex: 1,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 6
                    }
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <Typography 
                      variant="subtitle2" 
                      color="primary.main" 
                      fontWeight={600}
                      sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.75rem' }}
                    >
                      Agendados
                    </Typography>
                    <Typography 
                      variant="h3" 
                      color="primary.dark"
                      fontWeight="bold"
                    >
                      {stats.agendados}
                    </Typography>
                  </CardContent>
                </Card>

                <Card 
                  elevation={3}
                  sx={{ 
                    bgcolor: '#1E4976',
                    flex: 1,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 6
                    }
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <Typography 
                      variant="subtitle2" 
                      color="white" 
                      fontWeight={600}
                      sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.75rem' }}
                    >
                      Total
                    </Typography>
                    <Typography 
                      variant="h3" 
                      color="white"
                      fontWeight="bold"
                    >
                      {stats.total}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Card>

            {/* Gráfico */}
            <Card 
              elevation={4}
              sx={{ 
                borderRadius: 3,
                overflow: 'hidden',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Typography 
                  variant="h5" 
                  gutterBottom 
                  fontWeight={600}
                  color="#1E4976"
                  sx={{ mb: 3 }}
                >
                  {viewMode === 'mensal' ? '📊 Desempenho Semanal' : '📈 Evolução Anual'}
                </Typography>
                
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                    <CircularProgress size={60} />
                  </Box>
                ) : chartData.length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                    <Typography variant="h6" color="text.secondary">
                      Nenhum dado disponível para o período selecionado
                    </Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    {viewMode === 'mensal' ? (
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="realizados" fill="#4caf50" name="Realizados" />
                        <Bar dataKey="ausentes" fill="#ff9800" name="Ausentes" />
                        <Bar dataKey="agendados" fill="#2196f3" name="Agendados" />
                      </BarChart>
                    ) : (
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="realizados" stroke="#4caf50" name="Realizados" strokeWidth={2} />
                        <Line type="monotone" dataKey="ausentes" stroke="#ff9800" name="Ausentes" strokeWidth={2} />
                        <Line type="monotone" dataKey="agendados" stroke="#2196f3" name="Agendados" strokeWidth={2} />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Mensagem orientativa para recepção */}
        {!showDashboard && (
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ mt: 3, textAlign: 'center' }}
          >
            Escolha uma opção no menu lateral para começar.
          </Typography>
        )}
        </Box>
      </Box>
    </>
  );
}
