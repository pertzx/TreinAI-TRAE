// Utilitário para construir URLs de imagens do backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/**
 * Constrói a URL completa da imagem a partir do path relativo
 * @param {string} imagePath - Path relativo da imagem (ex: '/uploads/image-perfil/avatar.jpg')
 * @returns {string} - URL completa da imagem
 */
export const buildImageUrl = (imagePath, type = 'image') => {
  if (!imagePath) return null;
  
  // Se já é uma URL completa, retorna como está
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Se não começa com /, adiciona
  const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  
  return `https://res.cloudinary.com/dglkape35/${type}/upload/v1760751117${path}`;
};

/**
 * Extrai apenas o path relativo de uma URL completa
 * @param {string} fullUrl - URL completa da imagem
 * @returns {string} - Path relativo da imagem
 */
export const extractImagePath = (fullUrl) => {
  if (!fullUrl) return null;
  
  // Se já é um path relativo, retorna como está
  if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
    return fullUrl;
  }
  
  try {
    const url = new URL(fullUrl);
    return url.pathname;
  } catch (error) {
    console.warn('Erro ao extrair path da URL:', error);
    return fullUrl;
  }
};