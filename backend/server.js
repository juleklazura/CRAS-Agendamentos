// Servidor principal da API do Sistema de Agendamentos CRAS
// Refatorado para arquitetura modular

import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import logger from './utils/logger.js';

// 🔒 SEGURANÇA: Validar configurações de segurança antes de iniciar
import './utils/validateSecrets.js';

// Importação de configurações modulares
import { corsOptions } from './config/cors.js';
import { helmetOptions } from './config/security.js';
import { globalLimiter, shouldTrustProxy } from './config/rateLimiting.js';

// Importação de middlewares modulares
import { sanitizationMiddleware } from './middlewares/sanitization.js';
import { timeoutMiddleware } from './middlewares/timeout.js';
import { securityHeadersMiddleware } from './middlewares/securityHeaders.js';

// Importação das rotas organizadas por funcionalidade
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import crasRoutes from './routes/cras.js';
import appointmentRoutes from './routes/appointment.js';
import logRoutes from './routes/log.js';
import blockedSlotRoutes from './routes/blockedSlot.js';

// Carrega variáveis de ambiente
dotenv.config();

// Inicializa aplicação Express
const app = express();

// ========================================
// 🔒 CONFIGURAÇÃO DE PROXY REVERSO
// ========================================
if (shouldTrustProxy()) {
  app.set('trust proxy', 1);
  logger.info('✓ Trust proxy habilitado - IPs reais serão detectados');
} else {
  logger.info('ℹ Trust proxy desabilitado');
}

// ========================================
// 🔒 MIDDLEWARES DE SEGURANÇA
// ========================================
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(globalLimiter);
app.use(helmet(helmetOptions));
app.use(securityHeadersMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(timeoutMiddleware);
app.use(sanitizationMiddleware);

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cras', crasRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/blocked-slots', blockedSlotRoutes);

// Health Check
app.get('/health', (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };
  
  if (process.env.NODE_ENV !== 'production') {
    healthCheck.uptime = process.uptime();
    healthCheck.environment = process.env.NODE_ENV || 'development';
    healthCheck.version = '1.0.0';
  }
  
  const statusCode = healthCheck.mongodb === 'connected' ? 200 : 503;
  res.status(statusCode).json(healthCheck);
});

app.get('/', (req, res) => res.send('API de Agendamento CRAS rodando!'));

const PORT = process.env.PORT || 5000;

// Obter URI de conexão MongoDB Atlas
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  logger.error('❌ ERRO CRÍTICO: Variável MONGODB_URI não encontrada!');
  logger.error('Configure no arquivo .env:');
  logger.error('  MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/database?retryWrites=true&w=majority');
  logger.error('');
  logger.error('📌 Obtenha sua URI em: https://cloud.mongodb.com');
  process.exit(1);
}

// Validar formato MongoDB Atlas (mongodb+srv://)
if (!mongoUri.startsWith('mongodb+srv://')) {
  logger.error('❌ ERRO: Este sistema requer MongoDB Atlas!');
  logger.error('  A URI deve começar com: mongodb+srv://');
  logger.error('  Formato: mongodb+srv://user:pass@cluster.mongodb.net/database?retryWrites=true&w=majority');
  logger.error('');
  logger.error('📌 Crie um cluster gratuito em: https://cloud.mongodb.com');
  process.exit(1);
}

// Configuração otimizada para MongoDB Atlas (Free Tier M0)
const mongooseOptions = {
  retryWrites: true,
  w: 'majority',
  maxPoolSize: 10,      // Atlas M0 suporta até 500 conexões
  minPoolSize: 2,
  serverSelectionTimeoutMS: 10000,  // Aumentado para cold starts
  socketTimeoutMS: 45000,
  heartbeatFrequencyMS: 30000,      // Manter conexão ativa
  maxIdleTimeMS: 60000              // Tempo máximo de conexão ociosa
};

mongoose.connect(mongoUri, mongooseOptions)
.then(() => {
  app.listen(PORT, () => {
    logger.success(`Servidor rodando na porta ${PORT}`);
    logger.info('MongoDB conectado com sucesso');
  });
})
.catch((err) => {
  logger.error('Erro ao conectar ao MongoDB', err);
  process.exit(1);
});

// ========================================
// 🔒 MIDDLEWARE DE ERRO GLOBAL
// ========================================
// DEVE SER O ÚLTIMO MIDDLEWARE (após todas as rotas)
app.use((err, req, res, next) => {
  // Logar erro completo internamente
  logger.error('❌ Erro não tratado:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id || req.userId || 'não autenticado',
    userAgent: req.headers['user-agent']
  });
  
  // 🔒 SEGURANÇA: Nunca expor detalhes internos em produção
  if (process.env.NODE_ENV === 'production') {
    return res.status(err.status || 500).json({ 
      message: 'Erro interno do servidor',
      code: 'ERR_INTERNAL',
      timestamp: new Date().toISOString()
    });
  }
  
  // Em desenvolvimento: retornar detalhes completos
  res.status(err.status || 500).json({ 
    message: err.message,
    stack: err.stack,
    errors: err.errors
  });
});

// ========================================
// 🔒 HANDLERS DE ERROS NÃO CAPTURADOS
// ========================================
// Handler de exceções não capturadas
process.on('uncaughtException', (error) => {
  logger.error('🚨 Uncaught Exception:', {
    message: error.message,
    stack: error.stack
  });
  
  // Dar tempo para logs serem escritos
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Handler de promises rejeitadas não tratadas
process.on('unhandledRejection', (reason, promise) => {
  logger.error('🚨 Unhandled Rejection:', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined
  });
});

// ========================================
// 🔒 GRACEFUL SHUTDOWN
// ========================================
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} recebido, encerrando servidor gracefully...`);
  
  try {
    await mongoose.connection.close();
    logger.info('MongoDB desconectado com sucesso');
    process.exit(0);
  } catch (err) {
    logger.error('Erro ao encerrar servidor', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
