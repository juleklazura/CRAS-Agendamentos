import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');
    
    const db = mongoose.connection.db;
    
    const total = await db.collection('appointments').countDocuments();
    console.log('\n📊 Total de agendamentos:', total);
    
    if (total === 0) {
      console.log('\n⚠️  Banco está vazio! Execute o seed para criar dados de teste.');
      await mongoose.connection.close();
      process.exit(0);
      return;
    }
    
    console.log('\n📈 Contagem por status:');
    const statusCount = await db.collection('appointments').aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    statusCount.forEach(s => {
      console.log(`  - ${s._id}: ${s.count}`);
    });
    
    // Testar agregação do dashboard (mensal)
    console.log('\n🔍 Testando agregação do dashboard...');
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const dashboardData = await db.collection('appointments').aggregate([
      {
        $match: {
          data: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            status: '$status'
          },
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    
    console.log('\n📊 Dados do dashboard (mês atual):');
    if (dashboardData.length === 0) {
      console.log('  ⚠️  Nenhum agendamento no mês atual');
    } else {
      dashboardData.forEach(d => {
        console.log(`  - ${d._id.status}: ${d.count}`);
      });
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Teste concluído');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    process.exit(1);
  }
}

test();
