import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../Api.js';
import { handleError, isAuthError } from '../utils/errorHandler.js';
import { useToast } from '../components/Toast';

// Criação do contexto de autenticação
const AuthContext = createContext();

// Hook personalizado para usar o contexto de autenticação
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

// Provider do contexto de autenticação
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [needToPay, setNeedToPay] = useState(false);
  const [error, setError] = useState(null);
  const { showError, showSuccess } = useToast();

  // Função para verificar autenticação
  const checkAuth = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/dashboard');
      
      if (response.data?.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        setNeedToPay(response.data.needToPay || false);
        return true;
      } else {
        setIsAuthenticated(false);
        setUser(null);
        return false;
      }
    } catch (error) {
      if (isAuthError(error)) {
        setIsAuthenticated(false);
        setUser(null);
        setNeedToPay(false);
      } else {
        // Para outros erros, mantém o estado atual e apenas loga
        const errorMessage = handleError(error, null, 'dashboard');
        setError(errorMessage);
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Função para fazer login
  const login = async (email, password) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/login', { email, password });
      
      if (response.data?.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        setNeedToPay(response.data.needToPay || false);
        showSuccess('Login realizado com sucesso!');
        return { success: true, user: response.data.user };
      } else {
        throw new Error('Resposta inválida do servidor');
      }
    } catch (error) {
      const errorMessage = handleError(error, showError, 'login');
      setError(errorMessage);
      setIsAuthenticated(false);
      setUser(null);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Função para fazer logout
  const logout = async () => {
    setIsLoading(true);
    
    try {
      await api.post('/logout');
      showSuccess('Logout realizado com sucesso!');
    } catch (error) {
      const errorMessage = handleError(error);
      showError('Erro ao fazer logout no servidor. Você foi desconectado localmente.');
      console.error('Logout server error:', error);
    } finally {
      // Sempre limpa o estado local
      setUser(null);
      setIsAuthenticated(false);
      setNeedToPay(false);
      setError(null);
      setIsLoading(false);
    }
  };

  // Função para atualizar dados do usuário
  const updateUser = (userData) => {
    setUser(prevUser => ({ ...prevUser, ...userData }));
  };

  // Verificar autenticação na inicialização
  useEffect(() => {
    checkAuth();
  }, []);

  // Valor do contexto
  const contextValue = {
    user,
    isAuthenticated,
    isLoading,
    needToPay,
    error,
    login,
    logout,
    checkAuth,
    updateUser,
    setNeedToPay,
    setError
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;