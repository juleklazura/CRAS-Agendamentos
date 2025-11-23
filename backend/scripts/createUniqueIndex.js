// ========================================
// 🔧 SCRIPT DE MIGRAÇÃO - CRIAR ÍNDICE ÚNICO
// ========================================
// Aplica índice único para prevenir race conditions
// Executar: node backend/scripts/createUniqueIndex.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '../.env') });

// Construir URI do MongoDB a partir das variáveis de ambiente
const MONGO_URI = process.env.MONGO_URI || 
  `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}?authSource=${process.env.MONGO_AUTH_SOURCE}`;

if (!MONGO_URI || MONGO_URI.includes('undefined')) {
  console.error('❌ ERRO: Variáveis de ambiente MongoDB não configuradas!');
  console.error('Verifique o arquivo .env e configure:');
  console.error('  - MONGO_URI ou');
  console.error('  - MONGO_USER, MONGO_PASSWORD, MONGO_HOST, MONGO_PORT, MONGO_DB, MONGO_AUTH_SOURCE');
  process.exit(1);
}

/**
 * Conecta ao MongoDB e cria índice único para prevenir duplicatas
 */
const createUniqueIndex = async () => {
  try {
    console.log('🔗 Conectando ao MongoDB...');
    
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Conectado ao MongoDB');
    
    const db = mongoose.connection.db;
    const appointmentsCollection = db.collection('appointments');
    
    console.log('\n📊 Verificando índices existentes...');
    const existingIndexes = await appointmentsCollection.indexes();
    console.log('Índices atuais:', existingIndexes.map(idx => idx.name));
    
    // Verificar se índice já existe
    const indexExists = existingIndexes.some(idx => idx.name === 'unique_appointment_slot');
    
    if (indexExists) {
      console.log('\n⚠️  Índice "unique_appointment_slot" já existe!');
      console.log('Removendo índice antigo para recriar...');
      await appointmentsCollection.dropIndex('unique_appointment_slot');
    }
    
    console.log('\n🔨 Criando índice único composto...');
    
    // Criar índice único com filtro parcial
    await appointmentsCollection.createIndex(
      { 
        entrevistador: 1, 
        data: 1
      },
      { 
        unique: true,
        name: 'unique_appointment_slot',
        // Apenas agendamentos ativos bloqueiam o horário
        partialFilterExpression: { 
          status: { $in: ['agendado', 'reagendar'] }
        }
      }
    );
    
    console.log('✅ Índice único criado com sucesso!');
    
    // Verificar índices após criação
    console.log('\n📊 Índices após criação:');
    const newIndexes = await appointmentsCollection.indexes();
    newIndexes.forEach(idx => {
      console.log(`  - ${idx.name}:`, JSON.stringify(idx.key));
    });
    
    // Contar documentos afetados
    const activeAppointments = await appointmentsCollection.countDocuments({
      status: { $in: ['agendado', 'reagendar'] }
    });
    
    console.log(`\n📈 Estatísticas:`);
    console.log(`  - Agendamentos ativos: ${activeAppointments}`);
    console.log(`  - Agendamentos protegidos contra duplicata: ${activeAppointments}`);
    
    console.log('\n🎉 Migração concluída com sucesso!');
    console.log('🔒 Sistema agora está protegido contra race conditions');
    
  } catch (error) {
    console.error('\n❌ Erro ao criar índice:', error.message);
    
    if (error.code === 11000) {
      console.error('\n⚠️  ATENÇÃO: Já existem agendamentos duplicados no banco!');
      console.error('Para resolver:');
      console.error('1. Identifique os duplicados manualmente');
      console.error('2. Cancele ou remova os agendamentos duplicados');
      console.error('3. Execute este script novamente');
    }
    
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexão fechada');
  }
};

// Executar migração
createUniqueIndex();
