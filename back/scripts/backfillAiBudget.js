/**
 * Backfill único: define aiBudgetBRL e periodStart para usuários pagos/ativos
 * que ainda não têm o orçamento de IA setado (evita lock-out na migração).
 *
 * Uso: node scripts/backfillAiBudget.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { getSettings } from '../models/GlobalSettings.js';

const PAID = ['pro', 'max', 'coach'];

const run = async () => {
  const uri = (process.env.DB_USER && process.env.DB_PASSWORD)
    ? `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.vcxrbu2.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`
    : (process.env.MONGO_URI || process.env.DATABASE_URL);
  if (!uri) { console.error('Variáveis de conexão do Mongo (DB_USER/DB_PASSWORD/DB_NAME) não definidas no .env'); process.exit(1); }

  await mongoose.connect(uri);
  console.log('Conectado ao MongoDB.');

  const settings = await getSettings();
  const users = await User.find({
    'planInfos.planType': { $in: PAID },
    'planInfos.status': 'ativo',
  });

  console.log(`Encontrados ${users.length} usuários pagos/ativos.`);
  let atualizados = 0;

  for (const user of users) {
    const pi = user.planInfos || {};
    const semOrcamento = !(Number(pi.aiBudgetBRL) > 0);
    const semPeriodo = !pi.periodStart;

    if (semOrcamento || semPeriodo) {
      const valorPago = Number(pi.nextPaymentValue);
      const fallback = Number(settings.planBudgetFallbackBRL?.[pi.planType]) || 0;
      if (semOrcamento) user.planInfos.aiBudgetBRL = valorPago > 0 ? valorPago : fallback;
      if (semPeriodo) user.planInfos.periodStart = new Date();
      await user.save();
      atualizados++;
    }
  }

  console.log(`Backfill concluído. ${atualizados} usuários atualizados.`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch(err => { console.error('Erro no backfill:', err); process.exit(1); });
