import React from 'react';

/**
 * Componente de loading spinner reutilizável
 */
const LoadingSpinner = ({ 
  size = 'medium', 
  color = 'blue', 
  text = 'Carregando...', 
  fullScreen = false,
  className = '' 
}) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12',
    xlarge: 'h-16 w-16'
  };

  const colorClasses = {
    blue: 'text-blue-600',
    gray: 'text-gray-600',
    white: 'text-white',
    green: 'text-green-600',
    red: 'text-red-600'
  };

  const spinnerElement = (
    <div className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}>
      <svg 
        className="w-full h-full" 
        fill="none" 
        viewBox="0 0 24 24"
      >
        <circle 
          className="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4"
        />
        <path 
          className="opacity-75" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
        <div className="text-center">
          {spinnerElement}
          {text && (
            <p className={`mt-4 text-sm ${colorClasses[color]} font-medium`}>
              {text}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="text-center">
        {spinnerElement}
        {text && (
          <p className={`mt-2 text-sm ${colorClasses[color]} font-medium`}>
            {text}
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * Componente de loading inline (apenas spinner, sem texto)
 */
export const InlineSpinner = ({ size = 'small', color = 'blue', className = '' }) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-6 w-6',
    large: 'h-8 w-8'
  };

  const colorClasses = {
    blue: 'text-blue-600',
    gray: 'text-gray-600',
    white: 'text-white',
    green: 'text-green-600',
    red: 'text-red-600'
  };

  return (
    <div className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`}>
      <svg 
        className="w-full h-full" 
        fill="none" 
        viewBox="0 0 24 24"
      >
        <circle 
          className="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4"
        />
        <path 
          className="opacity-75" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
};

/**
 * Componente de loading para botões
 */
export const ButtonSpinner = ({ className = '' }) => {
  return (
    <InlineSpinner 
      size="small" 
      color="white" 
      className={`mr-2 ${className}`} 
    />
  );
};

export default LoadingSpinner;