import { UserGamification, Challenge } from '../models/Gamification.js';
import { getBrazilDate } from '../helpers/getBrazilDate.js';

// Sistema de progresso de desafios otimizado
export const updateChallengeProgressSystem = async (userId, actionType, value = 1, metadata = {}) => {
  try {
    const gamification = await UserGamification.findOne({ userId });
    if (!gamification) {
      console.log(`Gamification não encontrada para usuário ${userId}`);
      return;
    }

    const progressUpdates = [];
    const completedChallenges = [];

    // Processar todos os desafios ativos
    for (const activeChallenge of gamification.activeChallenges) {
      const challenge = await Challenge.findById(activeChallenge.challengeId);
      if (!challenge || !challenge.isActive) continue;

      // Verificar se o desafio ainda está no período válido
      const now = getBrazilDate();
      if (now < challenge.startDate || now > challenge.endDate) continue;

      // Verificar se a ação corresponde ao tipo do desafio
      if (challenge.actionType === actionType) {
        const oldProgress = activeChallenge.progress;
        activeChallenge.progress += value;

        // Garantir que não ultrapasse o target
        if (activeChallenge.progress > challenge.requirements.target) {
          activeChallenge.progress = challenge.requirements.target;
        }

        progressUpdates.push({
          challengeId: challenge._id,
          challengeTitle: challenge.title,
          oldProgress,
          newProgress: activeChallenge.progress,
          target: challenge.requirements.target,
          percentage: Math.round((activeChallenge.progress / challenge.requirements.target) * 100)
        });

        // Verificar marcos de progresso (25%, 50%, 75%)
        const percentage = (activeChallenge.progress / challenge.requirements.target) * 100;
        const milestones = [25, 50, 75];
        
        for (const milestone of milestones) {
          const oldPercentage = (oldProgress / challenge.requirements.target) * 100;
          if (oldPercentage < milestone && percentage >= milestone) {
            // Adicionar notificação de marco
            if (!gamification.notifications) gamification.notifications = [];
            gamification.notifications.push({
              type: 'challenge_milestone',
              title: `${milestone}% Completo!`,
              message: `Você completou ${milestone}% do desafio "${challenge.title}"`,
              data: {
                challengeId: challenge._id,
                milestone,
                progress: activeChallenge.progress,
                target: challenge.requirements.target
              },
              read: false,
              createdAt: now
            });
          }
        }

        // Verificar se completou o desafio
        if (activeChallenge.progress >= challenge.requirements.target) {
          // Mover para desafios completados
          const completedChallenge = {
            challengeId: activeChallenge.challengeId,
            completedAt: now,
            pointsEarned: challenge.rewards.points || 0,
            finalProgress: activeChallenge.progress
          };

          gamification.completedChallenges.push(completedChallenge);
          completedChallenges.push({
            challenge,
            completedChallenge
          });

          // Adicionar pontos
          gamification.totalPoints += challenge.rewards.points || 0;
          gamification.stats.challengesCompleted += 1;

          // Verificar se subiu de nível
          const newLevel = Math.floor(gamification.totalPoints / 1000) + 1;
          if (newLevel > gamification.level) {
            gamification.level = newLevel;
            
            // Adicionar notificação de nível
            if (!gamification.notifications) gamification.notifications = [];
            gamification.notifications.push({
              type: 'level_up',
              title: 'Nível Aumentado!',
              message: `Parabéns! Você alcançou o nível ${newLevel}`,
              data: {
                newLevel,
                totalPoints: gamification.totalPoints
              },
              read: false,
              createdAt: now
            });
          }

          // Adicionar aos completados do desafio
          if (!challenge.completedBy.some(cb => cb.userId.toString() === userId)) {
            challenge.completedBy.push({
              userId,
              completedAt: now
            });
            await challenge.save();
          }

          // Adicionar notificação de conclusão
          if (!gamification.notifications) gamification.notifications = [];
          gamification.notifications.push({
            type: 'challenge_completed',
            title: 'Desafio Concluído!',
            message: `Parabéns! Você completou o desafio "${challenge.title}" e ganhou ${challenge.rewards.points} pontos`,
            data: {
              challengeId: challenge._id,
              challengeTitle: challenge.title,
              pointsEarned: challenge.rewards.points,
              badge: challenge.rewards.badge
            },
            read: false,
            createdAt: now
          });
        }
      }
    }

    // Remover desafios completados dos ativos
    gamification.activeChallenges = gamification.activeChallenges.filter(
      ac => !completedChallenges.some(cc => cc.completedChallenge.challengeId.toString() === ac.challengeId.toString())
    );

    // Atualizar última atividade
    gamification.lastActivity = now;

    await gamification.save();

    return {
      success: true,
      progressUpdates,
      completedChallenges: completedChallenges.map(cc => ({
        challengeId: cc.challenge._id,
        title: cc.challenge.title,
        pointsEarned: cc.completedChallenge.pointsEarned
      })),
      newLevel: gamification.level,
      totalPoints: gamification.totalPoints
    };

  } catch (error) {
    console.error('Erro ao atualizar progresso do desafio:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Função para obter progresso detalhado de um usuário
export const getUserChallengeProgress = async (userId) => {
  try {
    const gamification = await UserGamification.findOne({ userId }).populate('activeChallenges.challengeId');
    if (!gamification) {
      return { success: false, message: 'Gamification não encontrada' };
    }

    const activeProgress = [];
    
    for (const activeChallenge of gamification.activeChallenges) {
      if (activeChallenge.challengeId) {
        const challenge = activeChallenge.challengeId;
        const percentage = Math.round((activeChallenge.progress / challenge.requirements.target) * 100);
        
        activeProgress.push({
          challengeId: challenge._id,
          title: challenge.title,
          description: challenge.description,
          actionType: challenge.actionType,
          category: challenge.category,
          progress: activeChallenge.progress,
          target: challenge.requirements.target,
          percentage,
          unit: challenge.requirements.unit,
          startDate: challenge.startDate,
          endDate: challenge.endDate,
          rewards: challenge.rewards
        });
      }
    }

    return {
      success: true,
      data: {
        activeProgress,
        totalPoints: gamification.totalPoints,
        level: gamification.level,
        completedChallenges: gamification.completedChallenges.length,
        stats: gamification.stats
      }
    };

  } catch (error) {
    console.error('Erro ao obter progresso do usuário:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Função para verificar e atualizar streaks
export const updateUserStreak = async (userId, actionType) => {
  try {
    const gamification = await UserGamification.findOne({ userId });
    if (!gamification) return;

    const today = getBrazilDate().toDateString();
    const yesterday = new Date(getBrazilDate().getTime() - 24 * 60 * 60 * 1000).toDateString();

    if (actionType === 'complete_workout') {
      const lastWorkoutDate = gamification.streaks.workout.lastDate ? 
        new Date(gamification.streaks.workout.lastDate).toDateString() : null;

      if (lastWorkoutDate === today) {
        // Já treinou hoje, não atualizar streak
        return;
      }

      if (lastWorkoutDate === yesterday) {
        // Continuou a sequência
        gamification.streaks.workout.current += 1;
        if (gamification.streaks.workout.current > gamification.streaks.workout.best) {
          gamification.streaks.workout.best = gamification.streaks.workout.current;
        }
      } else {
        // Quebrou a sequência ou começou nova
        gamification.streaks.workout.current = 1;
      }

      gamification.streaks.workout.lastDate = getBrazilDate();
      await gamification.save();
    }

  } catch (error) {
    console.error('Erro ao atualizar streak:', error);
  }
};