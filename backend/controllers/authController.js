// Controller de autenticação: login, logout, refresh token e dados do usuário atual.
import { randomUUID } from 'crypto';
import prisma from '../utils/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import logger, { pseudonymizeIp } from '../utils/logger.js';
import cache from '../utils/cache.js';
import tokenBlacklist from '../utils/tokenBlacklist.js';
import { apiSuccess, apiError } from '../utils/apiResponse.js';

// =============================================================================
// CONFIGURAÇÃO DE COOKIES
// =============================================================================

// Em produção, frontend e backend estão em domínios distintos (Vercel + Render),
// exigindo SameSite=None para que o browser envie cookies cross-site.
// Requer Secure=true, portanto só funciona em HTTPS.
const isCrossSite = process.env.NODE_ENV === 'production';

// Access token: curta duração (8h) para limitar a janela de comprometimento.
const ACCESS_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,                                    // Inacessível via JavaScript — protege contra XSS
  secure: process.env.NODE_ENV === 'production',
  sameSite: isCrossSite ? 'none' : 'lax',
  maxAge: 8 * 60 * 60 * 1000,
  path: '/',
};

// Refresh token: longa duração (7d) mas contém apenas o ID do usuário.
// É consumido e rotacionado a cada uso (OWASP A07).
const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: isCrossSite ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

// Opções para clearCookie — path e flags devem ser idênticos ao Set-Cookie original.
const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: isCrossSite ? 'none' : 'lax',
  path: '/',
};

// Hash constante usado para prevenir timing oracle no login.
// bcrypt.compare executa sempre, mesmo quando a matrícula não existe no banco,
// tornando o tempo de resposta uniforme e impedindo enumeração de matrículas por diff de latencia.
const DUMMY_HASH = '$2a$12$invaliddummyhashfortimingprotect.00000000000000000000000';

/** Monta o objeto `agenda` a partir dos campos do User. Retorna undefined para roles sem agenda. */
const buildAgenda = (user) => {
  if (user.role !== 'entrevistador') return undefined;
  return {
    horariosDisponiveis: user.horariosDisponiveis,
    diasAtendimento: user.diasAtendimento,
  };
};

/**
 * POST /auth/login
 * Valida credenciais, emite access token (8h) e refresh token (7d) via cookies httpOnly.
 */
export const login = async (req, res) => {
  const { matricula, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { matricula } });

    // Executa bcrypt independentemente de o usuário existir.
    // Sem isso, a diferença de ~250ms entre "matrícula inexistente" (sem bcrypt)
    // e "senha errada" (com bcrypt) permitiria enumerar matrículas válidas por tempo de resposta.
    const hashToCompare = user?.password ?? DUMMY_HASH;
    const isMatch = await bcrypt.compare(password, hashToCompare);

    if (!user) {
      // Mensagem genérica intencional — não revelar se a matrícula existe.
      prisma.log.create({
        data: {
          userId: null,
          crasId: null,
          action: 'login_falha',
          details: `Tentativa de login com matrícula inexistente (IP: ${pseudonymizeIp(req.ip)})`,
        },
      }).catch(() => {});
      return apiError(res, 'Credenciais inválidas', 401);
    }

    if (!isMatch) {
      prisma.log.create({
        data: {
          userId: user.id,
          crasId: user.crasId,
          action: 'login_falha',
          details: `Tentativa de login com senha incorreta (IP: ${pseudonymizeIp(req.ip)})`,
        },
      }).catch(() => {});
      return apiError(res, 'Credenciais inválidas', 401);
    }

    // Conta inativa: mesma mensagem genérica para não revelar que a conta existe mas está inativa.
    if (!user.ativo) {
      prisma.log.create({
        data: {
          userId: user.id,
          crasId: user.crasId,
          action: 'login_falha',
          details: `Tentativa de login em conta inativa (IP: ${pseudonymizeIp(req.ip)})`,
        },
      }).catch(() => {});
      return apiError(res, 'Credenciais inválidas', 401);
    }
    
    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET não definido — servidor mal configurado');
      return apiError(res, 'Erro de configuração do servidor', 500);
    }

    const agenda = buildAgenda(user);

    // Access token: inclui role e cras para que middlewares de autorização
    // não precisem consultar o banco em cada requisição.
    // jti único por token permite revogação individual na blacklist.
    const accessToken = jwt.sign({ 
      id: user.id, 
      role: user.role, 
      cras: user.crasId,
      agenda,
      type: 'access',
      jti: randomUUID(),
    }, process.env.JWT_SECRET, { expiresIn: '8h' });
    
    // Refresh token: contém apenas o ID (sem role/cras) para minimizar dados expostos.
    // Secret separado do JWT_SECRET impede que um vazamento comprometa ambos.
    const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    const refreshToken = jwt.sign({
      id: user.id,
      type: 'refresh',
      jti: randomUUID(),
    }, refreshSecret, { expiresIn: '7d' });
    
    await prisma.log.create({
      data: {
        userId: user.id,
        crasId: user.crasId,
        action: 'login',
        details: `Login realizado por ${user.name} (${user.role}) - ID: ${user.id}`,
      },
    });
    
    // Tokens entregues exclusivamente via httpOnly cookies.
    // Nunca retornados no corpo da resposta para proteger contra XSS.
    res.cookie('token', accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
    res.cookie('refreshToken', refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
    
    apiSuccess(res, { 
      user: { 
        id: user.id, 
        name: user.name, 
        role: user.role, 
        cras: user.crasId, 
        matricula: user.matricula,
        agenda,
      } 
    });
  } catch (err) {
    logger.error('Erro no login:', { error: err.message, stack: process.env.NODE_ENV === 'development' ? err.stack : undefined });
    apiError(res, 'Erro no login', 500);
  }
};

/**
 * GET /auth/me
 * Retorna dados atualizados do usuário autenticado (incluindo agenda se entrevistador).
 */
export const getCurrentUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      omit: { password: true },
    });
    
    if (!user) {
      return apiError(res, 'Usuário não encontrado', 404);
    }
    
    apiSuccess(res, {
      id: user.id,
      name: user.name,
      role: user.role,
      cras: user.crasId,
      matricula: user.matricula,
      agenda: buildAgenda(user),
    });
  } catch (err) {
    logger.error('Erro ao buscar usuário:', { error: err.message });
    apiError(res, 'Erro ao buscar usuário', 500);
  }
};

/**
 * POST /auth/logout
 * Revoga os tokens na blacklist e limpa os cookies de sessão.
 * A revogação garante que tokens capturados (ex: proxies, logs de rede)
 * não possam ser reutilizados dentro do prazo de validade original.
 */
export const logout = async (req, res) => {
  try {
    const now = Math.floor(Date.now() / 1000);

    // Revoga o access token pelo jti. Usa jwt.decode (sem verificar assinatura)
    // porque o objetivo é apenas extrair o jti para a blacklist, não revalidar.
    const rawAccessToken = req.cookies?.token;
    if (rawAccessToken) {
      try {
        const decoded = jwt.decode(rawAccessToken);
        if (decoded?.jti && decoded?.exp) {
          const remaining = decoded.exp - now;
          if (remaining > 0) tokenBlacklist.revokeToken(decoded.jti, remaining);
        }
      } catch (_) { /* token malformado — ignora */ }
    }

    const rawRefreshToken = req.cookies?.refreshToken;
    if (rawRefreshToken) {
      try {
        const decoded = jwt.decode(rawRefreshToken);
        if (decoded?.jti && decoded?.exp) {
          const remaining = decoded.exp - now;
          if (remaining > 0) tokenBlacklist.revokeToken(decoded.jti, remaining);
        }
      } catch (_) { /* token malformado — ignora */ }
    }

    if (req.user?.id) {
      cache.invalidateUser(req.user.id);
    }

    if (req.user?.id) {
      prisma.log.create({
        data: {
          userId: req.user.id,
          crasId: req.user.cras ?? null,   // req.user.cras — ver middlewares/auth.js
          action: 'logout',
          details: `Logout realizado (role: ${req.user.role}, ID: ${req.user.id})`,
        },
      }).catch(logger.error);
    }
    
    // path deve ser idêntico ao usado no Set-Cookie original (ambos com path: '/')
    res.clearCookie('token', CLEAR_COOKIE_OPTIONS);
    res.clearCookie('refreshToken', CLEAR_COOKIE_OPTIONS);
    
    apiSuccess(res, { message: 'Logout realizado com sucesso' });
  } catch (err) {
    logger.error('Erro no logout:', { error: err.message });
    apiError(res, 'Erro no logout', 500);
  }
};

/**
 * POST /auth/refresh
 * Consome o refresh token atual, emite um novo par access+refresh (rotação completa).
 * A rotação impede reutilização do refresh token caso seja capturado (OWASP A07).
 */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    
    if (!refreshToken) {
      return apiError(res, 'Refresh token não fornecido', 401);
    }
    
    const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    
    if (!refreshSecret) {
      logger.error('JWT_SECRET não definido — servidor mal configurado');
      return apiError(res, 'Erro de configuração do servidor', 500);
    }
    
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, refreshSecret);
    } catch (err) {
      return apiError(res, 'Refresh token inválido ou expirado', 401);
    }
    
    if (decoded.type !== 'refresh') {
      return apiError(res, 'Token inválido', 401);
    }

    // Blacklist persistente: rejeita tokens revogados (ex: logout anterior).
    if (decoded.jti && await tokenBlacklist.isRevoked(decoded.jti)) {
      return apiError(res, 'Token revogado. Faça login novamente', 401);
    }

    // Revoga o token atual antes de emitir um novo (rotação).
    // Sem isso, um token capturado poderia ser usado indefinidamente até expirar.
    if (decoded.jti && decoded.exp) {
      const remaining = decoded.exp - Math.floor(Date.now() / 1000);
      if (remaining > 0) tokenBlacklist.revokeToken(decoded.jti, remaining);
    }
    
    // Buscar usuário atualizado
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      omit: { password: true },
    });
    
    if (!user) {
      return apiError(res, 'Usuário não encontrado', 404);
    }

    // Impede renovação para contas desativadas, mesmo com token válido.
    if (!user.ativo) {
      return apiError(res, 'Sessão encerrada. Entre em contato com o administrador.', 401);
    }

    const agenda = buildAgenda(user);
    
    const newAccessToken = jwt.sign({
      id: user.id,
      role: user.role,
      cras: user.crasId,
      agenda,
      type: 'access',
      jti: randomUUID(),
    }, process.env.JWT_SECRET, { expiresIn: '8h' });
    
    // Novo refresh token com jti único — o anterior já foi revogado acima.
    const newRefreshToken = jwt.sign(
      { id: user.id, type: 'refresh', jti: randomUUID() },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', newAccessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
    res.cookie('refreshToken', newRefreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

    // Fire-and-forget: falha de log não deve bloquear a renovação.
    prisma.log.create({
      data: {
        userId: user.id,
        crasId: user.crasId,
        action: 'token_refresh',
        details: `Token renovado para ${user.name} (${user.role})`,
      },
    }).catch(logger.error);
    
    apiSuccess(res, { 
      message: 'Token renovado com sucesso',
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        cras: user.crasId,
        matricula: user.matricula,
        agenda,
      }
    });
  } catch (err) {
    logger.error('Erro ao renovar token:', { error: err.message });
    apiError(res, 'Erro ao renovar token', 500);
  }
};
