// Middleware de tratamento de erros para APIs externas
import { getBrazilDate } from '../helpers/getBrazilDate.js';

// Tratamento específico para erros de APIs externas
export const handleExternalAPIError = (error, apiName) => {
  const timestamp = getBrazilDate();
  
  console.error(`[${timestamp}] Erro na API ${apiName}:`, {
    message: error.message,
    status: error.response?.status,
    statusText: error.response?.statusText,
    data: error.response?.data
  });

  // Classificar tipos de erro
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return {
      type: 'CONNECTION_ERROR',
      message: `Falha na conexão com ${apiName}`,
      retryable: true
    };
  }

  if (error.response?.status === 401) {
    return {
      type: 'AUTH_ERROR',
      message: `Chave de API inválida para ${apiName}`,
      retryable: false
    };
  }

  if (error.response?.status === 429) {
    return {
      type: 'RATE_LIMIT',
      message: `Limite de requisições excedido para ${apiName}`,
      retryable: true,
      retryAfter: error.response?.headers?.['retry-after'] || 60
    };
  }

  if (error.response?.status >= 500) {
    return {
      type: 'SERVER_ERROR',
      message: `Erro interno do servidor ${apiName}`,
      retryable: true
    };
  }

  return {
    type: 'UNKNOWN_ERROR',
    message: `Erro desconhecido na API ${apiName}`,
    retryable: false
  };
};

// Middleware de validação para requisições de exercícios
export const validateExerciseRequest = (req, res, next) => {
  const { query, muscleGroup, equipment, difficulty } = req.body;

  // Validar query obrigatória
  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Query de busca deve ter pelo menos 2 caracteres'
    });
  }

  // Sanitizar query
  req.body.query = query.trim().substring(0, 100);

  // Validar grupo muscular se fornecido
  const validMuscleGroups = [
    'peito', 'costas', 'ombros', 'biceps', 'triceps', 'pernas', 
    'gluteos', 'abdomen', 'cardio', 'corpo_todo'
  ];
  
  if (muscleGroup && !validMuscleGroups.includes(muscleGroup)) {
    return res.status(400).json({
      success: false,
      message: 'Grupo muscular inválido',
      validOptions: validMuscleGroups
    });
  }

  // Validar equipamento se fornecido
  const validEquipment = [
    'peso_corporal', 'halteres', 'barra', 'maquinas', 'elasticos', 
    'kettlebell', 'medicine_ball', 'sem_equipamento'
  ];
  
  if (equipment && !validEquipment.includes(equipment)) {
    return res.status(400).json({
      success: false,
      message: 'Equipamento inválido',
      validOptions: validEquipment
    });
  }

  // Validar dificuldade se fornecida
  const validDifficulties = ['iniciante', 'intermediario', 'avancado'];
  
  if (difficulty && !validDifficulties.includes(difficulty)) {
    return res.status(400).json({
      success: false,
      message: 'Dificuldade inválida',
      validOptions: validDifficulties
    });
  }

  next();
};

// Middleware de validação para geração de treinos
export const validateWorkoutRequest = (req, res, next) => {
  const { objetivo, grupoMuscular, duracao, equipamentos, dificuldade } = req.body;

  // Validar objetivo obrigatório
  if (!objetivo || typeof objetivo !== 'string' || objetivo.trim().length < 3) {
    return res.status(400).json({
      success: false,
      message: 'Objetivo do treino deve ter pelo menos 3 caracteres'
    });
  }

  // Sanitizar objetivo
  req.body.objetivo = objetivo.trim().substring(0, 100);

  // Validar duração se fornecida
  if (duracao && (isNaN(duracao) || duracao < 10 || duracao > 180)) {
    return res.status(400).json({
      success: false,
      message: 'Duração deve estar entre 10 e 180 minutos'
    });
  }

  // Validar grupo muscular se fornecido
  const validMuscleGroups = [
    'peito', 'costas', 'ombros', 'biceps', 'triceps', 'pernas', 
    'gluteos', 'abdomen', 'cardio', 'corpo_todo'
  ];
  
  if (grupoMuscular && !validMuscleGroups.includes(grupoMuscular)) {
    return res.status(400).json({
      success: false,
      message: 'Grupo muscular inválido',
      validOptions: validMuscleGroups
    });
  }

  // Validar equipamentos se fornecidos
  if (equipamentos && Array.isArray(equipamentos)) {
    const validEquipment = [
      'peso_corporal', 'halteres', 'barra', 'maquinas', 'elasticos', 
      'kettlebell', 'medicine_ball', 'sem_equipamento'
    ];
    
    const invalidEquipment = equipamentos.filter(eq => !validEquipment.includes(eq));
    if (invalidEquipment.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Equipamentos inválidos encontrados',
        invalidEquipment,
        validOptions: validEquipment
      });
    }
  }

  // Validar dificuldade se fornecida
  const validDifficulties = ['iniciante', 'intermediario', 'avancado'];
  
  if (dificuldade && !validDifficulties.includes(dificuldade)) {
    return res.status(400).json({
      success: false,
      message: 'Dificuldade inválida',
      validOptions: validDifficulties
    });
  }

  next();
};

// Middleware de rate limiting personalizado
export const createRateLimit = (windowMs = 60000, maxRequests = 10) => {
  const requests = new Map();

  return (req, res, next) => {
    const clientId = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Limpar requisições antigas
    if (requests.has(clientId)) {
      const clientRequests = requests.get(clientId).filter(time => time > windowStart);
      requests.set(clientId, clientRequests);
    }

    // Verificar limite
    const clientRequests = requests.get(clientId) || [];
    if (clientRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Muitas requisições. Tente novamente em alguns segundos.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    // Adicionar nova requisição
    clientRequests.push(now);
    requests.set(clientId, clientRequests);

    next();
  };
};

// Middleware de log de performance
export const logPerformance = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const timestamp = getBrazilDate();
    
    console.log(`[${timestamp}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    
    // Log de requisições lentas (> 5 segundos)
    if (duration > 5000) {
      console.warn(`[SLOW REQUEST] ${req.method} ${req.path} took ${duration}ms`);
    }
  });

  next();
};