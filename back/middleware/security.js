const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');
const xss = require('xss');

// Rate limiting para diferentes endpoints
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.log(`Rate limit exceeded for IP: ${req.ip}, endpoint: ${req.path}`);
      res.status(429).json({ error: message });
    }
  });
};

// Rate limits específicos
const tokenRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutos
  10, // máximo 10 tentativas
  'Muitas tentativas de criação de local com token. Tente novamente em 15 minutos.'
);

const paymentRateLimit = createRateLimit(
  5 * 60 * 1000, // 5 minutos
  3, // máximo 3 tentativas
  'Muitas tentativas de pagamento. Tente novamente em 5 minutos.'
);

const generalRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutos
  100, // máximo 100 requests
  'Muitas requisições. Tente novamente em 15 minutos.'
);

// Validação e sanitização de entrada
const validateAndSanitize = {
  // Validar dados do local
  localData: (req, res, next) => {
    const { nome, descricao, endereco, cidade, estado, pais } = req.body;
    
    // Validações obrigatórias
    if (!nome || !validator.isLength(nome.trim(), { min: 2, max: 100 })) {
      return res.status(400).json({ 
        error: 'Nome deve ter entre 2 e 100 caracteres' 
      });
    }
    
    if (!descricao || !validator.isLength(descricao.trim(), { min: 10, max: 1000 })) {
      return res.status(400).json({ 
        error: 'Descrição deve ter entre 10 e 1000 caracteres' 
      });
    }
    
    if (!endereco || !validator.isLength(endereco.trim(), { min: 5, max: 200 })) {
      return res.status(400).json({ 
        error: 'Endereço deve ter entre 5 e 200 caracteres' 
      });
    }
    
    if (!cidade || !validator.isLength(cidade.trim(), { min: 2, max: 100 })) {
      return res.status(400).json({ 
        error: 'Cidade deve ter entre 2 e 100 caracteres' 
      });
    }
    
    if (!estado || !validator.isLength(estado.trim(), { min: 2, max: 100 })) {
      return res.status(400).json({ 
        error: 'Estado deve ter entre 2 e 100 caracteres' 
      });
    }
    
    if (!pais || !validator.isLength(pais.trim(), { min: 2, max: 100 })) {
      return res.status(400).json({ 
        error: 'País deve ter entre 2 e 100 caracteres' 
      });
    }
    
    // Sanitizar dados
    req.body.nome = xss(nome.trim());
    req.body.descricao = xss(descricao.trim());
    req.body.endereco = xss(endereco.trim());
    req.body.cidade = xss(cidade.trim());
    req.body.estado = xss(estado.trim());
    req.body.pais = xss(pais.trim());
    
    next();
  },
  
  // Validar token
  token: (req, res, next) => {
    const { token } = req.body;
    
    if (!token || !validator.isUUID(token)) {
      return res.status(400).json({ 
        error: 'Token inválido' 
      });
    }
    
    next();
  },
  
  // Validar userId
  userId: (req, res, next) => {
    const userId = req.params.userId || req.body.userId;
    
    if (!userId || !validator.isMongoId(userId)) {
      return res.status(400).json({ 
        error: 'ID de usuário inválido' 
      });
    }
    
    next();
  }
};

// Validação de arquivos de imagem
const validateImageUpload = (req, res, next) => {
  if (!req.files || !req.files.imagem) {
    return res.status(400).json({ 
      error: 'Imagem é obrigatória' 
    });
  }
  
  const imagem = req.files.imagem;
  
  // Validar tipo de arquivo
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(imagem.mimetype)) {
    return res.status(400).json({ 
      error: 'Tipo de arquivo não permitido. Use JPEG, PNG ou WebP' 
    });
  }
  
  // Validar tamanho (máximo 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (imagem.size > maxSize) {
    return res.status(400).json({ 
      error: 'Imagem muito grande. Máximo 5MB' 
    });
  }
  
  // Validar dimensões básicas (se possível)
  if (imagem.size < 1024) { // Muito pequeno para ser uma imagem válida
    return res.status(400).json({ 
      error: 'Arquivo de imagem inválido' 
    });
  }
  
  next();
};

// Middleware de log de segurança
const securityLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log da requisição
  console.log(`[SECURITY] ${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip} - User-Agent: ${req.get('User-Agent')}`);
  
  // Interceptar resposta para log
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    
    if (res.statusCode >= 400) {
      console.log(`[SECURITY ERROR] ${new Date().toISOString()} - ${req.method} ${req.path} - Status: ${res.statusCode} - Duration: ${duration}ms - IP: ${req.ip}`);
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

// Configuração do Helmet para segurança
const helmetConfig = helmet({
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
  crossOriginEmbedderPolicy: false
});

module.exports = {
  tokenRateLimit,
  paymentRateLimit,
  generalRateLimit,
  validateAndSanitize,
  validateImageUpload,
  securityLogger,
  helmetConfig
};