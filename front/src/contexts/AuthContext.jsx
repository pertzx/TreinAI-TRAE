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
      console.error('Erro ao verificar autenticação:', error);
      authCookies.clearToken();
      setIsAuthenticated(false);
      setUser(null);
      setError(error.message);
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