import rateLimit from 'express-rate-limit';

// Configuração base para todos os rate limiters
const baseRateLimitConfig = {
  standardHeaders: true,
  legacyHeaders: false,
  // Configurações para resolver warnings de proxy
  validate: {
    xForwardedForHeader: false, // Desabilita warning para X-Forwarded-For
    forwardedHeader: false, // Desabilita warning para Forwarded header
    trustProxy: false // Desabilita warning de trust proxy
  }
};

// Rate limiting geral para login
export const loginRateLimit = rateLimit({
    ...baseRateLimitConfig,
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // máximo 10 tentativas por IP
    message: {
        error: "Muitas tentativas de login. Tente novamente em 15 minutos.",
        retryAfter: 15 * 60
    },
    skipSuccessfulRequests: true
});

// Rate limiting para registro
export const signupRateLimit = rateLimit({
    ...baseRateLimitConfig,
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 15, // máximo 15 registros por IP por hora
    message: {
        error: "Muitas tentativas de registro. Tente novamente em 1 hora.",
        retryAfter: 60 * 60
    }
});

// Rate limiting para uploads
export const uploadRateLimit = rateLimit({
    ...baseRateLimitConfig,
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 50, // máximo 50 uploads por IP (aumentado para navegação normal)
    message: {
        error: "Muitos uploads. Tente novamente em 15 minutos.",
        retryAfter: 15 * 60
    }
});

// Rate limiting para operações sensíveis (atualização de perfil, etc.)
export const sensitiveRateLimit = rateLimit({
    ...baseRateLimitConfig,
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 operações por IP (aumentado para navegação normal)
    message: {
        error: "Muitas operações sensíveis. Tente novamente em 15 minutos.",
        retryAfter: 15 * 60
    }
});

// Rate limiting para reset de senha
export const passwordResetRateLimit = rateLimit({
    ...baseRateLimitConfig,
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3, // máximo 3 tentativas por hora
    message: {
        error: "Muitas tentativas de reset de senha. Tente novamente em 1 hora.",
        retryAfter: 60 * 60
    }
});

// Rate limiting para rotas administrativas - muito restritivo
export const adminRateLimit = rateLimit({
    ...baseRateLimitConfig,
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 200, // máximo 200 requisições por IP (aumentado para admin dashboard)
    message: {
        error: "Muitas requisições administrativas. Tente novamente em 15 minutos.",
        retryAfter: 15 * 60
    }
});

// Rate limiting para geração de imagens (estrito)
export const imageGenerateRateLimit = rateLimit({
    ...baseRateLimitConfig,
    windowMs: parseInt(process.env.IMAGE_RATE_WINDOW_MS || `${5 * 60 * 1000}`), // 5 minutos por padrão
    max: parseInt(process.env.IMAGE_RATE_MAX || '3'), // máximo 3 por IP na janela
    keyGenerator: (req) => (String(req.userEmail || '').toLowerCase() || req.ip || 'unknown'),
    message: {
        error: "Muitas requisições de geração de imagens. Tente novamente mais tarde.",
        retryAfter: parseInt(process.env.IMAGE_RATE_WINDOW_MS || `${5 * 60 * 1000}`) / 1000
    }
});

// Rate limiting para busca de imagens (estrito)
export const imageFindRateLimit = rateLimit({
    ...baseRateLimitConfig,
    windowMs: parseInt(process.env.IMAGE_FIND_RATE_WINDOW_MS || `${5 * 60 * 1000}`), // 5 minutos por padrão
    max: parseInt(process.env.IMAGE_FIND_RATE_MAX || '100'), // máximo 100 por IP na janela
    keyGenerator: (req) => (req.ip || 'unknown'),
    message: {
        error: "Muitas requisições de busca de imagens. Tente novamente mais tarde.",
        retryAfter: parseInt(process.env.IMAGE_FIND_RATE_WINDOW_MS || `${5 * 60 * 1000}`) / 1000
    }
});