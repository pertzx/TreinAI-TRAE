import { useState, useEffect } from 'react';
import api from '../Api';

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

        
        // Armazena no localStorage para persistir entre recarregamentos
        localStorage.setItem('csrfToken', response.data.csrfToken);
        localStorage.setItem('csrfTokenExpiry', Date.now() + response.data.expiresIn);
        
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
    
    const expiry = localStorage.getItem('csrfTokenExpiry');
    if (!expiry) return false;
    
    return Date.now() < parseInt(expiry);
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
    localStorage.removeItem('csrfToken');
    localStorage.removeItem('csrfTokenExpiry');
  };

  // Inicialização do hook
  useEffect(() => {
    const initializeToken = async () => {
      // Tenta recuperar token do localStorage
      const storedToken = localStorage.getItem('csrfToken');
      const storedExpiry = localStorage.getItem('csrfTokenExpiry');
      
      if (storedToken && storedExpiry && Date.now() < parseInt(storedExpiry)) {
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

    const expiry = localStorage.getItem('csrfTokenExpiry');
    if (!expiry) return;

    const timeUntilExpiry = parseInt(expiry) - Date.now();
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