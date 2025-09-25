import OpenAI from 'openai';
import axios from 'axios';
import dotenv from 'dotenv';
import User from '../models/User.js';
import { getBrazilDate } from '../helpers/getBrazilDate.js';
import redisCache from '../config/redis.js';
import { handleExternalAPIError } from '../middleware/errorHandler.js';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// APIs de fitness e exercícios
const FITNESS_APIS = {
  exerciseDB: {
    url: process.env.EXERCISEDB_API_URL || 'https://exercisedb.p.rapidapi.com',
    headers: {
      'X-RapidAPI-Key': process.env.EXERCISEDB_API_KEY,
      'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com'
    }
  },
  wgerAPI: {
    url: process.env.WGER_API_URL || 'https://wger.de/api/v2',
    headers: {
      'User-Agent': 'TreinAI/1.0',
      'Authorization': process.env.WGER_API_KEY ? `Token ${process.env.WGER_API_KEY}` : undefined
    }
  }
};

// Cache em memória como fallback (caso Redis não esteja disponível)
const memoryCache = new Map();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hora

// Função para buscar exercícios na web
export const searchExercisesWeb = async (req, res) => {
  try {
    const { query, muscleGroup, equipment, difficulty } = req.body;
    const userId = req.user?.id;

    if (!query) {
      return res.status(400).json({
        message: 'Query de busca é obrigatória'
      });
    }

    // Gerar chave de cache
    const cacheParams = { query, muscleGroup, equipment, difficulty };
    const cacheKey = redisCache.generateCacheKey('exercise_search', cacheParams);

    // Verificar cache Redis primeiro
    let cached = await redisCache.get(cacheKey);
    
    // Fallback para cache em memória se Redis não estiver disponível
    if (!cached && !redisCache.isReady()) {
      const memoryCached = memoryCache.get(cacheKey);
      if (memoryCached && (Date.now() - memoryCached.timestamp) < CACHE_DURATION) {
        cached = memoryCached.data;
      }
    }
    
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        source: 'cache'
      });
    }

    // Buscar exercícios em múltiplas fontes
    const searchResults = await Promise.allSettled([
      searchExerciseDB(query, muscleGroup, equipment),
      searchWgerAPI(query, muscleGroup),
      searchWithAI(query, muscleGroup, equipment, difficulty)
    ]);

    // Combinar e processar resultados
    const combinedResults = [];
    
    searchResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        combinedResults.push(...result.value);
      }
    });

    // Remover duplicatas e melhorar dados com IA
    const uniqueExercises = await deduplicateAndEnhance(combinedResults, query);

    // Personalizar baseado no perfil do usuário
    let personalizedResults = uniqueExercises;
    if (userId) {
      personalizedResults = await personalizeResults(uniqueExercises, userId);
    }

    // Cache dos resultados
    const cacheSuccess = await redisCache.set(cacheKey, personalizedResults);
    
    // Fallback para cache em memória se Redis falhar
    if (!cacheSuccess) {
      memoryCache.set(cacheKey, {
        data: personalizedResults,
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      data: personalizedResults,
      totalFound: personalizedResults.length,
      source: 'web_search'
    });

  } catch (error) {
    console.error('Erro na busca web de exercícios:', error);
    res.status(500).json({
      message: 'Erro interno na busca de exercícios',
      error: error.message
    });
  }
};

// Função para retornar exercícios mock para desenvolvimento/teste
function getMockExercises(query, muscleGroup, equipment) {
  const mockExercises = {
    peito: [
      {
        id: 'mock_1',
        name: 'Flexão de Braço',
        target: 'peitoral',
        equipment: 'peso_corporal',
        bodyPart: 'peito',
        instructions: [
          'Posicione-se em prancha com as mãos no chão',
          'Desça o corpo mantendo o core contraído',
          'Empurre o corpo de volta à posição inicial',
          'Mantenha o corpo alinhado durante todo o movimento'
        ],
        source: 'mock',
        difficulty: 'iniciante'
      },
      {
        id: 'mock_2',
        name: 'Supino com Halteres',
        target: 'peitoral',
        equipment: 'halteres',
        bodyPart: 'peito',
        instructions: [
          'Deite-se no banco com halteres nas mãos',
          'Posicione os halteres na altura do peito',
          'Empurre os halteres para cima até estender os braços',
          'Desça controladamente até a posição inicial'
        ],
        source: 'mock',
        difficulty: 'intermediario'
      },
      {
        id: 'mock_3',
        name: 'Crucifixo com Halteres',
        target: 'peitoral',
        equipment: 'halteres',
        bodyPart: 'peito',
        instructions: [
          'Deite-se no banco com halteres nas mãos',
          'Abra os braços em movimento de arco',
          'Desça até sentir alongamento no peito',
          'Retorne à posição inicial contraindo o peitoral'
        ],
        source: 'mock',
        difficulty: 'intermediario'
      }
    ],
    costas: [
      {
        id: 'mock_4',
        name: 'Puxada na Barra Fixa',
        target: 'latissimo',
        equipment: 'barra_fixa',
        bodyPart: 'costas',
        instructions: [
          'Segure a barra com pegada pronada',
          'Puxe o corpo para cima até o queixo passar da barra',
          'Desça controladamente até estender os braços',
          'Mantenha o core contraído durante o movimento'
        ],
        source: 'mock',
        difficulty: 'intermediario'
      }
    ],
    pernas: [
      {
        id: 'mock_5',
        name: 'Agachamento Livre',
        target: 'quadriceps',
        equipment: 'peso_corporal',
        bodyPart: 'pernas',
        instructions: [
          'Fique em pé com pés na largura dos ombros',
          'Desça flexionando quadris e joelhos',
          'Mantenha o peito erguido e joelhos alinhados',
          'Suba empurrando pelos calcanhares'
        ],
        source: 'mock',
        difficulty: 'iniciante'
      }
    ]
  };

  // Retornar exercícios baseados no grupo muscular ou todos se não especificado
  if (muscleGroup && mockExercises[muscleGroup]) {
    return mockExercises[muscleGroup];
  }

  // Se não encontrar o grupo específico, retornar alguns exercícios gerais
  return [
    ...mockExercises.peito.slice(0, 2),
    ...mockExercises.costas.slice(0, 1),
    ...mockExercises.pernas.slice(0, 1)
  ];
}

// Buscar na ExerciseDB API
async function searchExerciseDB(query, muscleGroup, equipment) {
  try {
    if (!process.env.RAPIDAPI_KEY || process.env.RAPIDAPI_KEY === 'test_key_placeholder') {
      console.log('RapidAPI key não configurada ou é placeholder, retornando exercícios mock');
      return getMockExercises(query, muscleGroup, equipment);
    }

    let url = `${FITNESS_APIS.exerciseDB.url}/exercises`;
    
    // Construir URL baseada nos filtros
    if (muscleGroup) {
      url = `${FITNESS_APIS.exerciseDB.url}/exercises/target/${muscleGroup}`;
    } else if (equipment) {
      url = `${FITNESS_APIS.exerciseDB.url}/exercises/equipment/${equipment}`;
    }

    const response = await axios.get(url, {
      headers: FITNESS_APIS.exerciseDB.headers,
      timeout: 10000
    });

    return response.data.slice(0, 20).map(exercise => ({
      id: exercise.id,
      name: exercise.name,
      target: exercise.target,
      equipment: exercise.equipment,
      bodyPart: exercise.bodyPart,
      gifUrl: exercise.gifUrl,
      instructions: exercise.instructions || [],
      source: 'exercisedb',
      difficulty: 'intermediario'
    }));

  } catch (error) {
    const errorInfo = handleExternalAPIError(error, 'ExerciseDB');
    console.error('ExerciseDB API Error:', errorInfo);
    
    // Se for erro de autenticação, não tentar novamente
    if (errorInfo.type === 'AUTH_ERROR') {
      console.error('Chave da API ExerciseDB inválida. Verifique RAPIDAPI_KEY no .env');
    }
    
    // Retornar exercícios mock em caso de erro
    return getMockExercises(query, muscleGroup, equipment);
  }
}

// Buscar na Wger API
async function searchWgerAPI(query, muscleGroup) {
  try {
    const response = await axios.get(`${FITNESS_APIS.wgerAPI.url}/exercise/`, {
      headers: FITNESS_APIS.wgerAPI.headers,
      params: {
        language: 2, // Inglês
        limit: 20
      },
      timeout: 10000 // 10 segundos timeout
    });

    return response.data.results.map(exercise => ({
      id: `wger_${exercise.id}`,
      name: exercise.name,
      description: exercise.description,
      category: exercise.category,
      muscles: exercise.muscles,
      source: 'wger',
      difficulty: 'intermediario'
    }));

  } catch (error) {
    const errorInfo = handleExternalAPIError(error, 'Wger API');
    console.error('Wger API Error:', errorInfo);
    
    // Log específico para diferentes tipos de erro
    if (errorInfo.type === 'RATE_LIMIT') {
      console.warn(`Wger API rate limit atingido. Retry após ${errorInfo.retryAfter} segundos`);
    }
    
    return [];
  }
}

// Buscar com IA (OpenAI)
async function searchWithAI(query, muscleGroup, equipment, difficulty) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.log('OpenAI key não configurada, pulando busca IA');
      return [];
    }

    const prompt = `
Crie uma lista de 5-10 exercícios baseados na busca: "${query}"
${muscleGroup ? `Grupo muscular: ${muscleGroup}` : ''}
${equipment ? `Equipamento: ${equipment}` : ''}
${difficulty ? `Dificuldade: ${difficulty}` : ''}

Para cada exercício, forneça:
1. Nome do exercício
2. Grupo muscular principal
3. Equipamento necessário
4. Instruções detalhadas (3-5 passos)
5. Dicas de segurança
6. Variações (se houver)

Responda em formato JSON válido com array de exercícios.
`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em educação física e criação de exercícios. Sempre responda em JSON válido.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      timeout: 30000 // 30 segundos timeout
    });

    const aiResponse = response.choices[0].message.content;
    
    // Validar se a resposta é JSON válido
    let exercises;
    try {
      exercises = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Erro ao parsear resposta da OpenAI:', parseError.message);
      return [];
    }

    // Validar se exercises é um array
    if (!Array.isArray(exercises)) {
      console.error('Resposta da OpenAI não é um array válido');
      return [];
    }

    return exercises.map((exercise, index) => ({
      id: `ai_${Date.now()}_${index}`,
      name: exercise.nome || exercise.name || 'Exercício sem nome',
      target: exercise.grupoMuscular || exercise.target || 'Não especificado',
      equipment: exercise.equipamento || exercise.equipment || 'peso_corporal',
      instructions: exercise.instrucoes || exercise.instructions || [],
      safetyTips: exercise.dicasSeguranca || exercise.safetyTips || [],
      variations: exercise.variacoes || exercise.variations || [],
      source: 'ai_generated',
      difficulty: difficulty || 'intermediario'
    }));

  } catch (error) {
    const errorInfo = handleExternalAPIError(error, 'OpenAI');
    console.error('OpenAI API Error:', errorInfo);
    
    // Log específico para diferentes tipos de erro
    if (errorInfo.type === 'AUTH_ERROR') {
      console.error('Chave da API OpenAI inválida. Verifique OPENAI_API_KEY no .env');
    } else if (errorInfo.type === 'RATE_LIMIT') {
      console.warn(`OpenAI rate limit atingido. Retry após ${errorInfo.retryAfter} segundos`);
    }
    
    return [];
  }
}

// Remover duplicatas e melhorar dados
async function deduplicateAndEnhance(exercises, originalQuery) {
  const seen = new Set();
  const unique = [];

  for (const exercise of exercises) {
    const key = exercise.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (!seen.has(key)) {
      seen.add(key);
      
      // Melhorar dados com IA se necessário
      if (!exercise.instructions || exercise.instructions.length === 0) {
        exercise.instructions = await generateInstructions(exercise.name);
      }
      
      unique.push(exercise);
    }
  }

  return unique.slice(0, 15); // Limitar a 15 resultados
}

// Gerar instruções com IA
async function generateInstructions(exerciseName) {
  try {
    if (!process.env.OPENAI_API_KEY) return [];

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um personal trainer experiente. Forneça instruções claras e seguras para exercícios.'
        },
        {
          role: 'user',
          content: `Forneça 4-6 instruções passo a passo para o exercício: ${exerciseName}. Responda apenas com um array JSON de strings.`
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Erro ao gerar instruções:', error);
    return [
      'Posicione-se corretamente',
      'Execute o movimento de forma controlada',
      'Mantenha a respiração adequada',
      'Retorne à posição inicial'
    ];
  }
}

// Personalizar resultados baseado no perfil do usuário
async function personalizeResults(exercises, userId) {
  try {
    const user = await User.findById(userId);
    if (!user) return exercises;

    const userProfile = {
      objetivo: user.perfil?.objetivo || 'saude',
      nivelExperiencia: user.perfil?.nivelExperiencia || 'iniciante',
      idade: user.perfil?.idade,
      genero: user.perfil?.genero
    };

    // Filtrar e ordenar baseado no perfil
    return exercises
      .map(exercise => {
        let score = 0;

        // Pontuação baseada no objetivo
        if (userProfile.objetivo === 'hipertrofia' && exercise.target) {
          score += 2;
        }
        if (userProfile.objetivo === 'emagrecimento' && exercise.equipment === 'cardio') {
          score += 3;
        }

        // Pontuação baseada no nível
        if (userProfile.nivelExperiencia === 'iniciante' && exercise.equipment === 'peso_corporal') {
          score += 2;
        }

        return { ...exercise, personalScore: score };
      })
      .sort((a, b) => b.personalScore - a.personalScore);

  } catch (error) {
    console.error('Erro na personalização:', error);
    return exercises;
  }
}

// Gerar treino completo com IA e busca web
export const generateWorkoutWithWeb = async (req, res) => {
  try {
    const { objetivo, grupoMuscular, duracao, equipamentos, dificuldade } = req.body;
    const userId = req.user?.id;

    if (!objetivo) {
      return res.status(400).json({
        message: 'Objetivo do treino é obrigatório'
      });
    }

    // Gerar chave de cache para o treino
    const workoutCacheKey = `workout:${objetivo}:${grupoMuscular || 'all'}:${duracao || 45}:${equipamentos || 'any'}:${dificuldade || 'medium'}`;
    
    // Verificar cache Redis primeiro
    try {
      const cachedWorkout = await redisCache.get(workoutCacheKey);
      if (cachedWorkout) {
        console.log('Treino encontrado no cache Redis');
        return res.json({
          success: true,
          workout: cachedWorkout,
          cached: true,
          generatedAt: getBrazilDate()
        });
      }
    } catch (redisError) {
      console.warn('Redis indisponível para cache de treino:', redisError.message);
    }

    // Buscar exercícios relevantes
    const searchQuery = `${objetivo} ${grupoMuscular || ''} treino`;
    
    // Criar um mock request para buscar exercícios
    const mockReq = {
      body: { 
        query: searchQuery, 
        muscleGroup: grupoMuscular, 
        equipment: equipamentos, 
        difficulty: dificuldade 
      },
      user: { id: userId }
    };
    
    // Criar um mock response para capturar os dados
    let exercisesData = [];
    const mockRes = {
      json: (data) => {
        exercisesData = data.data || [];
        return data;
      },
      status: () => mockRes
    };

    // Buscar exercícios
    await searchExercisesWeb(mockReq, mockRes);
    const availableExercises = exercisesData;

    // Gerar estrutura do treino com IA
    const workoutStructure = await generateWorkoutStructure(objetivo, grupoMuscular, duracao, availableExercises);

    // Salvar no cache Redis
    try {
      await redisCache.set(workoutCacheKey, workoutStructure, 3600); // Cache por 1 hora
    } catch (redisError) {
      console.warn('Erro ao salvar treino no cache Redis:', redisError.message);
    }

    // Salvar no histórico do usuário se logado
    if (userId) {
      await saveGeneratedWorkout(userId, workoutStructure);
    }

    res.json({
      success: true,
      workout: workoutStructure,
      exercisesUsed: availableExercises.length,
      generatedAt: getBrazilDate()
    });

  } catch (error) {
    console.error('Erro na geração de treino:', error);
    res.status(500).json({
      message: 'Erro interno na geração de treino',
      error: error.message
    });
  }
};

// Gerar estrutura do treino com IA
async function generateWorkoutStructure(objetivo, grupoMuscular, duracao, exercises) {
  try {
    const prompt = `
Crie um treino estruturado com base nos seguintes parâmetros:
- Objetivo: ${objetivo}
- Grupo muscular: ${grupoMuscular || 'corpo todo'}
- Duração: ${duracao || 45} minutos
- Exercícios disponíveis: ${exercises.map(e => e.name).join(', ')}

Estruture o treino com:
1. Aquecimento (5-10 min)
2. Parte principal (70% do tempo)
3. Volta à calma (5-10 min)

Para cada exercício, defina séries, repetições e tempo de descanso.
Responda em JSON válido.
`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um personal trainer experiente. Crie treinos seguros e eficazes.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });

    return JSON.parse(response.choices[0].message.content);

  } catch (error) {
    console.error('Erro ao gerar estrutura do treino:', error);
    return {
      nome: `Treino ${objetivo}`,
      duracao: duracao || 45,
      exercicios: exercises.slice(0, 6).map((exercise, index) => ({
        ordem: index + 1,
        nome: exercise.name,
        series: 3,
        repeticoes: 12,
        descanso: 60,
        instrucoes: exercise.instructions
      }))
    };
  }
}

// Salvar treino gerado no perfil do usuário
async function saveGeneratedWorkout(userId, workout) {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const newWorkout = {
      treinoId: `web_${Date.now()}`,
      treinoName: workout.nome || 'Treino Gerado com IA',
      ordem: user.meusTreinos.length + 1,
      descricao: 'Treino gerado automaticamente com busca web e IA',
      exercicios: workout.exercicios || [],
      criadoEm: getBrazilDate(),
      source: 'web_ai_generated'
    };

    user.meusTreinos.push(newWorkout);
    await user.save();

  } catch (error) {
    console.error('Erro ao salvar treino gerado:', error);
  }
}

// Buscar tendências de fitness
export const getFitnessTrends = async (req, res) => {
  try {
    // Verificar cache Redis primeiro
    const trendsCacheKey = 'fitness:trends:2024';
    
    try {
      const cachedTrends = await redisCache.get(trendsCacheKey);
      if (cachedTrends) {
        console.log('Tendências encontradas no cache Redis');
        return res.json({
          success: true,
          trends: cachedTrends,
          cached: true,
          updatedAt: getBrazilDate()
        });
      }
    } catch (redisError) {
      console.warn('Redis indisponível para cache de tendências:', redisError.message);
    }

    const trends = await searchFitnessTrends();
    
    // Salvar no cache Redis (cache por 24 horas)
    try {
      await redisCache.set(trendsCacheKey, trends, 86400);
    } catch (redisError) {
      console.warn('Erro ao salvar tendências no cache Redis:', redisError.message);
    }
    
    res.json({
      success: true,
      trends,
      updatedAt: getBrazilDate()
    });

  } catch (error) {
    console.error('Erro ao buscar tendências:', error);
    res.status(500).json({
      message: 'Erro interno ao buscar tendências'
    });
  }
};

// Buscar tendências atuais de fitness
async function searchFitnessTrends() {
  try {
    if (!process.env.OPENAI_API_KEY) return [];

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em tendências de fitness e bem-estar.'
        },
        {
          role: 'user',
          content: 'Liste as 10 principais tendências de fitness e exercícios para 2024. Para cada tendência, forneça nome, descrição breve e benefícios. Responda em JSON válido.'
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    return JSON.parse(response.choices[0].message.content);

  } catch (error) {
    console.error('Erro ao buscar tendências:', error);
    return [
      {
        nome: 'Treino Funcional',
        descricao: 'Exercícios que simulam movimentos do dia a dia',
        beneficios: ['Melhora da coordenação', 'Fortalecimento global', 'Prevenção de lesões']
      }
    ];
  }
}

// Limpar cache periodicamente
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of searchCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      searchCache.delete(key);
    }
  }
}, 30 * 60 * 1000); // A cada 30 minutos