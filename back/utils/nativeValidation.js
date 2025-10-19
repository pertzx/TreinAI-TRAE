/**
 * Utilitários de validação nativos para substituir validator.js
 * Implementações seguras e eficientes sem dependências externas
 */

/**
 * Valida se uma string tem comprimento dentro do intervalo especificado
 * @param {string} str - String a ser validada
 * @param {Object} options - Opções de validação {min, max}
 * @returns {boolean} True se válida
 */
export const isLength = (str, options = {}) => {
  if (typeof str !== 'string') return false;
  
  const len = str.length;
  const min = options.min || 0;
  const max = options.max || Infinity;
  
  return len >= min && len <= max;
};

/**
 * Valida se uma string é uma URL válida
 * @param {string} str - String a ser validada
 * @param {Object} options - Opções de validação
 * @returns {boolean} True se válida
 */
export const isURL = (str, options = {}) => {
  if (typeof str !== 'string') return false;
  
  try {
    const url = new URL(str);
    
    // Verificar protocolos permitidos
    if (options.protocols && !options.protocols.includes(url.protocol.slice(0, -1))) {
      return false;
    }
    
    // Verificar se protocolo é obrigatório
    if (options.require_protocol && !url.protocol) {
      return false;
    }
    
    // Validações básicas de URL
    return url.hostname.length > 0;
  } catch {
    return false;
  }
};

/**
 * Valida se uma string é um UUID válido (v4)
 * @param {string} str - String a ser validada
 * @returns {boolean} True se válida
 */
export const isUUID = (str) => {
  if (typeof str !== 'string') return false;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

/**
 * Valida se uma string é um MongoDB ObjectId válido
 * @param {string} str - String a ser validada
 * @returns {boolean} True se válida
 */
export const isMongoId = (str) => {
  if (typeof str !== 'string') return false;
  
  // MongoDB ObjectId tem 24 caracteres hexadecimais
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(str);
};

/**
 * Valida se uma string é um email válido
 * @param {string} str - String a ser validada
 * @returns {boolean} True se válida
 */
export const isEmail = (str) => {
  if (typeof str !== 'string') return false;
  
  // Regex básico para email (RFC 5322 simplificado)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(str);
};

/**
 * Escapa caracteres especiais HTML para prevenir XSS
 * @param {string} str - String a ser escapada
 * @returns {string} String escapada
 */
export const escape = (str) => {
  if (typeof str !== 'string') return '';
  
  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  
  return str.replace(/[&<>"'/]/g, (match) => htmlEscapes[match]);
};

/**
 * Valida se uma string contém apenas caracteres alfanuméricos
 * @param {string} str - String a ser validada
 * @param {string} locale - Locale para validação (padrão: 'en-US')
 * @returns {boolean} True se válida
 */
export const isAlphanumeric = (str, locale = 'en-US') => {
  if (typeof str !== 'string') return false;
  
  const alphanumericRegex = /^[a-zA-Z0-9]+$/;
  return alphanumericRegex.test(str);
};

/**
 * Valida se uma string é um número inteiro
 * @param {string} str - String a ser validada
 * @param {Object} options - Opções de validação {min, max}
 * @returns {boolean} True se válida
 */
export const isInt = (str, options = {}) => {
  if (typeof str !== 'string') return false;
  
  const num = parseInt(str, 10);
  if (isNaN(num) || num.toString() !== str) return false;
  
  if (options.min !== undefined && num < options.min) return false;
  if (options.max !== undefined && num > options.max) return false;
  
  return true;
};

/**
 * Valida se uma string é um número decimal
 * @param {string} str - String a ser validada
 * @param {Object} options - Opções de validação {min, max}
 * @returns {boolean} True se válida
 */
export const isFloat = (str, options = {}) => {
  if (typeof str !== 'string') return false;
  
  const num = parseFloat(str);
  if (isNaN(num)) return false;
  
  if (options.min !== undefined && num < options.min) return false;
  if (options.max !== undefined && num > options.max) return false;
  
  return true;
};

/**
 * Valida se uma string está em uma lista de valores permitidos
 * @param {string} str - String a ser validada
 * @param {Array} values - Array de valores permitidos
 * @returns {boolean} True se válida
 */
export const isIn = (str, values) => {
  if (typeof str !== 'string' || !Array.isArray(values)) return false;
  return values.includes(str);
};

/**
 * Remove espaços em branco do início e fim da string
 * @param {string} str - String a ser processada
 * @returns {string} String processada
 */
export const trim = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim();
};

/**
 * Normaliza uma string removendo acentos e caracteres especiais
 * @param {string} str - String a ser normalizada
 * @returns {string} String normalizada
 */
export const normalize = (str) => {
  if (typeof str !== 'string') return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

// Exportar todas as funções como um objeto para compatibilidade
export default {
  isLength,
  isURL,
  isUUID,
  isMongoId,
  isEmail,
  escape,
  isAlphanumeric,
  isInt,
  isFloat,
  isIn,
  trim,
  normalize
};