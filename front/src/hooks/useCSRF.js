import { useState, useEffect } from 'react';
import api from '../Api';
import { authCookies } from '../utils/cookieUtils';
import { getBrazilDate } from '../../helpers/getBrazilDate';

/**
 * Hook personalizado para gerenciar CSRF tokens
 * Automaticamente obtém e renova tokens quando necessário
 */
export const useCSRF = () => {
  const [csrfToken, setCsrfToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Obtém um novo CSRF token do servidor
   */
  const fetchCSRFToken = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/csrf-token');
      
      if (response.data && response.data.csrfToken) {
        setCsrfToken(response.data.csrfToken);
        // Log removido para evitar exposição de token CSRF

        // Fallback de 25 min caso o backend não informe expiresIn (evita
        // gravar NaN no cookie de expiração, que invalidava toda a lógica)
        const expiresIn = Number(response.data.expiresIn) || 25 * 60 * 1000;

        // Armazena em cookie para persistir entre recarregamentos
        authCookies.setCsrfToken(response.data.csrfToken);
        authCookies.setCsrfExpiry(getBrazilDate() + expiresIn);
        
        return response.data.csrfToken;
      }
    } catch (err) {
      console.error('Erro ao obter CSRF token:', err);
      setError('Falha ao obter token de segurança');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verifica se o token atual ainda é válido
   */
  const isTokenValid = () => {
    if (!csrfToken) return false;
    
    const expiry = authCookies.getCsrfExpiry();
    if (!expiry) return false;
    
    return getBrazilDate() < parseInt(expiry);
  };

  /**
   * Obtém um token válido (busca novo se necessário)
   */
  const getValidToken = async () => {
    if (isTokenValid()) {
      return csrfToken;
    }
    
    return await fetchCSRFToken();
  };

  /**
   * Limpa o token atual
   */
  const clearToken = () => {
    setCsrfToken(null);
    authCookies.removeCsrfToken();
    authCookies.removeCsrfExpiry();
  };

  // Inicialização do hook
  useEffect(() => {
    const initializeToken = async () => {
      // Tenta recuperar token do cookie
      const storedToken = authCookies.getCsrfToken();
      const storedExpiry = authCookies.getCsrfExpiry();
      
      if (storedToken && storedExpiry && getBrazilDate() < parseInt(storedExpiry)) {
        // Token armazenado ainda é válido
        setCsrfToken(storedToken);
        setLoading(false);
      } else {
        // Precisa buscar novo token
        await fetchCSRFToken();
      }
    };

    initializeToken();
  }, []);

  // Auto-renovação do token antes de expirar
  useEffect(() => {
    if (!csrfToken) return;

    const expiry = authCookies.getCsrfExpiry();
    if (!expiry) return;

    const timeUntilExpiry = parseInt(expiry) - getBrazilDate();
    const renewTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 1000); // Renova 5 min antes de expirar

    const timer = setTimeout(() => {
      fetchCSRFToken();
    }, renewTime);

    return () => clearTimeout(timer);
  }, [csrfToken]);

  return {
    csrfToken,
    loading,
    error,
    fetchCSRFToken,
    getValidToken,
    clearToken,
    isTokenValid
  };
};