// utils/cloudinaryConfig.js
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

// Configuração do Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload de arquivo para Cloudinary
 * @param {string} filePath - Caminho do arquivo local (geralmente em /tmp)
 * @param {object} options - Opções de upload
 * @returns {Promise<object>} - Resultado do upload
 */
export const uploadToCloudinary = async (filePath, options = {}) => {
  try {
    console.log('[Cloudinary] Iniciando upload:', filePath);
    
    const defaultOptions = {
      resource_type: 'auto', // detecta automaticamente se é imagem ou vídeo
      folder: 'treinai-uploads', // pasta no Cloudinary
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      quality: 'auto:good',
      fetch_format: 'auto',
    };

    const uploadOptions = { ...defaultOptions, ...options };
    
    const result = await cloudinary.uploader.upload(filePath, uploadOptions);
    
    console.log('[Cloudinary] Upload concluído:', result.public_id);
    
    // Limpar arquivo temporário após upload bem-sucedido
    if (filePath.startsWith('/tmp/')) {
      try {
        await fs.promises.unlink(filePath);
        console.log('[Cloudinary] Arquivo temporário removido:', filePath);
      } catch (unlinkError) {
        console.warn('[Cloudinary] Erro ao remover arquivo temporário:', unlinkError.message);
      }
    }
    
    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      created_at: result.created_at,
    };
    
  } catch (error) {
    console.error('[Cloudinary] Erro no upload:', error);
    
    // Tentar limpar arquivo temporário mesmo em caso de erro
    if (filePath.startsWith('/tmp/')) {
      try {
        await fs.promises.unlink(filePath);
        console.log('[Cloudinary] Arquivo temporário removido após erro:', filePath);
      } catch (unlinkError) {
        console.warn('[Cloudinary] Erro ao remover arquivo temporário após falha:', unlinkError.message);
      }
    }
    
    throw new Error(`Erro no upload para Cloudinary: ${error.message}`);
  }
};

/**
 * Upload de buffer diretamente para Cloudinary (sem salvar em disco)
 * @param {Buffer} buffer - Buffer do arquivo
 * @param {object} options - Opções de upload
 * @returns {Promise<object>} - Resultado do upload
 */
export const uploadBufferToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const defaultOptions = {
      resource_type: 'auto',
      folder: 'treinai-uploads',
      use_filename: false,
      unique_filename: true,
      quality: 'auto:good',
      fetch_format: 'auto',
    };

    const uploadOptions = { ...defaultOptions, ...options };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('[Cloudinary] Erro no upload de buffer:', error);
          reject(new Error(`Erro no upload para Cloudinary: ${error.message}`));
        } else {
          console.log('[Cloudinary] Upload de buffer concluído:', result.public_id);
          resolve({
            success: true,
            url: result.secure_url,
            public_id: result.public_id,
            resource_type: result.resource_type,
            format: result.format,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
            created_at: result.created_at,
          });
        }
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Deletar arquivo do Cloudinary
 * @param {string} publicId - ID público do arquivo no Cloudinary
 * @param {string} resourceType - Tipo do recurso ('image', 'video', 'raw')
 * @returns {Promise<object>} - Resultado da deleção
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    console.log('[Cloudinary] Deletando arquivo:', publicId);
    
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    
    console.log('[Cloudinary] Arquivo deletado:', result);
    return result;
    
  } catch (error) {
    console.error('[Cloudinary] Erro ao deletar arquivo:', error);
    throw new Error(`Erro ao deletar arquivo do Cloudinary: ${error.message}`);
  }
};

/**
 * Middleware para upload automático para Cloudinary após processamento do multer
 * Usar após o middleware de upload do multer
 */
export const autoUploadToCloudinary = (folderName = 'treinai-uploads') => {
  return async (req, res, next) => {
    try {
      // Verificar se há arquivo e se precisa de upload para cloud
      if (!req.file || !req.file.needsCloudUpload) {
        return next();
      }

      console.log('[AutoUpload] Iniciando upload automático para Cloudinary');

      const uploadOptions = {
        folder: folderName,
        resource_type: req.file.mimetype.startsWith('video/') ? 'video' : 'image',
      };

      const cloudinaryResult = await uploadToCloudinary(req.file.path, uploadOptions);

      // Atualizar req.file com informações do Cloudinary
      req.file.cloudinary = cloudinaryResult;
      req.file.url = cloudinaryResult.url;
      req.file.public_id = cloudinaryResult.public_id;
      req.file.isTemporary = false; // Agora está permanentemente armazenado

      console.log('[AutoUpload] Upload automático concluído:', cloudinaryResult.url);
      next();

    } catch (error) {
      console.error('[AutoUpload] Erro no upload automático:', error);
      // Não bloquear a requisição, apenas logar o erro
      // O arquivo ainda estará disponível temporariamente em /tmp
      req.file.cloudinaryError = error.message;
      next();
    }
  };
};

export default cloudinary;