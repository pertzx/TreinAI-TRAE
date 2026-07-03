import nativeCron from '../utils/nativeCron.js';
import User from '../models/User.js';

/**
 * Rebaixa para 'free' os trials "Fundador" vencidos (trialUntil no passado).
 * O bloqueio de IA já é garantido pela checagem lazy no gate; este job só
 * mantém o estado do banco/UI coerente. Em serverless o cron não roda —
 * por isso a checagem lazy é a fonte de verdade.
 */
export const expireFounderTrials = async () => {
  try {
    const now = new Date();
    const res = await User.updateMany(
      { 'planInfos.isTrial': true, 'planInfos.trialUntil': { $lt: now } },
      {
        $set: {
          'planInfos.planType': 'free',
          'planInfos.status': 'inativo',
          'planInfos.isTrial': false,
          'planInfos.aiBudgetBRL': 0,
        },
      }
    );
    if (res.modifiedCount > 0) {
      console.log(`[trialExpiry] ${res.modifiedCount} trial(s) Fundador expirado(s) → free`);
    }
  } catch (error) {
    console.error('[trialExpiry] erro ao expirar trials:', error);
  }
};

export const startTrialExpiryJob = () => {
  const job = nativeCron.schedule('0 3 * * *', expireFounderTrials, {
    scheduled: true,
    timezone: 'America/Sao_Paulo',
  });
  console.log('🕒 Job de expiração de trials Fundador configurado (diário às 3h)');
  setTimeout(expireFounderTrials, 90000); // varredura inicial após 90s
  return job;
};

export default { startTrialExpiryJob, expireFounderTrials };
