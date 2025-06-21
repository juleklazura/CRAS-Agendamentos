import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  entrevistador: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cras: { type: mongoose.Schema.Types.ObjectId, ref: 'Cras', required: true },
  pessoa: { type: String, required: true },
  cpf: { type: String, required: true },
  telefone1: { type: String, required: true },
  telefone2: { type: String },
  motivo: { type: String, enum: ['Atualização', 'Inclusão', 'Transferência', 'Orientações'], required: true },
  data: { type: Date, required: true },
  status: { type: String, enum: ['agendado', 'reagendar', 'realizado', 'faltou', 'cancelado'], default: 'agendado' },
  observacoes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});

appointmentSchema.index({ data: 1 });
appointmentSchema.index({ pessoa: 1 });
appointmentSchema.index({ motivo: 1 });
appointmentSchema.index({ cras: 1 });
appointmentSchema.index({ entrevistador: 1 });
appointmentSchema.index({ createdBy: 1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;
