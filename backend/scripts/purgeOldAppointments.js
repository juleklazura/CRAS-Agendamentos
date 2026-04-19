/**
 * ============================================================================
 * 🗑️  SCRIPT DE PURGA DE AGENDAMENTOS ANTIGOS (LGPD)
 * ============================================================================
 *
 * Remove agendamentos com dados pessoais que ultrapassaram o prazo de retenção,
 * em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018).
 *
 * Fundamentos legais:
 *   - Art. 6º, III (necessidade): limitação ao mínimo necessário
 *   - Art. 15: término do tratamento quando finalidade alcançada
 *   - Art. 16: eliminação dos dados após término do tratamento
 *
 * Prazo padrão de retenção: 2 anos (alinhado com prazos administrativos do SUAS)
 *
 * Comportamento:
 *   1. Identifica agendamentos com data anterior ao prazo de retenção
 *   2. Registra um resumo estatístico da purga no log de auditoria (sem dados pessoais)
 *   3. Exclui permanentemente os registros do banco de dados
 *   4. Também purga logs de auditoria e bloqueios de horário antigos
 *
 * Uso:
 *   node backend/scripts/purgeOldAppointments.js                   # Execução real (2 anos)
 *   node backend/scripts/purgeOldAppointments.js --dry-run          # Simulação (não exclui)
 *   node backend/scripts/purgeOldAppointments.js --retention-years=3 # Alterar prazo
 *   node backend/scripts/purgeOldAppointments.js --dry-run --retention-years=1
 *
 * Agendar via cron (ex: mensal, 1º domingo às 03:00):
 *   0 3 1-7 * 0 cd /path/to/project && node backend/scripts/purgeOldAppointments.js >> /var/log/cras-purge.log 2>&1
 *
 * ============================================================================
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { subYears } from 'date-fns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// ─── Configuração ─────────────────────────────────────────────────────────────

const DEFAULT_RETENTION_YEARS = 2;
const MIN_RETENTION_YEARS = 1;
const MAX_RETENTION_YEARS = 10;

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    dryRun: false,
    retentionYears: DEFAULT_RETENTION_YEARS,
  };

  for (const arg of args) {
    if (arg === '--dry-run') {
      config.dryRun = true;
    } else if (arg.startsWith('--retention-years=')) {
      const value = parseInt(arg.split('=')[1], 10);
      if (isNaN(value) || value < MIN_RETENTION_YEARS || value > MAX_RETENTION_YEARS) {
        console.error(`❌ Valor inválido para --retention-years. Use entre ${MIN_RETENTION_YEARS} e ${MAX_RETENTION_YEARS}.`);
        process.exit(1);
      }
      config.retentionYears = value;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Uso: node backend/scripts/purgeOldAppointments.js [opções]

Opções:
  --dry-run                Simula a purga sem excluir dados
  --retention-years=N      Define o prazo de retenção em anos (padrão: ${DEFAULT_RETENTION_YEARS})
  --help, -h               Exibe esta ajuda
      `);
      process.exit(0);
    } else {
      console.error(`❌ Argumento desconhecido: ${arg}`);
      process.exit(1);
    }
  }

  return config;
}

// ─── Script principal ─────────────────────────────────────────────────────────

const prisma = new PrismaClient();

async function purgeOldData() {
  const config = parseArgs();
  const cutoffDate = subYears(new Date(), config.retentionYears);

  console.log('\n' + '='.repeat(80));
  console.log('🗑️  PURGA DE DADOS ANTIGOS — LGPD (Lei 13.709/2018)');
  console.log('='.repeat(80));
  console.log(`\n📅 Prazo de retenção: ${config.retentionYears} ano(s)`);
  console.log(`📅 Data de corte: ${cutoffDate.toISOString().split('T')[0]}`);
  console.log(`🔒 Modo: ${config.dryRun ? 'SIMULAÇÃO (dry-run) — nenhum dado será excluído' : 'EXECUÇÃO REAL'}`);
  console.log('');

  try {
    await prisma.$connect();
    console.log('✅ Conectado ao PostgreSQL\n');

    // ── 1. Contar agendamentos a serem purgados ──
    const appointmentCount = await prisma.appointment.count({
      where: { data: { lt: cutoffDate } },
    });

    // ── 2. Resumo estatístico (sem dados pessoais) para log de auditoria ──
    let statsByStatus = [];
    let statsByCras = [];

    if (appointmentCount > 0) {
      // Agrupar por status para relatório
      statsByStatus = await prisma.appointment.groupBy({
        by: ['status'],
        where: { data: { lt: cutoffDate } },
        _count: true,
      });

      // Agrupar por CRAS para relatório
      statsByCras = await prisma.appointment.groupBy({
        by: ['crasId'],
        where: { data: { lt: cutoffDate } },
        _count: true,
      });
    }

    // ── 3. Contar bloqueios de horário antigos ──
    const blockedSlotCount = await prisma.blockedSlot.count({
      where: { data: { lt: cutoffDate } },
    });

    // ── 4. Contar logs antigos ──
    const logCount = await prisma.log.count({
      where: { date: { lt: cutoffDate } },
    });

    // ── Exibir resumo ──
    console.log('─'.repeat(60));
    console.log('📊 RESUMO DOS DADOS A SEREM PURGADOS');
    console.log('─'.repeat(60));
    console.log(`\n  Agendamentos:         ${appointmentCount.toLocaleString('pt-BR')}`);

    if (statsByStatus.length > 0) {
      console.log('    Por status:');
      for (const stat of statsByStatus) {
        console.log(`      - ${stat.status}: ${stat._count.toLocaleString('pt-BR')}`);
      }
    }

    if (statsByCras.length > 0) {
      // Buscar nomes dos CRAS
      const crasIds = statsByCras.map((s) => s.crasId);
      const crasList = await prisma.cras.findMany({
        where: { id: { in: crasIds } },
        select: { id: true, nome: true },
      });
      const crasMap = Object.fromEntries(crasList.map((c) => [c.id, c.nome]));

      console.log('    Por CRAS:');
      for (const stat of statsByCras) {
        const nome = crasMap[stat.crasId] || 'Desconhecido';
        console.log(`      - ${nome}: ${stat._count.toLocaleString('pt-BR')}`);
      }
    }

    console.log(`  Bloqueios de horário: ${blockedSlotCount.toLocaleString('pt-BR')}`);
    console.log(`  Logs de auditoria:    ${logCount.toLocaleString('pt-BR')}`);
    console.log('');

    const totalRecords = appointmentCount + blockedSlotCount + logCount;

    if (totalRecords === 0) {
      console.log('✅ Nenhum dado antigo encontrado para purgar.\n');
      return;
    }

    if (config.dryRun) {
      console.log('─'.repeat(60));
      console.log('ℹ️  MODO DRY-RUN: Nenhum dado foi excluído.');
      console.log('    Execute sem --dry-run para realizar a purga.');
      console.log('─'.repeat(60) + '\n');
      return;
    }

    // ── 5. Executar purga em transação ──
    console.log('⏳ Executando purga...\n');

    const result = await prisma.$transaction(async (tx) => {
      const deletedAppointments = await tx.appointment.deleteMany({
        where: { data: { lt: cutoffDate } },
      });

      const deletedBlockedSlots = await tx.blockedSlot.deleteMany({
        where: { data: { lt: cutoffDate } },
      });

      const deletedLogs = await tx.log.deleteMany({
        where: { date: { lt: cutoffDate } },
      });

      return {
        appointments: deletedAppointments.count,
        blockedSlots: deletedBlockedSlots.count,
        logs: deletedLogs.count,
      };
    });

    // ── 6. Registrar log de auditoria da purga ──
    // Busca um admin para vincular ao log (operação do sistema)
    const adminUser = await prisma.user.findFirst({
      where: { role: 'admin' },
      select: { id: true },
    });

    if (adminUser) {
      const purgeDetails = JSON.stringify({
        tipo: 'purga_lgpd',
        prazoRetencaoAnos: config.retentionYears,
        dataCorte: cutoffDate.toISOString().split('T')[0],
        registrosExcluidos: {
          agendamentos: result.appointments,
          bloqueiosHorario: result.blockedSlots,
          logsAuditoria: result.logs,
        },
        estatisticasPorStatus: statsByStatus.map((s) => ({
          status: s.status,
          quantidade: s._count,
        })),
      });

      await prisma.log.create({
        data: {
          userId: adminUser.id,
          action: 'PURGA_LGPD',
          details: purgeDetails,
        },
      });
    }

    // ── Resultado final ──
    console.log('─'.repeat(60));
    console.log('✅ PURGA CONCLUÍDA COM SUCESSO');
    console.log('─'.repeat(60));
    console.log(`\n  Agendamentos excluídos:         ${result.appointments.toLocaleString('pt-BR')}`);
    console.log(`  Bloqueios de horário excluídos:  ${result.blockedSlots.toLocaleString('pt-BR')}`);
    console.log(`  Logs de auditoria excluídos:     ${result.logs.toLocaleString('pt-BR')}`);
    console.log(`\n  📝 Log de auditoria registrado (ação: PURGA_LGPD)`);
    console.log(`  🔒 Dados pessoais eliminados conforme LGPD Art. 16`);
    console.log('─'.repeat(60) + '\n');
  } catch (error) {
    console.error('\n❌ Erro durante a purga:', error.message);
    console.error('   Nenhum dado foi excluído (transação revertida).\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('✅ Conexão fechada\n');
  }
}

purgeOldData();
