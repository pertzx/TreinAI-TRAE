import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { getBrazilDate } from '../helpers/getBrazilDate.js';

const { Schema } = mongoose;

// Schema para métricas de treino
const WorkoutMetricsSchema = new Schema({
  date: { type: Date, required: true },
  workoutId: { type: String, required: true },
  duration: { type: Number, required: true }, // em minutos
  exerciseCount: { type: Number, required: true },
  caloriesBurned: { type: Number, default: 0 },
  averageHeartRate: { type: Number, default: 0 },
  maxHeartRate: { type: Number, default: 0 },
  restTime: { type: Number, default: 0 }, // tempo total de descanso
  intensity: { type: String, enum: ['baixa', 'moderada', 'alta', 'extrema'], default: 'moderada' },
  muscleGroups: [{ type: String }], // grupos musculares trabalhados
  satisfaction: { type: Number, min: 1, max: 5, default: null }, // avaliação do usuário
  notes: { type: String, default: '' }
});

// Schema para métricas corporais
const BodyMetricsSchema = new Schema({
  date: { type: Date, required: true },
  weight: { type: Number, default: null },
  bodyFat: { type: Number, default: null }, // percentual de gordura
  muscleMass: { type: Number, default: null },
  bmi: { type: Number, default: null },
  measurements: {
    chest: { type: Number, default: null },
    waist: { type: Number, default: null },
    hips: { type: Number, default: null },
    bicep: { type: Number, default: null },
    thigh: { type: Number, default: null },
    neck: { type: Number, default: null }
  },
  photos: [{
    type: { type: String, enum: ['front', 'side', 'back'] },
    url: { type: String },
    uploadedAt: { type: Date, default: getBrazilDate }
  }]
});

// Schema para métricas de performance
const PerformanceMetricsSchema = new Schema({
  date: { type: Date, required: true },
  exerciseId: { type: String, required: true },
  exerciseName: { type: String, required: true },
  sets: [{
    reps: { type: Number, required: true },
    weight: { type: Number, default: 0 },
    duration: { type: Number, default: 0 }, // para exercícios de tempo
    distance: { type: Number, default: 0 }, // para cardio
    restTime: { type: Number, default: 0 }
  }],
  personalRecord: { type: Boolean, default: false },
  improvement: { type: Number, default: 0 }, // percentual de melhoria
  difficulty: { type: String, enum: ['muito_facil', 'facil', 'moderado', 'dificil', 'muito_dificil'], default: 'moderado' }
});

// Schema para métricas de sono e recuperação
const RecoveryMetricsSchema = new Schema({
  date: { type: Date, required: true },
  sleepHours: { type: Number, default: null },
  sleepQuality: { type: Number, min: 1, max: 5, default: null },
  stressLevel: { type: Number, min: 1, max: 5, default: null },
  energyLevel: { type: Number, min: 1, max: 5, default: null },
  musclesSoreness: { type: Number, min: 1, max: 5, default: null },
  restingHeartRate: { type: Number, default: null },
  hydration: { type: Number, default: null }, // litros de água
  notes: { type: String, default: '' }
});

// Schema para métricas nutricionais
const NutritionMetricsSchema = new Schema({
  date: { type: Date, required: true },
  calories: { type: Number, default: 0 },
  protein: { type: Number, default: 0 },
  carbs: { type: Number, default: 0 },
  fat: { type: Number, default: 0 },
  fiber: { type: Number, default: 0 },
  water: { type: Number, default: 0 },
  meals: [{
    type: { type: String, enum: ['cafe_manha', 'almoco', 'jantar', 'lanche'], required: true },
    foods: [{ type: String }],
    calories: { type: Number, default: 0 },
    time: { type: Date }
  }],
  supplements: [{
    name: { type: String, required: true },
    dosage: { type: String },
    time: { type: Date }
  }]
});

// Schema principal de Analytics do usuário
const UserAnalyticsSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  
  // Métricas de treino
  workoutMetrics: [WorkoutMetricsSchema],
  
  // Métricas corporais
  bodyMetrics: [BodyMetricsSchema],
  
  // Métricas de performance
  performanceMetrics: [PerformanceMetricsSchema],
  
  // Métricas de recuperação
  recoveryMetrics: [RecoveryMetricsSchema],
  
  // Métricas nutricionais
  nutritionMetrics: [NutritionMetricsSchema],
  
  // Objetivos e metas
  goals: [{
    id: { type: String, default: () => uuidv4() },
    type: { type: String, enum: ['weight_loss', 'weight_gain', 'muscle_gain', 'strength', 'endurance', 'custom'], required: true },
    title: { type: String, required: true },
    description: { type: String },
    targetValue: { type: Number, required: true },
    currentValue: { type: Number, default: 0 },
    unit: { type: String, required: true },
    deadline: { type: Date },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: getBrazilDate },
    completedAt: { type: Date, default: null }
  }],
  
  // Insights e análises automáticas
  insights: [{
    id: { type: String, default: () => uuidv4() },
    type: { type: String, enum: ['trend', 'achievement', 'recommendation', 'warning'], required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    data: { type: Schema.Types.Mixed }, // dados específicos do insight
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: getBrazilDate },
    expiresAt: { type: Date }
  }],
  
  // Configurações de analytics
  settings: {
    trackWeight: { type: Boolean, default: true },
    trackBodyFat: { type: Boolean, default: false },
    trackMeasurements: { type: Boolean, default: false },
    trackNutrition: { type: Boolean, default: false },
    trackSleep: { type: Boolean, default: false },
    trackHeartRate: { type: Boolean, default: false },
    autoGenerateInsights: { type: Boolean, default: true },
    shareData: { type: Boolean, default: false }
  },
  
  // Estatísticas calculadas
  calculatedStats: {
    totalWorkouts: { type: Number, default: 0 },
    totalDuration: { type: Number, default: 0 },
    averageWorkoutDuration: { type: Number, default: 0 },
    totalCaloriesBurned: { type: Number, default: 0 },
    averageCaloriesPerWorkout: { type: Number, default: 0 },
    consistencyScore: { type: Number, default: 0 }, // 0-100
    progressScore: { type: Number, default: 0 }, // 0-100
    lastCalculated: { type: Date, default: getBrazilDate }
  }
  
}, { timestamps: true });

// Índices para otimização de consultas
UserAnalyticsSchema.index({ userId: 1 });
UserAnalyticsSchema.index({ 'workoutMetrics.date': -1 });
UserAnalyticsSchema.index({ 'bodyMetrics.date': -1 });
UserAnalyticsSchema.index({ 'performanceMetrics.date': -1 });

const UserAnalytics = mongoose.model('UserAnalytics', UserAnalyticsSchema, 'user_analytics');

export default UserAnalytics;