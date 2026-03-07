// Controller de autenticação
// Gerencia login, validação de credenciais e geração de tokens JWT
import prisma from '../utils/prisma.js';
import bcrypt from 'bcryptjs';  // Para comparação segura de senhas
import jwt from 'jsonwebtoken';  // Para geração de tokens de autenticação
import dotenv from 'dotenv';
import logger from '../utils/logger.js';
import { apiSuccess, apiError } from '../utils/apiResponse.js';

dotenv.config();

// =============================================================================
// 🔒 CONFIGURAÇÃO SEGURA DE COOKIES
// =============================================================================

// Detecta se estamos em ambiente cross-site (frontend e backend em domínios diferentes)
const isCrossSite = process.env.NODE_ENV === 'production';

// Configurações de cookie para token de acesso (8 horas)
const ACCESS_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,                                    // Não acessível via JavaScript (previne XSS)
  secure: process.env.NODE_ENV === 'production',   // Apenas HTTPS em produção
  sameSite: isCrossSite ? 'none' : 'lax',          // 'none' para cross-site (Vercel + Render)
  maxAge: 8 * 60 * 60 * 1000,                       // 8 horas em milissegundos
  path: '/',                                         // Cookie disponível em toda aplicação
};

// Configurações de cookie para refresh token (7 dias)
const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: isCrossSite ? 'none' : 'lax',          // 'none' para cross-site (Vercel + Render)
  maxAge: 7 * 24 * 60 * 60 * 1000,                  // 7 dias em milissegundos
  path: '/',                                         // Cookie disponível em toda aplicação
};

// Configurações para limpar cookies (sem maxAge)
const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: isCrossSite ? 'none' : 'lax',
  path: '/',
};

/** Helper: monta o objeto agenda a partir dos campos do User do Prisma */
const buildAgenda = (user) => {
  if (user.role !== 'entrevistador') return undefined;
  return {
    horariosDisponiveis: user.horariosDisponiveis,
    diasAtendimento: user.diasAtendimento,
  };
};

// Função principal de login do sistema
// Valida credenciais, gera token JWT e registra ação em log
export const login = async (req, res) => {
  const { matricula, password, senha } = req.body;
  const senhaParaValidar = password || senha; // Aceita tanto 'password' quanto 'senha'
  
  try {
    // Busca usuário pela matrícula única
    const user = await prisma.user.findUnique({ where: { matricula } });
    if (!user) {
      return apiError(res, 'Usuário não encontrado');
    }
    
    // Compara senha fornecida com hash armazenado no banco
    const isMatch = await bcrypt.compare(senhaParaValidar, user.password);
    if (!isMatch) {
      return apiError(res, 'Senha incorreta');
    }
    
    // 🔒 SEGURANÇA: Valida que JWT_SECRET está configurado
    if (!process.env.JWT_SECRET) {
      logger.error('ERRO CRÍTICO: JWT_SECRET não está definida no arquivo .env');
      return apiError(res, 'Erro de configuração do servidor', 500);
    }

    const agenda = buildAgenda(user);
    
    // Gera access token JWT com informações essenciais do usuário
    const accessToken = jwt.sign({ 
      id: user.id, 
      role: user.role, 
      cras: user.crasId,
      agenda,
      type: 'access'
    }, process.env.JWT_SECRET, { expiresIn: '8h' });
    
    // Gera refresh token JWT (sem informações sensíveis, apenas ID)
    const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    const refreshToken = jwt.sign({
      id: user.id,
      type: 'refresh'
    }, refreshSecret, { expiresIn: '7d' });
    
    // Registra login no sistema de auditoria
    await prisma.log.create({
      data: {
        userId: user.id,
        crasId: user.crasId,
        action: 'login',
        details: `Login realizado por ${user.name} (${user.role}) - Matrícula: ${user.matricula}`,
      },
    });
    
    // 🔒 SEGURANÇA: Tokens enviados via httpOnly cookies (protege contra XSS)
    res.cookie('token', accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
    res.cookie('refreshToken', refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
    
    // Retorna apenas dados do usuário (sem token)
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

// Endpoint para obter dados do usuário autenticado
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

// Endpoint de logout - limpa o cookie de autenticação
export const logout = async (req, res) => {
  try {
    // Registra logout no sistema de auditoria
    if (req.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, name: true, role: true, crasId: true },
      });
      if (user) {
        await prisma.log.create({
          data: {
            userId: user.id,
            crasId: user.crasId,
            action: 'logout',
            details: `Logout realizado por ${user.name} (${user.role})`,
          },
        });
      }
    }
    
    // Limpa os cookies de autenticação (access e refresh tokens)
    res.clearCookie('token', CLEAR_COOKIE_OPTIONS);
    res.clearCookie('refreshToken', {
      ...CLEAR_COOKIE_OPTIONS,
      path: '/api/auth/refresh'
    });
    
    apiSuccess(res, { message: 'Logout realizado com sucesso' });
  } catch (err) {
    logger.error('Erro no logout:', { error: err.message });
    apiError(res, 'Erro no logout', 500);
  }
};

// Endpoint para renovar access token usando refresh token
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    
    if (!refreshToken) {
      return apiError(res, 'Refresh token não fornecido', 401);
    }
    
    const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    
    if (!refreshSecret) {
      logger.error('ERRO CRÍTICO: JWT_SECRET não está definido');
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
    
    // Buscar usuário atualizado
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      omit: { password: true },
    });
    
    if (!user) {
      return apiError(res, 'Usuário não encontrado', 404);
    }

    const agenda = buildAgenda(user);
    
    // Gerar novo access token
    const newAccessToken = jwt.sign({
      id: user.id,
      role: user.role,
      cras: user.crasId,
      agenda,
      type: 'access'
    }, process.env.JWT_SECRET, { expiresIn: '8h' });
    
    res.cookie('token', newAccessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
    
    // Registrar renovação de token no log
    await prisma.log.create({
      data: {
        userId: user.id,
        crasId: user.crasId,
        action: 'token_refresh',
        details: `Token renovado para ${user.name} (${user.role})`,
      },
    });
    
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
