import React from 'react';
import { Paper, Box, Avatar, Typography, Chip, CircularProgress } from '@mui/material';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssessmentIcon from '@mui/icons-material/Assessment';

/**
 * Componente de gráfico do dashboard
 * Exibe gráfico de barras (mensal) ou área (anual) com estatísticas de agendamentos
 * @param {Array} data - Dados do gráfico
 * @param {boolean} loading - Se está carregando dados
 * @param {string} viewMode - Modo de visualização ('mensal' ou 'anual')
 */
const DashboardChart = ({ data, loading, viewMode }) => {
  return (
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
        {!loading && data.length > 0 && (
          <Chip 
            label={`${data.length} ${viewMode === 'mensal' ? 'semanas' : 'meses'}`}
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
      ) : data.length === 0 ? (
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
            <BarChart data={data} barCategoryGap="20%">
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
            <AreaChart data={data}>
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
  );
};

export default DashboardChart;
