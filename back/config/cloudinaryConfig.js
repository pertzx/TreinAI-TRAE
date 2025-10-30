import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

// Carregar variáveis de ambiente
dotenv.config();

// Configuração do Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Faz upload de um arquivo para o Cloudinary
 * @param {Buffer} buffer - Buffer do arquivo
 * @param {string} folder - Pasta no Cloudinary (ex: 'image-perfil', 'image-profissional')
 * @param {string} resourceType - Tipo do recurso ('image', 'video', 'raw')
 * @returns {Promise<Object>} - Resultado do upload com path e URL completa
 */
export const uploadToCloudinary = async (buffer, folder = 'uploads', resourceType = 'image') => {
  try {
    return new Promise((resolve, reject) => {
      const uploadOptions = {
        folder: `treinai/${folder}`,
        resource_type: resourceType,
        quality: 'auto:good',
        fetch_format: 'auto',
      };

      // Para imagens, adicionar transformações de otimização
      if (resourceType === 'image') {
        uploadOptions.transformation = [
          { width: 2000, height: 2000, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ];
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('Erro no upload para Cloudinary:', error);
            reject(error);
          } else {
            // Extrair apenas o path da URL do Cloudinary
            const fullUrl = result.secure_url;
            const pathMatch = fullUrl.match(/\/v\d+\/(.+)$/);
            const path = pathMatch ? pathMatch[1] : result.public_id;
            
            // Retornar objeto com path e URL completa para compatibilidade
            resolve({
              ...result,
              path: path, // Apenas o path para salvar no banco
              secure_url: fullUrl, // URL completa para compatibilidade temporária
              cloudinary_path: path // Path específico do Cloudinary
            });
          }
        }
      );

      uploadStream.end(buffer);
    });
  } catch (error) {
    console.error('Erro ao fazer upload para Cloudinary:', error);
    throw error;
  }
};

/**
 * Remove um arquivo do Cloudinary
 * @param {string} imageUrl - URL da imagem no Cloudinary
 * @returns {Promise<void>}
 */
export const deleteFromCloudinary = async (imageUrl) => {
  try {
    const publicId = extractPublicIdFromUrl(imageUrl);
    if (!publicId) {
      console.warn('Não foi possível extrair public_id da URL:', imageUrl);
      return;
    }

    const result = await cloudinary.uploader.destroy(publicId);
    console.log('Arquivo removido do Cloudinary:', publicId, result);
  } catch (error) {
    console.error('Erro ao remover arquivo do Cloudinary:', error);
    throw error;
  }
};

/**
 * Extrai o public_id de uma URL do Cloudinary ou de um path
 * @param {string} urlOrPath - URL completa do Cloudinary ou apenas o path
 * @returns {string|null} - Public ID ou null se não conseguir extrair
 */
export const extractPublicIdFromUrl = (urlOrPath) => {
  try {
    if (!urlOrPath || typeof urlOrPath !== 'string') {
      return null;
    }

    // Se for apenas um path (não contém cloudinary.com)
    if (!urlOrPath.includes('cloudinary.com')) {
      // Assumir que é um path direto, remover apenas a extensão
      return urlOrPath.replace(/\.[^/.]+$/, '');
    }

    // Se for URL completa do Cloudinary
    // Exemplo de URL: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/treinai/image-perfil/filename.jpg
    const urlParts = urlOrPath.split('/');
    const uploadIndex = urlParts.findIndex(part => part === 'upload');
    
    if (uploadIndex === -1 || uploadIndex + 2 >= urlParts.length) {
      return null;
    }

    // Pegar tudo após 'upload/v{version}/'
    const pathAfterVersion = urlParts.slice(uploadIndex + 2).join('/');
    
    // Remover extensão do arquivo
    const publicId = pathAfterVersion.replace(/\.[^/.]+$/, '');
    
    return publicId;
  } catch (error) {
    console.error('Erro ao extrair public_id da URL/path:', error);
    return null;
  }
};

export default cloudinary;