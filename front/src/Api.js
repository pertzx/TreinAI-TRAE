import axios from "axios";
import { createRetryAxios, RETRY_CONFIGS } from './utils/apiRetry.js';
import { authCookies } from './utils/cookieUtils.js';
import { getBrazilDate } from "../helpers/getBrazilDate.js";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  timeout: 15000,
  withCredentials: true, // Habilita envio automático de cookies
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para incluir CSRF token automaticamente
api.interceptors.request.use(
  async (config) => {
    // Para métodos que modificam dados, incluir CSRF token
    if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
      const csrfToken = authCookies.getCsrfToken();
      
      if (csrfToken) {
        config.headers['x-csrf-token'] = csrfToken;
      }
    }
    
    // Se o data é FormData, remover Content-Type para permitir multipart/form-data
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// // Interceptor para lidar com erros de CSRF
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Se erro 403 com código CSRF_TOKEN_INVALID
    if (error.response?.status === 403 && 
        error.response?.data?.code === 'CSRF_TOKEN_INVALID' &&
        !originalRequest._retry) {
      
      originalRequest._retry = true;
      
      try {
        // Tenta obter novo token
        const tokenResponse = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/csrf-token`);
        const newToken = tokenResponse.data.csrfToken;
        
        // Armazena novo token em cookie
        authCookies.setCsrfToken(newToken);
        authCookies.setCsrfExpiry(getBrazilDate() + tokenResponse.data.expiresIn);
        
        // Refaz a requisição original com novo token
        originalRequest.headers['x-csrf-token'] = newToken;
        return api(originalRequest);
        
      } catch (tokenError) {
        console.error('Falha ao renovar CSRF token:', tokenError);
        // Remove tokens inválidos
        authCookies.removeCsrfToken();
        authCookies.removeCsrfExpiry();
      }
    }
    
    return Promise.reject(error);
  }
);

// Aplica retry logic à instância principal da API
const apiWithRetry = createRetryAxios(api, RETRY_CONFIGS.api);

// Cria instâncias especializadas para diferentes contextos
const authApi = createRetryAxios(axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  timeout: 15000, // Timeout maior para auth
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
}), RETRY_CONFIGS.auth);

const uploadApi = createRetryAxios(axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  timeout: 60000, // Timeout muito maior para uploads
  withCredentials: true,
  headers: {
    'Content-Type': 'multipart/form-data'
  }
}), RETRY_CONFIGS.upload);

const criticalApi = createRetryAxios(axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  timeout: 5000, // Timeout menor para operações críticas
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
}), RETRY_CONFIGS.critical);

// Aplica interceptors de CSRF às instâncias especializadas
[authApi, uploadApi, criticalApi].forEach(instance => {
  // Request interceptor para CSRF
  instance.interceptors.request.use(
    async (config) => {
      if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
        const csrfToken = authCookies.getCsrfToken();
        if (csrfToken) {
          config.headers['x-csrf-token'] = csrfToken;
        }
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor para CSRF
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      
      if (error.response?.status === 403 && 
          error.response?.data?.code === 'CSRF_TOKEN_INVALID' &&
          !originalRequest._retry) {
        
        originalRequest._retry = true;
        
        try {
          const tokenResponse = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/csrf-token`);
          const newToken = tokenResponse.data.csrfToken;
          
          authCookies.setCsrfToken(newToken);
          authCookies.setCsrfExpiry(getBrazilDate() + tokenResponse.data.expiresIn);
          
          originalRequest.headers['x-csrf-token'] = newToken;
          return instance(originalRequest);
          
        } catch (tokenError) {
          console.error('Falha ao renovar CSRF token:', tokenError);
          authCookies.removeCsrfToken();
          authCookies.removeCsrfExpiry();
        }
      }
      
      return Promise.reject(error);
    }
  );
});

// Exporta todas as instâncias da API
export { authApi, uploadApi, criticalApi };
export default apiWithRetry;
