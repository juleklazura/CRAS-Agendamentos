// =============================================================================
// SCHEDULER DE PURGA AUTOMÁTICA — LGPD (Lei 13.709/2018)
// =============================================================================
// Executa diariamente às PURGE_HOUR (padrão: 3 AM) a remoção de agendamentos,
// bloqueios de horário e logs de auditoria que ultrapassaram o prazo de retenção.
//
// Fundamentos legais:
//   - Art. 6º, III (necessidade): limitação ao mínimo necessário
//   - Art. 15: término do tratamento quando a finalidade for alcançada
//   - Art. 16: eliminação dos dados após o término do tratamento
//
// Integrado ao server.js via startPurgeScheduler().
// O script scripts/purgeOldAppointments.js permanece para execução manual/CLI.
// =============================================================================

import { subYears } from 'date-fns';
import prisma from './prisma.js';
import logger from './logger.js';

// ─── Configuração ─────────────────────────────────────────────────────────────

/** Prazo de retenção de agendamentos e bloqueios de horário. */
const RETENTION_YEARS = parseInt(process.env.PURGE_RETENTION_YEARS ?? '2', 10);

/** Prazo de retenção de logs de auditoria (CGU + LGPD para órgão público). */
const LOG_RETENTION_YEARS = parseInt(process.env.PURGE_LOG_RETENTION_YEARS ?? '5', 10);

/** Hora do dia (0-23) em que a purga é executada automaticamente. */
const PURGE_HOUR = parseInt(process.env.PURGE_HOUR ?? '3', 10);

/** Intervalo de verificação: a cada 1 hora (sem depender de node-cron). */
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

// ─── Core: lógica de purga ────────────────────────────────────────────────────

/**
 * Executa a purga de dados antigos conforme LGPD.
 * Idempotente: se não houver dados para purgar, retorna sem efeito.
 *
 * @returns {Promise<object|null>} Estatísticas da purga ou null se nada foi feito.
 */
export async function runPurge() {
  const cutoff = subYears(new Date(), RETENTION_YEARS);
  const logCutoff = subYears(new Date(), LOG_RETENTION_YEARS);

  logger.info('[purge] Iniciando purga automática LGPD', {
    retencaoAgendamentos: `${RETENTION_YEARS} anos`,
    retencaoLogs: `${LOG_RETENTION_YEARS} anos`,
    corteAgendamentos: cutoff.toISOString().split('T')[0],
    corteLogs: logCutoff.toISOString().split('T')[0],
  });

  try {
    // ── 1. Contagem prévia (sem I/O desnecessário) ──
    const [appointmentCount, blockedSlotCount, logCount] = await Promise.all([
      prisma.appointment.count({ where: { data: { lt: cutoff } } }),
      prisma.blockedSlot.count({ where: { data: { lt: cutoff } } }),
      prisma.log.count({ where: { date: { lt: logCutoff } } }),
    ]);

    // Usuários desativados sem agendamentos: Art. 15/16 LGPD — anonimizar
    const inactiveUsers = await prisma.user.findMany({
      where: { ativo: false, appointments: { none: {} } },
      select: { id: true },
    });

    const total = appointmentCount + blockedSlotCount + logCount + inactiveUsers.length;

    if (total === 0) {
      logger.info('[purge] Nenhum dado fora do prazo de retenção encontrado. Purga encerrada.');
      return null;
    }

    logger.info('[purge] Dados identificados para purga', {
      agendamentos: appointmentCount,
      bloqueios: blockedSlotCount,
      logs: logCount,
      usuariosAnonimizar: inactiveUsers.length,
    });

    // ── 2. Purga em transação ──
    const result = await prisma.$transaction(async (tx) => {
      const deletedAppointments = await tx.appointment.deleteMany({
        where: { data: { lt: cutoff } },
      });

      const deletedBlockedSlots = await tx.blockedSlot.deleteMany({
        where: { data: { lt: cutoff } },
      });

      // Logs usam prazo maior (logRetentionYears — documentos de conformidade)
      const deletedLogs = await tx.log.deleteMany({
        where: { date: { lt: logCutoff } },
      });

      // Anonimizar usuários desativados sem agendamentos (Arts. 15/16 LGPD).
      // Atualização individual: matrícula é unique, não suporta updateMany com valor único.
      let anonymizedUsers = 0;
      for (const u of inactiveUsers) {
        await tx.user.update({
          where: { id: u.id },
          data: {
            name: '[Anonimizado]',
            // Prefixo fixo + slice do ID garante unicidade sem expor dados pessoais
            matricula: `anon_${u.id.slice(0, 12)}`,
          },
        });
        anonymizedUsers++;
      }

      return {
        appointments: deletedAppointments.count,
        blockedSlots: deletedBlockedSlots.count,
        logs: deletedLogs.count,
        anonymizedUsers,
      };
    });

    // ── 3. Log de auditoria imutável ──
    const admin = await prisma.user.findFirst({
      where: { role: 'admin' },
      select: { id: true },
    });

    if (admin) {
      await prisma.log.create({
        data: {
          userId: admin.id,
          action: 'PURGA_LGPD',
          details: JSON.stringify({
            tipo: 'purga_automatica_lgpd',
            prazoRetencaoAnos: RETENTION_YEARS,
            prazoRetencaoLogsAnos: LOG_RETENTION_YEARS,
            dataCorte: cutoff.toISOString().split('T')[0],
            dataCorteLog: logCutoff.toISOString().split('T')[0],
            registros: result,
          }),
        },
      });
    }

    logger.info('[purge] Purga LGPD concluída com sucesso', result);
    return result;
  } catch (err) {
    // Transação é revertida automaticamente pelo Prisma em caso de erro
    logger.error('[purge] Falha na purga automática — nenhum dado foi excluído', {
      error: err.message,
    });
    return null;
  }
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

let _purgeTimer = null;

/**
 * Data da última execução (YYYY-MM-DD, horário do servidor).
 * Em memória: o processo reiniciado volta a executar na próxima janela >= PURGE_HOUR,
 * o que é seguro pois a purga é idempotente.
 */
let _lastRunDate = null;

const _tick = async () => {
  const now = new Date();
  const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

  // Executa se: passou do horário alvo E ainda não rodou hoje
  if (now.getHours() >= PURGE_HOUR && _lastRunDate !== today) {
    _lastRunDate = today;
    await runPurge();
  }
};

/**
 * Inicia o scheduler de purga automática.
 * Deve ser chamado uma única vez, após a conexão com o banco ser estabelecida.
 *
 * Verifica a cada hora se é o momento de executar.
 * Se já passou das PURGE_HOUR no dia atual, roda imediatamente na inicialização.
 */
export function startPurgeScheduler() {
  if (_purgeTimer) return; // Idempotente: não registra dois timers

  // Verifica imediatamente na inicialização (cobre restarts após as PURGE_HOUR)
  _tick().catch((err) =>
    logger.error('[purge] Erro na verificação inicial', { error: err.message })
  );

  _purgeTimer = setInterval(
    () => _tick().catch((err) =>
      logger.error('[purge] Erro no tick do scheduler', { error: err.message })
    ),
    CHECK_INTERVAL_MS
  );

  // Permite que o processo encerre sem aguardar o intervalo (mesmo padrão do tokenBlacklist)
  if (_purgeTimer.unref) _purgeTimer.unref();

  logger.info(
    `[purge] Scheduler LGPD iniciado — purga diária às ${PURGE_HOUR}h ` +
    `(retenção: ${RETENTION_YEARS} anos para agendamentos, ${LOG_RETENTION_YEARS} anos para logs)`
  );
}
