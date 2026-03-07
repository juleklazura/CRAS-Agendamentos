import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

async function test() {
  try {
    await prisma.$connect();
    console.log('✅ Conectado ao PostgreSQL');

    const total = await prisma.appointment.count();
    console.log('\n📊 Total de agendamentos:', total);

    if (total === 0) {
      console.log('\n⚠️  Banco está vazio! Execute o seed para criar dados de teste.');
      return;
    }

    console.log('\n📈 Contagem por status:');
    const statusCounts = await prisma.appointment.groupBy({
      by: ['status'],
      _count: { status: true },
      orderBy: { _count: { status: 'desc' } },
    });

    statusCounts.forEach((s) => {
      console.log(`  - ${s.status}: ${s._count.status}`);
    });

    // Testar dados do dashboard (mês atual)
    console.log('\n🔍 Testando dados do dashboard...');
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const dashboardData = await prisma.appointment.groupBy({
      by: ['status'],
      where: { data: { gte: startDate, lte: endDate } },
      _count: { status: true },
    });

    console.log('\n📊 Dados do dashboard (mês atual):');
    if (dashboardData.length === 0) {
      console.log('  ⚠️  Nenhum agendamento no mês atual');
    } else {
      dashboardData.forEach((d) => {
        console.log(`  - ${d.status}: ${d._count.status}`);
      });
    }

    console.log('\n✅ Teste concluído');
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

test();
