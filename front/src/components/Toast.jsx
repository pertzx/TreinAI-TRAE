import React, { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes, FaTimesCircle } from 'react-icons/fa';
import { getBrazilDate } from '../../helpers/getBrazilDate';

// Context para compartilhar o estado dos toasts
const ToastContext = createContext();

/**
 * Componente de Toast para notificações
 */
const Toast = ({
  message,
  type = 'info',
  duration = 5000,
  onClose,
  position = 'top-right',
  showCloseButton = true
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(true);

    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) {
        onClose();
      }
    }, 300);
  };

  if (!isVisible) return null;

  const typeConfig = {
    success: {
      icon: FaCheckCircle,
      bgColor: 'bg-gradient-to-r from-green-500 border border-green-500 to-green-600/30 ',
      textColor: 'text-white',
      borderColor: 'border-green-400',
    },
    error: {
      icon: FaTimesCircle,
      bgColor: 'bg-gradient-to-r from-red-500 border border-red-500 to-red-600/30 ',
      textColor: 'text-white', 
      borderColor: 'border-red-400',
    },
    warning: {
      icon: FaExclamationTriangle,
      bgColor: 'bg-gradient-to-r from-yellow-500 border border-yellow-500 to-yellow-600/30 ',
      textColor: 'text-white',
      borderColor: 'border-yellow-400',
    },
    info: {
      icon: FaInfoCircle,
      bgColor: 'bg-gradient-to-r from-blue-500 border border-blue-500 to-blue-600/30 ',
      textColor: 'text-white',
      borderColor: 'border-blue-400',
    }
  };

  const config = typeConfig[type] || typeConfig.info;
  const IconComponent = config.icon;

  // Position classes
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  };

  return (
    <div
      className={`
        ${config.bgColor} ${config.textColor} ${config.borderColor}
        max-w-sm w-full shadow-lg rounded-lg border-l-4
        p-4 transform transition-all duration-300 ease-in-out
        ${isAnimating ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        flex items-center space-x-3
        transition-all duration-300 ease-in-out
        backdrop-blur-sm pointer-events-auto m-0
      `}
    >
        <IconComponent className="text-xl flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium break-words">
            {message}
          </p>
        </div>

        {showCloseButton && (
          <button
            onClick={handleClose}
            className="flex-shrink-0 text-white hover:text-gray-200 transition-colors pointer-events-auto"
            aria-label="Fechar notificação"
          >
            <FaTimes className="text-sm" />
          </button>
        )}
      </div>
  );
};

/**
 * Provider para gerenciar o estado global dos toasts
 */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const toastTimeouts = useRef(new Map());
  const debounceTimeouts = useRef(new Map());

  // Função para gerar hash único baseado na mensagem e tipo
  const generateToastHash = useCallback((message, type) => {
    return `${type}-${message}`.replace(/\s+/g, '-').toLowerCase();
  }, []);

  // Função para limpar timeouts
  const clearToastTimeout = useCallback((id) => {
    if (toastTimeouts.current.has(id)) {
      clearTimeout(toastTimeouts.current.get(id));
      toastTimeouts.current.delete(id);
    }
  }, []);

  const clearDebounceTimeout = useCallback((hash) => {
    if (debounceTimeouts.current.has(hash)) {
      clearTimeout(debounceTimeouts.current.get(hash));
      debounceTimeouts.current.delete(hash);
    }
  }, []);

  const addToast = useCallback((message, type = 'info', options = {}) => {
    const hash = generateToastHash(message, type);
    
    // Verificar se já existe um toast com a mesma mensagem e tipo
    const existingToast = toasts.find(toast => toast.hash === hash);
    
    if (existingToast) {
      // Se já existe, apenas atualiza o timestamp para "renovar" o toast
      clearToastTimeout(existingToast.id);
      
      const duration = options.duration || 5000;
      if (duration > 0) {
        const timeoutId = setTimeout(() => {
          removeToast(existingToast.id);
        }, duration);
        toastTimeouts.current.set(existingToast.id, timeoutId);
      }
      
      return existingToast.id;
    }

    // Implementar debounce para evitar múltiplas chamadas rápidas
    clearDebounceTimeout(hash);
    
    const debounceTimeout = setTimeout(() => {
      const id = getBrazilDate() + Math.random();
      const toast = {
        id,
        hash,
        message,
        type,
        timestamp: getBrazilDate(),
        ...options
      };

      setToasts(prev => {
        // Verificar novamente se não foi adicionado durante o debounce
        const stillExists = prev.find(t => t.hash === hash);
        if (stillExists) {
          return prev;
        }
        return [...prev, toast];
      });

      // Auto-remove após duração especificada
      const duration = options.duration || 5000;
      if (duration > 0) {
        const timeoutId = setTimeout(() => {
          removeToast(id);
        }, duration);
        toastTimeouts.current.set(id, timeoutId);
      }
    }, 100); // Debounce de 100ms

    debounceTimeouts.current.set(hash, debounceTimeout);
    
    return hash; // Retorna o hash como identificador temporário
  }, [toasts, generateToastHash, clearToastTimeout, clearDebounceTimeout]);

  const removeToast = useCallback((id) => {
    clearToastTimeout(id);
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, [clearToastTimeout]);

  const clearAllToasts = useCallback(() => {
    // Limpar todos os timeouts
    toastTimeouts.current.forEach(timeout => clearTimeout(timeout));
    toastTimeouts.current.clear();
    debounceTimeouts.current.forEach(timeout => clearTimeout(timeout));
    debounceTimeouts.current.clear();
    
    setToasts([]);
  }, []);

  // Cleanup ao desmontar o componente
  useEffect(() => {
    return () => {
      toastTimeouts.current.forEach(timeout => clearTimeout(timeout));
      debounceTimeouts.current.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  const showSuccess = useCallback((message, options = {}) =>
    addToast(message, 'success', options), [addToast]);

  const showError = useCallback((message, options = {}) =>
    addToast(message, 'error', options), [addToast]);

  const showWarning = useCallback((message, options = {}) =>
    addToast(message, 'warning', options), [addToast]);

  const showInfo = useCallback((message, options = {}) =>
    addToast(message, 'info', options), [addToast]);

  const value = {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
};

/**
 * Hook para usar o contexto de toasts
 */
export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast deve ser usado dentro de um ToastProvider');
  }

  return context;
};

/**
 * Container de Toasts
 */
export const ToastContainer = ({ toasts, onRemoveToast, position = 'top-center' }) => {
  if (!toasts || toasts.length === 0) return null;

  // Position classes for the container
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  };

  // Define flex direction based on vertical position
  const isTop = position.includes('top');
  const flexDirection = isTop ? 'flex-col' : 'flex-col-reverse';

  return (
    <div className={`fixed ml-5 ${positionClasses[position]} z-50 pointer-events-none ${flexDirection} gap-3 max-w-sm`}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={0} // Controlado pelo hook
          position={position}
          onClose={() => {
            onRemoveToast(toast.id);
          }}
          showCloseButton={toast.showCloseButton !== false}
        />
      ))}
    </div>
  );
};

/**
 * Container Global de Toasts que usa o hook internamente
 */
export const GlobalToastContainer = ({ position = 'top-right' }) => {
  const { toasts, removeToast } = useToast();

  return (
    <ToastContainer
      toasts={toasts}
      onRemoveToast={removeToast}
      position={position}
    />
  );
};

export default Toast;