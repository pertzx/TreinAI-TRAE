/**
 * Utilitário para gerenciar cookies de forma segura
 */

/**
 * Define um cookie com configurações de segurança
 * @param {string} name - Nome do cookie
 * @param {string} value - Valor do cookie
 * @param {Object} options - Opções do cookie
 * @param {number} options.days - Dias até expirar (padrão: 7)
 * @param {boolean} options.secure - Se deve usar HTTPS (padrão: true em produção)
 * @param {boolean} options.httpOnly - Se deve ser httpOnly (padrão: false para JS access)
 * @param {string} options.sameSite - Política SameSite (padrão: 'Strict')
 * @param {string} options.path - Caminho do cookie (padrão: '/')
 */
export const setCookie = (name, value, options = {}) => {
  const {
    days = 7,
    secure = window.location.protocol === 'https:',
    httpOnly = false,
    sameSite = 'Strict',
    path = '/'
  } = options;

  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  
  // Adicionar data de expiração
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    cookieString += `; expires=${date.toUTCString()}`;
  }
  
  // Adicionar path
  cookieString += `; path=${path}`;
  
  // Adicionar SameSite
  cookieString += `; SameSite=${sameSite}`;
  
  // Adicionar Secure se necessário
  if (secure) {
    cookieString += '; Secure';
  }
  
  // HttpOnly não pode ser definido via JavaScript
  // É definido apenas pelo servidor
  
  document.cookie = cookieString;
};

/**
 * Obtém o valor de um cookie
 * @param {string} name - Nome do cookie
 * @returns {string|null} - Valor do cookie ou null se não encontrado
 */
export const getCookie = (name) => {
  const nameEQ = encodeURIComponent(name) + '=';
  const cookies = document.cookie.split(';');
  
  for (let cookie of cookies) {
    let c = cookie.trim();
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length));
    }
  }
  
  return null;
};

/**
 * Remove um cookie
 * @param {string} name - Nome do cookie
 * @param {string} path - Caminho do cookie (padrão: '/')
 */
export const removeCookie = (name, path = '/') => {
  setCookie(name, '', { days: -1, path });
};

/**
 * Verifica se um cookie existe
 * @param {string} name - Nome do cookie
 * @returns {boolean} - True se o cookie existe
 */
export const hasCookie = (name) => {
  return getCookie(name) !== null;
};

/**
 * Remove todos os cookies do domínio atual
 * ATENÇÃO: Esta função remove TODOS os cookies
 */
export const clearAllCookies = () => {
  const cookies = document.cookie.split(';');
  
  for (let cookie of cookies) {
    const eqPos = cookie.indexOf('=');
    const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
    
    if (name) {
      // Tentar remover com diferentes paths
      removeCookie(name, '/');
      removeCookie(name, '');
      
      // Remover também com domínio
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${window.location.hostname}`;
    }
  }
};

/**
 * Configurações específicas para tokens de autenticação
 */
export const authCookieConfig = {
  // Token de autenticação - mais restritivo
  token: {
    days: 7,
    secure: window.location.protocol === 'https:',
    sameSite: 'Strict',
    path: '/'
  },
  
  // CSRF Token - menos restritivo para permitir acesso via JS
  csrf: {
    days: 1,
    secure: window.location.protocol === 'https:',
    sameSite: 'Strict',
    path: '/'
  },
  
  // Preferências do usuário - longa duração
  preferences: {
    days: 365,
    secure: false, // Pode ser HTTP para preferências
    sameSite: 'Lax',
    path: '/'
  }
};

/**
 * Funções específicas para autenticação
 */
export const authCookies = {
  // Token de autenticação
  setToken: (token) => setCookie('auth_token', token, authCookieConfig.token),
  getToken: () => getCookie('auth_token'),
  removeToken: () => removeCookie('auth_token'),
  
  // CSRF Token
  setCsrfToken: (token) => setCookie('csrf_token', token, authCookieConfig.csrf),
  getCsrfToken: () => getCookie('csrf_token'),
  removeCsrfToken: () => removeCookie('csrf_token'),
  
  // CSRF Token Expiry
  setCsrfExpiry: (expiry) => setCookie('csrf_expiry', expiry.toString(), authCookieConfig.csrf),
  getCsrfExpiry: () => {
    const expiry = getCookie('csrf_expiry');
    return expiry ? parseInt(expiry, 10) : null;
  },
  removeCsrfExpiry: () => removeCookie('csrf_expiry'),
  
  // Limpar todos os cookies de autenticação
  clearAuth: () => {
    authCookies.removeToken();
    authCookies.removeCsrfToken();
    authCookies.removeCsrfExpiry();
  }
};

export default {
  setCookie,
  getCookie,
  removeCookie,
  hasCookie,
  clearAllCookies,
  authCookies,
  authCookieConfig
};