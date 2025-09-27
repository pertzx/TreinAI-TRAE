import React, { useState, useEffect, createContext, useContext } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes, FaTimesCircle } from 'react-icons/fa';

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
    console.log('handleClose chamado');
    setIsAnimating(false);
    setTimeout(() => {
      console.log('Removendo toast após animação');
      setIsVisible(false);
      if (onClose) {
        console.log('Chamando onClose callback');
        onClose();
      }
    }, 300);
  };

  if (!isVisible) return null;

  const typeConfig = {
    success: {
      icon: FaCheckCircle,
      bgColor: 'bg-gradient-to-r from-green-500 to-green-600',
      textColor: 'text-white',
      borderColor: 'border-green-400',
      shadowColor: 'shadow-green-500/25'
    },
    error: {
      icon: FaTimesCircle,
      bgColor: 'bg-gradient-to-r from-red-500 to-red-600',
      textColor: 'text-white',
      borderColor: 'border-red-400',
      shadowColor: 'shadow-red-500/25'
    },
    warning: {
      icon: FaExclamationTriangle,
      bgColor: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
      textColor: 'text-white',
      borderColor: 'border-yellow-400',
      shadowColor: 'shadow-yellow-500/25'
    },
    info: {
      icon: FaInfoCircle,
      bgColor: 'bg-gradient-to-r from-blue-500 to-blue-600',
      textColor: 'text-white',
      borderColor: 'border-blue-400',
      shadowColor: 'shadow-blue-500/25'
    }
  };

  const config = typeConfig[type] || typeConfig.info;
  const IconComponent = config.icon;

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
        fixed z-50 max-w-full mx-2
        ${positionClasses[position]}
        ${isAnimating ? 'animate-slide-in' : 'animate-slide-out'}
      `}
    >
      <div
        className={`
          ${config.bgColor} ${config.textColor} ${config.borderColor} ${config.shadowColor}
          border-l-4 p-4 rounded-lg shadow-xl
          flex items-center space-x-3
          transition-all duration-300 ease-in-out
          backdrop-blur-sm pointer-events-auto
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
    </div>
  );
};

/**
 * Provider para gerenciar o estado global dos toasts
 */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', options = {}) => {
    console.log('addToast chamado:', { message, type, options });

    // Verificar se já existe um toast com a mesma mensagem e tipo
    const existingToast = toasts.find(toast =>
      toast.message === message && toast.type === type
    );

    if (existingToast) {
      console.log('Toast duplicado detectado, ignorando:', { message, type });
      return existingToast.id;
    }

    const id = Date.now() + Math.random();
    console.log('Criando novo toast:', { id, message, type, options });

    const toast = {
      id,
      message,
      type,
      ...options
    };

    setToasts(prev => {
      const newToasts = [...prev, toast];
      console.log('Atualizando toasts:', newToasts);
      return newToasts;
    });

    // Auto-remove após duração especificada
    const duration = options.duration || 5000;
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  };

  const removeToast = (id) => {
    console.log('Removendo toast:', id);
    setToasts(prev => {
      const filtered = prev.filter(toast => toast.id !== id);
      console.log('Toasts após remoção:', filtered);
      return filtered;
    });
  };

  const clearAllToasts = () => {
    console.log('Limpando todos os toasts');
    setToasts([]);
  };

  const showSuccess = (message, options = {}) =>
    addToast(message, 'success', options);

  const showError = (message, options = {}) =>
    addToast(message, 'error', options);

  const showWarning = (message, options = {}) =>
    addToast(message, 'warning', options);

  const showInfo = (message, options = {}) =>
    addToast(message, 'info', options);

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

  console.log('ToastProvider render, toasts atuais:', toasts);

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

  console.log('useToast chamado, toasts disponíveis:', context.toasts);
  return context;
};

/**
 * Container de Toasts
 */
export const ToastContainer = ({ toasts, onRemoveToast, position = 'top-right' }) => {
  if (!toasts || toasts.length === 0) return null;

  console.log('ToastContainer renderizando com toasts:', toasts);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={0} // Controlado pelo hook
          position={position}
          onClose={() => {
            console.log('Toast onClose chamado para ID:', toast.id);
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