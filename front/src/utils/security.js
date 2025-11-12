import DOMPurify from 'dompurify';
import nativeValidator from './nativeValidation.js';

// Configuração do DOMPurify para sanitização segura
const purifyConfig = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM_IMPORT: false
};

/**
 * Sanitiza strings para prevenir XSS
 * @param {string} input - String a ser sanitizada
 * @returns {string} String sanitizada
 */
export const sanitizeString = (input) => {
  if (typeof input !== 'string') return '';
  return DOMPurify.sanitize(input, purifyConfig);
};

/**
 * Sanitiza dados de formulário de local
 * @param {Object} formData - Dados do formulário
 * @returns {Object} Dados sanitizados
 */
export const sanitizeLocalData = (formData) => {
  const sanitized = {};
  
  // Campos de texto que precisam de sanitização
  const textFields = ['localName', 'localDescricao', 'link', 'country', 'state', 'city'];
  
  textFields.forEach(field => {
    if (formData[field]) {
      sanitized[field] = sanitizeString(formData[field]);
    }
  });
  
  // Campos que não precisam de sanitização (IDs, tipos, etc.)
  const safeFields = ['localId', 'localType', 'countryCode', 'userId'];
  safeFields.forEach(field => {
    if (formData[field] !== undefined) {
      sanitized[field] = formData[field];
    }
  });
  
  // Preservar arquivo de imagem (File object)
  if (formData.image instanceof File) {
    sanitized.image = formData.image;
  }
  
  return sanitized;
};

/**
 * Valida dados de formulário de local
 * @param {Object} formData - Dados do formulário
 * @returns {Object} Objeto com isValid e errors
 */
export const validateLocalData = (formData) => {
  const errors = {};
  
  // Validação de nome do local
  if (!formData.localName || formData.localName.trim().length === 0) {
    errors.localName = 'Nome do local é obrigatório';
  } else if (formData.localName.length > 100) {
    errors.localName = 'Nome do local deve ter no máximo 100 caracteres';
  }
  
  // Validação de descrição
  if (!formData.localDescricao || formData.localDescricao.trim().length === 0) {
    errors.localDescricao = 'Descrição é obrigatória';
  } else if (formData.localDescricao.length > 500) {
    errors.localDescricao = 'Descrição deve ter no máximo 500 caracteres';
  }
  
  // Validação de link
  if (!formData.link || formData.link.trim().length === 0) {
    errors.link = 'Link é obrigatório';
  } else if (!nativeValidator.isURL(formData.link, { 
    protocols: ['http', 'https'],
    require_protocol: true 
  })) {
    errors.link = 'Link deve ser uma URL válida (http:// ou https://)';
  }
  
  // Validação de país
  if (!formData.country || formData.country.trim().length === 0) {
    errors.country = 'País é obrigatório';
  }
  
  // Validação de estado
  if (!formData.state || formData.state.trim().length === 0) {
    errors.state = 'Estado é obrigatório';
  }
  
  // Validação de cidade
  if (!formData.city || formData.city.trim().length === 0) {
    errors.city = 'Cidade é obrigatória';
  }
  
  // Validação de tipo de local
  const tiposPermitidos = [
    'academia',
    'consultorio-do-nutricionista',
    'clinica-de-fisioterapia',
    'loja',
    'outro'
  ];
  
  if (!formData.localType || !tiposPermitidos.includes(formData.localType)) {
    errors.localType = 'Tipo de local inválido';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Valida arquivo de imagem
 * @param {File} file - Arquivo a ser validado
 * @returns {Object} Objeto com isValid e error
 */
export const validateImageFile = (file) => {
  if (!file) {
    return { isValid: false, error: 'Nenhum arquivo selecionado' };
  }
  
  // Tipos permitidos
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { 
      isValid: false, 
      error: 'Tipo de arquivo não permitido. Use JPEG, PNG ou WebP' 
    };
  }
  
  // Tamanho máximo: 5MB
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return { 
      isValid: false, 
      error: 'Arquivo muito grande. Máximo 5MB' 
    };
  }
  
  return { isValid: true };
};

/**
 * Cria timeout para requisições
 * @param {number} ms - Tempo limite em milissegundos
 * @returns {AbortController} Controller para cancelar a requisição
 */
export const createRequestTimeout = (ms = 30000) => {
  const controller = new AbortController();
  
  setTimeout(() => {
    controller.abort();
  }, ms);
  
  return controller;
};

/**
 * Sanitiza dados antes de exibir na UI
 * @param {string} text - Texto a ser exibido
 * @returns {string} Texto sanitizado
 */
export const sanitizeForDisplay = (text) => {
  if (typeof text !== 'string') return '';
  
  // Remove tags HTML e sanitiza
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
};

/**
 * Valida ID de usuário
 * @param {string} userId - ID do usuário
 * @returns {boolean} True se válido
 */
export const validateUserId = (userId) => {
  if (!userId || typeof userId !== 'string') return false;
  
  // Verifica se é um ObjectId válido do MongoDB
  return nativeValidator.isMongoId(userId);
};

/**
 * Rate limiting simples no frontend
 */
class SimpleRateLimit {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }
  
  isAllowed(key) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const userRequests = this.requests.get(key);
    
    // Remove requisições antigas
    const validRequests = userRequests.filter(time => time > windowStart);
    this.requests.set(key, validRequests);
    
    // Verifica se pode fazer nova requisição
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Adiciona nova requisição
    validRequests.push(now);
    return true;
  }
}

// Instância global de rate limiting
export const tokenRateLimit = new SimpleRateLimit(5, 60000); // 5 requisições por minuto
export const paymentRateLimit = new SimpleRateLimit(3, 300000); // 3 pagamentos por 5 minutos
