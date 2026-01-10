// Script temporário para criar admin no MongoDB Atlas
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
console.log('Conectando ao MongoDB Atlas...');

mongoose.connect(uri).then(async () => {
  console.log('✅ Conectado ao MongoDB Atlas!');
  
  // Verificar se tem usuários
  const count = await mongoose.connection.db.collection('users').countDocuments();
  console.log('Usuários no banco Atlas:', count);
  
  if (count === 0) {
    console.log('\n⚠️  Banco vazio! Criando usuário admin...');
    
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    
    await mongoose.connection.db.collection('users').insertOne({
      name: 'Administrador',
      matricula: 'admin',
      password: hashedPassword,
      role: 'admin',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('✅ Usuário admin criado!');
    console.log('   Matrícula: admin');
    console.log('   Senha: Admin123!');
  } else {
    console.log('\n👥 Usuários existentes:');
    const users = await mongoose.connection.db.collection('users').find({}, {projection: {name: 1, matricula: 1, role: 1}}).toArray();
    users.forEach(u => console.log('   -', u.name, '(' + u.matricula + ') -', u.role));
  }
  
  await mongoose.connection.close();
  process.exit(0);
}).catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
