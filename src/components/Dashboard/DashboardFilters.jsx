import React, { useMemo } from 'react';
import { Paper, Box, Avatar, Typography, FormControl, InputLabel, Select, MenuItem, ToggleButtonGroup, ToggleButton, Grid } from '@mui/material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import FilterListIcon from '@mui/icons-material/FilterList';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

/**
 * Componente de filtros do dashboard
 * Permite filtrar dados por CRAS, entrevistador, período (mensal/anual), mês e ano
 * @param {string} viewMode - Modo de visualização ('mensal' ou 'anual')
 * @param {Function} setViewMode - Função para alterar o modo de visualização
 * @param {number} selectedMonth - Mês selecionado (0-11)
 * @param {Function} setSelectedMonth - Função para alterar o mês
 * @param {number} selectedYear - Ano selecionado
 * @param {Function} setSelectedYear - Função para alterar o ano
 * @param {string} selectedCras - CRAS selecionado (ID ou 'todos')
 * @param {Function} setSelectedCras - Função para alterar o CRAS
 * @param {Array} crasList - Lista de CRAS disponíveis
 * @param {string} selectedEntrevistador - Entrevistador selecionado (ID ou 'todos')
 * @param {Function} setSelectedEntrevistador - Função para alterar o entrevistador
 * @param {Array} entrevistadoresList - Lista de entrevistadores disponíveis
 * @param {boolean} isAdmin - Se o usuário é admin
 */
const DashboardFilters = ({ 
  viewMode, 
  setViewMode, 
  selectedMonth, 
  setSelectedMonth, 
  selectedYear, 
  setSelectedYear,
  selectedCras,
  setSelectedCras,
  crasList,
  selectedEntrevistador,
  setSelectedEntrevistador,
  entrevistadoresList,
  isAdmin
}) => {
  // Memoizar arrays estáticos
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

  const handleCrasChange = (e) => {
    const value = e.target.value;
    if (value === 'todos' || crasList.some(c => c._id === value)) {
      setSelectedCras(value);
      setSelectedEntrevistador('todos');
    }
  };

  const handleEntrevistadorChange = (e) => {
    const value = e.target.value;
    if (value === 'todos' || entrevistadoresList.some(ent => ent._id === value)) {
      setSelectedEntrevistador(value);
    }
  };

  // Filtrar entrevistadores por CRAS selecionado
  const filteredEntrevistadores = useMemo(() => {
    if (!isAdmin) return [];
    
    return entrevistadoresList.filter(ent => {
      if (ent.role !== 'entrevistador') return false;
      if (selectedCras === 'todos') return true;
      
      const entCrasId = typeof ent.cras === 'object' && ent.cras?._id ? ent.cras._id : ent.cras;
      return entCrasId === selectedCras;
    });
  }, [entrevistadoresList, selectedCras, isAdmin]);

  return (
    <Paper 
      elevation={0}
      sx={{ 
        mb: 2,
        borderRadius: '8px 8px 0 0 !important',
        pl: 3,
        bgcolor: 'white'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, verticalAlign: 'middle' }}>
        <Avatar sx={{ bgcolor: '#1E4976', width: 40, height: 40 }}>
          <FilterListIcon />
        </Avatar>
        <Typography variant="h6" fontWeight={600} color="#1E4976" sx={{ height: 40, display: 'flex', alignItems: 'center', mb: 4, p: 0 }}>
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
                onChange={handleCrasChange}
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
                onChange={handleEntrevistadorChange}
                label="Entrevistador"
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="todos">Todos os Entrevistadores</MenuItem>
                {filteredEntrevistadores.map((entrevistador) => (
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
  );
};

export default DashboardFilters;
