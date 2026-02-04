/**
 * Rotas de Estatísticas
 * Endpoint otimizado para dashboard
 */
import express from 'express';
import { getDashboardStats } from '../controllers/statsController.js';
import { auth, authorize } from '../middlewares/auth.js';

const router = express.Router();

// Endpoint de estatísticas do dashboard
// Todos os usuários autenticados podem acessar
router.get('/dashboard',
  auth,
  getDashboardStats
);

export default router;
