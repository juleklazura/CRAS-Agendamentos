// Modelo de dados para unidades CRAS
// Define estrutura básica das unidades do Centro de Referência de Assistência Social
import mongoose from 'mongoose';

// Schema simples para dados básicos da unidade CRAS
const crasSchema = new mongoose.Schema({
  // Nome oficial da unidade CRAS
  nome: { type: String, required: true },
  
  // Endereço completo da unidade
  endereco: { type: String, required: true },
  
  // Telefone de contato (opcional)
  telefone: { type: String },
});

// Índice para busca por nome
crasSchema.index({ nome: 1 });

// Exportação do modelo
const Cras = mongoose.model('Cras', crasSchema);
export default Cras;
