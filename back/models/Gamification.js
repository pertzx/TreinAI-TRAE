import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { getBrazilDate } from '../helpers/getBrazilDate.js';

const { Schema } = mongoose;

// Schema para Badges/Conquistas
const BadgeSchema = new Schema({
  id: { type: String, default: () => uuidv4() },
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['treino', 'consistencia', 'progresso', 'social', 'especial'], 
    required: true 
  },
  rarity: { 
    type: String, 
    enum: ['comum', 'raro', 'epico', 'lendario'], 
    default: 'comum' 
  },
  points: { type: Number, default: 10 },
  requirements: {
    type: { type: String, enum: ['treinos_count', 'streak_days', 'weight_progress', 'level_reached', 'custom'] },
    value: { type: Number },
    description: { type: String }
  },
  unlockedAt: { type: Date, default: getBrazilDate }
});

// Schema para Desafios - Otimizado baseado no relatório
const ChallengeSchema = new Schema({
  id: { type: String, default: () => uuidv4() },
  title: { type: String, required: true },
  description: { type: String, required: true },
  
  // Separação clara entre tipo de ação e período
  actionType: { 
    type: String, 
    enum: ['complete_workouts', 'use_nutri_ai', 'daily_streak', 'calorie_goal', 'share_progress', 'rate_app'], 
    required: true 
  },
  period: { 
    type: String, 
    enum: ['daily', 'weekly', 'monthly', 'one_time'], 
    required: true 
  },
  category: { 
    type: String, 
    enum: ['training', 'consistency', 'progress', 'social', 'engagement'], 
    required: true 
  },
  
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  
  // Requirements limpos - sem duplicação
  requirements: {
    target: { type: Number, required: true },
    current: { type: Number, default: 0 },
    unit: { type: String, enum: ['workouts', 'days', 'minutes', 'calories', 'uses'], default: 'workouts' }
  },
  
  // Rewards limpos - sem duplicação
  rewards: {
    points: { type: Number, required: true },
    badge: { type: String, default: null },
    title: { type: String, default: null },
    description: { type: String, default: null }
  },
  participants: [{ type: String }], // userIds
  completedBy: [{ 
    userId: { type: String },
    completedAt: { type: Date, default: getBrazilDate }
  }],
  createdBy: { type: String },
  createdAt: { type: Date, default: getBrazilDate },
  updatedAt: { type: Date, default: getBrazilDate }
});

// Schema principal de Gamificação do usuário
const UserGamificationSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  
  // Sistema de Pontos e Nível
  totalPoints: { type: Number, default: 0 },
  currentLevel: { type: Number, default: 1 },
  pointsToNextLevel: { type: Number, default: 100 },
  
  // Streaks
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastWorkoutDate: { type: Date, default: null },
  
  // Badges conquistadas
  badges: [BadgeSchema],
  
  // Desafios ativos
  activeChallenges: [{ 
    challengeId: { type: String },
    progress: { type: Number, default: 0 },
    startedAt: { type: Date, default: getBrazilDate }
  }],
  
  // Desafios completados
  completedChallenges: [{
    challengeId: { type: String },
    completedAt: { type: Date, default: getBrazilDate },
    pointsEarned: { type: Number, default: 0 }
  }],
  
  // Títulos desbloqueados
  titles: [{
    id: { type: String, default: () => uuidv4() },
    name: { type: String, required: true },
    description: { type: String },
    unlockedAt: { type: Date, default: getBrazilDate }
  }],
  
  // Título ativo
  activeTitle: { type: String, default: null },
  
  // Estatísticas de gamificação
  stats: {
    totalWorkouts: { type: Number, default: 0 },
    totalExercises: { type: Number, default: 0 },
    totalMinutes: { type: Number, default: 0 },
    badgesEarned: { type: Number, default: 0 },
    challengesCompleted: { type: Number, default: 0 },
    rankingPosition: { type: Number, default: null }
  },
  
  // Preferências de gamificação
  preferences: {
    showNotifications: { type: Boolean, default: true },
    showRanking: { type: Boolean, default: true },
    showBadges: { type: Boolean, default: true },
    showChallenges: { type: Boolean, default: true }
  }
  
}, { timestamps: true });

// Schema para Ranking Global
const RankingSchema = new Schema({
  period: { 
    type: String, 
    enum: ['semanal', 'mensal', 'anual', 'geral'], 
    required: true 
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  rankings: [{
    userId: { type: String, required: true },
    username: { type: String, required: true },
    avatar: { type: String },
    points: { type: Number, required: true },
    level: { type: Number, required: true },
    position: { type: Number, required: true },
    badges: { type: Number, default: 0 },
    workouts: { type: Number, default: 0 }
  }],
  lastUpdated: { type: Date, default: getBrazilDate }
}, { timestamps: true });

// Modelos
const UserGamification = mongoose.model('UserGamification', UserGamificationSchema, 'user_gamification');
const Challenge = mongoose.model('Challenge', ChallengeSchema, 'challenges');
const Ranking = mongoose.model('Ranking', RankingSchema, 'rankings');

export { UserGamification, Challenge, Ranking };
export default UserGamification;