// =============================================================================
// 🗄️ PRISMA CLIENT SINGLETON
// =============================================================================
// Garante uma única instância do PrismaClient durante toda a vida do processo.
// Previne problemas de conexão em ambientes serverless e hot-reload.

import { PrismaClient } from '@prisma/client';
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
