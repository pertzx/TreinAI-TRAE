/**
 * Seed idempotente dos gatilhos de conquista (MilestoneTriggers).
 * Migra o BADGE_CATALOG antigo e adiciona exemplos configuráveis.
 * $setOnInsert: não sobrescreve edições do admin em re-execuções.
 *
 * Uso: node scripts/seedMilestones.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import MilestoneTrigger from '../models/MilestoneTrigger.js';

const MILESTONES = [
  { key: 'primeiro-treino', type: 'workouts', value: 1, emoji: '🎉', title: 'Primeiro treino!', message: 'Você concluiu seu primeiro treino no TreinAI!', sortOrder: 1 },
  { key: 'treinos-10', type: 'workouts', value: 10, emoji: '💪', title: '10 treinos!', message: 'Já são 10 treinos concluídos. Bora manter o ritmo!', sortOrder: 2 },
  { key: 'treinos-50', type: 'workouts', value: 50, emoji: '🔥', title: '50 treinos!', message: '50 treinos no TreinAI. Consistência de verdade!', sortOrder: 3 },
  { key: 'treinos-100', type: 'workouts', value: 100, emoji: '🏆', title: '100 treinos!', message: '100 treinos concluídos. Você é referência!', sortOrder: 4 },
  { key: 'streak-7', type: 'streak-exact', value: 7, emoji: '⚡', title: 'Sequência de 7 dias!', message: '7 dias seguidos treinando. Imparável!', sortOrder: 5 },
  { key: 'streak-30', type: 'streak-exact', value: 30, emoji: '👑', title: 'Sequência de 30 dias!', message: '30 dias seguidos. Isso é elite!', sortOrder: 6 },
  { key: 'streak-cada-7', type: 'streak-every', value: 7, emoji: '🔥', title: 'Mais uma semana em sequência!', message: 'Você fechou mais 7 dias seguidos de treino!', sortOrder: 7 },
];

const run = async () => {
  const uri = (process.env.DB_USER && process.env.DB_PASSWORD)
    ? `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.vcxrbu2.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`
    : (process.env.MONGO_URI || process.env.DATABASE_URL);
  if (!uri) { console.error('Variáveis de conexão do Mongo não definidas no .env'); process.exit(1); }

  await mongoose.connect(uri);
  console.log('Conectado ao MongoDB.');

  let criados = 0;
  for (const m of MILESTONES) {
    const { key, ...rest } = m;
    const res = await MilestoneTrigger.updateOne(
      { key },
      { $setOnInsert: { key, active: true, ...rest } },
      { upsert: true }
    );
    if (res.upsertedCount) { criados++; console.log(`+ conquista criada: ${key}`); }
    else console.log(`= conquista já existe (mantida): ${key}`);
  }

  console.log(`Seed concluído. ${criados} conquista(s) criada(s); existentes preservadas.`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch(err => { console.error('Erro no seed de conquistas:', err); process.exit(1); });
