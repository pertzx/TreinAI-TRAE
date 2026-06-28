import AuditLog from '../models/AuditLog.js';

/**
 * Registra uma ação sensível de auditoria. NÃO bloqueia o fluxo principal:
 * qualquer erro é apenas logado no console (auditoria nunca deve derrubar a ação).
 *
 * @param {Object} opts
 * @param {Object} [opts.req]      - request express (para extrair user/ip/userAgent)
 * @param {string} opts.action     - identificador da ação (ex: 'account.delete')
 * @param {Object} [opts.details]  - dados adicionais relevantes
 */
export const logAudit = async ({ req, action, details = null }) => {
  try {
    await AuditLog.create({
      action,
      details,
      userId: req?.user?.id || null,
      email: req?.userEmail || req?.user?.email || req?.body?.email || null,
      ip: req?.ip || req?.headers?.['x-forwarded-for'] || null,
      userAgent: req?.headers?.['user-agent'] || null,
    });
  } catch (err) {
    console.error('[auditLog] Falha ao registrar auditoria:', action, err?.message);
  }
};

export default { logAudit };
