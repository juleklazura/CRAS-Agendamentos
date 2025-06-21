import mongoose from 'mongoose';
import User from '../models/User.js';
import Cras from '../models/Cras.js';

const MONGO_URI = 'mongodb://localhost:27017/agendamentos';

async function verificarUsuarios() {
  try {
    await mongoose.connect(MONGO_URI);
    
    console.log('=== VERIFICANDO USUÁRIOS ===');
    
    // Buscar todos os usuários
    const usuarios = await User.find().populate('cras');
    console.log('\nTodos os usuários:');
    usuarios.forEach(user => {
      console.log(`- ${user.name} (${user.matricula}) - Role: ${user.role} - CRAS: ${user.cras?.nome || 'N/A'}`);
    });
    
    // Buscar especificamente usuários de recepção
    const recepcao = await User.find({ role: 'recepcao' }).populate('cras');
    console.log('\n=== USUÁRIOS DE RECEPÇÃO ===');
    recepcao.forEach(user => {
      console.log(`- ${user.name} (${user.matricula})`);
      console.log(`  CRAS ID: ${user.cras?._id || 'N/A'}`);
      console.log(`  CRAS Nome: ${user.cras?.nome || 'N/A'}`);
    });
    
    // Buscar entrevistadores
    const entrevistadores = await User.find({ role: 'entrevistador' }).populate('cras');
    console.log('\n=== ENTREVISTADORES ===');
    entrevistadores.forEach(user => {
      console.log(`- ${user.name} (${user.matricula})`);
      console.log(`  CRAS ID: ${user.cras?._id || 'N/A'}`);
      console.log(`  CRAS Nome: ${user.cras?.nome || 'N/A'}`);
    });
    
    // Buscar todos os CRAS
    const allCras = await Cras.find();
    console.log('\n=== TODOS OS CRAS ===');
    allCras.forEach(cras => {
      console.log(`- ${cras.nome} (ID: ${cras._id})`);
    });
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await mongoose.disconnect();
  }
}

verificarUsuarios();
