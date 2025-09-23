import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para incluir CSRF token automaticamente
api.interceptors.request.use(
  async (config) => {
    // Para métodos que modificam dados, incluir CSRF token
    if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
      const csrfToken = localStorage.getItem('csrfToken');
      
      if (csrfToken) {
        config.headers['x-csrf-token'] = csrfToken;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para lidar com erros de CSRF
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
        
        // Armazena novo token
        localStorage.setItem('csrfToken', newToken);
        localStorage.setItem('csrfTokenExpiry', Date.now() + tokenResponse.data.expiresIn);
        
        // Refaz a requisição original com novo token
        originalRequest.headers['x-csrf-token'] = newToken;
        return api(originalRequest);
        
      } catch (tokenError) {
        console.error('Falha ao renovar CSRF token:', tokenError);
        // Remove tokens inválidos
        localStorage.removeItem('csrfToken');
        localStorage.removeItem('csrfTokenExpiry');
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
