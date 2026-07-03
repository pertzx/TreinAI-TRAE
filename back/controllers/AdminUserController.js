import User from '../models/User.js';
import Plan from '../models/Plan.js';
import AuditLog from '../models/AuditLog.js';
import { logAudit } from '../helpers/auditLog.js';
import { applyPlanSnapshot } from '../helpers/planAccess.js';
import { getSettings } from '../models/GlobalSettings.js';
import { getBrazilDate } from '../helpers/getBrazilDate.js';

// A middleware `router.use(verificarToken, isAdmin)` já garante admin. Aqui usamos
// SEMPRE req.user (token) — nunca ids do body — para a identidade do admin.

/** Banir um usuário (bloqueia acesso; BannedGuard redireciona p/ /suporte). */
export const banUser = async (req, res) => {
  try {
    const { userId, motivo } = req.body;
    if (!userId) return res.status(400).json({ success: false, msg: 'userId é obrigatório.' });
    if (String(userId) === String(req.user?.id)) {
      return res.status(400).json({ success: false, msg: 'Você não pode banir a si mesmo.' });
    }
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, msg: 'Usuário não encontrado.' });

    user.ban = { banned: true, motivo: String(motivo || 'Violação de termos').trim() };
    if (!user.blockedAt) user.blockedAt = new Date(getBrazilDate());
    await user.save();

    logAudit({ req, action: 'user.ban', details: { userId: String(userId), motivo: user.ban.motivo } });
    return res.status(200).json({ success: true, msg: 'Usuário banido.', ban: user.ban });
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Erro ao banir usuário.', error: error.message });
  }
};

/** Remover o banimento. */
export const unbanUser = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, msg: 'userId é obrigatório.' });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, msg: 'Usuário não encontrado.' });

    user.ban = { banned: false, motivo: null };
    user.blockedAt = null;
    await user.save();

    logAudit({ req, action: 'user.unban', details: { userId: String(userId) } });
    return res.status(200).json({ success: true, msg: 'Banimento removido.' });
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Erro ao desbanir usuário.', error: error.message });
  }
};

/** Ajusta o plano de um usuário manualmente (planType/status/acesso/orçamento). */
export const setUserPlan = async (req, res) => {
  try {
    const { userId, planType, status, aiBudgetBRL } = req.body;
    if (!userId || !planType) return res.status(400).json({ success: false, msg: 'userId e planType são obrigatórios.' });

    const key = String(planType).toLowerCase();
    if (key !== 'free') {
      const plan = await Plan.findOne({ key });
      if (!plan) return res.status(400).json({ success: false, msg: `Plano inexistente: ${key}` });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, msg: 'Usuário não encontrado.' });

    const settings = await getSettings();
    user.planInfos = user.planInfos || {};
    user.planInfos.planType = key;
    user.planInfos.status = (status === 'ativo' || status === 'inativo') ? status : (key === 'free' ? 'inativo' : 'ativo');
    await applyPlanSnapshot(user, key); // access + tipo do plano
    user.planInfos.periodStart = new Date();
    user.planInfos.isTrial = false;
    user.planInfos.trialUntil = null;

    if (aiBudgetBRL != null && aiBudgetBRL !== '') {
      user.planInfos.aiBudgetBRL = Math.max(0, Number(aiBudgetBRL) || 0);
    } else if (key !== 'free') {
      user.planInfos.aiBudgetBRL = Number(settings.planBudgetFallbackBRL?.[key]) || Number(user.planInfos.aiBudgetBRL) || 0;
    }

    await user.save();
    logAudit({ req, action: 'user.set-plan', details: { userId: String(userId), planType: key, status: user.planInfos.status } });
    return res.status(200).json({ success: true, msg: 'Plano do usuário atualizado.', planInfos: user.planInfos });
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Erro ao ajustar plano.', error: error.message });
  }
};

/** Zera o uso de IA do usuário (novo período). */
export const resetAiUsage = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, msg: 'userId é obrigatório.' });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, msg: 'Usuário não encontrado.' });

    if (!user.stats) user.stats = {};
    user.stats.aiUsage = [];
    user.planInfos = user.planInfos || {};
    user.planInfos.periodStart = new Date();
    await user.save();

    logAudit({ req, action: 'user.reset-ai', details: { userId: String(userId) } });
    return res.status(200).json({ success: true, msg: 'Uso de IA zerado.' });
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Erro ao resetar uso de IA.', error: error.message });
  }
};

/** Exclui um usuário (perigoso). Trava self-delete. Auditado antes de apagar. */
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, msg: 'userId é obrigatório.' });
    if (String(userId) === String(req.user?.id)) {
      return res.status(400).json({ success: false, msg: 'Você não pode excluir a si mesmo.' });
    }
    const user = await User.findById(userId).select('email username');
    if (!user) return res.status(404).json({ success: false, msg: 'Usuário não encontrado.' });

    await logAudit({ req, action: 'user.delete', details: { userId: String(userId), email: user.email, username: user.username } });
    await User.findByIdAndDelete(userId);
    return res.status(200).json({ success: true, msg: 'Usuário excluído.' });
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Erro ao excluir usuário.', error: error.message });
  }
};

/** Trilha de auditoria (paginada, filtrável por ação e email). */
export const getAuditLogs = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.body.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.body.limit, 10) || 25));
    const filter = {};
    if (req.body.action) filter.action = String(req.body.action);
    if (req.body.email) filter.email = new RegExp(String(req.body.email).trim(), 'i');

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ criadoEm: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      logs,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Erro ao buscar auditoria.', error: error.message });
  }
};
