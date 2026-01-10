import mongoose from 'mongoose';
import { getBrazilDate } from '../helpers/getBrazilDate.js';

const { Schema } = mongoose;

const InteractionLogSchema = new Schema({
  type: { type: String, enum: ['impression', 'click'], required: true },
  targetId: { type: String, required: true, index: true }, // ProfissionalId ou LocalId
  targetModel: { type: String, enum: ['Profissional', 'Local'], required: true },
  userId: { type: String, default: null }, // Se logado
  ip: { type: String, default: null }, // Anonimizado se possível
  timestamp: { type: Date, default: getBrazilDate },
  metadata: { type: Object, default: {} } // UserAgent, origem, etc
});

// Index para Analytics
InteractionLogSchema.index({ targetId: 1, type: 1 });
InteractionLogSchema.index({ timestamp: -1 });

const InteractionLog = mongoose.model('InteractionLog', InteractionLogSchema, 'InteractionLogs');

export default InteractionLog;
