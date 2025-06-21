import mongoose from 'mongoose';

const crasSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  endereco: { type: String, required: true },
  telefone: { type: String },
});

const Cras = mongoose.model('Cras', crasSchema);
export default Cras;
