/**
 * ============================================================================
 * purgeUser.js — Remoção completa (hard delete) de um usuário e todos os
 *                registros vinculados a ele no banco de dados.
 *
 * USO:
 *   node backend/scripts/purgeUser.js <matricula|nome>
 *
 * Exemplo:
 *   node backend/scripts/purgeUser.js entrevistador3
 *
 * Ordem de deleção (respeita FKs do schema):
 *   1. blocked_slots    (entrevistadorId NOT NULL)
 *   2. appointments     (entrevistadorId NOT NULL)
 *   3. appointments     (createdById / updatedById → NULL)
 *   4. logs             (userId → NULL)
 *   5. users            (registro do usuário)
 * ============================================================================
 */

import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

const termo = process.argv[2];

if (!termo) {
  console.error('\n❌ Uso: node backend/scripts/purgeUser.js <matricula|nome>\n');
  process.exit(1);
}

async function purgeUser() {
  try {
    console.log('\n⚠️  REMOÇÃO COMPLETA DE USUÁRIO\n');
    console.log('='.repeat(70));

    await prisma.$connect();
    console.log('🔌 Conectado ao PostgreSQL\n');

    // Localizar usuário por matrícula (exato) ou nome (case-insensitive)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { matricula: termo },
          { name: { equals: termo, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true, name: true, matricula: true, role: true, ativo: true,
        _count: {
          select: {
            appointments: true,
            appointmentsCreated: true,
            appointmentsUpdated: true,
            blockedSlots: true,
            logs: true,
          },
        },
      },
    });

    if (!user) {
      console.log(`\n⚠️  Nenhum usuário encontrado para o termo "${termo}"\n`);
      return;
    }

    console.log('👤 Usuário encontrado:');
    console.log(`   ID       : ${user.id}`);
    console.log(`   Nome     : ${user.name}`);
    console.log(`   Matrícula: ${user.matricula}`);
    console.log(`   Role     : ${user.role}`);
    console.log(`   Ativo    : ${user.ativo}`);
    console.log('\n📊 Registros vinculados:');
    console.log(`   Agendamentos (entrevistador) : ${user._count.appointments}`);
    console.log(`   Agendamentos (criados por)   : ${user._count.appointmentsCreated}`);
    console.log(`   Agendamentos (editados por)  : ${user._count.appointmentsUpdated}`);
    console.log(`   Bloqueios de horário         : ${user._count.blockedSlots}`);
    console.log(`   Logs de auditoria            : ${user._count.logs}`);
    console.log('');

    const totalRegistros =
      user._count.appointments +
      user._count.blockedSlots +
      user._count.logs;

    console.log(`🗑️  Total a remover: ${totalRegistros} registro(s) + o próprio usuário`);
    console.log('\n⏳ Executando remoção em transação...\n');

    const stats = await prisma.$transaction(async (tx) => {
      // 1. Bloqueios de horário
      const bloqueios = await tx.blockedSlot.deleteMany({
        where: { entrevistadorId: user.id },
      });

      // 2. Agendamentos onde este usuário é o entrevistador
      const agendamentosEntrevistador = await tx.appointment.deleteMany({
        where: { entrevistadorId: user.id },
      });

      // 3. Nulificar referências de auditoria (createdBy / updatedBy)
      const agendamentosCriados = await tx.appointment.updateMany({
        where: { createdById: user.id },
        data: { createdById: null },
      });
      const agendamentosEditados = await tx.appointment.updateMany({
        where: { updatedById: user.id },
        data: { updatedById: null },
      });

      // 4. Nulificar userId nos logs (preserva rastro de auditoria sem referenciar o usuário)
      const logs = await tx.log.updateMany({
        where: { userId: user.id },
        data: { userId: null },
      });

      // 5. Remover o usuário
      await tx.user.delete({ where: { id: user.id } });

      return { bloqueios, agendamentosEntrevistador, agendamentosCriados, agendamentosEditados, logs };
    });

    console.log('='.repeat(70));
    console.log('✅ REMOÇÃO CONCLUÍDA COM SUCESSO!\n');
    console.log(`   Bloqueios removidos                    : ${stats.bloqueios.count}`);
    console.log(`   Agendamentos removidos (entrevistador) : ${stats.agendamentosEntrevistador.count}`);
    console.log(`   Agendamentos (createdBy → null)        : ${stats.agendamentosCriados.count}`);
    console.log(`   Agendamentos (updatedBy → null)        : ${stats.agendamentosEditados.count}`);
    console.log(`   Logs (userId → null)                   : ${stats.logs.count}`);
    console.log(`   Usuário "${user.name}" (${user.matricula}) removido do banco`);
    console.log('='.repeat(70) + '\n');
  } catch (err) {
    console.error('\n❌ Erro durante a remoção:', err.message);
    if (err.code) console.error(`   Código Prisma: ${err.code}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

purgeUser();
