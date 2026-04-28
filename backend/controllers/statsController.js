/**
 * Controller de Estatísticas
 * Endpoint otimizado para dashboard com queries SQL nativas
 */
import prisma from '../utils/prisma.js';
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { apiSuccess, apiError } from '../utils/apiResponse.js';
import cache from '../utils/cache.js';
import logger from '../utils/logger.js';

/**
 * Busca estatísticas agregadas para o dashboard
 * Usa queries SQL nativas do PostgreSQL para performance máxima
 */
export const getDashboardStats = async (req, res) => {
  try {
    const {
      viewMode, // 'mensal' ou 'anual'
      month,
      year,
      entrevistador,
      cras,
    } = req.query;

    const actor = req.user;

    // 🔒 SEGURANÇA: Escopo por role — impede IDOR (acesso a dados de outros)
    const where = {};

    if (actor.role === 'entrevistador') {
      // Entrevistador só vê as próprias estatísticas — ignora filtros externos
      where.entrevistadorId = actor.id;
    } else if (actor.role === 'recepcao') {
      // Recepção só vê dados do próprio CRAS
      where.crasId = actor.cras;
      if (entrevistador) {
        // Garante que o entrevistador filtrado pertence ao CRAS da recepção
        const entrevistadorDoc = await prisma.user.findUnique({
          where: { id: entrevistador },
          select: { crasId: true },
        });
        if (!entrevistadorDoc || entrevistadorDoc.crasId !== actor.cras) {
          return apiError(res, 'Você não tem permissão para ver estatísticas deste entrevistador', 403);
        }
        where.entrevistadorId = entrevistador;
      }
    } else if (actor.role === 'admin') {
      // Admin pode filtrar livremente
      if (entrevistador) where.entrevistadorId = entrevistador;
      if (cras) where.crasId = cras;
    }

    // Filtro por período
    const currentYear = parseInt(year) || new Date().getFullYear();
    const currentMonth = month !== undefined ? parseInt(month) : new Date().getMonth();

    if (viewMode === 'mensal') {
      const startDate = startOfMonth(new Date(currentYear, currentMonth, 1));
      const endDate = endOfMonth(new Date(currentYear, currentMonth, 1));
      where.data = { gte: startDate, lte: endDate };
    } else {
      const startDate = startOfYear(new Date(currentYear, 0, 1));
      const endDate = endOfYear(new Date(currentYear, 0, 1));
      where.data = { gte: startDate, lte: endDate };
    }

    // 🔒 Chave de cache com escopo por role+identidade para evitar cache poisoning cross-user.
    // Cada usuário/CRAS tem uma chave isolada; dados de um nunca vazam para outro.
    let cacheKey;
    if (actor.role === 'entrevistador') {
      // Entrevistador só acessa os próprios dados — escopo pelo id do ator
      cacheKey = `stats:dashboard:${viewMode}:user:${actor.id}:${currentYear}:${currentMonth}`;
    } else if (actor.role === 'recepcao') {
      // Recepção é escopada ao CRAS; pode filtrar por entrevistador dentro dele
      cacheKey = `stats:dashboard:${viewMode}:cras:${actor.cras}:${entrevistador || 'all'}:${currentYear}:${currentMonth}`;
    } else {
      // Admin: usa os filtros externos como discriminadores
      cacheKey = `stats:dashboard:${viewMode}:admin:${entrevistador || 'all'}:${cras || 'all'}:${currentYear}:${currentMonth}`;
    }

    const formattedData = await cache.cached(
      cacheKey,
      async () => {
        // Buscar agendamentos agrupados
        const appointments = await prisma.appointment.findMany({
          where,
          select: {
            data: true,
            status: true,
          },
        });

        return formatStatsResults(appointments, viewMode, currentMonth, currentYear);
      },
      300
    );

    apiSuccess(res, formattedData);
  } catch (error) {
    logger.error('Erro ao buscar estatísticas do dashboard', error);
    apiError(res, 'Erro ao buscar estatísticas do dashboard', 500);
  }
};

/**
 * Formata resultados para o formato do dashboard
 */
function formatStatsResults(appointments, viewMode, selectedMonth, selectedYear) {
  if (viewMode === 'mensal') {
    return formatWeeklyStats(appointments, selectedMonth, selectedYear);
  } else {
    return formatMonthlyStats(appointments, selectedYear);
  }
}

/**
 * Formata estatísticas semanais (para visualização mensal)
 */
function formatWeeklyStats(appointments, selectedMonth, selectedYear) {
  const weeks = {};

  // Inicializar semanas (1 a 5)
  for (let week = 1; week <= 5; week++) {
    weeks[week] = {
      name: `Sem ${week}`,
      realizados: 0,
      ausentes: 0,
      agendados: 0,
    };
  }

  // Preencher com dados reais
  appointments.forEach((item) => {
    const date = new Date(item.data);
    if (date.getMonth() !== selectedMonth) return;

    const dayOfMonth = date.getDate();
    const status = item.status;

    const week = Math.ceil(dayOfMonth / 7);

    if (!weeks[week]) {
      weeks[week] = {
        name: `Sem ${week}`,
        realizados: 0,
        ausentes: 0,
        agendados: 0,
      };
    }

    if (status === 'realizado') {
      weeks[week].realizados += 1;
    } else if (status === 'ausente') {
      weeks[week].ausentes += 1;
    } else if (status === 'agendado') {
      weeks[week].agendados += 1;
    }
  });

  // Calcular totais
  const stats = { realizados: 0, ausentes: 0, agendados: 0, total: 0 };

  Object.values(weeks).forEach((week) => {
    stats.realizados += week.realizados;
    stats.ausentes += week.ausentes;
    stats.agendados += week.agendados;
  });

  stats.total = stats.realizados + stats.ausentes + stats.agendados;

  return { chartData: Object.values(weeks), stats };
}

/**
 * Formata estatísticas mensais (para visualização anual)
 */
function formatMonthlyStats(appointments, selectedYear) {
  const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const months = {};

  monthNames.forEach((month) => {
    months[month] = {
      name: month.charAt(0).toUpperCase() + month.slice(1),
      realizados: 0,
      ausentes: 0,
      agendados: 0,
    };
  });

  appointments.forEach((item) => {
    const date = new Date(item.data);
    if (date.getFullYear() !== selectedYear) return;

    const monthIndex = date.getMonth();
    const monthKey = monthNames[monthIndex];
    const status = item.status;

    if (status === 'realizado') {
      months[monthKey].realizados += 1;
    } else if (status === 'ausente') {
      months[monthKey].ausentes += 1;
    } else if (status === 'agendado') {
      months[monthKey].agendados += 1;
    }
  });

  // Calcular totais
  const stats = { realizados: 0, ausentes: 0, agendados: 0, total: 0 };

  Object.values(months).forEach((month) => {
    stats.realizados += month.realizados;
    stats.ausentes += month.ausentes;
    stats.agendados += month.agendados;
  });

  stats.total = stats.realizados + stats.ausentes + stats.agendados;

  return { chartData: Object.values(months), stats };
}
