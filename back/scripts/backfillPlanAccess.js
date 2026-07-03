/**
 * Backfill único: preenche planInfos.access e planInfos.tipo dos usuários
 * existentes, resolvendo pelo plano atual (getAccessForPlanKey). Evita perda de
 * acesso na migração para o gating por flags.
 *
 * Uso: node scripts/backfillPlanAccess.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { getAccessForPlanKey } from '../helpers/planAccess.js';

const run = async () => {
  const uri = (process.env.DB_USER && process.env.DB_PASSWORD)
    ? `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.vcxrbu2.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`
    : (process.env.MONGO_URI || process.env.DATABASE_URL);
  if (!uri) { console.error('Variáveis de conexão do Mongo não definidas no .env'); process.exit(1); }

  await mongoose.connect(uri);
  console.log('Conectado ao MongoDB.');

  const users = await User.find({}).select('_id planInfos');
  console.log(`Encontrados ${users.length} usuários.`);
  let atualizados = 0;

  for (const user of users) {
    const key = user.planInfos?.planType || 'free';
    const { access, tipo } = await getAccessForPlanKey(key);
    user.planInfos = user.planInfos || {};
    user.planInfos.access = access;
    // Não sobrescreve trial (que se comporta como pago): só define tipo se ausente.
    if (!user.planInfos.tipo) user.planInfos.tipo = user.planInfos.isTrial ? 'recorrente' : tipo;
    await user.save();
    atualizados++;
  }

  console.log(`Backfill concluído. ${atualizados} usuários atualizados.`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch(err => { console.error('Erro no backfill de acesso:', err); process.exit(1); });
