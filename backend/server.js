// Servidor principal da API do Sistema de Agendamentos CRAS
// Configura express, middlewares, rotas e conexão com MongoDB
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

// Importação das rotas organizadas por funcionalidade
import authRoutes from './routes/auth.js';           // Autenticação e login
import userRoutes from './routes/user.js';           // Gerenciamento de usuários
import crasRoutes from './routes/cras.js';           // Gerenciamento de unidades CRAS
import appointmentRoutes from './routes/appointment.js'; // Agendamentos
import logRoutes from './routes/log.js';             // Sistema de logs
import blockedSlotRoutes from './routes/blockedSlot.js'; // Bloqueios de horário

// Carrega variáveis de ambiente
dotenv.config();

// Inicializa aplicação Express
const app = express();

// Middlewares globais
app.use(cors());           // Permite requisições cross-origin
app.use(express.json());   // Parse de JSON nas requisições

// Configuração das rotas da API
app.use('/api/auth', authRoutes);           // /api/auth/* - Autenticação
app.use('/api/users', userRoutes);          // /api/users/* - Usuários
app.use('/api/cras', crasRoutes);           // /api/cras/* - CRAS
app.use('/api/appointments', appointmentRoutes); // /api/appointments/* - Agendamentos
app.use('/api/logs', logRoutes);            // /api/logs/* - Logs
app.use('/api/blocked-slots', blockedSlotRoutes); // /api/blocked-slots/* - Bloqueios

// Rota raiz para verificar se a API está funcionando
app.get('/', (req, res) => res.send('API de Agendamento CRAS rodando!'));

// Configuração da porta
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/agendamentos')
.then(() => {
  app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
})
.catch((err) => console.error('Erro ao conectar ao MongoDB:', err));
