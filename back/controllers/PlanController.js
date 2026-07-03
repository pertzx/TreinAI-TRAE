import Plan from '../models/Plan.js';
import User from '../models/User.js';

// Verifica se o requisitante é admin; retorna o doc do admin ou null.
// (mesmo padrão de AdminController.ensureAdmin — replicado para não acoplar)
const ensureAdmin = async (adminId) => {
  if (!adminId) return null;
  const u = await User.findById(adminId);
  return (u && u.role === 'admin') ? u : null;
};

// Só os campos que fazem sentido expor publicamente na landing.
const PUBLIC_FIELDS = 'key name subtitle description priceBRL originalPriceBRL periodLabel features buttonText accent popular isProfessional sortOrder -_id';

/**
 * Público: lista os planos ativos, ordenados. Sem dados sensíveis.
 * GET /plans
 */
export const getPublicPlans = async (_req, res) => {
  try {
    const plans = await Plan.find({ active: true })
      .select(PUBLIC_FIELDS)
      .sort({ sortOrder: 1 })
      .lean();
    return res.status(200).json({ success: true, plans });
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Erro ao buscar planos.', error: error.message });
  }
};

/**
 * Admin: lista TODOS os planos (inclusive inativos), para edição.
 * POST /admin/plans  { adminId }
 */
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

/**
 * Admin: atualiza um plano por `key` (apenas os campos enviados).
 * A `key` é imutável (é o vínculo com Stripe/gating).
 * POST /admin/update-plan  { adminId, key, ...campos }
 */
export const updatePlan = async (req, res) => {
  try {
    const admin = await ensureAdmin(req.body.adminId);
    if (!admin) return res.status(403).json({ success: false, message: 'Acesso negado.' });

    const { key } = req.body;
    if (!key) return res.status(400).json({ success: false, msg: 'key do plano é obrigatória.' });

    const plan = await Plan.findOne({ key });
    if (!plan) return res.status(404).json({ success: false, msg: `Plano não encontrado: ${key}` });

    const b = req.body;
    if (b.name != null) plan.name = String(b.name);
    if (b.subtitle != null) plan.subtitle = String(b.subtitle);
    if (b.description != null) plan.description = String(b.description);
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

    if (Array.isArray(b.features)) {
      plan.features = b.features
        .filter(f => f && typeof f.text === 'string' && f.text.trim())
        .map(f => ({
          text: String(f.text).trim(),
          included: f.included !== false,
          highlight: !!f.highlight,
        }));
    }

    await plan.save();
    return res.status(200).json({ success: true, plan, msg: 'Plano atualizado.' });
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Erro ao atualizar plano.', error: error.message });
  }
};
