// Rotas de autenticação do sistema
// Define endpoints para login e validação de usuários
// Sistema utiliza JWT para autenticação stateless
import express from 'express';
import * as authController from '../controllers/authController.js';
import { auth } from '../middlewares/auth.js';
import { loginLimiter, loginByMatriculaLimiter, refreshLimiter } from '../middlewares/rateLimiters.js';
import { validate } from '../validators/userValidator.js';
import { loginSchema } from '../validators/authValidator.js';

const router = express.Router();

// POST /api/auth/login - Endpoint para autenticação de usuários
// Recebe matrícula e senha, retorna token JWT se credenciais válidas
// Body: { matricula: string, password: string }
// Response: { user: { id, name, role, cras } } + httpOnly cookie com token
router.post('/login', loginLimiter, loginByMatriculaLimiter, validate(loginSchema), authController.login);

// GET /api/auth/me - Retorna dados do usuário autenticado

router.get('/me', auth, authController.getCurrentUser);

// POST /api/auth/logout - Limpa cookie de autenticação

router.post('/logout', auth, authController.logout);

// POST /api/auth/refresh - Renova access token usando refresh token
// Permite manter sessão ativa sem reautenticação
// POST /auth/refresh — refreshLimiter separado do loginLimiter (evita auto-DoS em múltiplas abas)
router.post('/refresh', refreshLimiter, authController.refreshToken);

export default router;
