import mongoose from 'mongoose';
import { getBrazilDate } from '../helpers/getBrazilDate.js';

const { Schema } = mongoose;

/**
 * Visita diária única ao sistema.
 * Um documento por (dia, visitante). O índice único impede contar a mesma
 * pessoa duas vezes no mesmo dia.
 */
const DailyVisitSchema = new Schema({
  day: { type: String, required: true },          // YYYY-MM-DD (fuso America/Sao_Paulo)
  visitorId: { type: String, required: true },    // cookie anônimo ou u:<userId>
  userId: { type: String, default: null },        // se logado
  criadoEm: { type: Date, default: getBrazilDate },
}, { versionKey: false });

// Garante unicidade por dia+visitante.
DailyVisitSchema.index({ day: 1, visitorId: 1 }, { unique: true });
DailyVisitSchema.index({ day: 1 });

const DailyVisit = mongoose.models.DailyVisit
  || mongoose.model('DailyVisit', DailyVisitSchema, 'DailyVisits');

export default DailyVisit;
