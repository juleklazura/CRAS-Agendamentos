import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/agendamentos';

async function createAdmin() {
  await mongoose.connect(MONGO_URI);
  const hash = await bcrypt.hash('12345678', 10);
  const exists = await User.findOne({ matricula: 'admin' });
  if (!exists) {
    await User.create({ name: 'Administrador', matricula: 'admin', password: hash, role: 'admin' });
    console.log('Usuário admin criado com sucesso!');
  } else {
    console.log('Usuário admin já existe.');
  }
  await mongoose.disconnect();
}

createAdmin();
