// Rotas de autenticação do sistema
// Define endpoints para login e validação de usuários
// Sistema utiliza JWT para autenticação stateless
import express from 'express';
import * as authController from '../controllers/authController.js';
import { auth } from '../middlewares/auth.js';
import { loginLimiter } from '../middlewares/rateLimiters.js';

const router = express.Router();

// POST /api/auth/login - Endpoint para autenticação de usuários
// Recebe matrícula e senha, retorna token JWT se credenciais válidas
// Body: { matricula: string, password: string }
// Response: { user: { id, name, role, cras } } + httpOnly cookie com token
router.post('/login', loginLimiter, authController.login);

// GET /api/auth/me - Retorna dados do usuário autenticado
// 🔒 Requer autenticação via cookie httpOnly
router.get('/me', auth, authController.getCurrentUser);

// POST /api/auth/logout - Limpa cookie de autenticação
// 🔒 Requer autenticação via cookie httpOnly
router.post('/logout', auth, authController.logout);

// POST /api/auth/refresh - Renova access token usando refresh token
// Permite manter sessão ativa sem reautenticação
// 🔒 SEGURANÇA: Usa refresh token separado com path restrito
router.post('/refresh', loginLimiter, authController.refreshToken);

export default router;
