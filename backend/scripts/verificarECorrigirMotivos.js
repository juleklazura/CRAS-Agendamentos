#!/usr/bin/env node

import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';

console.log('🔍 Verificando motivos de agendamento no banco de dados...\n');

try {
  // Conectar ao MongoDB
  await mongoose.connect('mongodb://localhost:27017/agendamentos');
  console.log('✅ Conectado ao MongoDB\n');

  // Motivos oficiais
  const motivosOficiais = ['Atualização Cadastral', 'Inclusão', 'Transferência de Município', 'Orientações Gerais'];
  
  // Buscar todos os motivos únicos existentes
  const motivosExistentes = await Appointment.distinct('motivo');
  console.log('📋 Motivos encontrados no banco:');
  motivosExistentes.forEach(motivo => {
    const isOficial = motivosOficiais.includes(motivo);
    console.log(`   ${isOficial ? '✅' : '❌'} "${motivo}"`);
  });
  
  // Identificar motivos que precisam ser corrigidos
  const motivosIncorretos = motivosExistentes.filter(motivo => !motivosOficiais.includes(motivo));
  
  if (motivosIncorretos.length === 0) {
    console.log('\n🎉 Todos os motivos já estão corretos!');
    process.exit(0);
  }

  console.log(`\n⚠️  Encontrados ${motivosIncorretos.length} motivos que precisam ser corrigidos:`);
  
  // Contar e corrigir cada motivo incorreto
  let totalCorrigidos = 0;
  
  for (const motivoIncorreto of motivosIncorretos) {
    const count = await Appointment.countDocuments({ motivo: motivoIncorreto });
    console.log(`\n📊 "${motivoIncorreto}": ${count} agendamentos`);
    
    // Mapear para motivo correto
    let motivoCorreto = 'Orientações Gerais'; // padrão
    
    if (motivoIncorreto.toLowerCase().includes('atualiza')) {
      motivoCorreto = 'Atualização Cadastral';
    } else if (motivoIncorreto.toLowerCase().includes('inclus')) {
      motivoCorreto = 'Inclusão';
    } else if (motivoIncorreto.toLowerCase().includes('transfer')) {
      motivoCorreto = 'Transferência de Município';
    } else if (motivoIncorreto.toLowerCase().includes('orienta')) {
      motivoCorreto = 'Orientações Gerais';
    }
    
    console.log(`   🔄 Corrigindo para: "${motivoCorreto}"`);
    
    // Atualizar no banco
    const resultado = await Appointment.updateMany(
      { motivo: motivoIncorreto },
      { $set: { motivo: motivoCorreto } }
    );
    
    console.log(`   ✅ ${resultado.modifiedCount} agendamentos atualizados`);
    totalCorrigidos += resultado.modifiedCount;
  }
  
  console.log(`\n🎉 Correção concluída! ${totalCorrigidos} agendamentos foram atualizados.`);
  
  // Verificação final
  const verificacao = await Appointment.distinct('motivo');
  console.log('\n🔍 Verificação final - Motivos no banco:');
  verificacao.forEach(motivo => {
    const isOficial = motivosOficiais.includes(motivo);
    console.log(`   ${isOficial ? '✅' : '❌'} "${motivo}"`);
  });

} catch (error) {
  console.error('❌ Erro:', error.message);
} finally {
  await mongoose.disconnect();
  console.log('\n🔌 Desconectado do MongoDB');
}
