/**
 * Implementação nativa dos headers de segurança para substituir helmet
 * Fornece as mesmas funcionalidades de segurança sem dependência externa
 */

/**
 * Configuração padrão dos headers de segurança
 */
const defaultSecurityConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true
};

/**
 * Converte diretivas CSP em string
 */
const buildCSPString = (directives) => {
  return Object.entries(directives)
    .map(([key, values]) => {
      const directive = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      const valueString = Array.isArray(values) ? values.join(' ') : values;
      return `${directive} ${valueString}`;
    })
    .join('; ');
};

/**
 * Middleware nativo que replica funcionalidades do helmet
 */
const nativeHelmet = (options = {}) => {
  const config = { ...defaultSecurityConfig, ...options };
  
  return (req, res, next) => {
    // Content Security Policy
    if (config.contentSecurityPolicy && config.contentSecurityPolicy.directives) {
      const cspString = buildCSPString(config.contentSecurityPolicy.directives);
      res.setHeader('Content-Security-Policy', cspString);
    }
    
    // X-Frame-Options (Frameguard)
    if (config.frameguard) {
      const action = config.frameguard.action || 'deny';
      res.setHeader('X-Frame-Options', action.toUpperCase());
    }
    
    // X-Content-Type-Options (noSniff)
    if (config.noSniff) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
    
    // X-XSS-Protection
    if (config.xssFilter) {
      res.setHeader('X-XSS-Protection', '1; mode=block');
    }
    
    // Strict-Transport-Security (HSTS)
    if (config.hsts && process.env.NODE_ENV === 'production') {
      let hstsValue = `max-age=${config.hsts.maxAge}`;
      if (config.hsts.includeSubDomains) hstsValue += '; includeSubDomains';
      if (config.hsts.preload) hstsValue += '; preload';
      res.setHeader('Strict-Transport-Security', hstsValue);
    }
    
    // Referrer-Policy
    if (config.referrerPolicy) {
      const policy = config.referrerPolicy.policy || 'strict-origin-when-cross-origin';
      res.setHeader('Referrer-Policy', policy);
    }
    
    // X-DNS-Prefetch-Control
    if (config.dnsPrefetchControl) {
      res.setHeader('X-DNS-Prefetch-Control', 'off');
    }
    
    // Cross-Origin-Opener-Policy
    if (config.crossOriginOpenerPolicy) {
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    }
    
    // Cross-Origin-Resource-Policy
    if (config.crossOriginResourcePolicy) {
      const policy = config.crossOriginResourcePolicy.policy || 'cross-origin';
      res.setHeader('Cross-Origin-Resource-Policy', policy);
    }
    
    // Cross-Origin-Embedder-Policy
    if (config.crossOriginEmbedderPolicy) {
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    }
    
    // Origin-Agent-Cluster
    if (config.originAgentCluster) {
      res.setHeader('Origin-Agent-Cluster', '?1');
    }
    
    // X-Permitted-Cross-Domain-Policies
    if (config.permittedCrossDomainPolicies === false) {
      res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    }
    
    // Remove X-Powered-By
    if (config.hidePoweredBy) {
      res.removeHeader('X-Powered-By');
    }
    
    // Permissions Policy
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
    
    next();
  };
};

/**
 * Configurações específicas para diferentes contextos
 */
const helmetConfigs = {
  // Configuração padrão (equivalente ao helmet())
  default: () => nativeHelmet(),
  
  // Configuração para APIs
  api: () => nativeHelmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        scriptSrc: ["'none'"],
        styleSrc: ["'none'"],
        imgSrc: ["'none'"],
        connectSrc: ["'self'"],
        fontSrc: ["'none'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'none'"],
        frameSrc: ["'none'"],
      }
    }
  }),
  
  // Configuração para uploads
  upload: () => nativeHelmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        scriptSrc: ["'none'"],
        styleSrc: ["'none'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        fontSrc: ["'none'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      }
    }
  }),
  
  // Configuração para admin
  admin: () => nativeHelmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      }
    }
  })
};

/**
 * Função de compatibilidade com helmet
 */
const helmet = (options = {}) => {
  return nativeHelmet(options);
};

// Exportar funções individuais para compatibilidade
helmet.contentSecurityPolicy = (options) => nativeHelmet({ contentSecurityPolicy: options });
helmet.frameguard = (options) => nativeHelmet({ frameguard: options });
helmet.hsts = (options) => nativeHelmet({ hsts: options });
helmet.noSniff = () => nativeHelmet({ noSniff: true });
helmet.xssFilter = () => nativeHelmet({ xssFilter: true });
helmet.referrerPolicy = (options) => nativeHelmet({ referrerPolicy: options });

// Exportar como default e named exports
export default helmet;
export { 
  nativeHelmet, 
  helmetConfigs, 
  defaultSecurityConfig,
  buildCSPString 
};