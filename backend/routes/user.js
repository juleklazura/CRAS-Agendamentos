import express from 'express';
import { createUser, getUsers, updateUser, deleteUser, getEntrevistadoresByCras } from '../controllers/userController.js';
import { auth, authorize } from '../middlewares/auth.js';
const router = express.Router();

// Rota acessível para todos os usuários autenticados
router.get('/', auth, getUsers);

// Buscar entrevistadores por CRAS (para recepção)
router.get('/entrevistadores/cras/:crasId', auth, authorize(['recepcao', 'admin']), getEntrevistadoresByCras);

// Rotas restritas ao admin
router.post('/', auth, authorize(['admin']), createUser);
router.put('/:id', auth, authorize(['admin']), updateUser);
router.delete('/:id', auth, authorize(['admin']), deleteUser);

export default router;
