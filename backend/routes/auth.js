// Rotas de autenticação do sistema
// Define endpoints para login e validação de usuários
import express from 'express';
import * as authController from '../controllers/authController.js';

const router = express.Router();

// POST /api/auth/login - Endpoint para autenticação de usuários
// Recebe matrícula e senha, retorna token JWT se válido
router.post('/login', authController.login);

export default router;
