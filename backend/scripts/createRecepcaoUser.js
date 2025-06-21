import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Cras from '../models/Cras.js';

const MONGO_URI = 'mongodb://localhost:27017/agendamentos';

async function createRecepcaoUser() {
  try {
    await mongoose.connect(MONGO_URI);
    
    // Buscar um CRAS existente
    const cras = await Cras.findOne();
    if (!cras) {
      console.log('Nenhum CRAS encontrado. Criando um CRAS primeiro...');
      return;
    }

    // Verificar se já existe um usuário de recepção
    const existingUser = await User.findOne({ matricula: 'REC001' });
    if (existingUser) {
      console.log('Usuário de recepção já existe!');
      return;
    }

    // Criar usuário de recepção
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    const recepcaoUser = new User({
      name: 'Recepção Teste',
      password: hashedPassword,
      role: 'recepcao',
      cras: cras._id,
      matricula: 'REC001'
    });

    await recepcaoUser.save();
    
    console.log('Usuário de recepção criado com sucesso!');
    console.log('Matrícula: REC001');
    console.log('Senha: 123456');
    console.log('CRAS:', cras.nome);
    
  } catch (error) {
    console.error('Erro ao criar usuário de recepção:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createRecepcaoUser();
