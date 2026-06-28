import mongoose from 'mongoose';
import { getBrazilDate } from '../helpers/getBrazilDate.js';

const { Schema } = mongoose;

/**
 * Histórico de conversas do usuário com os assistentes de IA (NutriAI / TreinoAI).
 * Uma conversa por (usuário, assistente).
 */
const AiConversationSchema = new Schema({
  userId: { type: String, required: true, index: true },
  assistant: { type: String, enum: ['nutri', 'treino'], required: true },
  messages: [{
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: getBrazilDate },
  }],
}, { timestamps: true });

AiConversationSchema.index({ userId: 1, assistant: 1 }, { unique: true });

const AiConversation = mongoose.models.AiConversation || mongoose.model('AiConversation', AiConversationSchema, 'AiConversations');

export default AiConversation;
