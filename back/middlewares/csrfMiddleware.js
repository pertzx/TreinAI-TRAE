import crypto from 'crypto';
import { getBrazilDate } from '../helpers/getBrazilDate.js';

// Armazena tokens CSRF temporariamente (em produção, use Redis ou banco de dados)
const csrfTokens = new Map();

// Limpa tokens expirados a cada 30 minutos
setInterval(() => {
    const now = getBrazilDate();
    for (const [token, data] of csrfTokens.entries()) {
        if (now - data.createdAt > 30 * 60 * 1000) { // 30 minutos
            csrfTokens.delete(token);
        }
    }
}, 30 * 60 * 1000);

/**
 * Gera um token CSRF único
 * @param {string} sessionId - ID da sessão do usuário
 * @returns {string} Token CSRF
 */
export const generateCSRFToken = (sessionId) => {
    const token = crypto.randomBytes(32).toString('hex');
    csrfTokens.set(token, {
        sessionId,
        createdAt: getBrazilDate()
    });
    return token;
};

/**
 * Valida um token CSRF
 * @param {string} token - Token a ser validado
 * @param {string} sessionId - ID da sessão do usuário
 * @returns {boolean} True se válido
 */
export const validateCSRFToken = (token, sessionId) => {
    if (!token || !sessionId) return false;
    
    const tokenData = csrfTokens.get(token);
    if (!tokenData) return false;
    
    // Verifica se o token pertence à sessão correta
    if (tokenData.sessionId !== sessionId) return false;
    
    // Verifica se não expirou (30 minutos)
    const now = getBrazilDate();
    if (now - tokenData.createdAt > 30 * 60 * 1000) {
        csrfTokens.delete(token);
        return false;
    }
    
    return true;
};

/**
 * Middleware para gerar e fornecer token CSRF
 */
export const provideCSRFToken = (req, res, next) => {
    // Usa email do usuário como sessionId (ou poderia usar session ID real)
    const sessionId = req.userEmail || req.ip;
    const csrfToken = generateCSRFToken(sessionId);
    
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
    
    // Obtém token do header, body ou cookies
    const token = req.headers['x-csrf-token'] || 
                  req.headers['x-xsrf-token'] ||
                  (req.body && req.body._csrf) ||
                  (req.query && req.query._csrf) ||
                  (req.cookies && req.cookies['x-csrf-token']);
    
    const sessionId = req.userEmail || req.ip;
    
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
    
    // Obtém token do header, body ou cookies
    const token = req.headers['x-csrf-token'] || 
                  req.headers['x-xsrf-token'] ||
                  (req.body && req.body._csrf) ||
                  (req.query && req.query._csrf) ||
                  (req.cookies && req.cookies['x-csrf-token']);
    
    const sessionId = req.userEmail || req.ip;
    
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
    const sessionId = req.userEmail || req.ip;
    const token = generateCSRFToken(sessionId);
    
    res.json({ csrfToken: token });
};