// Middleware de headers de segurança personalizado
// Implementação sem dependência do Helmet

/**
 * Middleware que adiciona headers de segurança essenciais
 */
export const securityHeaders = (req, res, next) => {
    // Previne ataques de clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Previne MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Habilita proteção XSS do navegador
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Força HTTPS em produção
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    
    // Content Security Policy restritiva
    const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' https://api.stripe.com https://checkout.stripe.com",
        "frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'"
    ].join('; ');
    
    res.setHeader('Content-Security-Policy', csp);
    
    // Referrer Policy - controla informações de referrer
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions Policy - controla APIs do navegador
    const permissionsPolicy = [
        'camera=()',
        'microphone=()',
        'geolocation=()',
        'payment=(self)',
        'usb=()',
        'magnetometer=()',
        'gyroscope=()',
        'accelerometer=()'
    ].join(', ');
    
    res.setHeader('Permissions-Policy', permissionsPolicy);
    
    // Remove header que expõe tecnologia do servidor
    res.removeHeader('X-Powered-By');
    
    // Adiciona header customizado para identificar API
    res.setHeader('X-API-Version', '1.0');
    
    next();
};

/**
 * Headers específicos para rotas de API
 */
export const apiSecurityHeaders = (req, res, next) => {
    // Cache control para APIs
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    next();
};

/**
 * Headers para upload de arquivos
 */
export const uploadSecurityHeaders = (req, res, next) => {
    // Limita tipos de conteúdo para uploads
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    
    // CSP mais restritiva para uploads
    res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'none'; object-src 'none';");
    
    next();
};

/**
 * Headers para rotas administrativas
 */
export const adminSecurityHeaders = (req, res, next) => {
    // Headers extras para rotas admin
    res.setHeader('X-Admin-Request', 'true');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    
    // CSP mais restritiva para admin
    const adminCSP = [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "connect-src 'self'",
        "font-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'"
    ].join('; ');
    
    res.setHeader('Content-Security-Policy', adminCSP);
    
    next();
};