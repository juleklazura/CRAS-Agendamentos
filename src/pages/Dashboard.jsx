// Componente Dashboard - Página inicial do sistema CRAS Agendamentos
// Exibe boas-vindas personalizadas e informações do usuário logado
// Para entrevistadores e admin: exibe gráficos de desempenho com filtros por mês/ano
import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useDashboardData } from '../hooks/useDashboardData';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import DashboardHeader from '../components/Dashboard/DashboardHeader';
import DashboardFilters from '../components/Dashboard/DashboardFilters';
import DashboardChart from '../components/Dashboard/DashboardChart';
import StatCard from '../components/Dashboard/StatCard';
import { Box, Typography, Avatar, Paper } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import AssessmentIcon from '@mui/icons-material/Assessment';

// Configuração dos cards de estatísticas
const statsConfig = [
  { 
    key: 'realizados', 
    title: 'Realizados', 
    icon: CheckCircleOutlineIcon, 
    gradientColors: ['#4caf50', '#66bb6a'], 
    shadowColor: 'rgba(76, 175, 80, 0.3)' 
  },
  { 
    key: 'ausentes', 
    title: 'Ausentes', 
    icon: EventBusyIcon, 
    gradientColors: ['#ff9800', '#ffb74d'], 
    shadowColor: 'rgba(255, 152, 0, 0.3)' 
  },
  { 
    key: 'agendados', 
    title: 'Agendados', 
    icon: EventAvailableIcon, 
    gradientColors: ['#2196f3', '#64b5f6'], 
    shadowColor: 'rgba(33, 150, 243, 0.3)' 
  },
  { 
    key: 'total', 
    title: 'Total', 
    icon: AssessmentIcon, 
    gradientColors: ['#1E4976', '#2d6aa3'], 
    shadowColor: 'rgba(30, 73, 118, 0.3)' 
  }
];

/**
 * Componente principal do dashboard
 * Recepção: Boas-vindas simples
 * Entrevistador: Gráficos de desempenho com estatísticas do próprio usuário
 * Admin: Gráficos de desempenho com estatísticas por CRAS (todos os CRAS)
 */
export default function Dashboard() {
  const { user } = useAuth();
  const [crasNome, setCrasNome] = useState('');
  
  // Estados para filtros
  const [viewMode, setViewMode] = useState('mensal');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedCras, setSelectedCras] = useState('todos');
  const [crasList, setCrasList] = useState([]);
  const [selectedEntrevistador, setSelectedEntrevistador] = useState('todos');
  const [entrevistadoresList, setEntrevistadoresList] = useState([]);

  const isEntrevistador = user?.role === 'entrevistador';
  const isAdmin = user?.role === 'admin';
  const showDashboard = isEntrevistador || isAdmin;

  // Hook customizado para gerenciar dados do dashboard
  const { chartData, stats, loading } = useDashboardData({
    user,
    viewMode,
    selectedMonth,
    selectedYear,
    selectedCras,
    selectedEntrevistador,
    crasList,
    entrevistadoresList
  });

  // Buscar dados de CRAS e entrevistadores (lista para admin e nome do CRAS do usuário) em paralelo
  useEffect(() => {
    if (!user) return;
    
    async function fetchCrasData() {
      const promises = [];
      
      if (isAdmin) {
        promises.push(
          api.get('/cras')
            .then(res => ({ type: 'crasList', data: res.data || [] }))
            .catch(() => ({ type: 'crasList', data: [] }))
        );
        promises.push(
          api.get('/users')
            .then(res => {
              const entrevistadores = (res.data || []).filter(u => u.role === 'entrevistador');
              return { type: 'entrevistadores', data: entrevistadores };
            })
            .catch(() => ({ type: 'entrevistadores', data: [] }))
        );
      }
      
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
          <DashboardHeader 
            user={user} 
            crasNome={crasNome} 
            isAdmin={isAdmin} 
            showDashboard={showDashboard} 
          />

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
                {statsConfig.map(config => (
                  <StatCard 
                    key={config.key}
                    title={config.title}
                    value={stats[config.key]}
                    icon={config.icon}
                    gradientColors={config.gradientColors}
                    shadowColor={config.shadowColor}
                  />
                ))}
              </Box>

              {/* Controles de filtro */}
              <DashboardFilters 
                viewMode={viewMode}
                setViewMode={setViewMode}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                selectedCras={selectedCras}
                setSelectedCras={setSelectedCras}
                crasList={crasList}
                selectedEntrevistador={selectedEntrevistador}
                setSelectedEntrevistador={setSelectedEntrevistador}
                entrevistadoresList={entrevistadoresList}
                isAdmin={isAdmin}
              />

              {/* Gráfico */}
              <DashboardChart 
                data={chartData}
                loading={loading}
                viewMode={viewMode}
              />
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
