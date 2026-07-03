import { getBrazilDate } from "../helpers/getBrazilDate.js";
import Ranking from "../models/Gamification/Ranking.js";
import UserGamification from "../models/Gamification/UserGamification.js";
import MilestoneTrigger from "../models/MilestoneTrigger.js";
import { evaluateMilestones } from "../helpers/evaluateMilestones.js";

// Catálogo de conquistas. Cada uma testa o estado atual da gamificação do usuário.
const BADGE_CATALOG = [
  { id: 'primeiro-treino', label: 'Primeiro treino', test: (g) => g.workouts >= 1 },
  { id: 'streak-7', label: 'Sequência de 7 dias', test: (g) => g.streak >= 7 },
  { id: 'streak-30', label: 'Sequência de 30 dias', test: (g) => g.streak >= 30 },
  { id: 'treinos-10', label: '10 treinos', test: (g) => g.workouts >= 10 },
  { id: 'treinos-50', label: '50 treinos', test: (g) => g.workouts >= 50 },
  { id: 'treinos-100', label: '100 treinos', test: (g) => g.workouts >= 100 },
];

/**
 * Confere o catálogo e adiciona ao doc as badges recém-conquistadas (sem duplicar).
 * Retorna a lista de badges novas (apenas as desbloqueadas nesta chamada).
 */
const awardBadges = (gami) => {
  if (!gami.badges) gami.badges = [];
  const jaTem = new Set(gami.badges.map(b => b.id));
  const novas = [];
  for (const badge of BADGE_CATALOG) {
    if (!jaTem.has(badge.id) && badge.test(gami)) {
      const earned = { id: badge.id, label: badge.label, earnedAt: new Date(getBrazilDate()) };
      gami.badges.push(earned);
      novas.push(earned);
    }
  }
  return novas;
};

export const finalizarTreino = async (req, res) => {
  try {
    const { payloadTreino = {}, user = {} } = req.body;
    /* 
      {
          dataExecucao: new Date(),
          duracao: total, // em segundos
          exerciciosFeitos: perExercise.map((p, idx) => ({
            nome: p.nome,
            seriesConcluidas: (p.sets || []).length,
            tempoTotalExercicio: p.sum,
            sets: p.sets,
          })),
        };
    */

    // Verificações de entrada mais robustas
    if (!payloadTreino || !user || !user._id) {
      return res.status(400).json({ success: false, msg: 'Dados incompletos: payloadTreino e user são obrigatórios' });
    }

    if (!payloadTreino.exerciciosFeitos || !Array.isArray(payloadTreino.exerciciosFeitos) || payloadTreino.exerciciosFeitos.length === 0) {
      return res.status(400).json({ success: false, msg: 'Exercícios realizados são obrigatórios' });
    }

    if (!payloadTreino.duracao || typeof payloadTreino.duracao !== 'number' || payloadTreino.duracao <= 0) {
      return res.status(400).json({ success: false, msg: 'Duração do treino deve ser um número positivo' });
    }

    if (!user.username || !user.perfil) {
      return res.status(400).json({ success: false, msg: 'Dados do usuário incompletos' });
    }

    // Encontrar um ranking valido pro cliente, endDate > data atual e startDate, ja começou
    const ranking = await Ranking.findOne({
      endDate: { $gt: new Date(getBrazilDate()) },
      startDate: { $lt: new Date(getBrazilDate()) }
    });

    // Calcular os pontos do usuario
    let setsExecutados = 0;
    let exerciseExecutadas = 0;

    // Calcular os sets e workouts executados
    payloadTreino.exerciciosFeitos.forEach((ex) => {
      if (ex && typeof ex.seriesConcluidas === 'number' && ex.seriesConcluidas > 0) {
        setsExecutados += ex.seriesConcluidas;
        exerciseExecutadas++;
      }
    });

    // Validar se pelo menos um exercício foi executado
    if (exerciseExecutadas === 0) {
      return res.status(400).json({ success: false, msg: 'Nenhum exercício válido foi executado' });
    }

    // Calcular os pontos do usuario
    const points = Math.round(setsExecutados * exerciseExecutadas * (payloadTreino.duracao * 0.001));

    // Atualizar os dados do usuario no ranking e no userGamification
    const userRanking = ranking?.competitors.find((u) => u.userId === user._id);
    if (!userRanking) {
      ranking?.competitors.push({
        userId: user._id,
        username: user.username,
        avatar: user.avatar,
        points: points,
        workouts: 1,
        sets: setsExecutados,
        duration: payloadTreino.duracao,
        exercises: exerciseExecutadas,
        location: {
          country: user.perfil.country,
          state: user.perfil.state,
          city: user.perfil.city,
        },
      });

      await ranking?.save();
    } else {
      userRanking.username = user.username;
      userRanking.avatar = user.avatar;
      userRanking.points += points;
      userRanking.workouts += 1;
      userRanking.exercises += exerciseExecutadas;
      userRanking.sets += setsExecutados;
      userRanking.duration += payloadTreino.duracao;
      userRanking.location.country = user.perfil.country;
      userRanking.location.state = user.perfil.state;
      userRanking.location.city = user.perfil.city;

      await ranking.save(); // Corrigido: salvar o ranking, não o userRanking
    }

    const userGamification = await UserGamification.findOne({ userId: user._id });

    // Estado ANTES deste treino (para detectar cruzamento de marcos cumulativos).
    const prevState = userGamification ? {
      workouts: userGamification.workouts || 0,
      duration: userGamification.duration || 0,
      points: userGamification.points || 0,
    } : { workouts: 0, duration: 0, points: 0 };

    // Verificar se o usuário já finalizou um treino hoje
    if (userGamification && userGamification.lastWorkoutDate && userGamification.lastWorkoutDate.length > 0) {
      const lastWorkoutDate = userGamification.lastWorkoutDate[userGamification.lastWorkoutDate.length - 1];
      const currentDate = new Date(getBrazilDate());

      // Normalizar as datas para comparação (apenas dia/mês/ano)
      const lastDate = new Date(lastWorkoutDate);
      lastDate.setHours(0, 0, 0, 0);

      const today = new Date(currentDate);
      today.setHours(0, 0, 0, 0);

      // Se as datas são iguais, o usuário já treinou hoje
      if (lastDate.getTime() === today.getTime()) {
        return res.status(400).json({
          success: false,
          msg: 'Você já finalizou um treino hoje. Volte amanhã para continuar sua jornada!',
          data: {
            lastWorkoutDate: lastWorkoutDate,
            nextWorkoutAvailable: new Date(today.getTime() + 24 * 60 * 60 * 1000) // Próximo dia
          }
        });
      }
    }
    let gami;
    let novasBadges = [];

    if (!userGamification) {
      gami = await UserGamification.create({
        userId: user._id,
        streak: 1,
        workouts: 1,
        sets: setsExecutados,
        duration: payloadTreino.duracao,
        exercises: exerciseExecutadas,
        points: points,
        lastWorkoutDate: [new Date(getBrazilDate())],
        location: {
          country: user.perfil.country,
          state: user.perfil.state,
          city: user.perfil.city,
        },
      });
      novasBadges = awardBadges(gami);
      await gami.save();
    } else {

      // Verificação do streak melhorada
      const lastWorkoutDate = userGamification.lastWorkoutDate[userGamification.lastWorkoutDate.length - 1];
      const currentDate = new Date(getBrazilDate());

      // Normalizar as datas para comparação (apenas dia/mês/ano)
      const lastDate = new Date(lastWorkoutDate);
      lastDate.setHours(0, 0, 0, 0);

      const today = new Date(currentDate);
      today.setHours(0, 0, 0, 0);

      const diffTime = today.getTime() - lastDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Treino no dia seguinte - mantém streak
        userGamification.streak += 1;
      } else if (diffDays === 0) {
        // Mesmo dia - não altera streak
        // Streak permanece o mesmo
      } else {
        // Mais de 1 dia de diferença - reset streak
        userGamification.streak = 1;
      }

      userGamification.location.country = user.perfil.country;
      userGamification.location.state = user.perfil.state;
      userGamification.location.city = user.perfil.city;
      userGamification.workouts += 1;
      userGamification.sets += setsExecutados;
      userGamification.duration += payloadTreino.duracao;
      userGamification.exercises += exerciseExecutadas;
      userGamification.points += points;
      userGamification.lastWorkoutDate.push(new Date(getBrazilDate()));
      novasBadges = awardBadges(userGamification);
      await userGamification.save();
      gami = userGamification;
    }

    // Posição no ranking (ordenada por pontos), se houver ranking ativo
    let rankingPosition = null;
    if (ranking && Array.isArray(ranking.competitors)) {
      const ordenado = [...ranking.competitors].sort((a, b) => (b.points || 0) - (a.points || 0));
      const idx = ordenado.findIndex(c => String(c.userId) === String(user._id));
      rankingPosition = idx >= 0 ? idx + 1 : null;
    }

    // Avaliar os gatilhos de conquista configuráveis (card compartilhável).
    let novosMarcos = [];
    try {
      const triggers = await MilestoneTrigger.find({ active: true }).sort({ sortOrder: 1 }).lean();
      if (triggers.length) {
        novosMarcos = evaluateMilestones(
          { streak: gami.streak, workouts: gami.workouts, duration: gami.duration, points: gami.points },
          prevState,
          triggers
        );
      }
    } catch (e) {
      console.error('[finalizarTreino] erro ao avaliar marcos:', e);
    }

    // Resposta de sucesso com dados relevantes
    return res.status(200).json({
      success: true,
      msg: 'Treino finalizado com sucesso!',
      data: {
        pointsEarned: points,
        totalPoints: gami.points,
        streak: gami.streak,
        exercisesCompleted: exerciseExecutadas,
        setsCompleted: setsExecutados,
        duration: payloadTreino.duracao,
        rankingPosition,
        badges: gami.badges || [],
        novasBadges,
        novosMarcos
      }
    });

  } catch (error) {
    console.error('Erro ao finalizar treino:', error);
    res.status(500).json({ success: false, msg: 'Erro interno do servidor ao finalizar treino', error: error.message });
  }
};

export const getRankings = async (req, res) => {
  try {
    // Parse e validação de query params
    let { page = 1, limit = 10, status, sortBy = 'startDate', order = 'desc' } = req.query;

    page = Math.max(1, parseInt(page, 10));
    limit = Math.max(1, Math.min(100, parseInt(limit, 10))); // Cap em 100

    // Filtros dinâmicos
    const filters = {};
    if (status === 'active') {
      filters.startDate = { $lte: new Date() };
      filters.endDate = { $gte: new Date() };
    } else if (status === 'finished') {
      filters.endDate = { $lte: new Date() };
    } else if (status === 'upcoming') {
      filters.startDate = { $gte: new Date() };
    }

    // Ordenação segura
    const allowedSortFields = ['startDate', 'endDate', 'createdAt'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'startDate';
    const sortOrder = order.toLowerCase() === 'asc' ? 1 : -1;
    const sortOptions = { [sortField]: sortOrder };

    // Busca com paginação e ordenação no banco
    const [rankings, total] = await Promise.all([
      Ranking.find(filters)
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Ranking.countDocuments(filters),
    ]);

    // Remover userId dos competidores e adicionar posição
    const sanitizedRankings = rankings.map(ranking => ({
      ...ranking,
      competitors: ranking.competitors.map((c, idx) => ({
        ...c,
        position: idx + 1,
        userId: undefined,
      })),
    }));

    res.status(200).json({
      success: true,
      msg: 'Rankings obtidos com sucesso',
      data: {
        rankings: sanitizedRankings,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Erro ao obter rankings:', error);
    res.status(500).json({ success: false, msg: 'Erro interno do servidor ao obter rankings', error: error.message });
  }
};

export const getUserGamification = async (req, res) => {
  try {
    const { userId } = req.query;
    const userGamification = await UserGamification.findOne({ userId })
    if (!userGamification) {
      return res.status(404).json({ success: false, msg: 'Usuário não encontrado nos rankings' });
    }
    res.status(200).json({ success: true, msg: 'Gamificação do usuário obtida com sucesso', data: userGamification });
  } catch (error) {
    console.error('Erro ao obter gamificação do usuário:', error);
    res.status(500).json({ success: false, msg: 'Erro interno do servidor ao obter gamificação do usuário', error: error.message });
  }
}