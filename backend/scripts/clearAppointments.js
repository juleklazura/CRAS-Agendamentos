import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

async function clearAppointments() {
  try {
    await prisma.$connect();
    console.log('✅ Conectado ao PostgreSQL');

    const result = await prisma.appointment.deleteMany({});

    console.log(`\n🗑️  ${result.count} agendamentos deletados com sucesso!`);
    console.log('✅ Tabela zerada');
  } catch (error) {
    console.error('❌ Erro ao deletar agendamentos:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n✅ Conexão fechada');
    process.exit(0);
  }
}

clearAppointments();
