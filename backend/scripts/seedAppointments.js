/**
 * ============================================================================
 * 📋 SCRIPT DE SEED DE AGENDAMENTOS
 * ============================================================================
 * 
 * Cria agendamentos de teste para validar paginação e performance
 * 
 * Executar: node backend/scripts/seedAppointments.js
 * 
 * ⚠️ IMPORTANTE: Apenas para ambiente de desenvolvimento/teste
 * ============================================================================
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import Cras from '../models/Cras.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

// Nomes brasileiros para gerar dados realistas
const NOMES = [
  'João Silva', 'Maria Santos', 'José Oliveira', 'Ana Costa', 'Carlos Souza',
  'Mariana Lima', 'Pedro Alves', 'Juliana Ferreira', 'Lucas Rodrigues', 'Fernanda Martins',
  'Rafael Pereira', 'Camila Ribeiro', 'Bruno Carvalho', 'Beatriz Almeida', 'Gabriel Dias',
  'Larissa Nascimento', 'Thiago Barbosa', 'Bruna Cardoso', 'Felipe Teixeira', 'Amanda Rocha',
  'Rodrigo Castro', 'Jéssica Freitas', 'Mateus Cavalcanti', 'Aline Monteiro', 'Diego Pinto'
];

const MOTIVOS = [
  'Atualização Cadastral',
  'Inclusão',
  'Transferência de Município',
  'Orientações Gerais'
];

const STATUS_LIST = ['agendado', 'realizado', 'ausente'];

// Gerar CPF válido
function gerarCPF() {
  const n = () => Math.floor(Math.random() * 9);
  const cpf = Array(9).fill(0).map(n);
  
  // Calcular dígitos verificadores
  let soma = cpf.reduce((acc, val, i) => acc + val * (10 - i), 0);
  cpf.push((soma * 10) % 11 % 10);
  
  soma = cpf.reduce((acc, val, i) => acc + val * (11 - i), 0);
  cpf.push((soma * 10) % 11 % 10);
  
  return cpf.join('');
}

// Gerar telefone brasileiro válido
function gerarTelefone() {
  const ddds = [11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99];
  const ddd = ddds[Math.floor(Math.random() * ddds.length)];
  const numero = Math.floor(Math.random() * 100000000);
  const numeroStr = numero.toString().padStart(8, '0');
  return `(${ddd}) 9${numeroStr.substring(0, 4)}-${numeroStr.substring(4)}`;
}

// Gerar data aleatória nos próximos 90 dias
function gerarDataAleatoria() {
  const hoje = new Date();
  const diasAFrente = Math.floor(Math.random() * 90); // 0 a 89 dias
  const data = new Date(hoje);
  data.setDate(data.getDate() + diasAFrente);
  return data.toISOString().split('T')[0];
}

async function seedAppointments() {
  try {
    console.log('\n📋 SEED DE AGENDAMENTOS\n');
    console.log('='.repeat(80));

    console.log('\n🔌 Conectando ao MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado com sucesso!\n');

    // Buscar entrevistadores e CRAS existentes
    console.log('🔍 Buscando entrevistadores e CRAS...');
    const entrevistadores = await User.find({ role: 'entrevistador' }).select('_id cras');
    const crasList = await Cras.find().select('_id');

    if (entrevistadores.length === 0) {
      console.error('❌ Nenhum entrevistador encontrado! Crie usuários primeiro.');
      process.exit(1);
    }

    if (crasList.length === 0) {
      console.error('❌ Nenhum CRAS encontrado! Crie CRAS primeiro.');
      process.exit(1);
    }

    console.log(`✓ ${entrevistadores.length} entrevistadores encontrados`);
    console.log(`✓ ${crasList.length} CRAS encontrados\n`);

    // Perguntar quantos agendamentos criar
    const quantidade = 10000;
    console.log(`📊 Criando ${quantidade.toLocaleString('pt-BR')} agendamentos de teste...\n`);

    // Limpar agendamentos antigos de teste
    const deleteResult = await Appointment.deleteMany({
      observacoes: { $regex: /\[TESTE\]/ }
    });
    console.log(`🗑️  ${deleteResult.deletedCount} agendamentos de teste anteriores removidos\n`);

    // Criar agendamentos em lotes
    const batchSize = 1000;
    let totalCriados = 0;
    const startTime = Date.now();

    for (let i = 0; i < quantidade; i += batchSize) {
      const batch = [];
      const loteSize = Math.min(batchSize, quantidade - i);

      for (let j = 0; j < loteSize; j++) {
        const entrevistador = entrevistadores[Math.floor(Math.random() * entrevistadores.length)];
        
        batch.push({
          entrevistador: entrevistador._id,
          cras: entrevistador.cras,
          pessoa: NOMES[Math.floor(Math.random() * NOMES.length)],
          cpf: gerarCPF(),
          telefone1: gerarTelefone(),
          telefone2: Math.random() > 0.5 ? gerarTelefone() : undefined,
          motivo: MOTIVOS[Math.floor(Math.random() * MOTIVOS.length)],
          data: gerarDataAleatoria(),
          status: STATUS_LIST[Math.floor(Math.random() * STATUS_LIST.length)],
          observacoes: `[TESTE] Agendamento de teste #${i + j + 1}`,
          createdBy: entrevistador._id
        });
      }

      await Appointment.insertMany(batch, { lean: true });
      totalCriados += batch.length;

      const progresso = ((totalCriados / quantidade) * 100).toFixed(1);
      const barraLength = 50;
      const filled = Math.floor((totalCriados / quantidade) * barraLength);
      const barra = '█'.repeat(filled) + '░'.repeat(barraLength - filled);
      
      process.stdout.write(`\r[${ barra}] ${progresso}% (${totalCriados.toLocaleString('pt-BR')}/${quantidade.toLocaleString('pt-BR')})`);
    }

    const endTime = Date.now();
    const tempoDecorrido = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n\n' + '='.repeat(80));
    console.log('✅ SEED CONCLUÍDO!\n');
    console.log(`📊 Estatísticas:`);
    console.log(`  • Total criado: ${totalCriados.toLocaleString('pt-BR')} agendamentos`);
    console.log(`  • Tempo decorrido: ${tempoDecorrido}s`);
    console.log(`  • Velocidade: ${(totalCriados / parseFloat(tempoDecorrido)).toFixed(0)} agendamentos/segundo\n`);

    // Contar por status
    console.log('📋 Distribuição por status:');
    for (const status of STATUS_LIST) {
      const count = await Appointment.countDocuments({ 
        status, 
        observacoes: { $regex: /\[TESTE\]/ } 
      });
      console.log(`  • ${status}: ${count.toLocaleString('pt-BR')}`);
    }

    console.log('\n🧪 Para testar a paginação:');
    console.log('  • GET /api/appointments?page=0&pageSize=10');
    console.log('  • GET /api/appointments?page=0&pageSize=50');
    console.log('  • GET /api/appointments?page=0&pageSize=100');
    console.log('  • GET /api/appointments?page=50&pageSize=100');
    
    console.log('\n🗑️  Para remover dados de teste:');
    console.log('  • node backend/scripts/cleanTestData.js');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Erro ao criar agendamentos:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexão fechada.\n');
  }
}

seedAppointments();
