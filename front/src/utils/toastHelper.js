/**
 * Helper para converter chamadas showToast antigas para o novo sistema
 */

export const createToastHelper = (toastFunctions) => {
  const { showSuccess, showError, showWarning, showInfo } = toastFunctions;
  
  return (message, type = 'info', options = {}) => {
    switch (type) {
      case 'success':
        return showSuccess(message, options);
      case 'error':
        return showError(message, options);
      case 'warning':
        return showWarning(message, options);
      case 'info':
      default:
        return showInfo(message, options);
    }
  };
};