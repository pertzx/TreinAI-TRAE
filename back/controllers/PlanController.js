import Plan from '../models/Plan.js';
import User from '../models/User.js';
import { ACCESS_FLAGS } from '../helpers/planAccess.js';

const ensureAdmin = async (adminId) => {
  if (!adminId) return null;
  const u = await User.findById(adminId);
  return (u && u.role === 'admin') ? u : null;
};

// Campos públicos (exibição em Configurações). NUNCA inclui `priceId`.
const PUBLIC_FIELDS = 'key name subtitle description precoText tipo priceBRL originalPriceBRL periodLabel access features buttonText accent popular isProfessional sortOrder -_id';

// Aplica os campos enviados no doc do plano (usado em create e update).
const applyPlanFields = (plan, b) => {
  if (b.name != null) plan.name = String(b.name);
  if (b.subtitle != null) plan.subtitle = String(b.subtitle);
  if (b.description != null) plan.description = String(b.description);
  if (b.priceId !== undefined) plan.priceId = b.priceId ? String(b.priceId).trim() : null;
  if (b.precoText != null) plan.precoText = String(b.precoText);
  if (b.tipo != null && ['recorrente', 'unico', 'cortesia'].includes(b.tipo)) plan.tipo = b.tipo;
  if (b.courtesyBudgetBRL != null) plan.courtesyBudgetBRL = Math.max(0, Number(b.courtesyBudgetBRL) || 0);
  if (b.priceBRL != null) plan.priceBRL = Math.max(0, Number(b.priceBRL) || 0);
  if (b.originalPriceBRL !== undefined) {
    plan.originalPriceBRL = (b.originalPriceBRL === null || b.originalPriceBRL === '')
      ? null : Math.max(0, Number(b.originalPriceBRL) || 0);
  }
  if (b.periodLabel != null) plan.periodLabel = String(b.periodLabel);
  if (b.buttonText != null) plan.buttonText = String(b.buttonText);
  if (b.accent != null) plan.accent = String(b.accent);
  if (b.popular != null) plan.popular = !!b.popular;
  if (b.isProfessional != null) plan.isProfessional = !!b.isProfessional;
  if (b.active != null) plan.active = !!b.active;
  if (b.sortOrder != null) plan.sortOrder = Number(b.sortOrder) || 0;

  if (b.access && typeof b.access === 'object') {
    plan.access = plan.access || {};
    ACCESS_FLAGS.forEach(flag => {
      if (b.access[flag] != null) plan.access[flag] = !!b.access[flag];
    });
  }

  if (Array.isArray(b.features)) {
    plan.features = b.features
      .filter(f => f && typeof f.text === 'string' && f.text.trim())
      .map(f => ({ text: String(f.text).trim(), included: f.included !== false, highlight: !!f.highlight }));
  }
};

/** Público: planos ativos p/ exibição em Configurações (sem priceId). */
export const getPublicPlans = async (_req, res) => {
  try {
    const plans = await Plan.find({ active: true }).select(PUBLIC_FIELDS).sort({ sortOrder: 1 }).lean();
    return res.status(200).json({ success: true, plans });
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Erro ao buscar planos.', error: error.message });
  }
};

/** Admin: lista TODOS os planos (inclui priceId e inativos). */
export const getAdminPlans = async (req, res) => {
  try {
    const admin = await ensureAdmin(req.body.adminId);
    if (!admin) return res.status(403).json({ success: false, message: 'Acesso negado.' });
    const plans = await Plan.find({}).sort({ sortOrder: 1 }).lean();
    return res.status(200).json({ success: true, plans });
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Erro ao buscar planos.', error: error.message });
  }
};

/** Admin: cria um plano (key livre). POST /admin/create-plan */
export const createPlan = async (req, res) => {
  try {
    const admin = await ensureAdmin(req.body.adminId);
    if (!admin) return res.status(403).json({ success: false, message: 'Acesso negado.' });

    const key = String(req.body.key || '').trim().toLowerCase();
    if (!key) return res.status(400).json({ success: false, msg: 'key do plano é obrigatória.' });
    if (!/^[a-z0-9-]+$/.test(key)) return res.status(400).json({ success: false, msg: 'key deve conter apenas letras minúsculas, números e hífen.' });
    if (!req.body.name) return res.status(400).json({ success: false, msg: 'name é obrigatório.' });

    const exists = await Plan.findOne({ key });
    if (exists) return res.status(409).json({ success: false, msg: 'Já existe um plano com essa key.' });

    const plan = new Plan({ key, name: String(req.body.name) });
    applyPlanFields(plan, req.body);
    await plan.save();
    return res.status(201).json({ success: true, plan, msg: 'Plano criado.' });
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Erro ao criar plano.', error: error.message });
  }
};

/** Admin: atualiza um plano por key (campos enviados). POST /admin/update-plan */
export const updatePlan = async (req, res) => {
  try {
    const admin = await ensureAdmin(req.body.adminId);
    if (!admin) return res.status(403).json({ success: false, message: 'Acesso negado.' });

    const { key } = req.body;
    if (!key) return res.status(400).json({ success: false, msg: 'key do plano é obrigatória.' });

    const plan = await Plan.findOne({ key });
    if (!plan) return res.status(404).json({ success: false, msg: `Plano não encontrado: ${key}` });

    applyPlanFields(plan, req.body);
    await plan.save();
    return res.status(200).json({ success: true, plan, msg: 'Plano atualizado.' });
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Erro ao atualizar plano.', error: error.message });
  }
};

/** Admin: remove um plano por key. POST /admin/delete-plan */
export const deletePlan = async (req, res) => {
  try {
    const admin = await ensureAdmin(req.body.adminId);
    if (!admin) return res.status(403).json({ success: false, message: 'Acesso negado.' });
    const { key } = req.body;
    if (!key) return res.status(400).json({ success: false, msg: 'key é obrigatória.' });
    await Plan.deleteOne({ key });
    return res.status(200).json({ success: true, msg: 'Plano removido.' });
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Erro ao remover plano.', error: error.message });
  }
};
