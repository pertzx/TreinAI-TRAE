import { UserGamification } from '../models/Gamification.js';
import { getBrazilDate } from '../helpers/getBrazilDate.js';
import { createAutoNotification } from './notificationController.js';

// Definição de badges automáticos
const AUTOMATIC_BADGES = [
  // Badges de Treino
  {
    id: 'first_workout',
    name: 'Primeiro Passo',
    description: 'Complete seu primeiro treino',
    icon: '🏃‍♂️',
    category: 'treino',
    rarity: 'comum',
    points: 50,
    requirements: {
      type: 'workout_count',
      value: 1
    }
  },
  {
    id: 'workout_streak_7',
    name: 'Dedicado',
    description: 'Treine por 7 dias consecutivos',
    icon: '🔥',
    category: 'consistencia',
    rarity: 'raro',
    points: 200,
    requirements: {
      type: 'workout_streak',
      value: 7
    }
  },
  {
    id: 'workout_streak_30',
    name: 'Imparável',
    description: 'Treine por 30 dias consecutivos',
    icon: '⚡',
    category: 'consistencia',
    rarity: 'epico',
    points: 1000,
    requirements: {
      type: 'workout_streak',
      value: 30
    }
  },
  {
    id: 'workout_count_50',
    name: 'Veterano',
    description: 'Complete 50 treinos',
    icon: '🏆',
    category: 'treino',
    rarity: 'raro',
    points: 500,
    requirements: {
      type: 'workout_count',
      value: 50
    }
  },
  {
    id: 'workout_count_100',
    name: 'Centurião',
    description: 'Complete 100 treinos',
    icon: '👑',
    category: 'treino',
    rarity: 'epico',
    points: 1500,
    requirements: {
      type: 'workout_count',
      value: 100
    }
  },
  
  // Badges de Pontos
  {
    id: 'points_1000',
    name: 'Milionário',
    description: 'Acumule 1.000 pontos',
    icon: '💰',
    category: 'progresso',
    rarity: 'comum',
    points: 100,
    requirements: {
      type: 'total_points',
      value: 1000
    }
  },
  {
    id: 'points_5000',
    name: 'Rico',
    description: 'Acumule 5.000 pontos',
    icon: '💎',
    category: 'progresso',
    rarity: 'raro',
    points: 300,
    requirements: {
      type: 'total_points',
      value: 5000
    }
  },
  {
    id: 'points_10000',
    name: 'Magnata',
    description: 'Acumule 10.000 pontos',
    icon: '🏰',
    category: 'progresso',
    rarity: 'epico',
    points: 800,
    requirements: {
      type: 'total_points',
      value: 10000
    }
  },

  // Badges de Nível
  {
    id: 'level_5',
    name: 'Iniciante Avançado',
    description: 'Alcance o nível 5',
    icon: '⭐',
    category: 'progresso',
    rarity: 'comum',
    points: 200,
    requirements: {
      type: 'level',
      value: 5
    }
  },
  {
    id: 'level_10',
    name: 'Experiente',
    description: 'Alcance o nível 10',
    icon: '🌟',
    category: 'progresso',
    rarity: 'raro',
    points: 500,
    requirements: {
      type: 'level',
      value: 10
    }
  },
  {
    id: 'level_20',
    name: 'Mestre',
    description: 'Alcance o nível 20',
    icon: '✨',
    category: 'progresso',
    rarity: 'epico',
    points: 1200,
    requirements: {
      type: 'level',
      value: 20
    }
  },

  // Badges de Desafios
  {
    id: 'first_challenge',
    name: 'Desafiante',
    description: 'Complete seu primeiro desafio',
    icon: '🎯',
    category: 'especial',
    rarity: 'comum',
    points: 100,
    requirements: {
      type: 'challenges_completed',
      value: 1
    }
  },
  {
    id: 'challenge_master',
    name: 'Mestre dos Desafios',
    description: 'Complete 10 desafios',
    icon: '🏅',
    category: 'especial',
    rarity: 'epico',
    points: 800,
    requirements: {
      type: 'challenges_completed',
      value: 10
    }
  },

  // Badges de Tempo
  {
    id: 'time_60_minutes',
    name: 'Resistente',
    description: 'Acumule 60 minutos de treino',
    icon: '⏱️',
    category: 'treino',
    rarity: 'comum',
    points: 150,
    requirements: {
      type: 'total_minutes',
      value: 60
    }
  },
  {
    id: 'time_300_minutes',
    name: 'Maratonista',
    description: 'Acumule 300 minutos de treino',
    icon: '🏃‍♀️',
    category: 'treino',
    rarity: 'raro',
    points: 400,
    requirements: {
      type: 'total_minutes',
      value: 300
    }
  },
  {
    id: 'time_1000_minutes',
    name: 'Ultra Resistente',
    description: 'Acumule 1000 minutos de treino',
    icon: '🦾',
    category: 'treino',
    rarity: 'epico',
    points: 1000,
    requirements: {
      type: 'total_minutes',
      value: 1000
    }
  }
];

// Verificar e conceder badges automáticos
export const checkAndAwardBadges = async (userId, gamificationData = null) => {
  try {
    console.log(`🔍 Verificando badges para usuário ${userId}`);
    
    let gamification = gamificationData;
    if (!gamification) {
      gamification = await UserGamification.findOne({ userId });
      if (!gamification) return { success: false, message: 'Gamification não encontrada' };
    }

    console.log(`📊 Stats atuais: treinos=${gamification.stats.totalWorkouts}, pontos=${gamification.totalPoints}`);

    const newBadges = [];
    const currentBadgeIds = gamification.badges.map(b => b.badgeId);
    
    console.log(`🏆 Badges atuais: ${currentBadgeIds.join(', ') || 'nenhuma'}`);

    for (const badge of AUTOMATIC_BADGES) {
      console.log(`🔍 Verificando badge: ${badge.name} (${badge.id})`);
      
      // Verificar se o usuário já possui este badge
      if (currentBadgeIds.includes(badge.id)) {
        console.log(`   ⏭️ Já possui este badge`);
        continue;
      }

      let meetsRequirement = false;

      switch (badge.requirements.type) {
        case 'workout_count':
          meetsRequirement = gamification.stats.totalWorkouts >= badge.requirements.value;
          console.log(`   📊 workout_count: ${gamification.stats.totalWorkouts} >= ${badge.requirements.value} = ${meetsRequirement}`);
          break;
        
        case 'workout_streak':
          meetsRequirement = gamification.currentStreak >= badge.requirements.value ||
                           gamification.longestStreak >= badge.requirements.value;
          console.log(`   📊 workout_streak: current=${gamification.currentStreak}, longest=${gamification.longestStreak} >= ${badge.requirements.value} = ${meetsRequirement}`);
          break;
        
        case 'total_points':
          meetsRequirement = gamification.totalPoints >= badge.requirements.value;
          console.log(`   📊 total_points: ${gamification.totalPoints} >= ${badge.requirements.value} = ${meetsRequirement}`);
          break;
        
        case 'level':
          meetsRequirement = gamification.currentLevel >= badge.requirements.value;
          console.log(`   📊 level: ${gamification.currentLevel} >= ${badge.requirements.value} = ${meetsRequirement}`);
          break;
        
        case 'challenges_completed':
          meetsRequirement = (gamification.stats.challengesCompleted || 0) >= badge.requirements.value;
          console.log(`   📊 challenges_completed: ${gamification.stats.challengesCompleted || 0} >= ${badge.requirements.value} = ${meetsRequirement}`);
          break;
        
        case 'total_minutes':
          meetsRequirement = gamification.stats.totalMinutes >= badge.requirements.value;
          console.log(`   📊 total_minutes: ${gamification.stats.totalMinutes} >= ${badge.requirements.value} = ${meetsRequirement}`);
          break;
        
        case 'total_exercises':
          meetsRequirement = gamification.stats.totalExercises >= badge.requirements.value;
          console.log(`   📊 total_exercises: ${gamification.stats.totalExercises} >= ${badge.requirements.value} = ${meetsRequirement}`);
          break;
      }

      if (meetsRequirement) {
        console.log(`   🎉 Badge conquistada: ${badge.name}!`);
        
        // Conceder badge
        const newBadge = {
          badgeId: badge.id,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          category: badge.category,
          rarity: badge.rarity,
          points: badge.points,
          unlockedAt: getBrazilDate()
        };

        gamification.badges.push(newBadge);
        gamification.totalPoints += badge.points;
        gamification.stats.badgesEarned += 1;
        newBadges.push(newBadge);

        // Criar notificação automática
        try {
          await createAutoNotification(userId, {
            type: 'badge_earned',
            title: `Badge Conquistada: ${badge.name}!`,
            message: badge.description,
            data: { badge: newBadge }
          });
        } catch (notificationError) {
          console.error('Erro ao criar notificação automática:', notificationError);
        }
      } else {
        console.log(`   ❌ Não atende aos requisitos`);
      }
    }

    // Salvar as badges conquistadas
    if (newBadges.length > 0) {
      await gamification.save();
      console.log(`💾 Salvando ${newBadges.length} nova(s) badge(s)`);
    }

    return {
      success: true,
      newBadges,
      totalBadges: gamification.badges.length
    };

  } catch (error) {
    console.error('Erro ao verificar badges:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Obter todos os badges disponíveis
export const getAvailableBadges = async (req, res) => {
  try {
    const { userId } = req.params;

    const gamification = await UserGamification.findOne({ userId });
    if (!gamification) {
      return res.status(404).json({
        success: false,
        message: 'Gamification não encontrada'
      });
    }

    const userBadgeIds = gamification.badges.map(b => b.badgeId);
    
    const badgesWithStatus = AUTOMATIC_BADGES.map(badge => {
      const isUnlocked = userBadgeIds.includes(badge.id);
      let progress = 0;
      let progressText = '';

      if (!isUnlocked) {
        // Calcular progresso
        switch (badge.requirements.type) {
          case 'workout_count':
            progress = Math.min(gamification.stats.totalWorkouts / badge.requirements.value, 1);
            progressText = `${gamification.stats.totalWorkouts}/${badge.requirements.value} treinos`;
            break;
          
          case 'workout_streak':
            const currentStreak = Math.max(gamification.currentStreak, gamification.longestStreak);
            progress = Math.min(currentStreak / badge.requirements.value, 1);
            progressText = `${currentStreak}/${badge.requirements.value} dias consecutivos`;
            break;
          
          case 'total_points':
            progress = Math.min(gamification.totalPoints / badge.requirements.value, 1);
            progressText = `${gamification.totalPoints}/${badge.requirements.value} pontos`;
            break;
          
          case 'level':
            progress = Math.min(gamification.level / badge.requirements.value, 1);
            progressText = `Nível ${gamification.level}/${badge.requirements.value}`;
            break;
          
          case 'challenges_completed':
            progress = Math.min(gamification.stats.challengesCompleted / badge.requirements.value, 1);
            progressText = `${gamification.stats.challengesCompleted}/${badge.requirements.value} desafios`;
            break;
          
          case 'total_minutes':
            progress = Math.min(gamification.stats.totalMinutes / badge.requirements.value, 1);
            progressText = `${gamification.stats.totalMinutes}/${badge.requirements.value} minutos`;
            break;
        }
      }

      return {
        ...badge,
        isUnlocked,
        progress: Math.round(progress * 100),
        progressText,
        unlockedAt: isUnlocked ? gamification.badges.find(b => b.badgeId === badge.id)?.unlockedAt : null
      };
    });

    // Separar por categoria
    const badgesByCategory = badgesWithStatus.reduce((acc, badge) => {
      if (!acc[badge.category]) acc[badge.category] = [];
      acc[badge.category].push(badge);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        badges: badgesWithStatus,
        byCategory: badgesByCategory,
        stats: {
          total: AUTOMATIC_BADGES.length,
          unlocked: userBadgeIds.length,
          progress: Math.round((userBadgeIds.length / AUTOMATIC_BADGES.length) * 100)
        }
      }
    });

  } catch (error) {
    console.error('Erro ao obter badges disponíveis:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Obter badges do usuário
export const getUserBadges = async (req, res) => {
  try {
    const { userId } = req.params;
    const { category, rarity } = req.query;

    const gamification = await UserGamification.findOne({ userId });
    if (!gamification) {
      return res.status(404).json({
        success: false,
        message: 'Gamification não encontrada'
      });
    }

    let badges = gamification.badges || [];

    // Filtrar por categoria se especificado
    if (category) {
      badges = badges.filter(badge => badge.category === category);
    }

    // Filtrar por raridade se especificado
    if (rarity) {
      badges = badges.filter(badge => badge.rarity === rarity);
    }

    // Ordenar por data de desbloqueio (mais recentes primeiro)
    badges.sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt));

    res.json({
      success: true,
      data: {
        badges,
        stats: {
          total: gamification.badges.length,
          byCategory: gamification.badges.reduce((acc, badge) => {
            acc[badge.category] = (acc[badge.category] || 0) + 1;
            return acc;
          }, {}),
          byRarity: gamification.badges.reduce((acc, badge) => {
            acc[badge.rarity] = (acc[badge.rarity] || 0) + 1;
            return acc;
          }, {}),
          totalPoints: gamification.badges.reduce((sum, badge) => sum + (badge.points || 0), 0)
        }
      }
    });

  } catch (error) {
    console.error('Erro ao obter badges do usuário:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};