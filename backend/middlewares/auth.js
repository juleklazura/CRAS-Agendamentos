// Middleware de autenticação via JWT e autorização via role.
// Extrai o token do cookie httpOnly, valida assinatura, tipo e blacklist,
// e popula req.user com dados frescos do banco (com cache de 5 min).
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma.js';
import logger, { pseudonymizeIp } from '../utils/logger.js';
import cache from '../utils/cache.js';
import tokenBlacklist from '../utils/tokenBlacklist.js';
import { getAllowedOrigins } from '../config/cors.js';

// TTL do cache de autenticação: 300 segundos.
// Tradeoff deliberado: usuário desativado pode continuar com acesso por até 5 min.
// invalidateUser() é chamado ao desativar um usuário, reduzindo esse janela na prática.
const AUTH_CACHE_TTL = 300;

export async function auth(req, res, next) {
  try {
    // Validação de origem — camada adicional anti-CSRF para rejeitar
    // requisições que passaram pelo CORS mas têm origem suspeita.
    const origin = req.get('origin') || req.get('referer');
    const allowedOrigins = getAllowedOrigins();
    
    if (process.env.NODE_ENV === 'production' && origin) {
      const isAllowedOrigin = allowedOrigins.some(allowed => 
        origin.startsWith(allowed)
      );
      
      if (!isAllowedOrigin) {
        logger.warn('Tentativa de acesso de origem não autorizada', {
          origin,
          ip: pseudonymizeIp(req.ip),
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
        logger.warn('Requisição sem origin em desenvolvimento', {
          userAgent,
          ip: pseudonymizeIp(req.ip),
          path: req.path
        });
      }
    }
    
    const token = req.cookies?.token;
    
    if (!token) {
      logger.debug('Token não encontrado no cookie', {
        ip: pseudonymizeIp(req.ip),
        path: req.path
      });
      return res.status(401).json({ 
        message: 'Token não fornecido',
        code: 'NO_TOKEN'
      });
    }
    
    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET não está definido — servidor mal configurado');
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
        logger.warn('Token JWT inválido detectado', {
          ip: pseudonymizeIp(req.ip),
          path: req.path
        });
        return res.status(401).json({ 
          message: 'Token inválido',
          code: 'INVALID_TOKEN'
        });
      }
      throw jwtError;
    }

    // Verifica o tipo do token antes de qualquer outra coisa.
    // Impede que um refresh token (type:'refresh') seja apresentado como access token,
    // mesmo sendo criptograficamente válido — tokens têm escopos distintos.
    if (decoded.type !== 'access') {
      logger.warn('Token de tipo incorreto usado como access token', {
        tokenType: decoded.type,
        userId: decoded.id,
        ip: pseudonymizeIp(req.ip),
        path: req.path,
      });
      return res.status(401).json({
        message: 'Tipo de token inválido. Faça login novamente',
        code: 'INVALID_TOKEN_TYPE',
      });
    }

    // Verifica a blacklist persistente antes de aceitar o token.
    // Tokens revogados (logout, rotação de refresh) são rejeitados mesmo dentro do prazo de validade.
    if (decoded.jti && await tokenBlacklist.isRevoked(decoded.jti)) {
      logger.warn('Token revogado utilizado', {
        userId: decoded.id,
        ip: pseudonymizeIp(req.ip),
        path: req.path,
      });
      return res.status(401).json({
        message: 'Sessão encerrada. Faça login novamente',
        code: 'TOKEN_REVOKED',
      });
    }
    
    // Busca o usuário no banco com cache de curta duração.
    // O cache reduz queries ao Neon em sessões normais; invalidateUser() garante
    // que desativações e mudanças de role sejam aplicadas sem esperar o TTL.
    const authCacheKey = `user:auth:${decoded.id}`;
    const userExists = await cache.cached(
      authCacheKey,
      () => prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, role: true, crasId: true, name: true, matricula: true, ativo: true },
      }),
      AUTH_CACHE_TTL
    );
    
    if (!userExists) {
      logger.warn('Token válido mas usuário não encontrado no banco', {
        userId: decoded.id,
        ip: pseudonymizeIp(req.ip),
        path: req.path
      });
      return res.status(401).json({ 
        message: 'Usuário não encontrado. Faça login novamente',
        code: 'USER_NOT_FOUND'
      });
    }

    // Usuários desativados são bloqueados independentemente do token ser válido.
    // cache.invalidateUser() é chamado ao desativar, portanto o bloqueio
    // entra em vigor imediatamente — sem aguardar o TTL do cache.
    if (!userExists.ativo) {
      logger.warn('Usuário desativado tentou usar token válido', {
        userId: decoded.id,
        ip: pseudonymizeIp(req.ip),
        path: req.path
      });
      return res.status(401).json({
        message: 'Conta desativada. Entre em contato com o administrador.',
        code: 'USER_INACTIVE'
      });
    }
    
    // Popula req.user com dados do banco (não do payload do JWT), garantindo
    // que role/crasId reflitam o estado atual do banco após a verificação.
    // O campo é exposto como `cras` (não `crasId`) por convenção dos controllers.
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
      ip: pseudonymizeIp(req.ip),
      path: req.path
    });
    return res.status(500).json({ 
      message: 'Erro no servidor',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * Middleware de autorização baseada em role.
 * Registra em log toda tentativa de acesso negado (fire-and-forget),
 * tornando visíveis tentativas de escalação de privilégio sem bloquear a resposta.
 */
export function authorize(roles = []) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      prisma.log.create({
        data: {
          userId: req.user.id,
          crasId: req.user.cras ?? null,
          action: 'acesso_negado',
          details: `Role '${req.user.role}' tentou acessar rota que exige [${roles.join(', ')}] — ${req.method} ${req.path}`,
        },
      }).catch(() => {});
      return res.status(403).json({ message: 'Acesso negado' });
    }
    next();
  };
}
