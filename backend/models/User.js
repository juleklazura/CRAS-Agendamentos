import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'entrevistador', 'recepcao'], required: true },
  cras: { type: mongoose.Schema.Types.ObjectId, ref: 'Cras' }, // Apenas para entrevistador e recepção
  matricula: { type: String, required: true, unique: true },
  agenda: {
    horariosDisponiveis: {
      type: [String],
      default: [
        '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
        '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
      ]
    },
    diasAtendimento: {
      type: [Number], // 1 = Segunda, 2 = Terça, etc.
      default: [1, 2, 3, 4, 5] // Segunda a Sexta por padrão
    }
  },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
export default User;
