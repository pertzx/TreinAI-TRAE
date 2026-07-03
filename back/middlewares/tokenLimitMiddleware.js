import User from '../models/User.js';
import Profissional from '../models/Profissional.js';
import { getBrazilDate } from '../helpers/getBrazilDate.js';
import { getSettings } from '../models/GlobalSettings.js';

/**
 * Modelo de cobrança de IA por CUSTO (R$).
 *
 * A cada uso de IA somam-se os tokens (entrada/saída), converte-se para o custo
 * real do modelo, aplica-se a margem global (lucro) e debita-se do orçamento do
 * usuário. Orçamento dos pagos = valor pago na Stripe (planInfos.aiBudgetBRL),
 * medido por período (planInfos.periodStart). Free = cortesia única (vitalícia).
 */

const PAID_PLANS = ['pro', 'max', 'coach'];
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

/** Lê o preço de um modelo do settings (suporta Map do mongoose ou objeto). */
const getModelPricing = (settings, model) => {
  const mp = settings.modelPricingBRL;
  if (!mp) return null;
  if (typeof mp.get === 'function') return mp.get(model) || null;
  return mp[model] || null;
};

/**
 * Converte uso em custo real (R$) e custo cobrado (real × margem).
 */
export const computeCost = (settings, { model, promptTokens = 0, completionTokens = 0, isImage = false }) => {
  let custoReal = 0;
  if (isImage) {
    custoReal = Number(settings.imageCostBRL) || 0;
  } else {
    const pricing = getModelPricing(settings, model) || getModelPricing(settings, DEFAULT_MODEL);
    if (pricing) {
      custoReal = (Number(promptTokens) / 1e6) * pricing.inputPer1M
        + (Number(completionTokens) / 1e6) * pricing.outputPer1M;
    }
  }
  const margin = Number(settings.marginMultiplier) || 2;
  const custoCobrado = custoReal * margin;
  return { custoReal, custoCobrado };
};

/** Resolve o usuário-alvo (próprio ou, via profissionalId, o dono do plano coach). */
const findTargetUserDoc = async ({ email, profissionalId }) => {
  if (profissionalId) {
    const prof = await Profissional.findOne({ profissionalId });
    if (!prof) return { error: 'Profissional não encontrado', status: 404 };
    const user = await User.findById(prof.userId);
    if (!user) return { error: 'Usuário associado ao profissional não encontrado', status: 404 };
    if (user.planInfos?.planType !== 'coach' || user.planInfos?.status !== 'ativo') {
      return { error: 'Plano Coach inativo', status: 403 };
    }
    return { user, planType: 'coach' };
  }
  if (!email) return { error: 'Email é obrigatório para verificação de uso de IA', status: 400 };
  const user = await User.findOne({ email });
  if (!user) return { error: 'Usuário não encontrado', status: 404 };
  return { user, planType: user.planInfos?.planType || 'free' };
};

/** Trial "Fundador" expirado? (concedido pelo admin, com data limite). */
const isTrialExpired = (user) => {
  const pi = user.planInfos || {};
  return !!pi.isTrial && pi.trialUntil && new Date(pi.trialUntil) < new Date();
};

/** Calcula gasto e orçamento atuais do usuário (R$), + a lista de usos do período. */
const computeSpentAndBudget = (user, planType, settings) => {
  const usage = user.stats?.aiUsage || [];
  // Trial vencido perde o acesso pago → cai para a regra do free (bloqueia IA paga).
  const isPaidActive = PAID_PLANS.includes(planType)
    && user.planInfos?.status === 'ativo'
    && !isTrialExpired(user);

  if (isPaidActive) {
    const periodStart = user.planInfos?.periodStart ? new Date(user.planInfos.periodStart) : new Date(0);
    const usageInPeriod = usage.filter(u => new Date(u.data) >= periodStart);
    const gasto = usageInPeriod.reduce((acc, u) => acc + (Number(u.custoCobrado) || 0), 0);
    const orcamento = (Number(user.planInfos?.aiBudgetBRL) > 0)
      ? Number(user.planInfos.aiBudgetBRL)
      : (Number(settings.planBudgetFallbackBRL?.[planType]) || 0); // rede de segurança
    return { gasto, orcamento, isFree: false, usageInPeriod };
  }

  // Free (ou pago inativo): cortesia única, soma vitalícia.
  const gasto = usage.reduce((acc, u) => acc + (Number(u.custoCobrado) || 0), 0);
  const orcamento = Number(settings.freeCourtesyBudgetBRL) || 0;
  return { gasto, orcamento, isFree: true, usageInPeriod: usage };
};

/** Chave de dia no fuso de São Paulo (YYYY-MM-DD). */
const brazilDayKey = (d) => {
  try {
    return new Date(d).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  } catch {
    return new Date(d).toISOString().slice(0, 10);
  }
};

/** Percentual de uso, estado e série diária (%) — sem expor R$ ao cliente. */
const buildPercentView = (gasto, orcamento, usageInPeriod = []) => {
  const percentUsed = orcamento > 0
    ? Math.min(100, Math.max(0, (gasto / orcamento) * 100))
    : (gasto > 0 ? 100 : 0);
  const percentRemaining = Math.max(0, 100 - percentUsed);

  let status = 'ok';
  if (percentUsed >= 100) status = 'exhausted';
  else if (percentUsed >= 90) status = 'critical';
  else if (percentUsed >= 70) status = 'warning';

  // Série diária como % do orçamento (base para o gráfico do cliente).
  const byDay = new Map();
  if (orcamento > 0) {
    for (const u of usageInPeriod) {
      const key = brazilDayKey(u.data);
      byDay.set(key, (byDay.get(key) || 0) + (Number(u.custoCobrado) || 0));
    }
  }
  const dailyPercent = Array.from(byDay.entries())
    .map(([date, custo]) => ({ date, percent: Number(((custo / orcamento) * 100).toFixed(2)) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    percentUsed: Number(percentUsed.toFixed(1)),
    percentRemaining: Number(percentRemaining.toFixed(1)),
    status,
    dailyPercent,
  };
};

/**
 * Registra um uso de IA: calcula o custo e faz append em stats.aiUsage.
 * Retorna { ok, custoReal, custoCobrado }.
 */
export const registerAiUsage = async (email, { model, promptTokens = 0, completionTokens = 0, isImage = false, profissionalId = null } = {}) => {
  try {
    const settings = await getSettings();
    const { user, error } = await findTargetUserDoc({ email, profissionalId });
    if (error || !user) {
      console.error('[registerAiUsage] alvo não resolvido:', error);
      return { ok: false, custoReal: 0, custoCobrado: 0 };
    }
    const { custoReal, custoCobrado } = computeCost(settings, { model, promptTokens, completionTokens, isImage });

    if (!user.stats) user.stats = {};
    if (!user.stats.aiUsage) user.stats.aiUsage = [];
    user.stats.aiUsage.push({
      model: model || null,
      promptTokens: Number(promptTokens) || 0,
      completionTokens: Number(completionTokens) || 0,
      isImage: !!isImage,
      custoReal,
      custoCobrado,
      data: new Date(getBrazilDate()),
    });
    await user.save();

    console.log(`[registerAiUsage] ${profissionalId ? 'prof ' + profissionalId : email}: real R$${custoReal.toFixed(4)} cobrado R$${custoCobrado.toFixed(4)}`);
    return { ok: true, custoReal, custoCobrado };
  } catch (error) {
    console.error('[registerAiUsage] erro:', error);
    return { ok: false, custoReal: 0, custoCobrado: 0 };
  }
};

/**
 * Middleware: bloqueia o uso de IA quando o gasto atinge o orçamento.
 */
export const checkAiBudget = async (req, res, next) => {
  try {
    const email = req.body?.email || req.userEmail || req.user?.email || null;
    const { profissionalId } = req.body || {};
    const settings = await getSettings();

    const { user, planType, error, status } = await findTargetUserDoc({ email, profissionalId });
    if (error || !user) {
      return res.status(status || 404).json({ success: false, msg: error || 'Usuário não encontrado' });
    }

    const { gasto, orcamento, isFree } = computeSpentAndBudget(user, planType, settings);

    if (gasto >= orcamento) {
      return res.status(429).json({
        success: false,
        code: 'AI_BUDGET_EXCEEDED',
        msg: isFree
          ? 'Sua cortesia de IA acabou. Assine um plano para continuar usando a IA.'
          : 'Você atingiu o limite de uso de IA do seu plano neste período. Aguarde a renovação ou faça upgrade.',
        data: {
          planType,
          isFree,
          percentUsed: 100,
          percentRemaining: 0,
          status: 'exhausted',
        },
      });
    }

    req.aiBudgetInfo = {
      planType,
      orcamentoBRL: orcamento,
      gastoBRL: gasto,
      restanteBRL: orcamento - gasto,
      isFree,
      targetUser: user,
      profissionalId: profissionalId || null,
    };
    next();
  } catch (error) {
    console.error('[checkAiBudget] erro:', error);
    return res.status(500).json({ success: false, msg: 'Erro ao verificar orçamento de IA' });
  }
};

/**
 * Estatísticas de uso de IA para o CLIENTE — expostas em PERCENTUAL, nunca em R$.
 * (A visão em R$ fica só no admin, via rotas de admin.)
 */
export const getAiBudgetStats = async (userEmail, profissionalId = null) => {
  try {
    const settings = await getSettings();
    const { user, planType, error } = await findTargetUserDoc({ email: userEmail, profissionalId });
    if (error || !user) return { error: error || 'Usuário não encontrado' };

    const { gasto, orcamento, isFree, usageInPeriod } = computeSpentAndBudget(user, planType, settings);
    const { percentUsed, percentRemaining, status, dailyPercent } = buildPercentView(gasto, orcamento, usageInPeriod);
    return {
      planType,
      isFree,
      isProfessional: !!profissionalId,
      canUseAI: gasto < orcamento,
      percentUsed,
      percentRemaining,
      status,
      dailyPercent,
    };
  } catch (error) {
    console.error('[getAiBudgetStats] erro:', error);
    return { error: 'Erro interno do servidor' };
  }
};

/* ------------------------------------------------------------------ */
/* Aliases de compatibilidade (mantêm imports antigos funcionando)     */
/* ------------------------------------------------------------------ */

// Antes: middleware de limite por tokens. Agora aponta para o gate por custo.
export const checkTokenLimit = checkAiBudget;

// Antes: estatísticas por tokens. Agora retorna custo (R$).
export const getTokenStats = getAiBudgetStats;

// Antes: registerTokenUsage(email, tokens, profissionalId). Mantido como wrapper:
// trata o total como tokens de saída do modelo padrão (estimativa conservadora).
export const registerTokenUsage = async (email, tokens, profissionalId = null) => {
  const res = await registerAiUsage(email, {
    model: DEFAULT_MODEL,
    completionTokens: Number(tokens) || 0,
    profissionalId,
  });
  return res.ok;
};

export default {
  computeCost,
  registerAiUsage,
  checkAiBudget,
  getAiBudgetStats,
  checkTokenLimit,
  getTokenStats,
  registerTokenUsage,
};
