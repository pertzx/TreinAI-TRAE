import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { getBrazilDate } from '../helpers/getBrazilDate.js';

const { Schema } = mongoose;

const TicketSchema = new Schema({
  valor: { type: String, required: true, unique: true }, // Hash único da interação
  type: { type: String, enum: ['impression', 'click', 'interaction_token'], default: 'impression' },
  targetId: { type: String, required: false },
  userId: { type: String, required: false },
  used: { type: Boolean, default: false },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) }, // Expira em 24h
  criadoEm: { type: Date, default: getBrazilDate }
});

// TTL Index: remove documentos automaticamente após expiresAt
TicketSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });


const Ticket = mongoose.model('Ticket', TicketSchema, 'Tickets');

export default Ticket;