// Modelo de dados para Agendamentos
// Define estrutura, validações e índices para otimizar consultas no MongoDB
import mongoose from 'mongoose';

// Schema principal do agendamento com todas as validações necessárias
const appointmentSchema = new mongoose.Schema({
  // Referência ao entrevistador responsável
  entrevistador: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Referência ao CRAS onde o atendimento será realizado
  cras: { type: mongoose.Schema.Types.ObjectId, ref: 'Cras', required: true },
  
  // Dados da pessoa que será atendida
  pessoa: { type: String, required: true },        // Nome completo
  cpf: { type: String, required: true },           // CPF (armazenado sem formatação)
  telefone1: { type: String, required: true },     // Telefone principal
  telefone2: { type: String },                     // Telefone secundario (opcional)
  
  // Motivo do atendimento - valores pré-definidos para consistência
  motivo: { 
    type: String, 
    enum: ['Atualização Cadastral', 'Inclusão', 'Transferência de Município', 'Orientações Gerais'], 
    required: true 
  },
  
  // Data e horário do agendamento
  data: { type: Date, required: true },
  
  // Status do agendamento - controla o fluxo do atendimento
  status: { 
    type: String, 
    enum: ['agendado', 'reagendar', 'realizado', 'faltou', 'cancelado'], 
    default: 'agendado' 
  },
  
  // Campo para observações adicionais
  observacoes: { type: String },
  
  // Controle de auditoria - quem criou e modificou
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Timestamps automáticos
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});

// Índices para otimizar consultas frequentes
// Importante para performance com grande volume de dados
appointmentSchema.index({ data: 1 });            // Consultas por data
appointmentSchema.index({ pessoa: 1 });          // Busca por nome da pessoa
appointmentSchema.index({ motivo: 1 });          // Filtragem por motivo
appointmentSchema.index({ cras: 1 });            // Consultas por CRAS
appointmentSchema.index({ entrevistador: 1 });   // Consultas por entrevistador
appointmentSchema.index({ createdBy: 1 });       // Auditoria de criação

// Exportação do modelo para uso nos controllers
const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;
