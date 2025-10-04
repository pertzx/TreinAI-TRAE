import { UserGamification, Ranking } from '../models/Gamification.js';
import User from '../models/User.js';
import { getBrazilDate } from '../helpers/getBrazilDate.js';
import { checkAndAwardBadges } from './badgeController.js';

// Sistema de pontuação melhorado e mais justo
const calculateWorkoutPoints = (workoutData) => {
  const {
    duration = 0,
    exercises = 0,
    difficulty = 'medium',
    streak = 0,
    completionRate = 100
  } = workoutData;

  let points = 0;

  // Pontos base por treino (15-30 pontos dependendo da duração)
  if (duration >= 90) points += 30;
  else if (duration >= 60) points += 25;
  else if (duration >= 45) points += 20;
  else if (duration >= 30) points += 15;
  else points += 10;

  // Bônus por número de exercícios (1-2 pontos por exercício, máximo 20)
  points += Math.min(exercises * 1.5, 20);

  // Multiplicador por dificuldade
  const difficultyMultiplier = {
    'easy': 0.8,
    'medium': 1.0,
    'hard': 1.3,
    'expert': 1.5
  };
  points *= (difficultyMultiplier[difficulty] || 1.0);

  // Bônus por consistência (streak)
  if (streak >= 30) points += 25; // 1 mês
  else if (streak >= 14) points += 15; // 2 semanas
  else if (streak >= 7) points += 10; // 1 semana
  else if (streak >= 3) points += 5; // 3 dias

  // Bônus por taxa de conclusão
  if (completionRate >= 100) points += 5;
  else if (completionRate >= 90) points += 3;
  else if (completionRate >= 80) points += 1;

  return Math.round(points);
};

// Calcular score de ranking mais justo
const calculateRankingScore = (gamification, user) => {
  const now = new Date();
  const userCreatedAt = new Date(user.createdAt);
  const daysSinceJoined = Math.max(1, (now - userCreatedAt) / (1000 * 60 * 60 * 24));
  const daysSinceLastWorkout = gamification.lastWorkoutDate 
    ? (now - new Date(gamification.lastWorkoutDate)) / (1000 * 60 * 60 * 24)
    : 999;

  // Fatores do score
  const consistencyFactor = Math.min(2.0, (gamification.currentStreak / Math.max(1, gamification.longestStreak)) + 0.5);
  const activityFactor = daysSinceLastWorkout <= 7 ? 1.5 : daysSinceLastWorkout <= 30 ? 1.0 : 0.5;
  const qualityFactor = gamification.stats.totalWorkouts > 0 
    ? Math.min(2.0, (gamification.totalPoints / gamification.stats.totalWorkouts) / 50)
    : 0.5;
  const longevityFactor = Math.min(1.2, 1.0 + (daysSinceJoined / 365) * 0.2);

  const finalScore = gamification.totalPoints * consistencyFactor * activityFactor * qualityFactor * longevityFactor;

  return {
    finalScore: Math.round(finalScore),
    factors: {
      consistency: consistencyFactor,
      activity: activityFactor,
      quality: qualityFactor,
      longevity: longevityFactor
    }
  };
};

// Inicializar gamificação do usuário
export const initializeUserGamification = async (userId) => {
  try {
    let gamification = await UserGamification.findOne({ userId });
    
    if (!gamification) {
      gamification = new UserGamification({
        userId,
        totalPoints: 0,
        currentLevel: 1,
        pointsToNextLevel: 100,
        currentStreak: 0,
        longestStreak: 0,
        badges: [],
        stats: {
          totalWorkouts: 0,
          totalExercises: 0,
          totalMinutes: 0,
          badgesEarned: 0
        }
      });
      await gamification.save();
    }
    
    return gamification;
  } catch (error) {
    console.error('Erro ao inicializar gamificação:', error);
    throw error;
  }
};

// Registrar treino completado
export const recordWorkoutCompleted = async (req, res) => {
  try {
    const { userId } = req.params;
    const { duration, exercises, difficulty, completionRate } = req.body;

    let gamification = await UserGamification.findOne({ userId });
    if (!gamification) {
      gamification = await initializeUserGamification(userId);
    }

    const oldLevel = gamification.currentLevel;
    const today = getBrazilDate();
    const lastWorkout = gamification.lastWorkoutDate ? new Date(gamification.lastWorkoutDate) : null;

    // Atualizar streak
    if (lastWorkout) {
      const daysDiff = Math.floor((today - lastWorkout) / (1000 * 60 * 60 * 24));
      if (daysDiff === 1) {
        gamification.currentStreak += 1;
      } else if (daysDiff > 1) {
        gamification.currentStreak = 1;
      }
    } else {
      gamification.currentStreak = 1;
    }

    if (gamification.currentStreak > gamification.longestStreak) {
      gamification.longestStreak = gamification.currentStreak;
    }

    // Calcular pontos do treino
    const pointsEarned = calculateWorkoutPoints({
      duration,
      exercises,
      difficulty,
      streak: gamification.currentStreak,
      completionRate
    });

    // Atualizar pontos e estatísticas
    gamification.totalPoints += pointsEarned;
    gamification.stats.totalWorkouts += 1;
    gamification.stats.totalExercises += exercises || 0;
    gamification.stats.totalMinutes += duration || 0;
    gamification.lastWorkoutDate = today;

    // Calcular nível baseado nos pontos
    const newLevel = Math.floor(gamification.totalPoints / 100) + 1;
    gamification.currentLevel = newLevel;
    gamification.pointsToNextLevel = (newLevel * 100) - gamification.totalPoints;

    await gamification.save();

    // Verificar badges - passar os dados atualizados
    await checkAndAwardBadges(userId, gamification);

    // Atualizar ranking
    try {
      await generateRanking('geral');
    } catch (rankingError) {
      console.error('Erro ao atualizar ranking:', rankingError);
    }

    const leveledUp = gamification.currentLevel > oldLevel;

    res.status(200).json({
      success: true,
      message: 'Treino registrado com sucesso',
      data: {
        pointsEarned,
        totalPoints: gamification.totalPoints,
        currentLevel: gamification.currentLevel,
        currentStreak: gamification.currentStreak,
        leveledUp
      }
    });
  } catch (error) {
    console.error('Erro ao registrar treino:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

// Obter dados de gamificação do usuário
export const getUserGamification = async (req, res) => {
  try {
    const { userId } = req.params;
    
    let gamification = await UserGamification.findOne({ userId });
    if (!gamification) {
      gamification = await initializeUserGamification(userId);
    }

    res.status(200).json({
      success: true,
      data: gamification
    });
  } catch (error) {
    console.error('Erro ao buscar gamificação:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

// Obter ranking
export const getRanking = async (req, res) => {
  try {
    const { period = 'geral' } = req.params;
    
    let ranking = await Ranking.findOne({ period }).sort({ lastUpdated: -1 });
    
    if (!ranking || isRankingOutdated(ranking)) {
      ranking = await generateRanking(period);
    }

    res.status(200).json({
      success: true,
      data: ranking
    });
  } catch (error) {
    console.error('Erro ao buscar ranking:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

// Obter ranking por categoria
export const getRankingByCategory = async (req, res) => {
  try {
    const { period = 'global', category = 'overall' } = req.query;
    
    const gamifications = await UserGamification.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $match: {
          'stats.totalWorkouts': { $gte: 1 }
        }
      },
      {
        $project: {
          userId: 1,
          totalPoints: 1,
          currentLevel: 1,
          currentStreak: 1,
          longestStreak: 1,
          lastWorkoutDate: 1,
          badges: 1,
          stats: 1,
          'user.username': 1,
          'user.avatar': 1,
          'user.createdAt': 1
        }
      }
    ]);

    let sortedRankings;
    
    switch (category) {
      case 'consistency':
        sortedRankings = gamifications.sort((a, b) => b.currentStreak - a.currentStreak);
        break;
      case 'points':
        sortedRankings = gamifications.sort((a, b) => b.totalPoints - a.totalPoints);
        break;
      case 'workouts':
        sortedRankings = gamifications.sort((a, b) => b.stats.totalWorkouts - a.stats.totalWorkouts);
        break;
      case 'streaks':
        sortedRankings = gamifications.sort((a, b) => b.longestStreak - a.longestStreak);
        break;
      default: // overall
        const rankingsWithScores = gamifications.map(item => {
          const scoreData = calculateRankingScore(item, item.user);
          return { ...item, rankingScore: scoreData.finalScore };
        });
        sortedRankings = rankingsWithScores.sort((a, b) => b.rankingScore - a.rankingScore);
    }

    const rankings = sortedRankings.slice(0, 100).map((user, index) => ({
      userId: user.userId,
      username: user.user.username,
      avatar: user.user.avatar,
      points: user.totalPoints,
      level: user.currentLevel,
      position: index + 1,
      badges: user.badges.length,
      workouts: user.stats.totalWorkouts,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak
    }));

    res.status(200).json({
      success: true,
      data: {
        period,
        category,
        rankings,
        lastUpdated: getBrazilDate()
      }
    });
  } catch (error) {
    console.error('Erro ao buscar ranking por categoria:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

// Obter estatísticas do ranking
export const getRankingStats = async (req, res) => {
  try {
    const { period = 'global' } = req.query;
    
    const stats = await UserGamification.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $match: {
          'stats.totalWorkouts': { $gte: 1 }
        }
      },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          avgPoints: { $avg: '$totalPoints' },
          avgLevel: { $avg: '$currentLevel' },
          avgWorkouts: { $avg: '$stats.totalWorkouts' },
          maxStreak: { $max: '$longestStreak' },
          totalPoints: { $sum: '$totalPoints' },
          totalWorkouts: { $sum: '$stats.totalWorkouts' }
        }
      }
    ]);

    const levelDistribution = await UserGamification.aggregate([
      {
        $match: {
          'stats.totalWorkouts': { $gte: 1 }
        }
      },
      {
        $group: {
          _id: '$currentLevel',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const activeUsers = await UserGamification.countDocuments({
      lastWorkoutDate: {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    });

    res.status(200).json({
      success: true,
      data: {
        period,
        summary: stats[0] || {},
        levelDistribution,
        activeUsersLast7Days: activeUsers,
        lastUpdated: getBrazilDate()
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas do ranking:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

// Verificar se ranking está desatualizado
const isRankingOutdated = (ranking) => {
  const now = new Date();
  const lastUpdate = new Date(ranking.lastUpdated);
  const hoursDiff = (now - lastUpdate) / (1000 * 60 * 60);
  return hoursDiff > 1; // Atualizar a cada 1 hora
};

// Gerar ranking
const generateRanking = async (period) => {
  try {
    const now = getBrazilDate();
    let startDate, endDate;

    switch (period) {
      case 'semanal':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'mensal':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      case 'anual':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear() + 1, 0, 1);
        break;
      default: // geral
        startDate = new Date(2020, 0, 1);
        endDate = new Date(2030, 0, 1);
    }

    // Buscar dados com agregação otimizada
    const gamifications = await UserGamification.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $match: {
          'stats.totalWorkouts': { $gte: 1 }
        }
      },
      {
        $project: {
          userId: 1,
          totalPoints: 1,
          currentLevel: 1,
          currentStreak: 1,
          longestStreak: 1,
          lastWorkoutDate: 1,
          badges: 1,
          stats: 1,
          'user.username': 1,
          'user.avatar': 1,
          'user.createdAt': 1
        }
      }
    ]);

    // Calcular scores e ordenar
    const rankingsWithScores = gamifications.map(item => {
      const scoreData = calculateRankingScore(item, item.user);
      return {
        userId: item.userId,
        username: item.user.username,
        avatar: item.user.avatar,
        points: item.totalPoints,
        level: item.currentLevel,
        badges: item.badges.length,
        workouts: item.stats.totalWorkouts,
        currentStreak: item.currentStreak,
        longestStreak: item.longestStreak,
        lastWorkoutDate: item.lastWorkoutDate,
        rankingScore: scoreData.finalScore
      };
    });

    // Ordenar por score de ranking
    rankingsWithScores.sort((a, b) => b.rankingScore - a.rankingScore);

    // Adicionar posições
    const rankings = rankingsWithScores.map((user, index) => ({
      ...user,
      position: index + 1
    }));

    // Limitar a 100 posições para performance
    const topRankings = rankings.slice(0, 100);

    const ranking = new Ranking({
      period,
      startDate,
      endDate,
      rankings: topRankings,
      lastUpdated: getBrazilDate()
    });

    await ranking.save();
    return ranking;
  } catch (error) {
    console.error('Erro ao gerar ranking:', error);
    throw error;
  }
};

export default {
  initializeUserGamification,
  recordWorkoutCompleted,
  getUserGamification,
  getRanking,
  getRankingByCategory,
  getRankingStats
};