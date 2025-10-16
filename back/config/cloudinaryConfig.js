import { v2 as cloudinary } from 'cloudinary';

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
 * @param {string} resourceType - Tipo do recurso ('image' ou 'video')
 * @returns {Promise<Object>} - Resultado do upload do Cloudinary
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
            resolve(result);
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
 * Extrai o public_id de uma URL do Cloudinary
 * @param {string} url - URL do Cloudinary
 * @returns {string|null} - Public ID ou null se não conseguir extrair
 */
export const extractPublicIdFromUrl = (url) => {
  try {
    if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) {
      return null;
    }

    // Exemplo de URL: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/treinai/image-perfil/filename.jpg
    const urlParts = url.split('/');
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
    console.error('Erro ao extrair public_id da URL:', error);
    return null;
  }
};

export default cloudinary;