/**
 * Remove valores de CUSTO de IA em R$ do payload do usuário enviado ao CLIENTE.
 * O cliente vê o uso apenas em % (via /tokens/token-stats). O admin continua
 * recebendo R$ pelas rotas de admin (não passe o usuário por aqui no admin).
 *
 * Só deleta campos — não altera comportamento. Aceita doc do mongoose ou objeto.
 */
export const stripAiCostForClient = (user) => {
  if (!user) return user;
  const obj = (typeof user.toObject === 'function') ? user.toObject() : { ...user };

  if (obj.planInfos) {
    delete obj.planInfos.aiBudgetBRL;
  }
  if (obj.stats && Array.isArray(obj.stats.aiUsage)) {
    obj.stats.aiUsage = obj.stats.aiUsage.map(u => {
      const { custoReal, custoCobrado, ...rest } = u;
      return rest;
    });
  }
  return obj;
};

export default stripAiCostForClient;
