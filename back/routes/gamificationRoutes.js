import express from 'express';
import {
  getUserGamification,
  addPoints,
  recordWorkoutCompleted,
  createChallenge,
  joinChallenge,
  getRanking
} from '../controllers/gamificationController.js';
import { verificarToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Rotas protegidas por autenticação
router.use(verificarToken);

// Obter dados de gamificação do usuário
router.get('/user/:userId', getUserGamification);

// Adicionar pontos manualmente
router.post('/user/:userId/points', addPoints);

// Registrar treino completado
router.post('/user/:userId/workout-completed', recordWorkoutCompleted);

// Criar novo desafio (apenas admins)
router.post('/challenges', createChallenge);

// Participar de um desafio
router.post('/user/:userId/challenges/:challengeId/join', joinChallenge);

// Obter ranking
router.get('/ranking', getRanking);

export default router;