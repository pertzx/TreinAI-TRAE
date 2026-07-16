import React, { createContext, useContext, useState, useEffect } from 'react';
import { authCookies } from '../utils/cookieUtils';
import api from '../Api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [needToPay, setNeedToPay] = useState(false);
  const [error, setError] = useState(null);

  // Verificar autenticação ao carregar
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const token = authCookies.getToken();

      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        return;
      }

      // Verificar se o token é válido fazendo uma requisição para o backend
      const response = await api.get('/pegar-user');

      if (response.data && response.data.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        setNeedToPay(response.data.user.planInfos?.status !== 'ativo');
      } else {
        // Token inválido, limpar
        authCookies.clearToken();
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      const status = error?.response?.status;
      const code = error?.response?.data?.code;
      // Apenas 401/403 com AUTH_INVALID deslogam de verdade.
      // Para outros erros (400 de parâmetros faltando, 5xx, rede, etc.)
      // NÃO limpamos o token: isso continua quebrando user em casos onde o
      // backend exige /pegar-user com userId/profissionalId e a chamada
      // inicial falha antes do token estar realmente inválido.
      console.error('Erro ao verificar autenticação:', error);
      if (status === 401 || (status === 403 && code === 'AUTH_INVALID')) {
        authCookies.clearToken();
        setIsAuthenticated(false);
        setUser(null);
      } else {
        // mantém estado atual
        setError(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.post('/login', credentials);
      
      if (response.data && response.data.token) {
        authCookies.setToken(response.data.token);
        // Store CSRF token if provided
        if (response.data.csrfToken) {
          authCookies.setCsrfToken(response.data.csrfToken);
        }
        await checkAuth(); // Recarregar dados do usuário
        return response.data;
      }
      
      throw new Error('Resposta de login inválida');
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authCookies.clearToken();
    setUser(null);
    setIsAuthenticated(false);
    setNeedToPay(false);
    setError(null);
  };

  const updateUser = (userData) => {
    setUser(prevUser => ({ ...prevUser, ...userData }));
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    needToPay,
    error,
    login,
    logout,
    checkAuth,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;