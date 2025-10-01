// Modelo de dados para Usuários do sistema
// Define estrutura, validações e permissões dos diferentes tipos de usuário
import mongoose from 'mongoose';

// Schema do usuário com validações e relacionamentos
const userSchema = new mongoose.Schema({
  // Nome completo do usuário
  name: { type: String, required: true },
  
  // Senha hasheada (nunca armazenar em texto puro)
  password: { type: String, required: true },
  
  // Tipo de usuário que define permissões no sistema
  role: { type: String, enum: ['admin', 'entrevistador', 'recepcao'], required: true },
  
  // Referência ao CRAS onde o usuário trabalha (apenas para entrevistador e recepção)
  cras: { type: mongoose.Schema.Types.ObjectId, ref: 'Cras' },
  
  // Matrícula única para login (deve ser única no sistema)
  matricula: { type: String, required: true, unique: true },
  
  // Configurações de agenda específicas do entrevistador
  agenda: {
    // Horários disponíveis para agendamento (slots de 30 minutos)
    horariosDisponiveis: {
      type: [String],
      default: [
        '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
        '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
      ]
    },
    // Dias da semana para atendimento (1 = Segunda, 2 = Terça, etc.)
    diasAtendimento: {
      type: [Number],
      default: [1, 2, 3, 4, 5] // Segunda a Sexta por padrão
    }
  },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
export default User;
