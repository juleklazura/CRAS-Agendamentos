import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/agendamentos';

async function dropEmailIndex() {
  await mongoose.connect(MONGO_URI);
  try {
    await mongoose.connection.db.collection('users').dropIndex('email_1');
    console.log('Índice único do campo email removido com sucesso!');
  } catch (_) {
    if (err.codeName === 'IndexNotFound') {
      console.log('Índice email_1 já não existe.');
    } else {
      console.error('Erro ao remover índice:', err.message);
    }
  }
  await mongoose.disconnect();
}

dropEmailIndex();
