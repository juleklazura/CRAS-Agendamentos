// Modelo de dados para Agendamentos
// Define estrutura, validações e índices para otimizar consultas no MongoDB
import mongoose from 'mongoose';
import { validarCPF, validarTelefone } from '../utils/validators.js';
import EncryptionService from '../utils/encryption.js';

// Schema principal do agendamento com todas as validações necessárias
const appointmentSchema = new mongoose.Schema({
  // Referência ao entrevistador responsável
  entrevistador: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Referência ao CRAS onde o atendimento será realizado
  cras: { type: mongoose.Schema.Types.ObjectId, ref: 'Cras', required: true },
  
  // Dados da pessoa que será atendida (CRIPTOGRAFADOS)
  pessoa: { 
    type: String, 
    required: true,
    get: function(v) {
      return v && EncryptionService.isEncrypted(v) ? EncryptionService.decrypt(v) : v;
    },
    set: function(v) {
      return v ? EncryptionService.encrypt(v) : v;
    }
  },        // Nome completo (criptografado)
  
  cpf: { 
    type: String, 
    required: [true, 'CPF é obrigatório'],
    validate: {
      validator: function(v) {
        // Validar antes de criptografar
        const decrypted = EncryptionService.isEncrypted(v) ? EncryptionService.decrypt(v) : v;
        return validarCPF(decrypted);
      },
      message: 'CPF inválido. Verifique os dígitos e tente novamente.'
    },
    get: function(v) {
      return v && EncryptionService.isEncrypted(v) ? EncryptionService.decrypt(v) : v;
    },
    set: function(v) {
      return v ? EncryptionService.encrypt(v) : v;
    }
  },           // CPF (criptografado)
  
  cpfHash: { 
    type: String
  },  // Hash do CPF para buscas (não criptografado)
  
  telefone1: { 
    type: String, 
    required: [true, 'Telefone é obrigatório'],
    validate: {
      validator: function(v) {
        // Validar antes de criptografar
        const decrypted = EncryptionService.isEncrypted(v) ? EncryptionService.decrypt(v) : v;
        return validarTelefone(decrypted);
      },
      message: 'Telefone inválido. Use o formato (XX) XXXXX-XXXX'
    },
    get: function(v) {
      return v && EncryptionService.isEncrypted(v) ? EncryptionService.decrypt(v) : v;
    },
    set: function(v) {
      return v ? EncryptionService.encrypt(v) : v;
    }
  },     // Telefone principal (criptografado)
  
  telefone2: { 
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true;
        const decrypted = EncryptionService.isEncrypted(v) ? EncryptionService.decrypt(v) : v;
        return validarTelefone(decrypted);
      },
      message: 'Telefone 2 inválido. Use o formato (XX) XXXXX-XXXX'
    },
    get: function(v) {
      return v && EncryptionService.isEncrypted(v) ? EncryptionService.decrypt(v) : v;
    },
    set: function(v) {
      return v ? EncryptionService.encrypt(v) : v;
    }
  },                     // Telefone secundario (opcional, criptografado)
  
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
    enum: ['agendado', 'realizado', 'ausente'], 
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
}, {
  // Habilitar getters para descriptografar automaticamente
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Middleware para gerar hash do CPF antes de salvar (para buscas)
appointmentSchema.pre('save', function(next) {
  if (this.isModified('cpf')) {
    // Descriptografar CPF para criar hash
    const cpfDecrypted = EncryptionService.decrypt(this.cpf);
    this.cpfHash = EncryptionService.hash(cpfDecrypted);
  }
  next();
});

// Índices para otimizar consultas frequentes
// Importante para performance com grande volume de dados
appointmentSchema.index({ data: 1 });            // Consultas por data
appointmentSchema.index({ cpfHash: 1 });         // Busca por CPF (usando hash)
appointmentSchema.index({ motivo: 1 });          // Filtragem por motivo
appointmentSchema.index({ cras: 1 });            // Consultas por CRAS
appointmentSchema.index({ entrevistador: 1 });   // Consultas por entrevistador
appointmentSchema.index({ createdBy: 1 });       // Auditoria de criação

// ========================================
// 🔒 ÍNDICE ÚNICO COMPOSTO - PREVINE RACE CONDITIONS
// ========================================
// MongoDB garante atomicidade ao nível de documento
// Se dois requests simultâneos tentarem o mesmo slot, apenas um sucederá
// O segundo receberá erro de duplicata (código 11000)
appointmentSchema.index(
  { 
    entrevistador: 1, 
    data: 1
  },
  { 
    unique: true,
    name: 'unique_appointment_slot',
    // Permite reagendar slots cancelados/faltou/realizado
    // Apenas status ativos bloqueiam o horário
    partialFilterExpression: { 
      status: { $in: ['agendado', 'reagendar'] }
    }
  }
);

// Exportação do modelo para uso nos controllers
const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;
