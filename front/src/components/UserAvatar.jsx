import React from 'react';
import { buildImageUrl } from '../utils/imageUtils';

/**
 * Componente de Avatar do Usuário
 * Exibe o avatar do usuário ou iniciais como fallback
 * 
 * @param {Object} props
 * @param {Object} props.user - Dados do usuário (username, avatar)
 * @param {string} props.size - Tamanho do avatar ('small', 'medium', 'large')
 * @param {string} props.className - Classes CSS adicionais
 */

const UserAvatar = ({ user, size = 'medium', className = '' }) => {
  if (!user) return null;

  const { username, avatar } = user;
  
  // Definir tamanhos
  const sizeClasses = {
    small: 'w-6 h-6 text-xs',
    medium: 'w-8 h-8 text-sm',
    large: 'w-12 h-12 text-base'
  };

  const sizeClass = sizeClasses[size] || sizeClasses.medium;

  // Gerar iniciais do username
  const getInitials = (name) => {
    if (!name) return '?';
    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  };

  const initials = getInitials(username);

  // Gerar cor de fundo baseada no username
  const getBackgroundColor = (name) => {
    if (!name) return 'bg-gray-500';
    
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-yellow-500',
      'bg-teal-500'
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  const bgColor = getBackgroundColor(username);

  if (avatar && avatar.trim() !== '') {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden flex-shrink-0 ${className}`}>
        <img
          src={buildImageUrl(avatar)}
          alt={`Avatar de ${username}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Se a imagem falhar ao carregar, mostrar iniciais
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
        <div 
          className={`w-full h-full ${bgColor} text-white font-semibold rounded-full flex items-center justify-center`}
          style={{ display: 'none' }}
        >
          {initials}
        </div>
      </div>
    );
  }

  // Fallback para iniciais
  return (
    <div className={`${sizeClass} ${bgColor} text-white font-semibold rounded-full flex items-center justify-center flex-shrink-0 ${className}`}>
      {initials}
    </div>
  );
};

export default UserAvatar;