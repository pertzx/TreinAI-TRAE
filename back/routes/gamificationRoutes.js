import express from 'express';
import {
  getUserGamification,
  addPoints,
  recordWorkoutCompleted,
  joinChallenge,
  getRanking,
  getAllChallenges,
  createChallenge,
  updateChallenge,
  deleteChallenge,
  toggleChallengeStatus
} from '../controllers/gamificationController.js';

import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  createNotification,
  cleanOldNotifications,
  getNotificationStats
} from '../controllers/notificationController.js';

import {
  getAvailableBadges,
  getUserBadges
} from '../controllers/badgeController.js';

import {
  getUserChallengeProgress
} from '../controllers/challengeProgressController.js';

import { verificarToken } from '../middlewares/authMiddleware.js';
import { adminRateLimit } from '../middlewares/rateLimitMiddleware.js';

const router = express.Router();

// Rotas de usuário (protegidas)
router.get('/user/:userId', verificarToken, getUserGamification);
router.post('/user/:userId/points', verificarToken, addPoints);
router.post('/user/:userId/workout', verificarToken, recordWorkoutCompleted);
router.post('/user/:userId/challenge/:challengeId/join', verificarToken, joinChallenge);
router.get('/ranking/:period', verificarToken, getRanking);
router.get('/ranking', verificarToken, getRanking);

// Rotas de progresso de desafios
router.get('/user/:userId/challenge-progress', verificarToken, getUserChallengeProgress);

// Rotas de notificações
router.get('/user/:userId/notifications', verificarToken, getUserNotifications);
router.patch('/user/:userId/notifications/:notificationId/read', verificarToken, markNotificationAsRead);
router.patch('/user/:userId/notifications/read-all', verificarToken, markAllNotificationsAsRead);
router.post('/user/:userId/notifications', verificarToken, createNotification);
router.delete('/user/:userId/notifications/clean', verificarToken, cleanOldNotifications);
router.get('/user/:userId/notifications/stats', verificarToken, getNotificationStats);

// Rotas de badges
router.get('/user/:userId/badges', verificarToken, getUserBadges);
router.get('/user/:userId/badges/available', verificarToken, getAvailableBadges);

// Rotas administrativas (protegidas + rate limit)
router.get('/admin/challenges', verificarToken, adminRateLimit, getAllChallenges);
router.post('/admin/challenges', verificarToken, adminRateLimit, createChallenge);
router.put('/admin/challenges/:challengeId', verificarToken, adminRateLimit, updateChallenge);
router.delete('/admin/challenges/:challengeId', verificarToken, adminRateLimit, deleteChallenge);
router.patch('/admin/challenges/:challengeId/toggle', verificarToken, adminRateLimit, toggleChallengeStatus);

export default router;