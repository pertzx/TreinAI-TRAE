import express from 'express';
import {
  getUserGamification,
  recordWorkoutCompleted,
  getRanking,
  getRankingByCategory,
  getRankingStats
} from '../controllers/gamificationController.js';

import {
  getUserBadges
} from '../controllers/badgeController.js';

import { verificarToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Rotas essenciais de gamificação
router.get('/user/:userId', verificarToken, getUserGamification);
router.post('/user/:userId/workout', verificarToken, recordWorkoutCompleted);

// Rotas de ranking
router.get('/ranking/:period', verificarToken, getRanking);
router.get('/ranking', verificarToken, getRanking);
router.get('/ranking-category', verificarToken, getRankingByCategory);
router.get('/ranking-stats', verificarToken, getRankingStats);

// Rotas de badges
router.get('/user/:userId/badges', verificarToken, getUserBadges);

export default router;