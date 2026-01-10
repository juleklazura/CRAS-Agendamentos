// Middleware de autenticação e autorização
// Protege rotas que requerem usuário logado e controla permissões por role
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

// ========================================
// 🔒 CONFIGURAÇÃO DE ORIGENS PERMITIDAS
// ========================================
const getAllowedOrigins = () => {
  const origins = [
    process.env.FRONTEND_URL,
    // URLs do Vercel para este projeto
    'https://cras-agendamentos.vercel.app',
  ];
  
  // Em desenvolvimento, adicionar origens locais
  if (process.env.NODE_ENV === 'development') {
    origins.push(
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174'
    );
  }
  
  return origins.filter(Boolean);
};

// Verifica se é um domínio Vercel válido
const isVercelDomain = (origin) => {
  if (!origin) return false;
  return /^https:\/\/.*\.vercel\.app$/.test(origin);
};

// ========================================
// MIDDLEWARE PRINCIPAL DE AUTENTICAÇÃO
// ========================================
// Verifica se o token JWT é válido e valida origem da requisição
export function auth(req, res, next) {
  try {
    // ========================================
    // 🔒 VALIDAÇÃO DE ORIGEM (Anti-CSRF adicional)
    // ========================================
    const origin = req.get('origin') || req.get('referer');
    const allowedOrigins = getAllowedOrigins();
    
    // Em produção, validar origem estritamente
    if (process.env.NODE_ENV === 'production' && origin) {
      const isAllowedOrigin = allowedOrigins.some(allowed => 
        origin.startsWith(allowed)
      );
      
      // Permitir qualquer subdomínio do Vercel
      if (!isAllowedOrigin && !isVercelDomain(origin)) {
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
    
    // Em desenvolvimento, avisar quando não há origin (Postman/Insomnia)
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
    
    // Verificar e decodificar token
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
    
    // Adiciona dados do usuário ao objeto request para uso nas rotas
    req.user = decoded;
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

// Middleware de autorização por roles (perfis de usuário)
// Controla acesso baseado no tipo de usuário (admin, entrevistador, recepcao)
export function authorize(roles = []) {
  return (req, res, next) => {
    // Verifica se o role do usuário está na lista de roles permitidos
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Acesso negado' });
    }
    next();
  };
}
