import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agendamentos';

async function updateExistingAppointments() {
  try {
    await mongoose.connect(MONGO_URI);
    
    // Buscar agendamentos que não têm os novos campos
    const appointmentsToUpdate = await Appointment.find({
      $or: [
        { cpf: { $exists: false } },
        { telefone1: { $exists: false } }
      ]
    });

    console.log(`Encontrados ${appointmentsToUpdate.length} agendamentos para atualizar`);

    // Atualizar cada agendamento com valores padrão
    for (const appointment of appointmentsToUpdate) {
      await Appointment.updateOne(
        { _id: appointment._id },
        {
          $set: {
            cpf: appointment.cpf || 'Não informado',
            telefone1: appointment.telefone1 || 'Não informado',
            telefone2: appointment.telefone2 || ''
          }
        }
      );
    }

    console.log('Agendamentos atualizados com sucesso!');
    
  } catch (error) {
    console.error('Erro ao atualizar agendamentos:', error);
  } finally {
    await mongoose.disconnect();
  }
}

updateExistingAppointments();
