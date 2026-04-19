// Middleware de autenticação e autorização
// Protege rotas que requerem usuário logado e controla permissões por role
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';
import cache from '../utils/cache.js';
import { getAllowedOrigins } from '../config/cors.js';

// TTL do cache de autenticação: 300 segundos (5 min).
// Reduz queries ao Neon em sessões normais de uso.
// Tradeoff: usuário desativado pode ter acesso por até 5 min após desativação.
const AUTH_CACHE_TTL = 300;

// ========================================
// MIDDLEWARE PRINCIPAL DE AUTENTICAÇÃO
// ========================================
export async function auth(req, res, next) {
  try {
    // ========================================
    // 🔒 VALIDAÇÃO DE ORIGEM (Anti-CSRF adicional)
    // ========================================
    const origin = req.get('origin') || req.get('referer');
    const allowedOrigins = getAllowedOrigins();
    
    if (process.env.NODE_ENV === 'production' && origin) {
      const isAllowedOrigin = allowedOrigins.some(allowed => 
        origin.startsWith(allowed)
      );
      
      if (!isAllowedOrigin) {
        logger.warn('🔒 Tentativa de acesso de origem não autorizada', {
          origin,
          ip: req.ip,
          path: req.path,
          method: req.method
        });
        return res.status(403).json({ 
          message: 'Origem não autorizada',
          code: 'INVALID_ORIGIN'
        });
      }
    }
    
    if (process.env.NODE_ENV === 'development' && !origin) {
      const userAgent = req.get('user-agent') || '';
      const isApiTool = /postman|insomnia|curl|thunder/i.test(userAgent);
      
      if (!isApiTool) {
        logger.warn('⚠️  Requisição sem origin em desenvolvimento', {
          userAgent,
          ip: req.ip,
          path: req.path
        });
      }
    }
    
    // ========================================
    // 🔒 VALIDAÇÃO DE TOKEN JWT
    // ========================================
    const token = req.cookies?.token;
    
    if (!token) {
      logger.debug('Token não encontrado no cookie', {
        ip: req.ip,
        path: req.path
      });
      return res.status(401).json({ 
        message: 'Token não fornecido',
        code: 'NO_TOKEN'
      });
    }
    
    if (!process.env.JWT_SECRET) {
      logger.error('ERRO CRÍTICO: JWT_SECRET não está definido no ambiente');
      return res.status(500).json({ 
        message: 'Erro de configuração do servidor',
        code: 'CONFIG_ERROR'
      });
    }
    
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Sessão expirada. Faça login novamente',
          code: 'TOKEN_EXPIRED'
        });
      }
      if (jwtError.name === 'JsonWebTokenError') {
        logger.warn('🔒 Token JWT inválido detectado', {
          ip: req.ip,
          path: req.path
        });
        return res.status(401).json({ 
          message: 'Token inválido',
          code: 'INVALID_TOKEN'
        });
      }
      throw jwtError;
    }
    
    // ========================================
    // 🔒 VERIFICAÇÃO DE EXISTÊNCIA DO USUÁRIO (com cache)
    // ========================================
    const authCacheKey = `user:auth:${decoded.id}`;
    const userExists = await cache.cached(
      authCacheKey,
      () => prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, role: true, crasId: true, name: true, matricula: true },
      }),
      AUTH_CACHE_TTL
    );
    
    if (!userExists) {
      logger.warn('🔒 Token válido mas usuário não existe mais no sistema', {
        userId: decoded.id,
        ip: req.ip,
        path: req.path
      });
      return res.status(401).json({ 
        message: 'Usuário não encontrado. Faça login novamente',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Adiciona dados ATUALIZADOS do usuário ao objeto request
    // Mantém `cras` como alias de `crasId` para compatibilidade com controllers
    req.user = {
      id: userExists.id,
      role: userExists.role,
      cras: userExists.crasId,
      name: userExists.name,
      matricula: userExists.matricula
    };
    next();
    
  } catch (error) {
    logger.error('Erro no middleware de autenticação:', {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      ip: req.ip,
      path: req.path
    });
    return res.status(500).json({ 
      message: 'Erro no servidor',
      code: 'AUTH_ERROR'
    });
  }
}

// Middleware de autorização por roles
export function authorize(roles = []) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Acesso negado' });
    }
    next();
  };
}
