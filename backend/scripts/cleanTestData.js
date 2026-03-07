/**
 * ============================================================================
 * 🗑️  SCRIPT DE LIMPEZA DE DADOS DE TESTE
 * ============================================================================
 * 
 * Remove todos os agendamentos de teste (marcados com [TESTE])
 * 
 * Executar: node backend/scripts/cleanTestData.js
 * ============================================================================
 */

import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

async function cleanTestData() {
  try {
    console.log('\n🗑️  LIMPEZA DE DADOS DE TESTE\n');
    console.log('='.repeat(80));

    console.log('\n🔌 Conectando ao PostgreSQL...');
    await prisma.$connect();
    console.log('✅ Conectado com sucesso!\n');

    console.log('🔍 Buscando agendamentos de teste...');
    const count = await prisma.appointment.count({
      where: { observacoes: { contains: '[TESTE]' } },
    });

    if (count === 0) {
      console.log('✓ Nenhum agendamento de teste encontrado.\n');
      return;
    }

    console.log(`📊 ${count.toLocaleString('pt-BR')} agendamentos de teste encontrados\n`);
    console.log('⚠️  Removendo...');

    const result = await prisma.appointment.deleteMany({
      where: { observacoes: { contains: '[TESTE]' } },
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ LIMPEZA CONCLUÍDA!\n');
    console.log(`🗑️  ${result.count.toLocaleString('pt-BR')} agendamentos de teste removidos`);
    console.log('='.repeat(80) + '\n');
  } catch (error) {
    console.error('\n❌ Erro ao limpar dados:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Conexão fechada.\n');
  }
}

cleanTestData();
