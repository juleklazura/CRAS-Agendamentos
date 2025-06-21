import mongoose from 'mongoose';
import User from '../models/User.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/agendamentos';

async function listUsers() {
  await mongoose.connect(MONGO_URI);
  const users = await User.find({}, { name: 1, matricula: 1, role: 1 });
  console.log('Usuários cadastrados:');
  users.forEach(u => console.log(u));
  await mongoose.disconnect();
}

listUsers();
