/**
 * ============================================================================
 * 🗑️  SCRIPT DE LIMPEZA DE DADOS DE TESTE
 * ============================================================================
 * 
 * Remove todos os agendamentos de teste criados pelo seedAppointments.js
 * 
 * Executar: node backend/scripts/cleanTestData.js
 * ============================================================================
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Appointment from '../models/Appointment.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

async function cleanTestData() {
  try {
    console.log('\n🗑️  LIMPEZA DE DADOS DE TESTE\n');
    console.log('='.repeat(80));

    console.log('\n🔌 Conectando ao MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado com sucesso!\n');

    console.log('🔍 Buscando agendamentos de teste...');
    const count = await Appointment.countDocuments({
      observacoes: { $regex: /\[TESTE\]/ }
    });

    if (count === 0) {
      console.log('✓ Nenhum agendamento de teste encontrado.\n');
      return;
    }

    console.log(`📊 ${count.toLocaleString('pt-BR')} agendamentos de teste encontrados\n`);
    console.log('⚠️  Removendo...');

    const result = await Appointment.deleteMany({
      observacoes: { $regex: /\[TESTE\]/ }
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ LIMPEZA CONCLUÍDA!\n');
    console.log(`🗑️  ${result.deletedCount.toLocaleString('pt-BR')} agendamentos de teste removidos`);
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Erro ao limpar dados:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexão fechada.\n');
  }
}

cleanTestData();
