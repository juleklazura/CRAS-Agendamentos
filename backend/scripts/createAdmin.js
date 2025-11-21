import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cras-agendamentos';

async function createAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    
    const hash = await bcrypt.hash('12345678', 10);
    const exists = await User.findOne({ matricula: 'admin' });
    
    if (!exists) {
      await User.create({ 
        name: 'Administrador', 
        matricula: 'admin', 
        password: hash, 
        role: 'admin' 
        // Sem CRAS - admin não precisa
      });
      console.log('✅ Usuário admin criado com sucesso!');
      console.log('   Matrícula: admin');
      console.log('   Senha: 12345678');
    } else {
      console.log('⚠️  Usuário admin já existe.');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Erro ao criar admin:', error.message);
    await mongoose.disconnect();
  }
}

createAdmin();
