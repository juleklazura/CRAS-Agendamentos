// Rate limiters específicos por operação.
// O rate limiter global (100 req/15min por IP) é definido em config/rateLimiting.js.
// Aqui ficam os limiters com janelas e chaves mais restritivas por endpoint.
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import logger, { pseudonymizeIp } from '../utils/logger.js';

/**
 * Limiter de login por IP.
 * Janela curta e limite baixo para mitigar força bruta contra credenciais.
 * Em desenvolvimento o limite é mais permissivo para não atrapalhar testes.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 20,
  message: {
    error: 'Muitas tentativas de login. Por segurança, tente novamente em 15 minutos.',
    code: 'TOO_MANY_LOGIN_ATTEMPTS'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit excedido — login por IP', { 
      ip: pseudonymizeIp(req.ip), 
      userAgent: req.get('user-agent')
    });
    res.status(429).json({
      error: 'Muitas tentativas de login. Por segurança, tente novamente em 15 minutos.',
      code: 'TOO_MANY_LOGIN_ATTEMPTS',
      retryAfter: '15 minutos'
    });
  }
});

/**
 * Limiter para criação de recursos genéricos (usuários, CRAS).
 * 20 criações por hora por IP.
 */
export const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: {
    error: 'Muitas criações em pouco tempo. Aguarde um pouco antes de tentar novamente.',
    code: 'TOO_MANY_CREATES'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

/**
 * Limiter para operações de exclusão. Mais restritivo para prevenir exclusões em massa.
 * Admins ficam isentos pois são responsáveis pelo gerenciamento da base.
 */
export const deleteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    error: 'Muitas exclusões em pouco tempo. Aguarde antes de tentar novamente.',
    code: 'TOO_MANY_DELETES'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.user?.role === 'admin';
  },
  handler: (req, res) => {
    logger.warn('Rate limit de exclusões atingido', {
      userId: req.user?.id,
      ip: pseudonymizeIp(req.ip),
      userAgent: req.headers['user-agent']
    });
    res.status(429).json({
      message: 'Muitas exclusões em pouco tempo. Aguarde antes de tentar novamente.',
      code: 'TOO_MANY_DELETES',
      retryAfter: '1 hora'
    });
  }
});

/**
 * Limiter para exportação de dados.
 * Previne sobrecarga de processamento e possível exfiltração massiva de dados pessoais (LGPD).
 * 5 exportações a cada 10 minutos por IP.
 */
export const exportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: {
    error: 'Muitas exportações em pouco tempo. Aguarde alguns minutos.',
    code: 'TOO_MANY_EXPORTS'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Limiter para criação de agendamentos.
 * Chave por IP; admin fica isento. Limite alto porque a recepção
 * pode criar muitos agendamentos em sequência durante um dia de trabalho.
 */
export const createAppointmentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { 
    message: 'Limite de criação de agendamentos atingido. Tente novamente em 15 minutos',
    code: 'RATE_LIMIT_APPOINTMENTS'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.user?.role === 'admin';
  },
  handler: (req, res) => {
    logger.warn('Rate limit de agendamentos atingido', {
      userId: req.user?.id || req.userId,
      ip: pseudonymizeIp(req.ip),
      userAgent: req.headers['user-agent']
    });
    res.status(429).json({
      message: 'Limite de criação de agendamentos atingido. Tente novamente em 15 minutos',
      code: 'RATE_LIMIT_APPOINTMENTS',
      retryAfter: '15 minutos'
    });
  }
});

/**
 * Limiter para consultas por CPF (LGPD).
 * Previne enumeração de CPFs e acesso massivo a dados pessoais.
 * Chave por userId (requer auth) para evitar problemas de IPv6 compartilhado.
 */
export const cpfSearchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `cpf-search:${req.user.id}`,
  handler: (req, res) => {
    logger.warn('Rate limit de consulta por CPF atingido', {
      userId: req.user?.id,
      ip: pseudonymizeIp(req.ip),
      userAgent: req.headers['user-agent'],
    });
    res.status(429).json({
      message: 'Limite de consultas por CPF atingido. Aguarde 15 minutos antes de tentar novamente.',
      code: 'RATE_LIMIT_CPF_SEARCH',
      retryAfter: '15 minutos',
    });
  },
});

/**
 * Limiter por matrícula para o endpoint de login.
 * Complementa o loginLimiter por IP: bloqueia força bruta direcionada a uma matrícula
 * específica mesmo quando o atacante rotaciona entre IPs (VPN, botnets).
 * 10 tentativas em 15 minutos por matrícula.
 */
export const loginByMatriculaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `login:mat:${String(req.body?.matricula || 'unknown').slice(0, 50)}`,
  skip: (req) => !req.body?.matricula,
  handler: (req, res) => {
    logger.warn('Brute force por matrícula detectado', {
      ip: pseudonymizeIp(req.ip),
      userAgent: req.headers['user-agent'],
    });
    res.status(429).json({
      message: 'Conta temporariamente bloqueada. Tente novamente em 15 minutos.',
      code: 'RATE_LIMIT_MATRICULA',
      retryAfter: '15 minutos',
    });
  },
});

/**
 * P3: Limiter dedicado para POST /auth/refresh.
 * O loginLimiter (5 req/15 min) era compartilhado com /refresh, criando
 * risco de auto-DoS: um usuário com múltiplas abas esgotaria o limite de
 * login ao apenas renovar tokens. Limites são mais permissivos porque
 * refreshes são operações legítimas e frequentes.
 * Limite: 60 renovações por hora por userId (ou IP como fallback).
 */
export const refreshLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  // Chave: userId extraído do refresh token sem verificar assinatura (apenas leitura).
  // A verificação real ocorre no controller; aqui usamos apenas para chaveamento.
  // Fallback para IP se token ausente/malformado.
  keyGenerator: (req) => {
    try {
      const rawToken = req.cookies?.refreshToken;
      if (rawToken) {
        const payload = jwt.decode(rawToken);
        if (payload?.id) return `refresh:uid:${payload.id}`;
      }
    } catch {
      // silencioso — cai no fallback de IP
    }
    return `refresh:ip:${ipKeyGenerator(req)}`;
  },
  handler: (req, res) => {
    logger.warn('🔒 Rate limit de refresh token atingido', {
      ip: pseudonymizeIp(req.ip),
      userAgent: req.headers['user-agent'],
    });
    res.status(429).json({
      message: 'Muitas renovações de sessão. Aguarde antes de tentar novamente.',
      code: 'RATE_LIMIT_REFRESH',
      retryAfter: '1 hora',
    });
  },
});
