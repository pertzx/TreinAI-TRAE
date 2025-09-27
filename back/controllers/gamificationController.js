import { UserGamification, Challenge, Ranking } from '../models/Gamification.js';
import User from '../models/User.js';
import { getBrazilDate } from '../helpers/getBrazilDate.js';
import { updateChallengeProgressSystem, updateUserStreak } from './challengeProgressController.js';
import { checkAndAwardBadges } from './badgeController.js';
import { v4 as uuidv4 } from 'uuid';

// Sistema de Badges predefinidas
const PREDEFINED_BADGES = [
  {
    name: 'Primeiro Treino',
    description: 'Complete seu primeiro treino',
    icon: '🏃‍♂️',
    category: 'treino',
    rarity: 'comum',
    points: 10,
    requirements: { type: 'treinos_count', value: 1, description: 'Complete 1 treino' }
  },
  {
    name: 'Consistente',
    description: 'Mantenha uma sequência de 7 dias',
    icon: '🔥',
    category: 'consistencia',
    rarity: 'raro',
    points: 50,
    requirements: { type: 'streak_days', value: 7, description: 'Mantenha 7 dias consecutivos' }
  },
  {
    name: 'Dedicado',
    description: 'Complete 30 treinos',
    icon: '💪',
    category: 'treino',
    rarity: 'epico',
    points: 100,
    requirements: { type: 'treinos_count', value: 30, description: 'Complete 30 treinos' }
  },
  {
    name: 'Lenda',
    description: 'Alcance o nível 10',
    icon: '👑',
    category: 'progresso',
    rarity: 'lendario',
    points: 500,
    requirements: { type: 'level_reached', value: 10, description: 'Alcance o nível 10' }
  }
];

// Calcular nível baseado nos pontos
const calculateLevel = (points) => {
  return Math.floor(points / 100) + 1;
};

// Calcular pontos necessários para o próximo nível
const calculatePointsToNextLevel = (points) => {
  const currentLevel = calculateLevel(points);
  const pointsForNextLevel = currentLevel * 100;
  return pointsForNextLevel - points;
};

// Inicializar gamificação para novo usuário
export const initializeUserGamification = async (userId) => {
  try {
    const existingGamification = await UserGamification.findOne({ userId });
    if (existingGamification) {
      return existingGamification;
    }

    const newGamification = new UserGamification({
      userId,
      totalPoints: 0,
      currentLevel: 1,
      pointsToNextLevel: 100,
      currentStreak: 0,
      longestStreak: 0,
      badges: [],
      activeChallenges: [],
      completedChallenges: [],
      titles: [],
      stats: {
        totalWorkouts: 0,
        totalExercises: 0,
        totalMinutes: 0,
        badgesEarned: 0,
        challengesCompleted: 0
      }
    });

    await newGamification.save();
    return newGamification;
  } catch (error) {
    console.error('Erro ao inicializar gamificação:', error);
    throw error;
  }
};

// Adicionar pontos ao usuário
export const addPoints = async (req, res) => {
  try {
    const { userId } = req.params;
    const { points, actionType = 'complete_workout', metadata = {} } = req.body;

    let gamification = await UserGamification.findOne({ userId });
    if (!gamification) {
      gamification = await initializeUserGamification(userId);
    }

    const oldLevel = gamification.currentLevel;
    gamification.totalPoints += points;
    gamification.currentLevel = calculateLevel(gamification.totalPoints);
    gamification.pointsToNextLevel = calculatePointsToNextLevel(gamification.totalPoints);

    // Atualizar estatísticas baseado no tipo de ação
    if (actionType === 'complete_workout') {
      gamification.stats.totalWorkouts += 1;
      if (metadata.exercises) gamification.stats.totalExercises += metadata.exercises;
      if (metadata.duration) gamification.stats.totalMinutes += metadata.duration;
    }

    // Verificar se subiu de nível
    const leveledUp = gamification.currentLevel > oldLevel;

    // Atualizar streak
    await updateUserStreak(userId, actionType);

    // Atualizar progresso dos desafios usando o novo sistema
    const challengeProgress = await updateChallengeProgressSystem(userId, actionType, 1, metadata);

    await gamification.save();

    // Verificar badges desbloqueadas
    await checkAndUnlockBadges(userId);

    res.status(200).json({
      success: true,
      message: 'Pontos adicionados com sucesso',
      data: {
        pointsAdded: points,
        totalPoints: gamification.totalPoints,
        currentLevel: gamification.currentLevel,
        pointsToNextLevel: gamification.pointsToNextLevel,
        leveledUp,
        challengeProgress: challengeProgress.success ? challengeProgress : null,
        completedChallenges: challengeProgress.success ? challengeProgress.completedChallenges : [],
        stats: gamification.stats
      }
    });
  } catch (error) {
    console.error('Erro ao adicionar pontos:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

// Registrar treino completado
export const recordWorkoutCompleted = async (req, res) => {
  try {
    const { userId } = req.params;
    const { workoutDuration, exerciseCount } = req.body;

    console.log(`🏋️ Registrando treino para usuário ${userId}:`);
    console.log(`   - Duração: ${workoutDuration} minutos`);
    console.log(`   - Exercícios: ${exerciseCount}`);

    let gamification = await UserGamification.findOne({ userId });
    if (!gamification) {
      gamification = await initializeUserGamification(userId);
      console.log(`   - Criando nova gamificação para usuário ${userId}`);
    } else {
      console.log(`   - Gamificação existente encontrada`);
      console.log(`   - Pontos atuais: ${gamification.totalPoints}`);
      console.log(`   - Nível atual: ${gamification.currentLevel}`);
      console.log(`   - Treinos totais: ${gamification.stats.totalWorkouts}`);
      console.log(`   - Minutos totais: ${gamification.stats.totalMinutes}`);
    }

    // Atualizar estatísticas
    gamification.stats.totalWorkouts += 1;
    gamification.stats.totalExercises += exerciseCount || 0;
    gamification.stats.totalMinutes += workoutDuration || 0;

    console.log(`   - Novas estatísticas:`);
    console.log(`     * Total treinos: ${gamification.stats.totalWorkouts}`);
    console.log(`     * Total exercícios: ${gamification.stats.totalExercises}`);
    console.log(`     * Total minutos: ${gamification.stats.totalMinutes}`);

    // Calcular streak
    const today = new Date();
    const lastWorkout = gamification.lastWorkoutDate;
    
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

    gamification.lastWorkoutDate = today;

    // Adicionar pontos base pelo treino
    let pointsEarned = 20; // Pontos base por treino
    
    // Bonus por duração
    if (workoutDuration >= 60) pointsEarned += 10;
    if (workoutDuration >= 90) pointsEarned += 10;
    
    // Bonus por streak
    if (gamification.currentStreak >= 3) pointsEarned += 5;
    if (gamification.currentStreak >= 7) pointsEarned += 10;

    const oldLevel = gamification.currentLevel;
    gamification.totalPoints += pointsEarned;
    gamification.currentLevel = calculateLevel(gamification.totalPoints);
    gamification.pointsToNextLevel = calculatePointsToNextLevel(gamification.totalPoints);

    await gamification.save();
    console.log(`   - ✅ Gamificação salva no banco de dados`);
    console.log(`   - Pontos finais: ${gamification.totalPoints}`);
    console.log(`   - Nível final: ${gamification.currentLevel}`);

    // Verificar badges e desafios
    await checkAndUnlockBadges(userId);
    await updateChallengeProgress(userId, 'complete_workouts', 1);

    // Atualizar ranking após completar treino
    try {
      console.log(`   - Atualizando ranking geral...`);
      await generateRanking('geral');
      console.log(`   - ✅ Ranking atualizado com sucesso`);
    } catch (rankingError) {
      console.error('   - ❌ Erro ao atualizar ranking:', rankingError);
      // Não falha o processo principal se o ranking falhar
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

// Verificar e desbloquear badges
const checkAndUnlockBadges = async (userId) => {
  try {
    const gamification = await UserGamification.findOne({ userId });
    if (!gamification) return;

    const unlockedBadges = [];

    for (const badgeTemplate of PREDEFINED_BADGES) {
      // Verificar se já possui a badge
      const alreadyHas = gamification.badges.some(badge => badge.name === badgeTemplate.name);
      if (alreadyHas) continue;

      let shouldUnlock = false;

      switch (badgeTemplate.requirements.type) {
        case 'treinos_count':
          shouldUnlock = gamification.stats.totalWorkouts >= badgeTemplate.requirements.value;
          break;
        case 'streak_days':
          shouldUnlock = gamification.currentStreak >= badgeTemplate.requirements.value;
          break;
        case 'level_reached':
          shouldUnlock = gamification.currentLevel >= badgeTemplate.requirements.value;
          break;
      }

      if (shouldUnlock) {
        const newBadge = {
          ...badgeTemplate,
          id: uuidv4(),
          unlockedAt: getBrazilDate()
        };
        
        gamification.badges.push(newBadge);
        gamification.stats.badgesEarned += 1;
        gamification.totalPoints += badgeTemplate.points;
        
        unlockedBadges.push(newBadge);
      }
    }

    if (unlockedBadges.length > 0) {
      gamification.currentLevel = calculateLevel(gamification.totalPoints);
      gamification.pointsToNextLevel = calculatePointsToNextLevel(gamification.totalPoints);
      await gamification.save();
    }

    return unlockedBadges;
  } catch (error) {
    console.error('Erro ao verificar badges:', error);
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

    // Buscar desafios ativos
    const activeChallenges = await Challenge.find({
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    });

    res.status(200).json({
      success: true,
      data: {
        ...gamification.toObject(),
        availableChallenges: activeChallenges
      }
    });
  } catch (error) {
    console.error('Erro ao buscar gamificação:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

// Obter todos os desafios (para admin)
export const getAllChallenges = async (req, res) => {
  try {
    const challenges = await Challenge.find({})
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      challenges,
      total: challenges.length
    });
  } catch (error) {
    console.error('Erro ao buscar desafios:', error);
    res.status(500).json({
      success: false,
      erro: 'Erro interno do servidor'
    });
  }
};

// Criar novo desafio
export const createChallenge = async (req, res) => {
  try {
    const { titulo, descricao, actionType, period, category, requisitos, recompensas, dataInicio, dataFim, ativo, adminId } = req.body;

    // Verificar se o usuário é admin
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        erro: 'Acesso negado. Apenas administradores podem criar desafios.'
      });
    }

    // Mapear dados do frontend para o schema otimizado
    const challenge = new Challenge({
      title: titulo,
      description: descricao,
      actionType: actionType || 'complete_workouts', // Padrão se não especificado
      period: period || 'monthly', // Padrão se não especificado
      category: category || 'training', // Padrão se não especificado
      startDate: new Date(dataInicio),
      endDate: new Date(dataFim),
      requirements: {
        target: requisitos?.quantidade || requisitos?.target || 1,
        current: 0,
        unit: requisitos?.unit || 'workouts'
      },
      rewards: {
        points: recompensas?.pontos || recompensas?.points || 0,
        badge: recompensas?.badge || null,
        title: recompensas?.title || null,
        description: recompensas?.descricao || recompensas?.description || null
      },
      isActive: ativo !== undefined ? ativo : true,
      createdBy: adminId,
      createdAt: getBrazilDate(),
      updatedAt: getBrazilDate()
    });

    await challenge.save();

    res.status(201).json({
      success: true,
      message: 'Desafio criado com sucesso',
      data: challenge
    });
  } catch (error) {
    console.error('Erro ao criar desafio:', error);
    res.status(500).json({ 
      success: false, 
      erro: 'Erro interno do servidor: ' + error.message 
    });
  }
};

// Participar de um desafio
export const joinChallenge = async (req, res) => {
  try {
    const { userId, challengeId } = req.params;

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Desafio não encontrado' });
    }

    let gamification = await UserGamification.findOne({ userId });
    if (!gamification) {
      gamification = await initializeUserGamification(userId);
    }

    // Verificar se já está participando
    const alreadyJoined = gamification.activeChallenges.some(
      ac => ac.challengeId === challengeId
    );

    if (alreadyJoined) {
      return res.status(400).json({ success: false, message: 'Já está participando deste desafio' });
    }

    // Adicionar aos desafios ativos
    gamification.activeChallenges.push({
      challengeId,
      progress: 0,
      startedAt: getBrazilDate()
    });

    // Adicionar aos participantes do desafio
    if (!challenge.participants.includes(userId)) {
      challenge.participants.push(userId);
      await challenge.save();
    }

    await gamification.save();

    res.status(200).json({
      success: true,
      message: 'Inscrito no desafio com sucesso',
      data: challenge
    });
  } catch (error) {
    console.error('Erro ao participar do desafio:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

// Atualizar progresso do desafio
const updateChallengeProgress = async (userId, actionType, value) => {
  try {
    const gamification = await UserGamification.findOne({ userId });
    if (!gamification) return;

    for (const activeChallenge of gamification.activeChallenges) {
      const challenge = await Challenge.findById(activeChallenge.challengeId);
      if (!challenge || !challenge.isActive) continue;

      // Usar actionType do schema otimizado
      if (challenge.actionType === actionType) {
        activeChallenge.progress += value;

        // Verificar se completou o desafio
        if (activeChallenge.progress >= challenge.requirements.target) {
          // Mover para desafios completados
          gamification.completedChallenges.push({
            challengeId: activeChallenge.challengeId,
            completedAt: getBrazilDate(),
            pointsEarned: challenge.rewards.points || 0
          });

          // Adicionar pontos
          gamification.totalPoints += challenge.rewards.points || 0;
          gamification.stats.challengesCompleted += 1;

          // Adicionar aos completados do desafio
          if (!challenge.completedBy.some(cb => cb.userId === userId)) {
            challenge.completedBy.push({
              userId,
              completedAt: getBrazilDate()
            });
            await challenge.save();
          }

          // Remover dos ativos
          gamification.activeChallenges = gamification.activeChallenges.filter(
            ac => ac.challengeId !== activeChallenge.challengeId
          );
        }
      }
    }

    await gamification.save();
  } catch (error) {
    console.error('Erro ao atualizar progresso do desafio:', error);
  }
};

// Obter ranking
export const getRanking = async (req, res) => {
  try {
    const { period = 'geral' } = req.query;

    let ranking = await Ranking.findOne({ period }).sort({ lastUpdated: -1 });

    if (!ranking || (new Date() - ranking.lastUpdated) > 3600000) { // 1 hora
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

// Gerar ranking
const generateRanking = async (period) => {
  try {
    let startDate, endDate;
    const now = new Date();

    switch (period) {
      case 'semanal':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'mensal':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'anual':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        startDate = new Date(2020, 0, 1);
        endDate = now;
    }

    const gamifications = await UserGamification.find({}).sort({ totalPoints: -1 }).limit(100);
    const rankings = [];

    for (let i = 0; i < gamifications.length; i++) {
      const gamification = gamifications[i];
      const user = await User.findById(gamification.userId);
      
      if (user) {
        rankings.push({
          userId: gamification.userId,
          username: user.username,
          avatar: user.avatar,
          points: gamification.totalPoints,
          level: gamification.currentLevel,
          position: i + 1,
          badges: gamification.badges.length,
          workouts: gamification.stats.totalWorkouts
        });
      }
    }

    const ranking = new Ranking({
      period,
      startDate,
      endDate,
      rankings,
      lastUpdated: getBrazilDate()
    });

    await ranking.save();
    return ranking;
  } catch (error) {
    console.error('Erro ao gerar ranking:', error);
    throw error;
  }
};

// Atualizar desafio existente (apenas admins)
export const updateChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descricao, tipo, requisitos, recompensas, dataInicio, dataFim, ativo, adminId } = req.body;

    // Verificar se o usuário é admin
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        erro: 'Acesso negado. Apenas administradores podem atualizar desafios.'
      });
    }

    const challenge = await Challenge.findById(id);
    if (!challenge) {
      return res.status(404).json({
        success: false,
        erro: 'Desafio não encontrado'
      });
    }

    // Atualizar campos
    challenge.title = titulo;
    challenge.description = descricao;
    challenge.type = tipo;
    challenge.requirements = requisitos;
    challenge.rewards = recompensas;
    challenge.startDate = new Date(dataInicio);
    challenge.endDate = new Date(dataFim);
    challenge.isActive = ativo;
    challenge.updatedAt = getBrazilDate();

    await challenge.save();

    res.status(200).json({
      success: true,
      message: 'Desafio atualizado com sucesso',
      data: challenge
    });
  } catch (error) {
    console.error('Erro ao atualizar desafio:', error);
    res.status(500).json({
      success: false,
      erro: 'Erro interno do servidor'
    });
  }
};

// Deletar desafio (apenas admins)
export const deleteChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.body;

    // Verificar se o usuário é admin
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        erro: 'Acesso negado. Apenas administradores podem deletar desafios.'
      });
    }

    const challenge = await Challenge.findById(id);
    if (!challenge) {
      return res.status(404).json({
        success: false,
        erro: 'Desafio não encontrado'
      });
    }

    await Challenge.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Desafio deletado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar desafio:', error);
    res.status(500).json({
      success: false,
      erro: 'Erro interno do servidor'
    });
  }
};

// Alternar status do desafio (apenas admins)
export const toggleChallengeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { ativo, adminId } = req.body;

    // Verificar se o usuário é admin
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        erro: 'Acesso negado. Apenas administradores podem alterar status de desafios.'
      });
    }

    const challenge = await Challenge.findById(id);
    if (!challenge) {
      return res.status(404).json({
        success: false,
        erro: 'Desafio não encontrado'
      });
    }

    challenge.isActive = ativo;
    challenge.updatedAt = getBrazilDate();
    await challenge.save();

    res.status(200).json({
      success: true,
      message: `Desafio ${ativo ? 'ativado' : 'desativado'} com sucesso`,
      data: challenge
    });
  } catch (error) {
    console.error('Erro ao alterar status do desafio:', error);
    res.status(500).json({
      success: false,
      erro: 'Erro interno do servidor'
    });
  }
};

export default {
  initializeUserGamification,
  addPoints,
  recordWorkoutCompleted,
  getUserGamification,
  createChallenge,
  joinChallenge,
  getRanking,
  getAllChallenges,
  updateChallenge,
  deleteChallenge,
  toggleChallengeStatus
};