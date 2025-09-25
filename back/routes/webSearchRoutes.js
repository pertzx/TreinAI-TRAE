import express from 'express';
import { 
  searchExercisesWeb, 
  generateWorkoutWithWeb, 
  getFitnessTrends 
} from '../controllers/webSearchController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { 
  validateExerciseRequest, 
  validateWorkoutRequest, 
  createRateLimit, 
  logPerformance 
} from '../middleware/errorHandler.js';
import { 
  apiPerformanceMiddleware, 
  aiSystemLogger 
} from '../middleware/apiPerformanceMiddleware.js';

const router = express.Router();

// Middleware de log de performance para todas as rotas
router.use(logPerformance);

// Rate limiting específico para cada endpoint
const exerciseSearchLimit = createRateLimit(60000, 20); // 20 req/min
const workoutGenerationLimit = createRateLimit(60000, 10); // 10 req/min
const trendsLimit = createRateLimit(300000, 5); // 5 req/5min

// Buscar exercícios com validação e rate limiting
router.post('/search-exercises', 
  exerciseSearchLimit,
  authenticateToken, 
  validateExerciseRequest,
  apiPerformanceMiddleware('EXERCISE_SEARCH'),
  aiSystemLogger('EXERCISE_SEARCH'),
  searchExercisesWeb
);

// Gerar treino com validação e rate limiting
router.post('/generate-workout', 
  workoutGenerationLimit,
  authenticateToken, 
  validateWorkoutRequest,
  apiPerformanceMiddleware('WORKOUT_GENERATION'),
  aiSystemLogger('WORKOUT_GENERATION'),
  generateWorkoutWithWeb
);

// Buscar tendências com rate limiting
router.get('/fitness-trends', 
  trendsLimit,
  apiPerformanceMiddleware('FITNESS_TRENDS'),
  aiSystemLogger('FITNESS_TRENDS'),
  getFitnessTrends
);

// Rota de teste para busca de exercícios (sem autenticação)
router.post('/test-search-exercises', 
  exerciseSearchLimit,
  validateExerciseRequest,
  apiPerformanceMiddleware('EXERCISE_SEARCH_TEST'),
  aiSystemLogger('EXERCISE_SEARCH_TEST'),
  async (req, res) => {
    // Simular usuário de teste
    req.user = { id: 'test-user-id' };
    return searchExercisesWeb(req, res);
  }
);

// Rota de teste para geração de treino (sem autenticação)
router.post('/test-generate-workout', 
  workoutGenerationLimit,
  validateWorkoutRequest,
  apiPerformanceMiddleware('WORKOUT_GENERATION_TEST'),
  aiSystemLogger('WORKOUT_GENERATION_TEST'),
  async (req, res) => {
    // Simular usuário de teste
    req.user = { id: 'test-user-id' };
    return generateWorkoutWithWeb(req, res);
  }
);

export default router;