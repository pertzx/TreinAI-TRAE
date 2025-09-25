import UserAnalytics from '../models/Analytics.js';
import User from '../models/User.js';
import { getBrazilDate } from '../helpers/getBrazilDate.js';
import { v4 as uuidv4 } from 'uuid';

// Inicializar analytics para novo usuário
export const initializeUserAnalytics = async (userId) => {
  try {
    const existingAnalytics = await UserAnalytics.findOne({ userId });
    if (existingAnalytics) {
      return existingAnalytics;
    }

    const newAnalytics = new UserAnalytics({
      userId,
      workoutMetrics: [],
      bodyMetrics: [],
      performanceMetrics: [],
      recoveryMetrics: [],
      nutritionMetrics: [],
      goals: [],
      insights: [],
      settings: {
        trackWeight: true,
        trackBodyFat: false,
        trackMeasurements: false,
        trackNutrition: false,
        trackSleep: false,
        trackHeartRate: false,
        autoGenerateInsights: true,
        shareData: false
      },
      calculatedStats: {
        totalWorkouts: 0,
        totalDuration: 0,
        averageWorkoutDuration: 0,
        totalCaloriesBurned: 0,
        averageCaloriesPerWorkout: 0,
        consistencyScore: 0,
        progressScore: 0
      }
    });

    await newAnalytics.save();
    return newAnalytics;
  } catch (error) {
    console.error('Erro ao inicializar analytics:', error);
    throw error;
  }
};

// Obter dashboard de analytics
export const getAnalyticsDashboard = async (req, res) => {
  try {
    const { userId } = req.params;
    const { period = '30' } = req.query; // dias

    let analytics = await UserAnalytics.findOne({ userId });
    if (!analytics) {
      analytics = await initializeUserAnalytics(userId);
    }

    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Filtrar métricas por período
    const workoutMetrics = analytics.workoutMetrics.filter(
      metric => metric.date >= startDate
    );

    const bodyMetrics = analytics.bodyMetrics.filter(
      metric => metric.date >= startDate
    );

    const performanceMetrics = analytics.performanceMetrics.filter(
      metric => metric.date >= startDate
    );

    // Calcular estatísticas do período
    const periodStats = calculatePeriodStats(workoutMetrics, bodyMetrics, performanceMetrics);

    // Gerar insights automáticos
    const insights = await generateInsights(userId, analytics);

    res.status(200).json({
      success: true,
      data: {
        period: periodDays,
        stats: periodStats,
        workoutMetrics: workoutMetrics.slice(-30), // últimos 30 registros
        bodyMetrics: bodyMetrics.slice(-30),
        performanceMetrics: performanceMetrics.slice(-10),
        goals: analytics.goals.filter(goal => goal.isActive),
        insights: insights.slice(0, 5), // top 5 insights
        settings: analytics.settings
      }
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard de analytics:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

// Registrar métricas de treino
export const recordWorkoutMetrics = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      workoutId,
      duration,
      exerciseCount,
      caloriesBurned,
      averageHeartRate,
      maxHeartRate,
      restTime,
      intensity,
      muscleGroups,
      satisfaction,
      notes
    } = req.body;

    let analytics = await UserAnalytics.findOne({ userId });
    if (!analytics) {
      analytics = await initializeUserAnalytics(userId);
    }

    const workoutMetric = {
      date: getBrazilDate(),
      workoutId,
      duration,
      exerciseCount,
      caloriesBurned: caloriesBurned || 0,
      averageHeartRate: averageHeartRate || 0,
      maxHeartRate: maxHeartRate || 0,
      restTime: restTime || 0,
      intensity: intensity || 'moderada',
      muscleGroups: muscleGroups || [],
      satisfaction,
      notes: notes || ''
    };

    analytics.workoutMetrics.push(workoutMetric);

    // Atualizar estatísticas calculadas
    await updateCalculatedStats(analytics);

    await analytics.save();

    // Gerar insights automáticos se habilitado
    if (analytics.settings.autoGenerateInsights) {
      await generateWorkoutInsights(userId, workoutMetric, analytics);
    }

    res.status(200).json({
      success: true,
      message: 'Métricas de treino registradas com sucesso',
      data: workoutMetric
    });
  } catch (error) {
    console.error('Erro ao registrar métricas de treino:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

// Registrar métricas corporais
export const recordBodyMetrics = async (req, res) => {
  try {
    const { userId } = req.params;
    const { weight, bodyFat, muscleMass, measurements, photos } = req.body;

    let analytics = await UserAnalytics.findOne({ userId });
    if (!analytics) {
      analytics = await initializeUserAnalytics(userId);
    }

    const bodyMetric = {
      date: getBrazilDate(),
      weight,
      bodyFat,
      muscleMass,
      bmi: weight && req.body.height ? calculateBMI(weight, req.body.height) : null,
      measurements: measurements || {},
      photos: photos || []
    };

    analytics.bodyMetrics.push(bodyMetric);
    await analytics.save();

    // Gerar insights de progresso corporal
    if (analytics.settings.autoGenerateInsights) {
      await generateBodyInsights(userId, bodyMetric, analytics);
    }

    res.status(200).json({
      success: true,
      message: 'Métricas corporais registradas com sucesso',
      data: bodyMetric
    });
  } catch (error) {
    console.error('Erro ao registrar métricas corporais:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

// Registrar métricas de performance
export const recordPerformanceMetrics = async (req, res) => {
  try {
    const { userId } = req.params;
    const { exerciseId, exerciseName, sets, difficulty } = req.body;

    let analytics = await UserAnalytics.findOne({ userId });
    if (!analytics) {
      analytics = await initializeUserAnalytics(userId);
    }

    // Verificar se é um recorde pessoal
    const previousRecords = analytics.performanceMetrics.filter(
      metric => metric.exerciseId === exerciseId
    );

    const personalRecord = checkPersonalRecord(sets, previousRecords);
    const improvement = calculateImprovement(sets, previousRecords);

    const performanceMetric = {
      date: getBrazilDate(),
      exerciseId,
      exerciseName,
      sets,
      personalRecord,
      improvement,
      difficulty: difficulty || 'moderado'
    };

    analytics.performanceMetrics.push(performanceMetric);
    await analytics.save();

    // Gerar insights de performance
    if (analytics.settings.autoGenerateInsights && personalRecord) {
      await generatePerformanceInsights(userId, performanceMetric, analytics);
    }

    res.status(200).json({
      success: true,
      message: 'Métricas de performance registradas com sucesso',
      data: {
        ...performanceMetric,
        personalRecord,
        improvement
      }
    });
  } catch (error) {
    console.error('Erro ao registrar métricas de performance:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

// Criar meta/objetivo
export const createGoal = async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, title, description, targetValue, unit, deadline } = req.body;

    let analytics = await UserAnalytics.findOne({ userId });
    if (!analytics) {
      analytics = await initializeUserAnalytics(userId);
    }

    const goal = {
      id: uuidv4(),
      type,
      title,
      description: description || '',
      targetValue,
      currentValue: 0,
      unit,
      deadline: deadline ? new Date(deadline) : null,
      isActive: true,
      createdAt: getBrazilDate()
    };

    analytics.goals.push(goal);
    await analytics.save();

    res.status(201).json({
      success: true,
      message: 'Meta criada com sucesso',
      data: goal
    });
  } catch (error) {
    console.error('Erro ao criar meta:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

// Atualizar progresso da meta
export const updateGoalProgress = async (req, res) => {
  try {
    const { userId, goalId } = req.params;
    const { currentValue } = req.body;

    const analytics = await UserAnalytics.findOne({ userId });
    if (!analytics) {
      return res.status(404).json({ success: false, message: 'Analytics não encontrado' });
    }

    const goal = analytics.goals.find(g => g.id === goalId);
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Meta não encontrada' });
    }

    goal.currentValue = currentValue;

    // Verificar se a meta foi completada
    if (currentValue >= goal.targetValue && goal.isActive) {
      goal.isActive = false;
      goal.completedAt = getBrazilDate();

      // Gerar insight de conquista
      const insight = {
        id: uuidv4(),
        type: 'achievement',
        title: 'Meta Alcançada! 🎉',
        description: `Parabéns! Você completou a meta "${goal.title}"`,
        data: { goalId: goal.id, completedValue: currentValue },
        priority: 'high',
        createdAt: getBrazilDate(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias
      };

      analytics.insights.push(insight);
    }

    await analytics.save();

    res.status(200).json({
      success: true,
      message: 'Progresso da meta atualizado com sucesso',
      data: goal
    });
  } catch (error) {
    console.error('Erro ao atualizar progresso da meta:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

// Obter relatório de progresso
export const getProgressReport = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    const analytics = await UserAnalytics.findOne({ userId });
    if (!analytics) {
      return res.status(404).json({ success: false, message: 'Analytics não encontrado' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Filtrar dados por período
    const workoutData = analytics.workoutMetrics.filter(
      metric => metric.date >= start && metric.date <= end
    );

    const bodyData = analytics.bodyMetrics.filter(
      metric => metric.date >= start && metric.date <= end
    );

    const performanceData = analytics.performanceMetrics.filter(
      metric => metric.date >= start && metric.date <= end
    );

    // Gerar relatório detalhado
    const report = generateProgressReport(workoutData, bodyData, performanceData, start, end);

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de progresso:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

// Funções auxiliares

const calculatePeriodStats = (workoutMetrics, bodyMetrics, performanceMetrics) => {
  const totalWorkouts = workoutMetrics.length;
  const totalDuration = workoutMetrics.reduce((sum, metric) => sum + metric.duration, 0);
  const totalCalories = workoutMetrics.reduce((sum, metric) => sum + (metric.caloriesBurned || 0), 0);
  
  const averageDuration = totalWorkouts > 0 ? totalDuration / totalWorkouts : 0;
  const averageCalories = totalWorkouts > 0 ? totalCalories / totalWorkouts : 0;

  // Calcular tendência de peso
  const weightTrend = bodyMetrics.length >= 2 ? 
    bodyMetrics[bodyMetrics.length - 1].weight - bodyMetrics[0].weight : 0;

  // Calcular recordes pessoais no período
  const personalRecords = performanceMetrics.filter(metric => metric.personalRecord).length;

  return {
    totalWorkouts,
    totalDuration,
    totalCalories,
    averageDuration: Math.round(averageDuration),
    averageCalories: Math.round(averageCalories),
    weightTrend: Math.round(weightTrend * 10) / 10,
    personalRecords,
    workoutFrequency: totalWorkouts / (workoutMetrics.length > 0 ? 
      Math.ceil((Date.now() - workoutMetrics[0].date) / (1000 * 60 * 60 * 24)) : 1)
  };
};

const updateCalculatedStats = async (analytics) => {
  const stats = analytics.calculatedStats;
  
  stats.totalWorkouts = analytics.workoutMetrics.length;
  stats.totalDuration = analytics.workoutMetrics.reduce((sum, metric) => sum + metric.duration, 0);
  stats.averageWorkoutDuration = stats.totalWorkouts > 0 ? stats.totalDuration / stats.totalWorkouts : 0;
  stats.totalCaloriesBurned = analytics.workoutMetrics.reduce((sum, metric) => sum + (metric.caloriesBurned || 0), 0);
  stats.averageCaloriesPerWorkout = stats.totalWorkouts > 0 ? stats.totalCaloriesBurned / stats.totalWorkouts : 0;
  
  // Calcular score de consistência (últimos 30 dias)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentWorkouts = analytics.workoutMetrics.filter(metric => metric.date >= thirtyDaysAgo);
  stats.consistencyScore = Math.min(100, (recentWorkouts.length / 30) * 100);
  
  stats.lastCalculated = getBrazilDate();
};

const generateInsights = async (userId, analytics) => {
  const insights = [];
  
  // Insight de consistência
  if (analytics.calculatedStats.consistencyScore < 50) {
    insights.push({
      id: uuidv4(),
      type: 'recommendation',
      title: 'Melhore sua Consistência',
      description: 'Tente treinar pelo menos 3 vezes por semana para melhores resultados',
      priority: 'medium',
      createdAt: getBrazilDate()
    });
  }

  // Insight de progresso
  const recentWorkouts = analytics.workoutMetrics.slice(-7);
  if (recentWorkouts.length >= 3) {
    const avgDuration = recentWorkouts.reduce((sum, w) => sum + w.duration, 0) / recentWorkouts.length;
    if (avgDuration > analytics.calculatedStats.averageWorkoutDuration * 1.1) {
      insights.push({
        id: uuidv4(),
        type: 'trend',
        title: 'Treinos Mais Longos',
        description: 'Seus treinos estão ficando mais longos. Ótimo progresso!',
        priority: 'low',
        createdAt: getBrazilDate()
      });
    }
  }

  return insights;
};

const generateWorkoutInsights = async (userId, workoutMetric, analytics) => {
  // Implementar lógica de insights específicos do treino
};

const generateBodyInsights = async (userId, bodyMetric, analytics) => {
  // Implementar lógica de insights corporais
};

const generatePerformanceInsights = async (userId, performanceMetric, analytics) => {
  // Implementar lógica de insights de performance
};

const checkPersonalRecord = (sets, previousRecords) => {
  if (previousRecords.length === 0) return true;
  
  const maxWeight = Math.max(...sets.map(set => set.weight || 0));
  const maxReps = Math.max(...sets.map(set => set.reps || 0));
  
  const previousMaxWeight = Math.max(...previousRecords.flatMap(record => 
    record.sets.map(set => set.weight || 0)
  ));
  
  return maxWeight > previousMaxWeight || (maxWeight === previousMaxWeight && maxReps > 0);
};

const calculateImprovement = (sets, previousRecords) => {
  if (previousRecords.length === 0) return 0;
  
  const currentMax = Math.max(...sets.map(set => (set.weight || 0) * (set.reps || 1)));
  const previousMax = Math.max(...previousRecords.flatMap(record => 
    record.sets.map(set => (set.weight || 0) * (set.reps || 1))
  ));
  
  return previousMax > 0 ? ((currentMax - previousMax) / previousMax) * 100 : 0;
};

const calculateBMI = (weight, height) => {
  const heightInMeters = height / 100;
  return weight / (heightInMeters * heightInMeters);
};

const generateProgressReport = (workoutData, bodyData, performanceData, startDate, endDate) => {
  return {
    period: {
      start: startDate,
      end: endDate,
      days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
    },
    workouts: {
      total: workoutData.length,
      totalDuration: workoutData.reduce((sum, w) => sum + w.duration, 0),
      averageDuration: workoutData.length > 0 ? workoutData.reduce((sum, w) => sum + w.duration, 0) / workoutData.length : 0,
      totalCalories: workoutData.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0)
    },
    body: {
      measurements: bodyData.length,
      weightChange: bodyData.length >= 2 ? bodyData[bodyData.length - 1].weight - bodyData[0].weight : 0
    },
    performance: {
      personalRecords: performanceData.filter(p => p.personalRecord).length,
      totalSets: performanceData.reduce((sum, p) => sum + p.sets.length, 0)
    }
  };
};

export default {
  initializeUserAnalytics,
  getAnalyticsDashboard,
  recordWorkoutMetrics,
  recordBodyMetrics,
  recordPerformanceMetrics,
  createGoal,
  updateGoalProgress,
  getProgressReport
};