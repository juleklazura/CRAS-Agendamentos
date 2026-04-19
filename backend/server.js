// Servidor principal da API do Sistema de Agendamentos CRAS
// Refatorado para arquitetura modular

import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import logger, { pseudonymizeIp } from './utils/logger.js';
import prisma from './utils/prisma.js';

// 🔒 SEGURANÇA: Validar configurações de segurança antes de iniciar
import './utils/validateSecrets.js';

// Importação de configurações modulares
import { corsOptions } from './config/cors.js';
import { helmetOptions } from './config/security.js';
import { shouldTrustProxy, globalLimiter } from './config/rateLimiting.js';

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
import statsRoutes from './routes/stats.js';

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
app.use(helmet(helmetOptions));
app.use(securityHeadersMiddleware);
app.use('/api/', globalLimiter);
app.use(express.json({ limit: '100kb' }));
app.use(timeoutMiddleware);
app.use(sanitizationMiddleware);

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cras', crasRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/blocked-slots', blockedSlotRoutes);
app.use('/api/stats', statsRoutes);

// Health Check
app.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch { /* mantém disconnected */ }

  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: dbStatus,
  };

  if (process.env.NODE_ENV !== 'production') {
    healthCheck.uptime = process.uptime();
    healthCheck.environment = process.env.NODE_ENV || 'development';
    healthCheck.version = '1.0.0';
  }

  const statusCode = dbStatus === 'connected' ? 200 : 503;
  res.status(statusCode).json(healthCheck);
});

app.get('/', (req, res) => res.send('API de Agendamento CRAS rodando!'));

const PORT = process.env.PORT || 5000;

// Validar que DATABASE_URL está configurada
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  logger.error('❌ ERRO CRÍTICO: Variável DATABASE_URL não encontrada!');
  logger.error('Configure no arquivo .env:');
  logger.error('  DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.neon.tech/cras?sslmode=require');
  logger.error('');
  logger.error('📌 Crie um projeto gratuito em: https://neon.tech');
  process.exit(1);
}

async function bootstrapAdmin() {
  const adminMatricula = process.env.ADMIN_MATRICULA || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return;

  const count = await prisma.user.count();
  if (count > 0) return;

  const bcrypt = (await import('bcryptjs')).default;
  const hashedPassword = await bcrypt.hash(adminPassword, 12);
  await prisma.user.create({
    data: { name: 'Administrador', matricula: adminMatricula, password: hashedPassword, role: 'admin' },
  });
  logger.success(`Admin '${adminMatricula}' criado com sucesso`);
}

prisma.$connect()
  .then(async () => {
    await bootstrapAdmin();
    app.listen(PORT, '0.0.0.0', () => {
      logger.success(`Servidor rodando na porta ${PORT}`);
      logger.info('PostgreSQL (Neon) conectado com sucesso');
      logger.info(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
    });

    // Mantém o compute do Neon aquecido para evitar cold start (1–3s).
    // Neon hiberna após ~5 min de inatividade — ping a cada 4 min previne isso.
    if (process.env.NODE_ENV === 'production') {
      setInterval(async () => {
        try {
          await prisma.$queryRaw`SELECT 1`;
        } catch (err) {
          logger.warn('Keep-alive Neon: falhou', { error: err.message });
        }
      }, 4 * 60 * 1000);
    }
  })
  .catch((err) => {
    logger.error('Erro ao conectar ao PostgreSQL', err);
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
    ip: pseudonymizeIp(req.ip),
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
    await prisma.$disconnect();
    logger.info('PostgreSQL desconectado com sucesso');
    process.exit(0);
  } catch (err) {
    logger.error('Erro ao encerrar servidor', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
