import mongoose from 'mongoose';
import User from '../models/User.js';
import Cras from '../models/Cras.js';
import Appointment from '../models/Appointment.js';

const MONGO_URI = 'mongodb://localhost:27017/agendamentos';

async function testarCriacaoAgendamento() {
  try {
    await mongoose.connect(MONGO_URI);
    
    console.log('=== TESTANDO CRIAÇÃO DE AGENDAMENTO ===');
    
    // Buscar entrevistador de teste
    const entrevistador = await User.findOne({ matricula: 'entrevistador' });
    console.log('Entrevistador encontrado:', entrevistador?.name, 'CRAS ID:', entrevistador?.cras);
    
    if (!entrevistador) {
      console.log('❌ Entrevistador não encontrado!');
      return;
    }
    
    // Buscar CRAS
    const cras = await Cras.findById(entrevistador.cras);
    console.log('CRAS encontrado:', cras?.nome);
    
    if (!cras) {
      console.log('❌ CRAS não encontrado!');
      return;
    }
    
    // Criar dados de teste similar ao frontend
    const agora = new Date();
    const proximaSegunda = new Date(agora);
    proximaSegunda.setDate(agora.getDate() + (1 + 7 - agora.getDay()) % 7); // Próxima segunda
    proximaSegunda.setHours(10, 0, 0, 0); // 10:00
    
    const dadosAgendamento = {
      entrevistador: entrevistador._id,
      cras: entrevistador.cras,
      pessoa: 'Teste Usuario',
      cpf: '12345678901',
      telefone1: '11999999999',
      telefone2: '',
      motivo: 'Atualização Cadastral',
      data: proximaSegunda,
      status: 'agendado',
      observacoes: 'Teste de agendamento via script',
      createdBy: entrevistador._id
    };
    
    console.log('Dados para criar agendamento:', JSON.stringify(dadosAgendamento, null, 2));
    
    // Tentar criar agendamento
    const novoAgendamento = new Appointment(dadosAgendamento);
    await novoAgendamento.save();
    
    console.log('✅ Agendamento criado com sucesso!', novoAgendamento._id);
    
    // Limpar o teste - remover o agendamento criado
    await Appointment.findByIdAndDelete(novoAgendamento._id);
    console.log('🧹 Agendamento de teste removido');
    
  } catch (error) {
    console.error('❌ Erro ao testar criação de agendamento:', error);
    console.error('Detalhes do erro:', error.message);
    if (error.errors) {
      console.error('Erros de validação:', error.errors);
    }
  } finally {
    await mongoose.disconnect();
  }
}

testarCriacaoAgendamento();
