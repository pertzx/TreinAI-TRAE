/**
 * Utilitário para retry automático de requisições API
 */

import { isRetryableError, getRetryDelay } from './errorHandler.js';

/**
 * Configurações padrão para retry
 */
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryCondition: isRetryableError,
  onRetry: null // Callback chamado antes de cada retry
};

/**
 * Implementa retry automático para requisições
 * @param {Function} apiCall - Função que faz a requisição (deve retornar Promise)
 * @param {Object} config - Configurações de retry
 * @returns {Promise} Promise da requisição com retry
 */
export const withRetry = async (apiCall, config = {}) => {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError;
  
  for (let attempt = 1; attempt <= retryConfig.maxRetries + 1; attempt++) {
    try {
      const result = await apiCall();
      return result;
    } catch (error) {
      lastError = error;
      
      // Se não é o último attempt e o erro é retryable
      if (attempt <= retryConfig.maxRetries && retryConfig.retryCondition(error)) {
        const delay = getRetryDelay(error, attempt);
        
        // Chama callback de retry se fornecido
        if (retryConfig.onRetry) {
          retryConfig.onRetry(error, attempt, delay);
        }
        
        console.warn(`[API RETRY] Attempt ${attempt} failed, retrying in ${delay}ms:`, {
          error: error.message,
          status: error.response?.status,
          code: error.response?.data?.code,
          url: error.config?.url,
          method: error.config?.method
        });
        
        // Aguarda o delay antes da próxima tentativa
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Se chegou aqui, não vai tentar novamente
      break;
    }
  }
  
  // Se chegou aqui, todas as tentativas falharam
  console.error(`[API RETRY] All ${retryConfig.maxRetries + 1} attempts failed:`, {
    finalError: lastError.message,
    status: lastError.response?.status,
    code: lastError.response?.data?.code,
    url: lastError.config?.url,
    method: lastError.config?.method
  });
  
  throw lastError;
};

/**
 * Cria um wrapper de retry para uma instância do axios
 * @param {Object} axiosInstance - Instância do axios
 * @param {Object} defaultConfig - Configurações padrão de retry
 * @returns {Object} Instância do axios com retry automático
 */
export const createRetryAxios = (axiosInstance, defaultConfig = {}) => {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...defaultConfig };
  
  // Interceptor de resposta para implementar retry
  axiosInstance.interceptors.response.use(
    // Sucesso - retorna a resposta normalmente
    (response) => response,
    
    // Erro - implementa retry logic
    async (error) => {
      const config = error.config;
      
      // Evita retry infinito
      if (!config || config.__retryCount >= retryConfig.maxRetries) {
        return Promise.reject(error);
      }
      
      // Verifica se o erro é retryable
      if (!retryConfig.retryCondition(error)) {
        return Promise.reject(error);
      }
      
      // Incrementa contador de retry
      config.__retryCount = (config.__retryCount || 0) + 1;
      
      const delay = getRetryDelay(error, config.__retryCount);
      
      // Chama callback de retry se fornecido
      if (retryConfig.onRetry) {
        retryConfig.onRetry(error, config.__retryCount, delay);
      }
      
      console.warn(`[AXIOS RETRY] Attempt ${config.__retryCount} failed, retrying in ${delay}ms:`, {
        error: error.message,
        status: error.response?.status,
        code: error.response?.data?.code,
        url: config.url,
        method: config.method
      });
      
      // Aguarda o delay e tenta novamente
      await new Promise(resolve => setTimeout(resolve, delay));
      return axiosInstance(config);
    }
  );
  
  return axiosInstance;
};

/**
 * Configurações específicas para diferentes tipos de operação
 */
export const RETRY_CONFIGS = {
  // Login/Signup - retry mais conservador
  auth: {
    maxRetries: 2,
    retryCondition: (error) => {
      // Só retry para erros de rede e servidor, não para credenciais inválidas
      const status = error.response?.status;
      return !error.response || status >= 500;
    }
  },
  
  // Dashboard/API calls - retry mais agressivo
  api: {
    maxRetries: 3,
    retryCondition: isRetryableError
  },
  
  // Uploads/Downloads - retry com delay maior
  upload: {
    maxRetries: 5,
    baseDelay: 2000,
    maxDelay: 30000,
    retryCondition: (error) => {
      const status = error.response?.status;
      // Retry para erros de rede, timeout e alguns erros de servidor
      return !error.response || status === 408 || status >= 500;
    }
  },
  
  // Operações críticas - sem retry automático
  critical: {
    maxRetries: 0
  }
};

/**
 * Helper para criar funções de API com retry específico
 * @param {Function} apiFunction - Função da API original
 * @param {string} retryType - Tipo de retry (auth, api, upload, critical)
 * @returns {Function} Função com retry aplicado
 */
export const withRetryConfig = (apiFunction, retryType = 'api') => {
  const config = RETRY_CONFIGS[retryType] || RETRY_CONFIGS.api;
  
  return async (...args) => {
    return withRetry(() => apiFunction(...args), config);
  };
};

/**
 * Utilitário para cancelar requisições em andamento
 */
export class RequestCanceller {
  constructor() {
    this.controllers = new Map();
  }
  
  /**
   * Cria um AbortController para uma requisição
   * @param {string} key - Chave única para a requisição
   * @returns {AbortController}
   */
  createController(key) {
    // Cancela requisição anterior se existir
    this.cancel(key);
    
    const controller = new AbortController();
    this.controllers.set(key, controller);
    return controller;
  }
  
  /**
   * Cancela uma requisição específica
   * @param {string} key - Chave da requisição
   */
  cancel(key) {
    const controller = this.controllers.get(key);
    if (controller) {
      controller.abort();
      this.controllers.delete(key);
    }
  }
  
  /**
   * Cancela todas as requisições
   */
  cancelAll() {
    for (const controller of this.controllers.values()) {
      controller.abort();
    }
    this.controllers.clear();
  }
  
  /**
   * Remove um controller da lista (chamado quando requisição completa)
   * @param {string} key - Chave da requisição
   */
  remove(key) {
    this.controllers.delete(key);
  }
}

// Instância global do canceller
export const globalRequestCanceller = new RequestCanceller();