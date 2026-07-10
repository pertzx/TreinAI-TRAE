/**
 * Espelho do gating do backend (helpers/planAccess.js). As flags de acesso do
 * plano controlam o que o usuário vê. Concede se o snapshot OU o mapa legado
 * (free/pro/max/coach) liberam — compat com usuários antes do backfill.
 */
const LEGACY = {
  free: {},
  pro: { editarTreinos: true, semAnuncios: true },
  max: { editarTreinos: true, semAnuncios: true, nutriAI: true },
  coach: { editarTreinos: true, semAnuncios: true, nutriAI: true, coachPanel: true },
};

export function hasAccess(user, flag) {
  const acc = user?.planInfos?.access || {};
  if (acc[flag]) return true;
  const legacy = LEGACY[user?.planInfos?.planType];
  return !!(legacy && legacy[flag]);
}

// Usuário em plano cortesia (grátis, saldo único).
export function isFreeUser(user) {
  // Usuário ainda não carregado: não afirmar que é free (evita toast/gating
  // de "plano gratuito" durante o loading, inclusive para pagantes).
  if (!user?.planInfos) return false;
  const planType = user.planInfos.planType || 'free';
  if (planType === 'free') return true;
  // Planos legados pagos (pro/max/coach) nunca são cortesia — o planType manda.
  // Docs antigos receberam tipo 'cortesia' indevidamente por default do schema.
  if (LEGACY[planType]) return false;
  // Planos dinâmicos (criados no admin): confia no snapshot.
  return (user.planInfos.tipo || 'recorrente') === 'cortesia';
}

// Anúncios aparecem para todos por padrão. Quem tem a feature 'semAnuncios'
// no plano pode ESCOLHER desativá-los em Configurações (preferences.hideAds).
export function adsEnabled(user) {
  return !(hasAccess(user, 'semAnuncios') && user?.preferences?.hideAds === true);
}

export default { hasAccess, isFreeUser, adsEnabled };
