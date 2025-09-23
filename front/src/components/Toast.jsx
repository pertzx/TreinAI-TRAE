import React, { useState, useEffect } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes, FaTimesCircle } from 'react-icons/fa';

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
      if (onClose) onClose();
    }, 300);
  };

  if (!isVisible) return null;

  const typeConfig = {
    success: {
      icon: FaCheckCircle,
      bgColor: 'bg-green-500',
      textColor: 'text-white',
      borderColor: 'border-green-600'
    },
    error: {
      icon: FaTimesCircle,
      bgColor: 'bg-red-500',
      textColor: 'text-white',
      borderColor: 'border-red-600'
    },
    warning: {
      icon: FaExclamationTriangle,
      bgColor: 'bg-yellow-500',
      textColor: 'text-white',
      borderColor: 'border-yellow-600'
    },
    info: {
      icon: FaInfoCircle,
      bgColor: 'bg-blue-500',
      textColor: 'text-white',
      borderColor: 'border-blue-600'
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
        fixed z-50 max-w-sm w-full mx-auto
        ${positionClasses[position]}
        ${isAnimating ? 'animate-slide-in' : 'animate-slide-out'}
      `}
    >
      <div
        className={`
          ${config.bgColor} ${config.textColor} ${config.borderColor}
          border-l-4 p-4 rounded-lg shadow-lg
          flex items-center space-x-3
          transition-all duration-300 ease-in-out
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
            className="flex-shrink-0 text-white hover:text-gray-200 transition-colors"
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
 * Hook para gerenciar toasts
 */
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', options = {}) => {
    const id = Date.now() + Math.random();
    const toast = {
      id,
      message,
      type,
      ...options
    };

    setToasts(prev => [...prev, toast]);

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
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearAllToasts = () => {
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

  return {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};

/**
 * Container de Toasts
 */
export const ToastContainer = ({ toasts, onRemoveToast, position = 'top-right' }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={0} // Controlado pelo hook
          position={position}
          onClose={() => onRemoveToast(toast.id)}
          showCloseButton={toast.showCloseButton !== false}
        />
      ))}
    </div>
  );
};

export default Toast;