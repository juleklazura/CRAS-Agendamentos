/**
 * Controller de Estatísticas
 * Endpoint otimizado para dashboard com queries SQL nativas
 */
import prisma from '../utils/prisma.js';
import pkg from '@prisma/client';
const { Prisma } = pkg;
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { apiSuccess, apiError } from '../utils/apiResponse.js';
import cache from '../utils/cache.js';
import logger from '../utils/logger.js';

// =============================================================================
// HELPERS DE QUERY SQL AGREGADA
// =============================================================================

/**
 * Constrói fragmentos Prisma.Sql WHERE a partir do objeto where.
 * where.data é sempre definido antes de chamar esta função.
 */
function buildWhereConditions(where) {
  const parts = [];
  if (where.data?.gte) parts.push(Prisma.sql`data >= ${where.data.gte}`);
  if (where.data?.lte) parts.push(Prisma.sql`data <= ${where.data.lte}`);
  if (typeof where.entrevistadorId === 'string') {
    parts.push(Prisma.sql`entrevistador_id = ${where.entrevistadorId}`);
  } else if (Array.isArray(where.entrevistadorId?.in)) {
    parts.push(Prisma.sql`entrevistador_id = ANY(${where.entrevistadorId.in})`);
  }
  if (where.crasId) {
    parts.push(Prisma.sql`cras_id = ${where.crasId}`);
  }
  return parts;
}

/**
 * Chart data para view mensal — agrupa por semana (1–5) no banco.
 * AT TIME ZONE garante bucket correto no fuso de Brasília.
 */
async function fetchWeeklyChartData(where) {
  const conditions = buildWhereConditions(where);
  const whereClause = Prisma.join(conditions, ' AND ');

  const rows = await prisma.$queryRaw`
    SELECT
      LEAST(CEIL(EXTRACT(DAY FROM data AT TIME ZONE 'America/Sao_Paulo') / 7.0), 5)::int AS semana,
      status::text,
      COUNT(*)::int AS total
    FROM appointments
    WHERE ${whereClause}
    GROUP BY 1, 2
    ORDER BY 1
  `;

  const weeks = Array.from({ length: 5 }, (_, i) => ({
    name: `Sem ${i + 1}`,
    realizados: 0,
    ausentes: 0,
    agendados: 0,
  }));

  for (const row of rows) {
    const idx = row.semana - 1;
    if (idx < 0 || idx > 4) continue;
    if (row.status === 'realizado') weeks[idx].realizados = row.total;
    else if (row.status === 'ausente') weeks[idx].ausentes = row.total;
    else if (row.status === 'agendado') weeks[idx].agendados = row.total;
  }

  return weeks;
}

/**
 * Chart data para view anual — agrupa por mês no banco.
 */
async function fetchMonthlyChartData(where) {
  const conditions = buildWhereConditions(where);
  const whereClause = Prisma.join(conditions, ' AND ');

  const rows = await prisma.$queryRaw`
    SELECT
      EXTRACT(MONTH FROM data AT TIME ZONE 'America/Sao_Paulo')::int AS mes,
      status::text,
      COUNT(*)::int AS total
    FROM appointments
    WHERE ${whereClause}
    GROUP BY 1, 2
    ORDER BY 1
  `;

  const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const months = MONTH_NAMES.map((name) => ({ name, realizados: 0, ausentes: 0, agendados: 0 }));

  for (const row of rows) {
    const idx = row.mes - 1;
    if (idx < 0 || idx > 11) continue;
    if (row.status === 'realizado') months[idx].realizados = row.total;
    else if (row.status === 'ausente') months[idx].ausentes = row.total;
    else if (row.status === 'agendado') months[idx].agendados = row.total;
  }

  return months;
}

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

    // Escopo por role: impede IDOR (acesso a dados de outros CRAS).
    // Admin vê todos; entrevistador vê apenas a si; outros veem o próprio CRAS.
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

    // Chave de cache com escopo por role+identidade para evitar cache poisoning cross-user.
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
        // Executa aggregação de totais e chart data em paralelo (queries independentes)
        const [statusGroups, chartData] = await Promise.all([
          prisma.appointment.groupBy({
            by: ['status'],
            where,
            _count: { _all: true },
          }),
          viewMode === 'mensal'
            ? fetchWeeklyChartData(where)
            : fetchMonthlyChartData(where),
        ]);

        const stats = { realizados: 0, ausentes: 0, agendados: 0, total: 0 };
        for (const g of statusGroups) {
          if (g.status === 'realizado') stats.realizados = g._count._all;
          else if (g.status === 'ausente') stats.ausentes = g._count._all;
          else if (g.status === 'agendado') stats.agendados = g._count._all;
        }
        stats.total = stats.realizados + stats.ausentes + stats.agendados;

        return { chartData, stats };
      },
      300
    );

    apiSuccess(res, formattedData);
  } catch (error) {
    logger.error('Erro ao buscar estatísticas do dashboard', error);
    apiError(res, 'Erro ao buscar estatísticas do dashboard', 500);
  }
};
