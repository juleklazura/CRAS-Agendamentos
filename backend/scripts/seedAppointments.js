/**
 * ============================================================================
 * 📋 SCRIPT DE SEED DE AGENDAMENTOS
 * ============================================================================
 * 
 * Cria agendamentos de teste para validar paginação e performance
 * 
 * Executar: node backend/scripts/seedAppointments.js
 * ⚠️ IMPORTANTE: Apenas para ambiente de desenvolvimento/teste
 * ============================================================================
 */

import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import EncryptionService from '../utils/encryption.js';
import { motivoToEnum } from '../constants/motivos.js';

dotenv.config();

const prisma = new PrismaClient();

const QUANTIDADE = 10000;
const BATCH_SIZE = 500;

const HORARIOS = [
  '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
];

const STATUS = ['agendado', 'realizado', 'ausente'];

const NOMES = [
  'Ana Costa', 'Bruno Carvalho', 'Carlos Souza', 'Diego Pinto', 'Fernanda Martins',
  'Gabriel Dias', 'Helena Silva', 'Igor Santos', 'Juliana Ferreira', 'Lucas Rodrigues',
  'Mariana Lima', 'Pedro Alves', 'Rodrigo Castro', 'Thiago Barbosa', 'Amanda Rocha',
  'Larissa Nascimento', 'Felipe Teixeira', 'Jéssica Freitas', 'Mateus Cavalcanti',
  'Camila Ribeiro', 'Aline Monteiro', 'Bruna Cardoso', 'José Oliveira', 'Maria Santos',
];

const MOTIVOS = [
  'Atualização Cadastral',
  'Inclusão',
  'Transferência de Município',
  'Orientações Gerais',
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
  const ddds = [11, 21, 31, 41, 51, 61, 71, 81, 91, 27, 48];
  const ddd = ddds[Math.floor(Math.random() * ddds.length)];
  const numero = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return `(${ddd}) 9${numero.substring(0, 4)}-${numero.substring(4)}`;
}

function gerarDataHorario() {
  const hoje = new Date();
  let diasAFrente = Math.floor(Math.random() * 90);
  const data = new Date(hoje);
  data.setDate(data.getDate() + diasAFrente);

  while (data.getDay() === 0 || data.getDay() === 6) {
    diasAFrente++;
    data.setDate(hoje.getDate() + diasAFrente);
  }

  const horario = HORARIOS[Math.floor(Math.random() * HORARIOS.length)];
  const [hora, minuto] = horario.split(':');
  data.setHours(parseInt(hora, 10), parseInt(minuto, 10), 0, 0);
  return data;
}

async function seed() {
  try {
    console.log('\n📋 SEED DE AGENDAMENTOS\n');
    console.log('='.repeat(80));

    await prisma.$connect();
    console.log('✅ Conectado ao PostgreSQL\n');

    const entrevistadores = await prisma.user.findMany({
      where: { role: 'entrevistador' },
      select: { id: true, crasId: true },
    });

    if (entrevistadores.length === 0) {
      console.error('❌ Nenhum entrevistador encontrado! Crie usuários primeiro.');
      process.exit(1);
    }

    console.log(`✓ ${entrevistadores.length} entrevistadores encontrados\n`);

    const deleteResult = await prisma.appointment.deleteMany({
      where: { observacoes: { contains: '[TESTE]' } },
    });
    console.log(`🗑️  ${deleteResult.count} agendamentos de teste anteriores removidos\n`);

    console.log(`📝 Criando ${QUANTIDADE.toLocaleString('pt-BR')} agendamentos...\n`);

    const startTime = Date.now();
    let totalCriados = 0;

    for (let i = 0; i < QUANTIDADE; i += BATCH_SIZE) {
      const batch = [];
      const loteSize = Math.min(BATCH_SIZE, QUANTIDADE - i);

      for (let j = 0; j < loteSize; j++) {
        const entrevistador = entrevistadores[Math.floor(Math.random() * entrevistadores.length)];
        const cpf = gerarCPF();
        const pessoa = NOMES[Math.floor(Math.random() * NOMES.length)];
        const telefone1 = gerarTelefone();
        const telefone2 = Math.random() > 0.5 ? gerarTelefone() : null;
        const motivo = MOTIVOS[Math.floor(Math.random() * MOTIVOS.length)];

        batch.push({
          entrevistadorId: entrevistador.id,
          crasId: entrevistador.crasId,
          pessoa: EncryptionService.encrypt(pessoa),
          cpf: EncryptionService.encrypt(cpf),
          cpfHash: EncryptionService.hash(cpf),
          telefone1: EncryptionService.encrypt(telefone1),
          telefone2: telefone2 ? EncryptionService.encrypt(telefone2) : null,
          motivo: motivoToEnum(motivo),
          data: gerarDataHorario(),
          status: STATUS[Math.floor(Math.random() * STATUS.length)],
          observacoes: `[TESTE] Agendamento de teste #${i + j + 1}`,
          createdById: entrevistador.id,
        });
      }

      const result = await prisma.appointment.createMany({ data: batch, skipDuplicates: true });
      totalCriados += result.count;

      const progresso = ((totalCriados / QUANTIDADE) * 100).toFixed(1);
      const barraLength = 50;
      const filled = Math.floor((totalCriados / QUANTIDADE) * barraLength);
      const barra = '█'.repeat(filled) + '░'.repeat(barraLength - filled);
      process.stdout.write(
        `\r[${barra}] ${progresso}% (${totalCriados.toLocaleString('pt-BR')}/${QUANTIDADE.toLocaleString('pt-BR')})`
      );
    }

    const endTime = Date.now();
    const tempo = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n\n' + '='.repeat(80));
    console.log('✅ SEED CONCLUÍDO!\n');
    console.log(`📊 Estatísticas:`);
    console.log(`  • Total: ${totalCriados.toLocaleString('pt-BR')} agendamentos`);
    console.log(`  • Tempo: ${tempo}s`);
    console.log(`  • Velocidade: ${(totalCriados / parseFloat(tempo)).toFixed(0)} agendamentos/s\n`);

    console.log('📋 Distribuição por status:');
    for (const status of STATUS) {
      const count = await prisma.appointment.count({
        where: { status, observacoes: { contains: '[TESTE]' } },
      });
      console.log(`  • ${status}: ${count.toLocaleString('pt-BR')}`);
    }

    console.log('\n🗑️  Limpar dados:');
    console.log('  • node backend/scripts/cleanTestData.js');
    console.log('='.repeat(80) + '\n');
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

seed();
