import rateLimit from 'express-rate-limit';

// Rate limiting geral para login
export const loginRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // máximo 10 tentativas por IP
    message: {
        error: "Muitas tentativas de login. Tente novamente em 15 minutos.",
        retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
});

// Rate limiting para registro
export const signupRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 15, // máximo 15 registros por IP por hora
    message: {
        error: "Muitas tentativas de registro. Tente novamente em 1 hora.",
        retryAfter: 60 * 60
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiting para uploads
export const uploadRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 50, // máximo 50 uploads por IP (aumentado para navegação normal)
    message: {
        error: "Muitos uploads. Tente novamente em 15 minutos.",
        retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiting para operações sensíveis (atualização de perfil, etc.)
export const sensitiveRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 operações por IP (aumentado para navegação normal)
    message: {
        error: "Muitas operações sensíveis. Tente novamente em 15 minutos.",
        retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiting para reset de senha
export const passwordResetRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3, // máximo 3 tentativas por hora
    message: {
        error: "Muitas tentativas de reset de senha. Tente novamente em 1 hora.",
        retryAfter: 60 * 60
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiting para rotas administrativas - muito restritivo
export const adminRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 200, // máximo 200 requisições por IP (aumentado para admin dashboard)
    message: {
        error: "Muitas requisições administrativas. Tente novamente em 15 minutos.",
        retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false
});