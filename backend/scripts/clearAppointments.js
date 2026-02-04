import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Importa o modelo
import Appointment from '../models/Appointment.js';

async function clearAppointments() {
  try {
    // Conecta ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');

    // Deleta todos os agendamentos
    const result = await Appointment.deleteMany({});
    
    console.log(`\n🗑️  ${result.deletedCount} agendamentos deletados com sucesso!`);
    console.log('✅ Banco de dados zerado');

  } catch (error) {
    console.error('❌ Erro ao deletar agendamentos:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Conexão fechada');
    process.exit(0);
  }
}

clearAppointments();
