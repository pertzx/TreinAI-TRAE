import express from 'express';
import {
  getAnalyticsDashboard,
  recordWorkoutMetrics,
  recordBodyMetrics,
  recordPerformanceMetrics,
  createGoal,
  updateGoalProgress,
  getProgressReport
} from '../controllers/analyticsController.js';
import { verificarToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Rotas protegidas por autenticação
router.use(verificarToken);

// Dashboard de analytics
router.get('/dashboard/:userId', getAnalyticsDashboard);

// Registrar métricas
router.post('/workout-metrics/:userId', recordWorkoutMetrics);
router.post('/body-metrics/:userId', recordBodyMetrics);
router.post('/performance-metrics/:userId', recordPerformanceMetrics);

// Metas e objetivos
router.post('/goals/:userId', createGoal);
router.put('/goals/:userId/:goalId/progress', updateGoalProgress);

// Relatórios
router.get('/progress-report/:userId', getProgressReport);

export default router;