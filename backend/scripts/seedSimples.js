/**
 * Script de seed SIMPLIFICADO para criar 10,000 agendamentos
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import Cras from '../models/Cras.js';

dotenv.config();

// Configurações
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cras';
const QUANTIDADE = 10000;
const BATCH_SIZE = 1000;

// Horários disponíveis corretos (do sistema)
const HORARIOS = [
  '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
];

// Status CORRETOS
const STATUS = ['agendado', 'realizado', 'ausente'];

// Nomes brasileiros
const NOMES = [
  'Ana Costa', 'Bruno Carvalho', 'Carlos Souza', 'Diego Pinto', 'Fernanda Martins',
  'Gabriel Dias', 'Helena Silva', 'Igor Santos', 'Juliana Ferreira', 'Lucas Rodrigues',
  'Mariana Lima', 'Pedro Alves', 'Rodrigo Castro', 'Thiago Barbosa', 'Amanda Rocha',
  'Larissa Nascimento', 'Felipe Teixeira', 'Jéssica Freitas', 'Mateus Cavalcanti',
  'Camila Ribeiro', 'Aline Monteiro', 'Bruna Cardoso', 'José Oliveira', 'Maria Santos'
];

// Motivos CORRETOS
const MOTIVOS = [
  'Atualização Cadastral',
  'Inclusão',
  'Transferência de Município',
  'Orientações Gerais'
];

function gerarCPF() {
  const cpf = [];
  for (let i = 0; i < 9; i++) cpf.push(Math.floor(Math.random() * 10));
  
  let soma = cpf.reduce((acc, val, i) => acc + val * (10 - i), 0);
  cpf.push((soma * 10) % 11 % 10);
  
  soma = cpf.reduce((acc, val, i) => acc + val * (11 - i), 0);
  cpf.push((soma * 10) % 11 % 10);
  
  return cpf.join('');
}

function gerarTelefone() {
  const ddds = [11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99];
  const ddd = ddds[Math.floor(Math.random() * ddds.length)];
  const numero = Math.floor(Math.random() * 100000000);
  const numeroStr = numero.toString().padStart(8, '0');
  return `(${ddd}) 9${numeroStr.substring(0, 4)}-${numeroStr.substring(4)}`;
}

function gerarDataHorario() {
  const hoje = new Date();
  let diasAFrente = Math.floor(Math.random() * 90);
  
  const data = new Date(hoje);
  data.setDate(data.getDate() + diasAFrente);
  
  // Pular fins de semana
  while (data.getDay() === 0 || data.getDay() === 6) {
    diasAFrente++;
    data.setDate(hoje.getDate() + diasAFrente);
  }
  
  // Pegar horário aleatório
  const horario = HORARIOS[Math.floor(Math.random() * HORARIOS.length)];
  const [hora, minuto] = horario.split(':');
  
  data.setHours(parseInt(hora, 10), parseInt(minuto, 10), 0, 0);
  
  return data;
}

async function limparDadosTeste() {
  console.log('\n🗑️  Limpando agendamentos de teste anteriores...');
  const resultado = await Appointment.deleteMany({
    observacoes: { $regex: /\[TESTE\]/ }
  });
  console.log(`✓ ${resultado.deletedCount} agendamentos removidos\n`);
}

async function seed() {
  try {
    console.log('\n📋 SEED DE AGENDAMENTOS - VERSÃO SIMPLIFICADA\n');
    console.log('='.repeat(80));
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado ao MongoDB\n');
    
    const entrevistadores = await User.find({ role: 'entrevistador' }).select('_id cras').lean();
    
    if (entrevistadores.length === 0) {
      console.error('❌ Nenhum entrevistador encontrado!');
      process.exit(1);
    }
    
    console.log(`✓ ${entrevistadores.length} entrevistadores encontrados\n`);
    
    await limparDadosTeste();
    
    console.log(`📝 Criando ${QUANTIDADE.toLocaleString('pt-BR')} agendamentos...\n`);
    
    const startTime = Date.now();
    let totalCriados = 0;
    let errosIgnorados = 0;
    
    for (let i = 0; i < QUANTIDADE; i += BATCH_SIZE) {
      const batch = [];
      const loteSize = Math.min(BATCH_SIZE, QUANTIDADE - i);
      
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
          data: gerarDataHorario(),
          status: STATUS[Math.floor(Math.random() * STATUS.length)],
          observacoes: `[TESTE] Agendamento de teste #${i + j + 1}`,
          createdBy: entrevistador._id
        });
      }
      
      try {
        const resultado = await Appointment.insertMany(batch, { ordered: false });
        totalCriados += resultado.length;
      } catch (error) {
        // Ignorar erros de duplicata (código 11000), contar apenas os inseridos
        if (error.code === 11000) {
          const inseridos = error.insertedDocs ? error.insertedDocs.length : 0;
          totalCriados += inseridos;
          errosIgnorados += (loteSize - inseridos);
        } else {
          throw error;
        }
      }
      
      const progresso = ((totalCriados / QUANTIDADE) * 100).toFixed(1);
      const barraLength = 50;
      const filled = Math.floor((totalCriados / QUANTIDADE) * barraLength);
      const barra = '█'.repeat(filled) + '░'.repeat(barraLength - filled);
      
      process.stdout.write(`\r[${barra}] ${progresso}% (${totalCriados.toLocaleString('pt-BR')}/${QUANTIDADE.toLocaleString('pt-BR')})`);
    }
    
    const endTime = Date.now();
    const tempo = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n\n' + '='.repeat(80));
    console.log('✅ SEED CONCLUÍDO!\n');
    console.log(`📊 Estatísticas:`);
    console.log(`  • Total: ${totalCriados.toLocaleString('pt-BR')} agendamentos`);
    if (errosIgnorados > 0) {
      console.log(`  • Duplicados ignorados: ${errosIgnorados.toLocaleString('pt-BR')}`);
    }
    console.log(`  • Tempo: ${tempo}s`);
    console.log(`  • Velocidade: ${(totalCriados / parseFloat(tempo)).toFixed(0)} agendamentos/s\n`);
    
    console.log('📋 Distribuição por status:');
    for (const status of STATUS) {
      const count = await Appointment.countDocuments({ 
        status, 
        observacoes: { $regex: /\[TESTE\]/ } 
      });
      console.log(`  • ${status}: ${count.toLocaleString('pt-BR')}`);
    }
    
    console.log('\n🧪 Testar paginação:');
    console.log('  • GET /api/appointments?page=0&pageSize=10');
    console.log('  • GET /api/appointments?page=0&pageSize=50');
    console.log('  • GET /api/appointments?page=0&pageSize=100');
    
    console.log('\n🗑️  Limpar dados:');
    console.log('  • node backend/scripts/cleanTestData.js');
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

seed();
