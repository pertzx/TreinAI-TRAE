import mongoose from 'mongoose';
import { verifyBan } from './banFunctions.js';

// Rotas que devem ser acessadas sem verificação (whitelist)
// - Prefixos estáticos (ex.: /public) e caminhos exatos (ex.: /health)
// - Pode ser ampliada via variável de ambiente SECURITY_GUARD_BYPASS_PATHS (lista separada por vírgula)
const STATIC_BYPASS_PREFIXES = ['/public', '/assets', '/docs', '/images', '/css', '/js', '/uploads'];
const EXACT_BYPASS_PATHS = ['/webhook', '/csrf-token', '/health', '/status', '/login', '/signup', '/login-nao-autorizado'];
const ENV_BYPASS = (process.env.SECURITY_GUARD_BYPASS_PATHS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const isBypassedRoute = (req) => {
  if (req.method === 'OPTIONS') return true; // preflight sempre liberado
  const p = req.path || '';
  if (EXACT_BYPASS_PATHS.includes(p)) return true;
  if (STATIC_BYPASS_PREFIXES.some(prefix => p.startsWith(prefix))) return true;
  if (ENV_BYPASS.some(prefix => p.startsWith(prefix))) return true;
  return false;
};

// Detecta presença de parâmetros sensíveis (userId/profissionalId) em params, query e body
const collectSensitiveIdentifiers = (obj, depth = 0) => {
  const userIds = [];
  const profissionalIds = [];

  if (!obj || typeof obj !== 'object' || depth > 2) return { userIds, profissionalIds };

  for (const [key, value] of Object.entries(obj)) {
    const k = String(key).toLowerCase();

    if (value && typeof value === 'object') {
      const nested = collectSensitiveIdentifiers(value, depth + 1);
      userIds.push(...nested.userIds);
      profissionalIds.push(...nested.profissionalIds);
      continue;
    }

    const val = value != null ? String(value) : '';
    if (!val) continue;

    const isUserIdKey = k === 'userid' || k.includes('user') && k.includes('id') || k === 'uid' || k === '_id' || k === 'user_id';
    const isProfIdKey = k === 'profissionalid' || k.includes('profissional') && k.includes('id') || k === 'professionalid' || k === 'prof_id' || k === 'professional_id';

    if (isUserIdKey) userIds.push(val.trim());
    if (isProfIdKey) profissionalIds.push(val.trim());
  }

  return { userIds, profissionalIds };
};

// Verifica payload suspeito (XSS simples)
const hasSuspiciousPayload = (val) => {
  const v = String(val || '').toLowerCase();
  return v.includes('<') || v.includes('>') || v.includes('script') || v.includes('javascript:') || /on\w+\s*=/.test(v);
};

// Middleware global: aplica verificação somente quando houver userId/profissionalId
export const secureAccessGuard = async (req, res, next) => {
  try {
    // Rotas que DEVEM ser acessadas a todo custo (bypass)
    if (isBypassedRoute(req)) return next();

    const fromParams = collectSensitiveIdentifiers(req.params);
    const fromQuery = collectSensitiveIdentifiers(req.query);
    const fromBody = collectSensitiveIdentifiers(req.body);

    const userIds = [...fromParams.userIds, ...fromQuery.userIds, ...fromBody.userIds];
    const profissionalIds = [...fromParams.profissionalIds, ...fromQuery.profissionalIds, ...fromBody.profissionalIds];

    const hasSensitive = (userIds.length > 0) || (profissionalIds.length > 0);
    if (!hasSensitive) return next();

    // Proteções de entrada: XSS e formato de ObjectId
    const allValues = [...userIds, ...profissionalIds];
    const hasXSS = allValues.some(hasSuspiciousPayload);
    if (hasXSS) {
      console.warn('[secureAccessGuard] Possível tentativa de XSS detectada', {
        route: req.originalUrl,
        method: req.method,
        ip: req.ip,
        ua: req.headers['user-agent']
      });
      return res.status(403).json({
        msg: 'Acesso não autorizado - conteúdo potencialmente malicioso',
        code: 'POTENTIAL_XSS'
      });
    }

    const allIdsAreValid = allValues.every((v) => mongoose.Types.ObjectId.isValid(String(v)));
    if (!allIdsAreValid) {
      console.warn('[secureAccessGuard] Parâmetros inválidos (ObjectId) detectados. | Possivel exploite.', {
        route: req.originalUrl,
        method: req.method,
        ua: req.headers['user-agent']
      });
      return res.status(403).json({
        msg: 'Acesso não autorizado - parâmetro inválido detectado. IDs devem estar no formato válido do MongoDB. | Se você é um exploiter é melhor parar por aqui 😉',
        code: 'PARAM_INVALID'
      });
    }

    // Autorização: delega verificação completa para verifyBan (já compatível com GET/POST)
    return verifyBan(req, res, next);
  } catch (err) {
    console.error('[secureAccessGuard] Erro inesperado no guard:', err?.message);
    return res.status(500).json({
      msg: 'Erro interno na verificação de segurança',
      code: 'SECURITY_GUARD_ERROR'
    });
  }
};

export default secureAccessGuard;