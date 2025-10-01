// Modelo de dados para horários bloqueados
// Permite que entrevistadores bloqueiem horários específicos em suas agendas
import mongoose from 'mongoose';

// Schema para bloqueio de horários na agenda
const blockedSlotSchema = new mongoose.Schema({
  // Entrevistador que criou o bloqueio
  entrevistador: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // CRAS onde o bloqueio se aplica
  cras: { type: mongoose.Schema.Types.ObjectId, ref: 'Cras', required: true },
  
  // Data e horário exato do bloqueio
  data: { type: Date, required: true },
  
  // Motivo do bloqueio (opcional, para contexto)
  motivo: { type: String },
  
  // Timestamps automáticos
  createdAt: { type: Date, default: Date.now }
});

// Índices para otimizar consultas de disponibilidade
blockedSlotSchema.index({ data: 1 });            // Consultas por data
blockedSlotSchema.index({ entrevistador: 1 });   // Bloqueios por entrevistador
blockedSlotSchema.index({ cras: 1 });            // Bloqueios por CRAS

// Exportação do modelo
const BlockedSlot = mongoose.model('BlockedSlot', blockedSlotSchema);
export default BlockedSlot;
