/**
 * Controller de Estatísticas
 * Endpoint otimizado para dashboard com agregações MongoDB
 */
import Appointment from '../models/Appointment.js';
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import mongoose from 'mongoose';

/**
 * Busca estatísticas agregadas para o dashboard
 * Usa agregações nativas do MongoDB para performance máxima
 */
export const getDashboardStats = async (req, res) => {
  try {
    const { 
      viewMode, // 'mensal' ou 'anual'
      month, 
      year, 
      entrevistador, 
      cras 
    } = req.query;
    
    // Construir filtro base
    const matchStage = {};
    
    // Filtro por entrevistador - converter para ObjectId
    if (entrevistador) {
      matchStage.entrevistador = new mongoose.Types.ObjectId(entrevistador);
    }
    
    // Filtro por CRAS - converter para ObjectId
    if (cras) {
      matchStage.cras = new mongoose.Types.ObjectId(cras);
    }
    
    // Filtro por período
    const currentYear = parseInt(year) || new Date().getFullYear();
    const currentMonth = month !== undefined ? parseInt(month) : new Date().getMonth();
    
    if (viewMode === 'mensal') {
      // Filtrar por mês específico
      const startDate = startOfMonth(new Date(currentYear, currentMonth, 1));
      const endDate = endOfMonth(new Date(currentYear, currentMonth, 1));
      matchStage.data = { $gte: startDate, $lte: endDate };
    } else {
      // Filtrar por ano completo
      const startDate = startOfYear(new Date(currentYear, 0, 1));
      const endDate = endOfYear(new Date(currentYear, 0, 1));
      matchStage.data = { $gte: startDate, $lte: endDate };
    }
    
    // Pipeline de agregação otimizado
    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $year: '$data' },
            month: { $month: '$data' },
            dayOfMonth: viewMode === 'mensal' ? { $dayOfMonth: '$data' } : null,
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.dayOfMonth': 1 } }
    ];
    
    const results = await Appointment.aggregate(pipeline);
    
    // Formatar resultados
    const formattedData = formatStatsResults(results, viewMode, currentMonth, currentYear);
    
    res.json(formattedData);
    
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ 
      message: 'Erro ao buscar estatísticas do dashboard',
      error: error.message 
    });
  }
};

/**
 * Formata resultados da agregação para o formato do dashboard
 */
function formatStatsResults(results, viewMode, selectedMonth, selectedYear) {
  if (viewMode === 'mensal') {
    return formatWeeklyStats(results, selectedMonth, selectedYear);
  } else {
    return formatMonthlyStats(results, selectedYear);
  }
}

/**
 * Formata estatísticas semanais (para visualização mensal)
 */
function formatWeeklyStats(results, selectedMonth, selectedYear) {
  const weeks = {};
  const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  
  // Inicializar semanas (1 a 5)
  for (let week = 1; week <= 5; week++) {
    weeks[week] = {
      name: `Sem ${week}`,
      realizados: 0,
      ausentes: 0,
      agendados: 0
    };
  }
  
  // Preencher com dados reais usando o dia do mês
  results.forEach(item => {
    if (item._id.month - 1 !== selectedMonth) return;
    
    const dayOfMonth = item._id.dayOfMonth;
    const status = item._id.status;
    const count = item.count;
    
    // Calcular semana do mês baseado no dia: 1-7 = Sem 1, 8-14 = Sem 2, etc
    const week = Math.ceil(dayOfMonth / 7);
    
    if (!weeks[week]) {
      weeks[week] = {
        name: `Sem ${week}`,
        realizados: 0,
        ausentes: 0,
        agendados: 0
      };
    }
    
    if (status === 'realizado') {
      weeks[week].realizados += count;
    } else if (status === 'ausente') {
      weeks[week].ausentes += count;
    } else if (status === 'agendado') {
      weeks[week].agendados += count;
    }
  });
  
  // Calcular totais
  const stats = {
    realizados: 0,
    ausentes: 0,
    agendados: 0,
    total: 0
  };
  
  Object.values(weeks).forEach(week => {
    stats.realizados += week.realizados;
    stats.ausentes += week.ausentes;
    stats.agendados += week.agendados;
  });
  
  stats.total = stats.realizados + stats.ausentes + stats.agendados;
  
  return {
    chartData: Object.values(weeks),
    stats
  };
}

/**
 * Formata estatísticas mensais (para visualização anual)
 */
function formatMonthlyStats(results, selectedYear) {
  const months = {};
  const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  
  // Inicializar todos os meses
  monthNames.forEach((month, index) => {
    months[month] = {
      name: month.charAt(0).toUpperCase() + month.slice(1),
      realizados: 0,
      ausentes: 0,
      agendados: 0
    };
  });
  
  // Preencher com dados reais
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  results.forEach(item => {
    if (item._id.year !== selectedYear) return;
    
    const monthIndex = item._id.month - 1;
    const monthKey = monthNames[monthIndex];
    const status = item._id.status;
    const count = item.count;
    
    if (status === 'realizado') {
      months[monthKey].realizados += count;
    } else if (status === 'ausente') {
      months[monthKey].ausentes += count;
    } else if (status === 'agendado') {
      months[monthKey].agendados += count;
    }
  });
  
  // Calcular totais
  const stats = {
    realizados: 0,
    ausentes: 0,
    agendados: 0,
    total: 0
  };
  
  Object.values(months).forEach(month => {
    stats.realizados += month.realizados;
    stats.ausentes += month.ausentes;
    stats.agendados += month.agendados;
  });
  
  stats.total = stats.realizados + stats.ausentes + stats.agendados;
  
  return {
    chartData: Object.values(months),
    stats
  };
}
