/**
 * Rotas de Estatísticas
 * Endpoint otimizado para dashboard
 */
import express from 'express';
import { getDashboardStats } from '../controllers/statsController.js';
import { auth, authorize } from '../middlewares/auth.js';

const router = express.Router();

// Endpoint de estatísticas do dashboard
// Apenas entrevistadores e admin podem acessar
router.get('/dashboard',
  auth,
  authorize(['entrevistador', 'admin']),
  getDashboardStats
);

export default router;
