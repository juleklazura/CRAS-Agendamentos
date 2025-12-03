import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agendamentos';

async function updateCreatedByField() {
  try {
    await mongoose.connect(MONGO_URI);
    
    // Buscar agendamentos que não têm createdBy
    const appointmentsWithoutCreatedBy = await Appointment.find({
      createdBy: { $exists: false }
    }).populate('entrevistador');

    console.log(`Encontrados ${appointmentsWithoutCreatedBy.length} agendamentos sem createdBy`);

    // Para cada agendamento, definir o entrevistador como quem criou
    for (const appointment of appointmentsWithoutCreatedBy) {
      if (appointment.entrevistador) {
        await Appointment.updateOne(
          { _id: appointment._id },
          { $set: { createdBy: appointment.entrevistador._id } }
        );
        console.log(`Agendamento ${appointment._id} atualizado - createdBy: ${appointment.entrevistador.name}`);
      }
    }

    // Buscar agendamentos que têm createdBy null
    const appointmentsWithNullCreatedBy = await Appointment.find({
      createdBy: null
    }).populate('entrevistador');

    console.log(`Encontrados ${appointmentsWithNullCreatedBy.length} agendamentos com createdBy null`);

    // Para cada agendamento, definir o entrevistador como quem criou
    for (const appointment of appointmentsWithNullCreatedBy) {
      if (appointment.entrevistador) {
        await Appointment.updateOne(
          { _id: appointment._id },
          { $set: { createdBy: appointment.entrevistador._id } }
        );
        console.log(`Agendamento ${appointment._id} atualizado - createdBy: ${appointment.entrevistador.name}`);
      }
    }

    console.log('Campos createdBy atualizados com sucesso!');
    
  } catch (error) {
    console.error('Erro ao atualizar createdBy:', error);
  } finally {
    await mongoose.disconnect();
  }
}

updateCreatedByField();
