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
  const tipo = user?.planInfos?.tipo;
  if (tipo) return tipo === 'cortesia';
  return (user?.planInfos?.planType || 'free') === 'free';
}

export default { hasAccess, isFreeUser };
