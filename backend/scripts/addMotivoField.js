import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';

const MONGO_URI = 'mongodb://localhost:27017/agendamentos';

async function addMotivoToExistingAppointments() {
  try {
    await mongoose.connect(MONGO_URI);
    
    // Buscar agendamentos que não têm o campo motivo
    const appointmentsWithoutMotivo = await Appointment.find({
      motivo: { $exists: false }
    });

    console.log(`Encontrados ${appointmentsWithoutMotivo.length} agendamentos sem motivo`);

    // Para cada agendamento, definir um motivo padrão
    for (const appointment of appointmentsWithoutMotivo) {
      await Appointment.updateOne(
        { _id: appointment._id },
        { $set: { motivo: 'Orientações' } } // Motivo padrão
      );
      console.log(`Agendamento ${appointment._id} atualizado com motivo padrão`);
    }

    console.log('Campo motivo adicionado com sucesso aos agendamentos existentes!');
    
  } catch (error) {
    console.error('Erro ao atualizar agendamentos:', error);
  } finally {
    await mongoose.disconnect();
  }
}

addMotivoToExistingAppointments();
