// Servidor principal da API do Sistema de Agendamentos CRAS
// Configura express, middlewares, rotas e conexão com MongoDB

import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import logger from './utils/logger.js';

// 🔒 SEGURANÇA: Validar configurações de segurança antes de iniciar
import './utils/validateSecrets.js';

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
// Habilitar apenas se houver Nginx, CloudFlare, ALB na frente
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
  logger.info('✓ Trust proxy habilitado - IPs reais serão detectados');
} else {
  logger.info('ℹ Trust proxy desabilitado');
}

// 🔒 SEGURANÇA: CORS configurado PRIMEIRO (antes de qualquer outro middleware)
// Isso garante que requisições OPTIONS (preflight) sejam tratadas corretamente
const allowedOrigins = [
  process.env.FRONTEND_URL,
  // URLs do Vercel (pattern para previews e produção)
  ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
  // URLs comuns do Vercel para este projeto
  'https://cras-agendamentos.vercel.app',
  'https://cras-agendamentos-git-main-juleklazuras-projects.vercel.app',
  ...(process.env.NODE_ENV === 'development' ? [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173'
  ] : [])
].filter(Boolean);

// Log das origens permitidas para debug
console.log('🔐 CORS - Origens permitidas:', allowedOrigins);

const corsOptions = {
  origin: function (origin, callback) {
    // 🔒 SEGURANÇA: Requisições sem origin (Postman, cURL, health checks)
    if (!origin) {
      return callback(null, true);
    }
    
    // Validar se origin está na whitelist
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Permitir qualquer subdomínio do Vercel
      const isVercelDomain = origin.match(/https:\/\/.*\.vercel\.app$/);
      if (isVercelDomain) {
        console.log('✅ CORS permitido para Vercel:', origin);
        return callback(null, true);
      }
      
      console.log('❌ CORS bloqueado:', origin);
      callback(new Error('Origem não permitida pelo CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization', 'Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 600 // 10 minutos
};

app.use(cors(corsOptions));

// 🔒 SEGURANÇA: Cookie Parser - necessário para ler cookies httpOnly
app.use(cookieParser());

// 🔒 SEGURANÇA: Rate Limiting Global
// Protege contra ataques de negação de serviço (DoS)
// DESENVOLVIMENTO: Limite mais flexível (produção: 100/15min)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 500, // Dev: 500, Prod: 100
  message: {
    error: 'Muitas requisições deste IP. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

// 🔒 SEGURANÇA: Helmet com configuração completa de headers
app.use(helmet({
  // Content Security Policy - define fontes permitidas para recursos
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // MUI/React precisa de unsafe-inline
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [])].filter(Boolean),
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  // Cross-Origin Policies
  crossOriginEmbedderPolicy: false, // Desabilitado para compatibilidade
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-site" },
  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },
  // Frameguard - previne clickjacking
  frameguard: { action: "deny" },
  // Hide X-Powered-By
  hidePoweredBy: true,
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 ano
    includeSubDomains: true,
    preload: true
  },
  // IE No Open
  ieNoOpen: true,
  // No Sniff
  noSniff: true,
  // Referrer Policy
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  // XSS Filter
  xssFilter: true
}));

// 🔒 SEGURANÇA: Headers adicionais customizados
app.use((req, res, next) => {
  // Permissions Policy - desabilitar recursos não utilizados
  res.setHeader('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=()'
  );
  
  // Cache Control para rotas de API (não cachear dados sensíveis)
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  // Forçar HTTPS em produção
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  
  next();
});

app.use(express.json({ limit: '10mb' }));

// Timeouts
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    logger.warn(`Request timeout: ${req.method} ${req.path} - IP: ${req.ip}`);
  });
  
  res.setTimeout(30000, () => {
    if (!res.headersSent) {
      logger.error(`Response timeout: ${req.method} ${req.path} - IP: ${req.ip}`);
      res.status(408).json({ error: 'Tempo de requisição excedido' });
    }
  });
  
  next();
});

// Sanitização
const sanitizeInput = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeInput(item));
  }
  
  Object.keys(obj).forEach(key => {
    if (key.includes('$') || key.includes('.')) {
      delete obj[key];
      logger.security(`Campo removido (chave perigosa): ${key}`);
      return;
    }
    
    if (typeof obj[key] === 'string') {
      const value = obj[key];
      
      const isISODate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value);
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      const isURL = /^https?:\/\/.+/.test(value);
      const isDecimal = /^\d+\.\d+$/.test(value);
      const isVersion = /^\d+\.\d+\.\d+$/.test(value);
      const isCPF = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value);
      
      const isSafePattern = isISODate || isEmail || isURL || isDecimal || isVersion || isCPF;
      
      const hasMongoDollar = /\$[\w]+/.test(value);
      const hasDotNotation = /^[\w]+\.[\w]+/.test(value) && !isSafePattern;
      
      if (hasMongoDollar || hasDotNotation) {
        logger.security(`🚨 Injeção NoSQL detectada - Campo: ${key}, Valor: ${value.substring(0, 50)}`);
        delete obj[key];
        return;
      }
    } else if (Array.isArray(obj[key])) {
      obj[key] = sanitizeInput(obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      obj[key] = sanitizeInput(obj[key]);
    }
  });
  
  return obj;
};

app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    sanitizeInput(req.body);
  }
  
  const checkDangerousChars = (obj, source) => {
    if (!obj || typeof obj !== 'object') return false;
    
    for (const key in obj) {
      if (key.includes('$') || key.includes('.')) {
        logger.security(`🚨 Tentativa de injeção detectada em ${source} - Campo: ${key}`);
        return true;
      }
      
      if (typeof obj[key] === 'string') {
        const value = obj[key];
        
        const isISODate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value);
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        const isURL = /^https?:\/\/.+/.test(value);
        const isDecimal = /^\d+\.\d+$/.test(value);
        const isVersion = /^\d+\.\d+\.\d+$/.test(value);
        const isCPF = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value);
        
        const isSafe = isISODate || isEmail || isURL || isDecimal || isVersion || isCPF;
        
        const hasMongoDollar = /\$[\w]+/.test(value);
        const hasDotNotation = /^[\w]+\.[\w]+/.test(value) && !isSafe;
        
        if (hasMongoDollar || hasDotNotation) {
          logger.security(`🚨 Tentativa de injeção detectada em ${source} - Campo: ${key}, Valor: ${value.substring(0, 50)}`);
          return true;
        }
      }
      
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (checkDangerousChars(obj[key], source)) {
          return true;
        }
      }
    }
    return false;
  };
  
  if (checkDangerousChars(req.query, 'query')) {
    return res.status(400).json({ error: 'Requisição contém caracteres não permitidos' });
  }
  
  if (checkDangerousChars(req.params, 'params')) {
    return res.status(400).json({ error: 'Requisição contém caracteres não permitidos' });
  }
  
  next();
});

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
