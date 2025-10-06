import express from 'express';
import { verificarToken } from '../middlewares/authMiddleware.js';
import { finalizarTreino, getRankings, getUserGamification } from '../controllers/gamificationController.js';

const router = express.Router();

// Middleware de autenticação para todas as rotas
router.use(verificarToken);

router.post('/finalizar-treino', finalizarTreino);
router.get('/rankings', getRankings);
router.get('/user-gamification', getUserGamification);

export default router;