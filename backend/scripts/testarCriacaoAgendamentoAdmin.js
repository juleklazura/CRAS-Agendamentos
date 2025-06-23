import mongoose from 'mongoose';
import User from '../models/User.js';
import Cras from '../models/Cras.js';
import axios from 'axios';

const MONGO_URI = 'mongodb://localhost:27017/agendamentos';

async function testarCriacaoAgendamentoAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    
    console.log('=== TESTANDO CRIAÇÃO DE AGENDAMENTO COMO ADMIN ===');
    
    // Buscar admin
    const admin = await User.findOne({ role: 'admin' });
    console.log('Admin encontrado:', admin?.name, 'ID:', admin?._id);
    
    // Buscar entrevistador
    const entrevistador = await User.findOne({ role: 'entrevistador' }).populate('cras');
    console.log('Entrevistador encontrado:', entrevistador?.name, 'ID:', entrevistador?._id);
    console.log('CRAS do entrevistador:', entrevistador?.cras?.nome, 'ID:', entrevistador?.cras?._id);
    
    if (!admin || !entrevistador) {
      console.log('❌ Admin ou entrevistador não encontrado!');
      return;
    }
    
    // Simular dados que seriam enviados
    const agora = new Date();
    const proximaSegunda = new Date(agora);
    proximaSegunda.setDate(agora.getDate() + (1 + 7 - agora.getDay()) % 7);
    proximaSegunda.setHours(10, 0, 0, 0);
    
    const dadosParaEnvio = {
      entrevistador: entrevistador._id,
      cras: entrevistador.cras._id,
      pessoa: 'Teste Admin',
      cpf: '12345678901',
      telefone1: '11999999999',
      telefone2: '',
      motivo: 'Atualização Cadastral',
      data: proximaSegunda,
      status: 'agendado',
      observacoes: 'Teste de agendamento criado pelo admin'
    };
    
    console.log('\\n📤 Dados que seriam enviados:');
    console.log(JSON.stringify(dadosParaEnvio, null, 2));
    
    // Simular login do admin para pegar token
    console.log('\\n🔐 Fazendo login como admin...');
    let token;
    try {
      const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
        matricula: admin.matricula,
        password: '123456' // Tentar senha padrão
      });
      token = loginResponse.data.token;
    } catch (loginError) {
      console.log('❌ Falha com senha 123456, tentando admin123...');
      try {
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
          matricula: admin.matricula,
          password: 'admin123'
        });
        token = loginResponse.data.token;
      } catch (loginError2) {
        console.log('❌ Falha com admin123, tentando admin...');
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
          matricula: admin.matricula,
          password: 'admin'
        });
        token = loginResponse.data.token;
      }
    }
    console.log('✅ Token obtido:', token ? 'Sucesso' : 'Falhou');
    
    // Tentar criar agendamento
    console.log('\\n📝 Tentando criar agendamento...');
    const response = await axios.post('http://localhost:5000/api/appointments', dadosParaEnvio, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Agendamento criado com sucesso!', response.data._id);
    
    // Limpar o teste
    await axios.delete(`http://localhost:5000/api/appointments/${response.data._id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('🧹 Agendamento de teste removido');
    
  } catch (error) {
    console.error('❌ Erro ao testar criação de agendamento:', error.message);
    if (error.response) {
      console.error('📜 Status:', error.response.status);
      console.error('📋 Dados da resposta:', JSON.stringify(error.response.data, null, 2));
    }
  } finally {
    await mongoose.disconnect();
  }
}

testarCriacaoAgendamentoAdmin();
