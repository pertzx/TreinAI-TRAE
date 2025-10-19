/**
 * Utilitário de validação de email nativo para substituir email-validator
 * Implementação robusta e segura sem dependências externas
 */

/**
 * Valida se uma string é um email válido
 * Implementação baseada em RFC 5322 com validações adicionais de segurança
 * @param {string} email - Email a ser validado
 * @returns {boolean} True se válido
 */
export const validate = (email) => {
  if (typeof email !== 'string') return false;
  
  // Verificações básicas
  if (!email || email.length === 0) return false;
  if (email.length > 254) return false; // RFC 5321 limit
  
  // Verificar se contém @ e apenas um @
  const atCount = (email.match(/@/g) || []).length;
  if (atCount !== 1) return false;
  
  const [localPart, domainPart] = email.split('@');
  
  // Validar parte local (antes do @)
  if (!isValidLocalPart(localPart)) return false;
  
  // Validar parte do domínio (depois do @)
  if (!isValidDomainPart(domainPart)) return false;
  
  return true;
};

/**
 * Valida a parte local do email (antes do @)
 * @param {string} localPart - Parte local do email
 * @returns {boolean} True se válida
 */
const isValidLocalPart = (localPart) => {
  if (!localPart || localPart.length === 0) return false;
  if (localPart.length > 64) return false; // RFC 5321 limit
  
  // Não pode começar ou terminar com ponto
  if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
  
  // Não pode ter pontos consecutivos
  if (localPart.includes('..')) return false;
  
  // Caracteres permitidos na parte local
  const localPartRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
  return localPartRegex.test(localPart);
};

/**
 * Valida a parte do domínio do email (depois do @)
 * @param {string} domainPart - Parte do domínio do email
 * @returns {boolean} True se válida
 */
const isValidDomainPart = (domainPart) => {
  if (!domainPart || domainPart.length === 0) return false;
  if (domainPart.length > 253) return false; // RFC 5321 limit
  
  // Não pode começar ou terminar com hífen ou ponto
  if (domainPart.startsWith('-') || domainPart.endsWith('-')) return false;
  if (domainPart.startsWith('.') || domainPart.endsWith('.')) return false;
  
  // Deve conter pelo menos um ponto (para ter TLD)
  if (!domainPart.includes('.')) return false;
  
  // Dividir em labels (partes separadas por ponto)
  const labels = domainPart.split('.');
  
  // Cada label deve ser válido
  for (const label of labels) {
    if (!isValidDomainLabel(label)) return false;
  }
  
  // O último label (TLD) deve ter pelo menos 2 caracteres
  const tld = labels[labels.length - 1];
  if (tld.length < 2) return false;
  
  return true;
};

/**
 * Valida um label do domínio
 * @param {string} label - Label do domínio
 * @returns {boolean} True se válido
 */
const isValidDomainLabel = (label) => {
  if (!label || label.length === 0) return false;
  if (label.length > 63) return false; // RFC 1035 limit
  
  // Não pode começar ou terminar com hífen
  if (label.startsWith('-') || label.endsWith('-')) return false;
  
  // Apenas letras, números e hífens
  const labelRegex = /^[a-zA-Z0-9-]+$/;
  return labelRegex.test(label);
};

/**
 * Normaliza um email removendo espaços e convertendo para minúsculas
 * @param {string} email - Email a ser normalizado
 * @returns {string} Email normalizado
 */
export const normalize = (email) => {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
};

/**
 * Extrai o domínio de um email
 * @param {string} email - Email
 * @returns {string|null} Domínio ou null se inválido
 */
export const getDomain = (email) => {
  if (!validate(email)) return null;
  return email.split('@')[1];
};

/**
 * Extrai a parte local de um email
 * @param {string} email - Email
 * @returns {string|null} Parte local ou null se inválido
 */
export const getLocalPart = (email) => {
  if (!validate(email)) return null;
  return email.split('@')[0];
};

/**
 * Verifica se um email pertence a um domínio específico
 * @param {string} email - Email a ser verificado
 * @param {string} domain - Domínio a ser comparado
 * @returns {boolean} True se pertence ao domínio
 */
export const isFromDomain = (email, domain) => {
  if (!validate(email) || typeof domain !== 'string') return false;
  const emailDomain = getDomain(email);
  return emailDomain === domain.toLowerCase();
};

/**
 * Lista de domínios temporários/descartáveis comuns para bloqueio
 */
const DISPOSABLE_DOMAINS = [
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'tempmail.org',
  'yopmail.com',
  'temp-mail.org',
  'throwaway.email'
];

/**
 * Verifica se um email é de um domínio temporário/descartável
 * @param {string} email - Email a ser verificado
 * @returns {boolean} True se for temporário
 */
export const isDisposable = (email) => {
  if (!validate(email)) return false;
  const domain = getDomain(email);
  return DISPOSABLE_DOMAINS.includes(domain);
};

// Exportar como objeto para compatibilidade com email-validator
export default {
  validate,
  normalize,
  getDomain,
  getLocalPart,
  isFromDomain,
  isDisposable
};