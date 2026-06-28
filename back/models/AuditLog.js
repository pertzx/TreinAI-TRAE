import mongoose from 'mongoose';
import { getBrazilDate } from '../helpers/getBrazilDate.js';

const { Schema } = mongoose;

/**
 * Registro de auditoria de ações sensíveis (LGPD, conta, plano, vínculos).
 * Mantém rastreabilidade de quem fez o quê e quando.
 */
const AuditLogSchema = new Schema({
  userId: { type: String, default: null, index: true },
  email: { type: String, default: null },
  action: { type: String, required: true, index: true }, // ex: 'account.delete', 'lgpd.export'
  details: { type: Schema.Types.Mixed, default: null },
  ip: { type: String, default: null },
  userAgent: { type: String, default: null },
  criadoEm: { type: Date, default: getBrazilDate },
}, { versionKey: false });

AuditLogSchema.index({ criadoEm: -1 });

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema, 'AuditLogs');

export default AuditLog;
