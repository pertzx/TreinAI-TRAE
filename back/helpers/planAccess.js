import Plan from '../models/Plan.js';

/**
 * Fonte única do gating por plano. As flags de `access` do Plano controlam o
 * acesso real (nutriAI, painel Coach, anúncios, editar treinos).
 *
 * - `hasFeature(user, flag)` é SÍNCRONO: lê o snapshot `user.planInfos.access`
 *   (setado quando o plano muda) com rede de segurança no mapa legado por key.
 * - `getAccessForPlanKey(key)` é ASSÍNCRONO: resolve pelo Plan doc (fonte de
 *   verdade) e é usado ao SETAR o snapshot (webhook/atualizar-plano/trial/free).
 */

export const ACCESS_FLAGS = ['nutriAI', 'coachPanel', 'semAnuncios', 'editarTreinos'];

const emptyAccess = () => ({ nutriAI: false, coachPanel: false, semAnuncios: false, editarTreinos: false });

// Mapa legado (compat com usuários/planos free/pro/max/coach antes do backfill).
const LEGACY_ACCESS = {
  free: emptyAccess(),
  pro: { ...emptyAccess(), editarTreinos: true, semAnuncios: true },
  max: { ...emptyAccess(), editarTreinos: true, semAnuncios: true, nutriAI: true },
  coach: { ...emptyAccess(), editarTreinos: true, semAnuncios: true, nutriAI: true, coachPanel: true },
};

const legacyTipo = (key) => (key === 'free' ? 'cortesia' : 'recorrente');

/** Acesso a uma feature (síncrono). Concede se o snapshot OU o mapa legado liberam. */
export const hasFeature = (user, flag) => {
  const acc = user?.planInfos?.access || {};
  if (acc[flag]) return true;
  const legacy = LEGACY_ACCESS[user?.planInfos?.planType];
  return !!(legacy && legacy[flag]);
};

/** true se o plano do usuário é cortesia (free) — saldo único, não renovável. */
export const isCourtesyUser = (user) => {
  const planType = user?.planInfos?.planType || 'free';
  if (planType === 'free') return true;
  // Planos legados pagos (pro/max/coach) nunca são cortesia. O planType manda:
  // muitos docs receberam tipo 'cortesia' indevidamente pelo antigo default do
  // schema, marcando pagantes como free.
  if (LEGACY_ACCESS[planType]) return false;
  // Planos dinâmicos (criados no admin): confia no snapshot.
  return (user?.planInfos?.tipo || 'recorrente') === 'cortesia';
};

/**
 * Resolve {access, tipo, courtesyBudgetBRL} de uma key, pelo Plan doc (fonte de
 * verdade) com fallback legado. Usado ao setar o snapshot no usuário.
 */
export const getAccessForPlanKey = async (key) => {
  try {
    const plan = await Plan.findOne({ key }).lean();
    if (plan) {
      return {
        access: { ...emptyAccess(), ...(plan.access || {}) },
        tipo: plan.tipo || legacyTipo(key),
        courtesyBudgetBRL: Number(plan.courtesyBudgetBRL) || 0,
      };
    }
  } catch (e) {
    console.error('[planAccess] getAccessForPlanKey erro:', e?.message);
  }
  return {
    access: { ...emptyAccess(), ...(LEGACY_ACCESS[key] || {}) },
    tipo: legacyTipo(key),
    courtesyBudgetBRL: 0,
  };
};

/** Aplica o snapshot de acesso/tipo no doc do usuário (não salva). */
export const applyPlanSnapshot = async (user, key) => {
  const { access, tipo } = await getAccessForPlanKey(key);
  if (!user.planInfos) user.planInfos = {};
  user.planInfos.access = access;
  user.planInfos.tipo = tipo;
  return { access, tipo };
};

export default { ACCESS_FLAGS, hasFeature, isCourtesyUser, getAccessForPlanKey, applyPlanSnapshot };
