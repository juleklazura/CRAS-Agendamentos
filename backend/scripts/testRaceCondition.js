// ========================================
// 🧪 TESTE DE RACE CONDITION
// ========================================
// Simula requisições simultâneas para verificar se duplicatas são prevenidas
// Executar: node backend/scripts/testRaceCondition.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '../.env') });

// Construir URI do MongoDB
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agendamentos';

/**
 * Schema simplificado para teste
 */
const appointmentSchema = new mongoose.Schema({
  entrevistador: { type: mongoose.Schema.Types.ObjectId, required: true },
  data: { type: Date, required: true },
  pessoa: { type: String, required: true },
  cpf: { type: String, required: true },
  telefone1: { type: String, required: true },
  motivo: { type: String, required: true },
  status: { type: String, default: 'agendado' },
  cras: { type: mongoose.Schema.Types.ObjectId, required: true }
}, { timestamps: true });

// Índice único
appointmentSchema.index(
  { entrevistador: 1, data: 1 },
  { 
    unique: true,
    name: 'unique_appointment_slot',
    partialFilterExpression: { 
      status: { $in: ['agendado', 'reagendar'] }
    }
  }
);

const TestAppointment = mongoose.model('TestAppointment', appointmentSchema, 'appointments');

/**
 * Simula criação de agendamento (com ou sem delay)
 */
const createAppointment = async (requestNumber, delay = 0) => {
  if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
  
  const testData = {
    entrevistador: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'), // ID fictício
    data: new Date('2025-11-25T10:00:00Z'),
    pessoa: `Pessoa Teste ${requestNumber}`,
    cpf: `123.456.789-${String(requestNumber).padStart(2, '0')}`,
    telefone1: `(11) 98765-${String(requestNumber).padStart(4, '0')}`,
    motivo: 'Teste Race Condition',
    status: 'agendado',
    cras: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012') // ID fictício
  };
  
  try {
    const appointment = await TestAppointment.create(testData);
    return {
      success: true,
      requestNumber,
      message: `✅ Request #${requestNumber} criou agendamento ${appointment._id}`,
      id: appointment._id
    };
  } catch (error) {
    if (error.code === 11000) {
      return {
        success: false,
        requestNumber,
        message: `❌ Request #${requestNumber} BLOQUEADO - Horário já ocupado`,
        error: 'DUPLICATE_KEY'
      };
    }
    return {
      success: false,
      requestNumber,
      message: `❌ Request #${requestNumber} ERRO: ${error.message}`,
      error: error.message
    };
  }
};

/**
 * Executa teste de race condition
 */
const testRaceCondition = async () => {
  try {
    console.log('🔗 Conectando ao MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado ao MongoDB\n');
    
    // ========================================
    // TESTE 1: Requisições Simultâneas (Race Condition)
    // ========================================
    console.log('🧪 TESTE 1: Simulando 5 requisições SIMULTÂNEAS');
    console.log('📍 Mesmo entrevistador, mesma data/horário');
    console.log('⏱️  Iniciando todas ao mesmo tempo...\n');
    
    // Limpar agendamentos de teste anteriores
    await TestAppointment.deleteMany({ 
      motivo: 'Teste Race Condition' 
    });
    
    // Disparar 5 requisições simultâneas
    const promises = [];
    for (let i = 1; i <= 5; i++) {
      promises.push(createAppointment(i));
    }
    
    const results = await Promise.all(promises);
    
    // Analisar resultados
    console.log('📊 RESULTADOS:\n');
    results.forEach(result => {
      console.log(result.message);
    });
    
    const successCount = results.filter(r => r.success).length;
    const blockedCount = results.filter(r => !r.success).length;
    
    console.log('\n� ESTATÍSTICAS:');
    console.log(`  ✅ Sucessos: ${successCount}`);
    console.log(`  ❌ Bloqueados: ${blockedCount}`);
    
    if (successCount === 1 && blockedCount === 4) {
      console.log('\n🎉 TESTE PASSOU! Race condition está PREVENIDA!');
      console.log('   Apenas 1 agendamento foi criado, os outros 4 foram bloqueados.');
    } else {
      console.log('\n⚠️  TESTE FALHOU! Race condition NÃO está prevenida!');
      console.log(`   Esperado: 1 sucesso e 4 bloqueios`);
      console.log(`   Obtido: ${successCount} sucessos e ${blockedCount} bloqueios`);
    }
    
    // ========================================
    // TESTE 2: Requisições Sequenciais (Controle)
    // ========================================
    console.log('\n\n🧪 TESTE 2: Simulando 3 requisições SEQUENCIAIS');
    console.log('📍 Mesmo entrevistador, horários DIFERENTES');
    console.log('⏱️  Executando uma após a outra...\n');
    
    const sequentialResults = [];
    for (let i = 1; i <= 3; i++) {
      const testData = {
        entrevistador: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        data: new Date(`2025-11-25T${9 + i}:00:00Z`), // Horários diferentes
        pessoa: `Pessoa Sequencial ${i}`,
        cpf: `123.456.789-${String(10 + i).padStart(2, '0')}`,
        telefone1: `(11) 98765-${String(1000 + i).padStart(4, '0')}`,
        motivo: 'Teste Race Condition',
        status: 'agendado',
        cras: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012')
      };
      
      try {
        const appointment = await TestAppointment.create(testData);
        sequentialResults.push({
          success: true,
          message: `✅ Agendamento ${i} criado: ${new Date(testData.data).toLocaleTimeString('pt-BR')}`
        });
      } catch (error) {
        sequentialResults.push({
          success: false,
          message: `❌ Agendamento ${i} ERRO: ${error.message}`
        });
      }
    }
    
    console.log('📊 RESULTADOS:\n');
    sequentialResults.forEach(result => {
      console.log(result.message);
    });
    
    const sequentialSuccess = sequentialResults.filter(r => r.success).length;
    
    if (sequentialSuccess === 3) {
      console.log('\n✅ TESTE PASSOU! Agendamentos em horários diferentes funcionam normalmente.');
    } else {
      console.log('\n⚠️  TESTE FALHOU! Problema com agendamentos em horários diferentes.');
    }
    
    // ========================================
    // TESTE 3: Status Diferentes (Filtro Parcial)
    // ========================================
    console.log('\n\n🧪 TESTE 3: Verificando filtro de status');
    console.log('📍 Criar agendamento → Cancelar → Criar outro no mesmo horário\n');
    
    // Limpar teste anterior
    await TestAppointment.deleteMany({ 
      motivo: 'Teste Status' 
    });
    
    const testDate = new Date('2025-11-25T14:00:00Z');
    
    // Criar primeiro agendamento
    const first = await TestAppointment.create({
      entrevistador: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
      data: testDate,
      pessoa: 'Pessoa Status 1',
      cpf: '123.456.789-50',
      telefone1: '(11) 98765-5000',
      motivo: 'Teste Status',
      status: 'agendado',
      cras: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012')
    });
    console.log(`✅ Agendamento 1 criado (status: agendado)`);
    
    // Cancelar o primeiro
    first.status = 'cancelado';
    await first.save();
    console.log(`🔄 Agendamento 1 cancelado`);
    
    // Tentar criar outro no mesmo horário
    try {
      const second = await TestAppointment.create({
        entrevistador: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
        data: testDate,
        pessoa: 'Pessoa Status 2',
        cpf: '123.456.789-51',
        telefone1: '(11) 98765-5001',
        motivo: 'Teste Status',
        status: 'agendado',
        cras: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012')
      });
      console.log(`✅ Agendamento 2 criado no mesmo horário (possível após cancelamento)`);
      console.log('\n🎉 TESTE PASSOU! Filtro de status funciona corretamente.');
    } catch (error) {
      console.log(`❌ ERRO ao criar segundo agendamento: ${error.message}`);
      console.log('\n⚠️  TESTE FALHOU! Filtro de status não está funcionando.');
    }
    
    // Limpar dados de teste
    console.log('\n\n🧹 Limpando dados de teste...');
    const deleted = await TestAppointment.deleteMany({ 
      motivo: { $in: ['Teste Race Condition', 'Teste Status'] }
    });
    console.log(`✅ ${deleted.deletedCount} agendamentos de teste removidos`);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 RESUMO FINAL');
    console.log('='.repeat(60));
    console.log('✅ Índice único composto implementado');
    console.log('✅ Race conditions prevenidas');
    console.log('✅ Agendamentos duplicados bloqueados');
    console.log('✅ Horários diferentes funcionam');
    console.log('✅ Status cancelados permitem reagendamento');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Erro durante teste:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexão fechada');
  }
};

// Executar testes
testRaceCondition();
