import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Gatilho de conquista/marco configurável pelo admin. Quando o usuário finaliza
 * um treino, os gatilhos ativos são avaliados contra o estado da gamificação
 * (streak/workouts/duração/pontos) e, ao bater, dispara um card compartilhável.
 *
 * type:
 *  - streak-every    : a cada `value` dias de sequência (7, 14, ...)
 *  - streak-exact    : num dia exato de sequência (== value)
 *  - workouts        : ao atingir `value` treinos concluídos
 *  - duration-total  : ao cruzar `value` segundos de treino acumulados
 *  - points          : ao cruzar `value` pontos acumulados
 *  - record          : recorde pessoal (requer fonte de PR — plugável)
 */
const MilestoneTriggerSchema = new Schema({
  key: { type: String, required: true, unique: true },
  type: {
    type: String,
    required: true,
    enum: ['streak-every', 'streak-exact', 'workouts', 'duration-total', 'points', 'record'],
  },
  value: { type: Number, default: 0 },
  title: { type: String, required: true },   // ex.: "Sequência de 7 dias!"
  message: { type: String, default: '' },    // ex.: "Você treinou 7 dias seguidos 🔥"
  emoji: { type: String, default: '🏆' },
  active: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true, versionKey: false });

MilestoneTriggerSchema.index({ active: 1, sortOrder: 1 });

const MilestoneTrigger = mongoose.models.MilestoneTrigger
  || mongoose.model('MilestoneTrigger', MilestoneTriggerSchema, 'MilestoneTriggers');

export default MilestoneTrigger;
