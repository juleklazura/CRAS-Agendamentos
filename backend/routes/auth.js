// Rotas de autenticação do sistema
// Define endpoints para login e validação de usuários
// Sistema utiliza JWT para autenticação stateless
import express from 'express';
import * as authController from '../controllers/authController.js';
import { loginLimiter } from '../middlewares/rateLimiters.js';

const router = express.Router();

// POST /api/auth/login - Endpoint para autenticação de usuários
// Recebe matrícula e senha, retorna token JWT se credenciais válidas
// Body: { matricula: string, password: string }
// Response: { token: string, user: { id, name, role, cras } }
// 🔒 SEGURANÇA: Rate limiter aplicado - máximo 5 tentativas a cada 15 minutos
router.post('/login', loginLimiter, authController.login);

export default router;
