// =============================================================================
// Singleton do PrismaClient.
// Em desenvolvimento, recriações de módulos (HMR) gerariam múltiplas conexões.
// O singleton armazenado em `globalThis` garante que apenas uma instância exista.
// =============================================================================
// Garante uma única instância do PrismaClient durante toda a vida do processo.
// Previne problemas de conexão em ambientes serverless e hot-reload.

import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import logger from './logger.js';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
      ]
    : [{ emit: 'event', level: 'error' }],
});

// Log de queries em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    if (e.duration > 100) {
      logger.debug(`🐢 Query lenta (${e.duration}ms): ${e.query.substring(0, 100)}`);
    }
  });
}

prisma.$on('error', (e) => {
  logger.error('❌ Erro Prisma:', e.message);
});

export default prisma;
