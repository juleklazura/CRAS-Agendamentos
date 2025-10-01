// Modelo de dados para sistema de logs e auditoria
// Registra todas as ações importantes realizadas no sistema
import mongoose from 'mongoose';

// Schema para registro de ações com dados de auditoria
const logSchema = new mongoose.Schema({
  // Usuário que realizou a ação
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // CRAS relacionado à ação (se aplicável)
  cras: { type: mongoose.Schema.Types.ObjectId, ref: 'Cras' },
  
  // Tipo de ação realizada (login, criar_agendamento, etc.)
  action: { type: String, required: true },
  
  // Detalhes específicos da ação para contexto
  details: { type: String, required: true },
  
  // Timestamp automático da ação
  date: { type: Date, default: Date.now }
});

// Índices para otimizar consultas de auditoria
logSchema.index({ date: -1 });    // Ordenação por data (mais recente primeiro)
logSchema.index({ user: 1 });     // Consultas por usuário
logSchema.index({ cras: 1 });     // Consultas por CRAS
logSchema.index({ action: 1 });   // Filtragem por tipo de ação

// Exportação do modelo
const Log = mongoose.model('Log', logSchema);
export default Log;
