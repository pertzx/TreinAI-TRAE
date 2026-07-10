import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// Tokens CSRF stateless (assinados via HMAC). Não dependem de memória do
// processo, então funcionam em serverless/multi-instância e sobrevivem a
// restarts — o Map antigo perdia todos os tokens a cada cold start e
// derrubava usuários no meio do cadastro/onboarding.
const CSRF_SECRET = process.env.CSRF_SECRET || process.env.SECRET_JWT;
const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutos

if (!CSRF_SECRET) {
    throw new Error('CSRF_SECRET ou SECRET_JWT deve estar definido para gerar tokens CSRF');
}

const sign = (payload) => crypto.createHmac('sha256', CSRF_SECRET).update(payload).digest('hex');

/**
 * Resolve a identidade da sessão para o token CSRF.
 * - Usuário autenticado: e-mail (do verificarToken ou decodificando o JWT
 *   do cookie/header, para rotas sem middleware de auth como /csrf-token).
 * - Visitante (login/signup): 'anon' — não vincula ao IP, que muda em redes
 *   móveis/proxies e causava validações falhando aleatoriamente.
 */
const resolveSessionId = (req) => {
    if (req.userEmail) return req.userEmail;

    let token = req.cookies?.authToken || req.cookies?.auth_token;
    if (!token) {
        const authHeader = req.headers['authorization'];
        token = authHeader && authHeader.split(' ')[1];
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.SECRET_JWT);
            if (decoded?.email) return decoded.email;
        } catch {
            // Token inválido/expirado: trata como visitante
        }
    }

    return 'anon';
};

/**
 * Gera um token CSRF assinado
 * @param {string} sessionId - Identidade da sessão (e-mail ou 'anon')
 * @returns {string} Token CSRF no formato nonce.timestamp.assinatura
 */
export const generateCSRFToken = (sessionId) => {
    const nonce = crypto.randomBytes(16).toString('hex');
    const ts = Date.now().toString(36);
    const sig = sign(`${nonce}.${ts}.${sessionId}`);
    return `${nonce}.${ts}.${sig}`;
};

/**
 * Valida um token CSRF (assinatura + expiração)
 * @param {string} token - Token a ser validado
 * @param {string} sessionId - Identidade da sessão
 * @returns {boolean} True se válido
 */
export const validateCSRFToken = (token, sessionId) => {
    if (!token || !sessionId) return false;

    const parts = String(token).split('.');
    if (parts.length !== 3) return false;

    const [nonce, ts, sig] = parts;
    const createdAt = parseInt(ts, 36);
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > TOKEN_TTL_MS) return false;

    const expected = sign(`${nonce}.${ts}.${sessionId}`);
    try {
        return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
    } catch {
        return false;
    }
};

/**
 * Extrai o token CSRF da requisição (header, body, query ou cookie)
 */
const extractToken = (req) => {
    return req.headers['x-csrf-token'] ||
        req.headers['x-xsrf-token'] ||
        (req.body && req.body._csrf) ||
        (req.query && req.query._csrf) ||
        (req.cookies && req.cookies['x-csrf-token']) ||
        (req.cookies && req.cookies['csrf_token']);
};

/**
 * Middleware para gerar e fornecer token CSRF
 */
export const provideCSRFToken = (req, res, next) => {
    const csrfToken = generateCSRFToken(resolveSessionId(req));

    // Adiciona token ao response
    res.locals.csrfToken = csrfToken;

    // Adiciona header para o frontend
    res.setHeader('X-CSRF-Token', csrfToken);

    next();
};

/**
 * Middleware para validar token CSRF em requisições que modificam dados
 */
export const validateCSRF = (req, res, next) => {
    // Pula validação para métodos seguros
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // Garante que req.body existe (compatibilidade Express 5.x)
    if (!req.body) {
        req.body = {};
    }

    const token = extractToken(req);
    const sessionId = resolveSessionId(req);

    if (!validateCSRFToken(token, sessionId)) {
        return res.status(403).json({
            error: 'Token CSRF inválido ou expirado',
            code: 'CSRF_TOKEN_INVALID'
        });
    }

    next();
};

/**
 * Middleware específico para rotas de autenticação
 * Mais permissivo para login/signup
 */
export const validateCSRFAuth = (req, res, next) => {
    // Pula validação para métodos seguros
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // Garante que req.body existe (compatibilidade Express 5.x)
    if (!req.body) {
        req.body = {};
    }

    // Para rotas de auth, é mais flexível - permite sem token em algumas situações
    const isLoginRoute = req.path.includes('/login') || req.path.includes('/signup');

    if (isLoginRoute) {
        // Login/signup podem prosseguir sem CSRF em desenvolvimento
        if (process.env.NODE_ENV !== 'production') {
            return next();
        }
    }

    const token = extractToken(req);
    const sessionId = resolveSessionId(req);

    if (!validateCSRFToken(token, sessionId)) {
        return res.status(403).json({
            error: 'Token CSRF inválido ou expirado',
            code: 'CSRF_TOKEN_INVALID'
        });
    }

    next();
};

/**
 * Endpoint para obter token CSRF
 */
export const getCSRFToken = (req, res) => {
    const token = generateCSRFToken(resolveSessionId(req));

    res.json({ csrfToken: token, expiresIn: TOKEN_TTL_MS });
};
