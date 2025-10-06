import { getBrazilDate } from "../helpers/getBrazilDate.js";
import Ranking from "../models/Gamification/Ranking.js";
import UserGamification from "../models/Gamification/UserGamification.js";

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

    if (!ranking) {
      return res.status(404).json({ success: false, msg: 'Nenhum ranking encontrado.' });
    }

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
    const userRanking = ranking.competitors.find((u) => u.userId === user._id);
    if (!userRanking) {
      ranking.competitors.push({
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

      await ranking.save();
    } else {
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
    if (!userGamification) {
      await UserGamification.create({
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

      userGamification.workouts += 1;
      userGamification.sets += setsExecutados;
      userGamification.duration += payloadTreino.duracao;
      userGamification.exercises += exerciseExecutadas;
      userGamification.points += points;
      userGamification.lastWorkoutDate.push(new Date(getBrazilDate()));
      await userGamification.save();
    }

    // Resposta de sucesso com dados relevantes
    return res.status(200).json({
      success: true,
      msg: 'Treino finalizado com sucesso!',
      data: {
        pointsEarned: points,
        totalPoints: userGamification ? userGamification.points + points : points,
        streak: userGamification ? userGamification.streak : 1,
        exercisesCompleted: exerciseExecutadas,
        setsCompleted: setsExecutados,
        duration: payloadTreino.duracao,
        rankingPosition: ranking.competitors.findIndex(c => c.userId === user._id) + 1
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
      filters.endDate = { $lt: new Date() };
    } else if (status === 'upcoming') {
      filters.startDate = { $gt: new Date() };
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