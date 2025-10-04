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
    enum: ['treino', 'consistencia', 'progresso', 'especial'], 
    required: true 
  },
  rarity: { 
    type: String, 
    enum: ['comum', 'raro', 'epico', 'lendario'], 
    default: 'comum' 
  },
  points: { type: Number, default: 10 },
  requirements: {
    type: { type: String, enum: ['treinos_count', 'streak_days', 'level_reached'] },
    value: { type: Number },
    description: { type: String }
  },
  unlockedAt: { type: Date, default: getBrazilDate }
});

// Schema principal de Gamificação do usuário - Simplificado
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
  
  // Estatísticas essenciais
  stats: {
    totalWorkouts: { type: Number, default: 0 },
    totalExercises: { type: Number, default: 0 },
    totalMinutes: { type: Number, default: 0 },
    badgesEarned: { type: Number, default: 0 }
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
    workouts: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 }
  }],
  lastUpdated: { type: Date, default: getBrazilDate }
}, { timestamps: true });

// Modelos
const UserGamification = mongoose.model('UserGamification', UserGamificationSchema, 'user_gamification');
const Ranking = mongoose.model('Ranking', RankingSchema, 'rankings');

export { UserGamification, Ranking };
export default UserGamification;