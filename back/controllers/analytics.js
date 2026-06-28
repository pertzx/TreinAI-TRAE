import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User.js';
import DailyVisit from '../models/DailyVisit.js';
import InteractionLog from '../models/InteractionLog.js';
import Anuncio from '../models/Anuncios.js';
import Profissional from '../models/Profissional.js';

const TZ = 'America/Sao_Paulo';

/** YYYY-MM-DD no fuso do Brasil. */
const dayKey = (d = new Date()) => {
  try { return new Date(d).toLocaleDateString('en-CA', { timeZone: TZ }); }
  catch { return new Date(d).toISOString().slice(0, 10); }
};

/** Lista os últimos N day-keys (mais antigo → mais recente). */
const lastNDays = (n) => {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push(dayKey(d));
  }
  return out;
};

/** Monta uma série contínua de N dias preenchendo zeros a partir de um mapa. */
const fillSeries = (days, map, keys) =>
  days.map(day => {
    const row = map.get(day) || {};
    const obj = { day };
    for (const k of keys) obj[k] = Number(row[k] || 0);
    return obj;
  });

const isAdmin = async (adminId) => {
  if (!adminId) return false;
  const u = await User.findById(adminId).select('role').lean();
  return !!(u && u.role === 'admin');
};

/* ------------------------------------------------------------------ */
/* 1) Registro de visita diária única (público)                        */
/* ------------------------------------------------------------------ */
export const trackVisit = async (req, res) => {
  try {
    // Identificador do visitante: cookie persistente (anônimo). Cria se não existir.
    let visitorId = req.cookies?.visitorId;
    if (!visitorId) {
      visitorId = uuidv4();
      res.cookie('visitorId', visitorId, {
        maxAge: 1000 * 60 * 60 * 24 * 365, // 1 ano
        httpOnly: true,
        sameSite: 'Lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }

    const day = dayKey();
    const userId = req.userEmail ? (req.user?.id || null) : null;

    try {
      await DailyVisit.create({ day, visitorId, userId });
    } catch (err) {
      if (err.code !== 11000) throw err; // 11000 = já contado hoje (ok)
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('[trackVisit] erro:', error);
    return res.status(200).json({ success: false }); // nunca quebra o client
  }
};

/* ------------------------------------------------------------------ */
/* 2) Dashboard de analytics do admin                                  */
/* ------------------------------------------------------------------ */
export const getAdminAnalytics = async (req, res) => {
  try {
    if (!(await isAdmin(req.body.adminId))) {
      return res.status(403).json({ success: false, message: 'Acesso negado.' });
    }
    const days = Math.min(90, Math.max(7, Number(req.body.days) || 30));
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);
    const startKey = dayKey(start);
    const daysList = lastNDays(days);

    const [
      totalUsers,
      signupsRows,
      planRows,
      aiRows,
      visitsRows,
      activePaid,
    ] = await Promise.all([
      User.countDocuments(),
      User.aggregate([
        { $match: { createdAt: { $gte: start } } },
        { $group: { _id: { $dateToString: { date: '$createdAt', format: '%Y-%m-%d', timezone: TZ } }, count: { $sum: 1 } } },
      ]),
      User.aggregate([
        { $group: { _id: { plan: '$planInfos.planType', status: '$planInfos.status' }, count: { $sum: 1 } } },
      ]),
      User.aggregate([
        { $unwind: '$stats.aiUsage' },
        { $match: { 'stats.aiUsage.data': { $gte: start } } },
        { $group: {
          _id: { $dateToString: { date: '$stats.aiUsage.data', format: '%Y-%m-%d', timezone: TZ } },
          revenue: { $sum: '$stats.aiUsage.custoCobrado' },
          cost: { $sum: '$stats.aiUsage.custoReal' },
        } },
      ]),
      DailyVisit.aggregate([
        { $match: { day: { $gte: startKey } } },
        { $group: { _id: '$day', count: { $sum: 1 } } },
      ]),
      User.find({ 'planInfos.planType': { $in: ['pro', 'max', 'coach'] }, 'planInfos.status': 'ativo' })
        .select('planInfos.nextPaymentValue planInfos.planType').lean(),
    ]);

    // Séries diárias preenchidas
    const signupsMap = new Map(signupsRows.map(r => [r._id, { count: r.count }]));
    const aiMap = new Map(aiRows.map(r => [r._id, { revenue: r.revenue, cost: r.cost }]));
    const visitsMap = new Map(visitsRows.map(r => [r._id, { count: r.count }]));

    const signupsSeries = fillSeries(daysList, signupsMap, ['count']);
    const visitsSeries = fillSeries(daysList, visitsMap, ['count']);
    const aiSeries = fillSeries(daysList, aiMap, ['revenue', 'cost']).map(r => ({
      day: r.day,
      revenue: Number(r.revenue.toFixed(4)),
      cost: Number(r.cost.toFixed(4)),
      profit: Number((r.revenue - r.cost).toFixed(4)),
    }));

    // Distribuição de planos
    const planDist = {};
    let activeCount = 0;
    for (const r of planRows) {
      const plan = r._id.plan || 'free';
      planDist[plan] = (planDist[plan] || 0) + r.count;
      if (r._id.status === 'ativo' && plan !== 'free') activeCount += r.count;
    }

    // Receita recorrente (MRR) e lucro acumulado de IA no período
    const mrr = activePaid.reduce((acc, u) => acc + (Number(u.planInfos?.nextPaymentValue) || 0), 0);
    const aiRevenue = aiSeries.reduce((a, r) => a + r.revenue, 0);
    const aiCost = aiSeries.reduce((a, r) => a + r.cost, 0);
    const visitsTotal = visitsSeries.reduce((a, r) => a + r.count, 0);
    const signupsTotal = signupsSeries.reduce((a, r) => a + r.count, 0);

    return res.json({
      success: true,
      periodoDias: days,
      kpis: {
        totalUsers,
        assinantesAtivos: activeCount,
        mrrBRL: Number(mrr.toFixed(2)),
        novosUsuarios: signupsTotal,
        visitasUnicas: visitsTotal,
        receitaIA: Number(aiRevenue.toFixed(2)),
        custoIA: Number(aiCost.toFixed(2)),
        lucroIA: Number((aiRevenue - aiCost).toFixed(2)),
      },
      planDist,
      series: { signups: signupsSeries, visits: visitsSeries, ai: aiSeries },
    });
  } catch (error) {
    console.error('[getAdminAnalytics] erro:', error);
    return res.status(500).json({ success: false, msg: 'Erro ao gerar analytics.', error: error.message });
  }
};

/* ------------------------------------------------------------------ */
/* 3) Série de impressões/cliques de um alvo (anúncio/profissional)    */
/* ------------------------------------------------------------------ */
export const getInteractionStats = async (req, res) => {
  try {
    const targetId = req.body.targetId || req.query.targetId;
    const targetModel = req.body.targetModel || req.query.targetModel; // 'Anuncio' | 'Profissional' | 'Local'
    const days = Math.min(90, Math.max(7, Number(req.body.days || req.query.days) || 30));

    if (!targetId || !['Anuncio', 'Profissional', 'Local'].includes(targetModel)) {
      return res.status(400).json({ success: false, msg: 'targetId e targetModel válidos são obrigatórios.' });
    }

    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);
    const daysList = lastNDays(days);

    const rows = await InteractionLog.aggregate([
      { $match: { targetId: String(targetId), targetModel, timestamp: { $gte: start } } },
      { $group: {
        _id: { day: { $dateToString: { date: '$timestamp', format: '%Y-%m-%d', timezone: TZ } }, type: '$type' },
        count: { $sum: 1 },
      } },
    ]);

    const map = new Map();
    for (const r of rows) {
      const day = r._id.day;
      const cur = map.get(day) || { impressions: 0, clicks: 0 };
      if (r._id.type === 'impression') cur.impressions += r.count;
      else if (r._id.type === 'click') cur.clicks += r.count;
      map.set(day, cur);
    }
    const series = fillSeries(daysList, map, ['impressions', 'clicks']);

    // Totais agregados (contadores oficiais do alvo)
    let totals = { impressions: 0, clicks: 0 };
    if (targetModel === 'Anuncio') {
      const a = await Anuncio.findOne({ $or: [{ anuncioId: targetId }, ...(targetId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: targetId }] : [])] }).select('estatisticas').lean();
      if (a) totals = { impressions: a.estatisticas?.impressoes || 0, clicks: a.estatisticas?.cliques || 0 };
    } else if (targetModel === 'Profissional') {
      const p = await Profissional.findOne({ $or: [{ profissionalId: targetId }, { userId: targetId }] }).select('estatisticas').lean();
      if (p) totals = { impressions: p.estatisticas?.impressoes || 0, clicks: p.estatisticas?.cliques || 0 };
    }
    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;

    return res.json({ success: true, series, totals, ctr: Number(ctr.toFixed(2)) });
  } catch (error) {
    console.error('[getInteractionStats] erro:', error);
    return res.status(500).json({ success: false, msg: 'Erro ao buscar estatísticas.' });
  }
};
