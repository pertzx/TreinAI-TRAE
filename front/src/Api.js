import axios from "axios";
import { createRetryAxios, RETRY_CONFIGS } from './utils/apiRetry.js';
import { authCookies } from './utils/cookieUtils.js';
import { getBrazilDate } from "../helpers/getBrazilDate.js";

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  withCredentials: true, // Habilita envio automático de cookies
  headers: {
    'Content-Type': 'application/json'
  }
});

// Função para limpar auth e redirecionar para login
const handleAuthFailure = () => {
  authCookies.clearAuth();
  // Usar replace para não adicionar ao histórico
  if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/signup')) {
    window.location.replace('/login');
  }
};

// Interceptor de request compartilhado: JWT via header (não depende de cookie
// cross-domain, que navegadores como Safari/iOS bloqueiam) + CSRF token
const attachAuthHeaders = (config) => {
  const token = authCookies.getToken();
  if (token && !config.headers['Authorization']) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

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
};

// Busca um CSRF token novo enviando as credenciais atuais, para o backend
// emitir o token vinculado ao usuário logado (e não a uma sessão anônima)
const fetchFreshCsrfToken = async () => {
  const token = authCookies.getToken();
  const tokenResponse = await axios.get(`${BASE_URL}/csrf-token`, {
    withCredentials: true,
    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
  });

  const newToken = tokenResponse.data.csrfToken;
  const expiresIn = Number(tokenResponse.data.expiresIn) || 25 * 60 * 1000;

  authCookies.setCsrfToken(newToken);
  authCookies.setCsrfExpiry(getBrazilDate() + expiresIn);

  return newToken;
};

// Interceptor de response compartilhado
const createResponseErrorHandler = (instance) => async (error) => {
  const originalRequest = error.config || {};
  const status = error.response?.status;
  const data = error.response?.data;

  // CSRF inválido/expirado: renovar o token e repetir UMA vez.
  // Isso NÃO é falha de autenticação — nunca deslogar o usuário por isso.
  if (status === 403 && data?.code === 'CSRF_TOKEN_INVALID') {
    if (!originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await fetchFreshCsrfToken();
        originalRequest.headers['x-csrf-token'] = newToken;
        return instance(originalRequest);
      } catch (tokenError) {
        console.error('Falha ao renovar CSRF token:', tokenError);
      }
    }
    return Promise.reject(error);
  }

  // Se erro 401/403 com AUTH_INVALID: não desloga forçado.
  // Apenas rejeita a promise. O AuthContext (via /pegar-user) é quem
  // decide se a sessão está realmente morta. Assim, um 403 de permissão
  // ou 401 transitório não derruba o usuário para /login do nada.
  if (status === 401) {
    return Promise.reject(error);
  }

  if (status === 403 && data?.code === 'AUTH_INVALID') {
    return Promise.reject(error);
  }

  return Promise.reject(error);
};

api.interceptors.request.use(attachAuthHeaders, (error) => Promise.reject(error));
api.interceptors.response.use((response) => response, createResponseErrorHandler(api));

// Aplica retry logic à instância principal da API
const apiWithRetry = createRetryAxios(api, RETRY_CONFIGS.api);

// Cria instâncias especializadas para diferentes contextos
const authApi = createRetryAxios(axios.create({
  baseURL: BASE_URL,
  timeout: 15000, // Timeout maior para auth
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
}), RETRY_CONFIGS.auth);

const uploadApi = createRetryAxios(axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // Timeout muito maior para uploads
  withCredentials: true,
  headers: {
    'Content-Type': 'multipart/form-data'
  }
}), RETRY_CONFIGS.upload);

const criticalApi = createRetryAxios(axios.create({
  baseURL: BASE_URL,
  timeout: 5000, // Timeout menor para operações críticas
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
}), RETRY_CONFIGS.critical);

// Aplica os mesmos interceptors às instâncias especializadas
[authApi, uploadApi, criticalApi].forEach(instance => {
  instance.interceptors.request.use(attachAuthHeaders, (error) => Promise.reject(error));
  instance.interceptors.response.use((response) => response, createResponseErrorHandler(instance));
});

// Exporta todas as instâncias da API
export { authApi, uploadApi, criticalApi };
export default apiWithRetry;
