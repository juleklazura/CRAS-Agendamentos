import mongoose from 'mongoose';

const blockedSlotSchema = new mongoose.Schema({
  entrevistador: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cras: { type: mongoose.Schema.Types.ObjectId, ref: 'Cras', required: true },
  data: { type: Date, required: true },
  motivo: { type: String }
});

const BlockedSlot = mongoose.model('BlockedSlot', blockedSlotSchema);
export default BlockedSlot;
