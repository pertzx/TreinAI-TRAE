import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';
import path from 'path';
import { createError, asyncHandler } from '../middlewares/errorHandler.js';
import { optimizeMedia, generateImageVariants as generateImageVariantsOptimizer } from '../middlewares/uploadOptimizer.js';
import { validateUploadedFile } from '../middlewares/uploadValidation.js';

/**
 * Serviço centralizado para gerenciamento de uploads
 * Arquitetura escalável com suporte a múltiplos provedores de armazenamento
 */

/**
 * Configuração do ambiente
 */
const isServerless = process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME;
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Configuração do Cloudinary (lazy loading)
 */
let cloudinaryConfigured = false;

const configureCloudinary = () => {
  if (!cloudinaryConfigured && process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });
    cloudinaryConfigured = true;
  }
  return cloudinaryConfigured;
};

/**
 * Interface para provedores de armazenamento
 */
class StorageProvider {
  async upload(file, options) {
    throw new Error('Método upload deve ser implementado');
  }
  
  async delete(publicId) {
    throw new Error('Método delete deve ser implementado');
  }
  
  async getUrl(publicId, options) {
    throw new Error('Método getUrl deve ser implementado');
  }
}

/**
 * Provedor Cloudinary
 */
class CloudinaryProvider extends StorageProvider {
  constructor() {
    super();
    this.configured = configureCloudinary();
  }
  
  async upload(file, options = {}) {
    if (!this.configured) {
      throw createError('Cloudinary não configurado', 'CLOUDINARY_NOT_CONFIGURED', 500);
    }
    
    try {
      const uploadOptions = {
        folder: options.folder || 'uploads',
        resource_type: options.resourceType || 'auto',
        public_id: options.publicId,
        overwrite: options.overwrite || false,
        unique_filename: options.uniqueFilename !== false,
        use_filename: options.useFilename || false,
        ...options.cloudinaryOptions
      };
      
      // Otimizações específicas para imagens
      if (file.mimetype?.startsWith('image/')) {
        uploadOptions.transformation = [
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
          ...(options.transformations || [])
        ];
      }
      
      const result = await cloudinary.uploader.upload(file.path || file.buffer, uploadOptions);
      
      return {
        publicId: result.public_id,
        url: result.secure_url,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        resourceType: result.resource_type,
        createdAt: result.created_at,
        provider: 'cloudinary'
      };
      
    } catch (error) {
      console.error('Erro no upload Cloudinary:', error);
      throw createError('Erro no serviço de armazenamento', 'CLOUDINARY_UPLOAD_ERROR', 500);
    }
  }
  
  async delete(publicId) {
    if (!this.configured) {
      throw createError('Cloudinary não configurado', 'CLOUDINARY_NOT_CONFIGURED', 500);
    }
    
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      console.error('Erro ao deletar do Cloudinary:', error);
      throw createError('Erro ao deletar arquivo', 'CLOUDINARY_DELETE_ERROR', 500);
    }
  }
  
  async getUrl(publicId, options = {}) {
    if (!this.configured) {
      return null;
    }
    
    return cloudinary.url(publicId, {
      secure: true,
      ...options
    });
  }
}

/**
 * Provedor Local (para desenvolvimento)
 */
class LocalProvider extends StorageProvider {
  constructor() {
    super();
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadDir();
  }
  
  async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }
  
  async upload(file, options = {}) {
    try {
      await this.ensureUploadDir();
      
      const filename = options.filename || file.filename || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const filepath = path.join(this.uploadDir, filename);
      
      // Se o arquivo já está no disco (Multer), mover
      if (file.path) {
        await fs.rename(file.path, filepath);
      } else if (file.buffer) {
        await fs.writeFile(filepath, file.buffer);
      } else {
        throw createError('Arquivo inválido para upload local', 'INVALID_FILE', 400);
      }
      
      const stats = await fs.stat(filepath);
      
      return {
        publicId: filename,
        url: `/uploads/${filename}`,
        localPath: filepath,
        bytes: stats.size,
        createdAt: stats.birthtime,
        provider: 'local'
      };
      
    } catch (error) {
      console.error('Erro no upload local:', error);
      throw createError('Erro ao salvar arquivo localmente', 'LOCAL_UPLOAD_ERROR', 500);
    }
  }
  
  async delete(publicId) {
    try {
      const filepath = path.join(this.uploadDir, publicId);
      await fs.unlink(filepath);
      return true;
    } catch (error) {
      console.error('Erro ao deletar arquivo local:', error);
      return false;
    }
  }
  
  async getUrl(publicId, options = {}) {
    return `/uploads/${publicId}`;
  }
}

/**
 * Factory para provedores de armazenamento
 */
class StorageFactory {
  static createProvider(type = 'auto') {
    if (type === 'auto') {
      // Em serverless ou produção, usar Cloudinary se configurado
      if ((isServerless || !isDevelopment) && process.env.CLOUDINARY_CLOUD_NAME) {
        return new CloudinaryProvider();
      }
      // Caso contrário, usar local
      return new LocalProvider();
    }
    
    switch (type) {
      case 'cloudinary':
        return new CloudinaryProvider();
      case 'local':
        return new LocalProvider();
      default:
        throw createError('Provedor de armazenamento não suportado', 'UNSUPPORTED_PROVIDER', 400);
    }
  }
}

/**
 * Serviço principal de upload
 */
class UploadService {
  constructor(providerType = 'auto') {
    this.provider = StorageFactory.createProvider(providerType);
    this.uploadHistory = new Map(); // Cache de uploads recentes
  }
  
  /**
   * Processa e faz upload de um arquivo
   * @param {Object} file - Arquivo do Multer
   * @param {Object} options - Opções de upload
   * @returns {Promise<Object>} - Resultado do upload
   */
  async uploadFile(file, options = {}) {
    try {
      // Validação avançada do arquivo
      if (options.enableValidation !== false) {
        await validateUploadedFile(file);
      }
      
      // Otimização de mídia se habilitada
      let processedFile = file;
      if (options.optimize !== false && file.mimetype?.startsWith('image/')) {
        const optimized = await optimizeMedia(file.buffer, file.mimetype, options.optimization);
        processedFile = {
          ...file,
          buffer: optimized.buffer,
          size: optimized.buffer.length,
          optimizationApplied: optimized.optimizationApplied
        };
      }
      
      // Upload para o provedor
      const uploadResult = await this.provider.upload(processedFile, options);
      
      // Salvar no histórico
      this.uploadHistory.set(uploadResult.publicId, {
        ...uploadResult,
        uploadedAt: new Date(),
        originalFile: {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size
        }
      });
      
      // Limpeza de arquivo temporário se necessário
      if (file.path && options.cleanup !== false) {
        try {
          await fs.unlink(file.path);
        } catch (cleanupError) {
          console.warn('Erro na limpeza de arquivo temporário:', cleanupError);
        }
      }
      
      return uploadResult;
      
    } catch (error) {
      // Limpeza em caso de erro
      if (file.path) {
        try {
          await fs.unlink(file.path);
        } catch (cleanupError) {
          console.warn('Erro na limpeza após falha:', cleanupError);
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Faz upload de múltiplos arquivos
   * @param {Array} files - Array de arquivos
   * @param {Object} options - Opções de upload
   * @returns {Promise<Array>} - Resultados dos uploads
   */
  async uploadMultiple(files, options = {}) {
    const results = [];
    const errors = [];
    
    // Processar em paralelo com limite de concorrência
    const concurrency = options.concurrency || 3;
    const chunks = [];
    
    for (let i = 0; i < files.length; i += concurrency) {
      chunks.push(files.slice(i, i + concurrency));
    }
    
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (file, index) => {
        try {
          const result = await this.uploadFile(file, {
            ...options,
            folder: options.folder || `batch-${Date.now()}`
          });
          return { index: results.length + index, result, success: true };
        } catch (error) {
          return { index: results.length + index, error: error.message, success: false };
        }
      });
      
      const chunkResults = await Promise.allSettled(chunkPromises);
      
      chunkResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            results.push(result.value.result);
          } else {
            errors.push(result.value);
          }
        } else {
          errors.push({ error: result.reason.message, success: false });
        }
      });
    }
    
    return {
      successful: results,
      failed: errors,
      totalProcessed: files.length,
      successCount: results.length,
      errorCount: errors.length
    };
  }
  
  /**
   * Gera variantes de uma imagem
   * @param {Object} file - Arquivo de imagem
   * @param {Object} options - Opções de geração
   * @returns {Promise<Object>} - Variantes geradas
   */
  async generateVariants(file, options = {}) {
    try {
      if (!file.mimetype?.startsWith('image/')) {
        throw createError('Arquivo deve ser uma imagem', 'NOT_AN_IMAGE', 400);
      }
      
      const variants = await generateImageVariantsOptimizer(file.buffer, options);
      const uploadedVariants = {};
      
      for (const [variantName, variantData] of Object.entries(variants)) {
        const variantFile = {
          ...file,
          buffer: variantData.buffer,
          size: variantData.buffer.length,
          filename: `${variantName}-${file.filename || 'image'}`
        };
        
        const uploadResult = await this.provider.upload(variantFile, {
          ...options,
          folder: `${options.folder || 'uploads'}/variants`,
          publicId: `${options.basePublicId || 'image'}-${variantName}`
        });
        
        uploadedVariants[variantName] = {
          ...uploadResult,
          metadata: variantData.metadata,
          optimizationApplied: variantData.optimizationApplied
        };
      }
      
      return uploadedVariants;
      
    } catch (error) {
      console.error('Erro na geração de variantes:', error);
      throw error;
    }
  }
  
  /**
   * Deleta um arquivo
   * @param {string} publicId - ID público do arquivo
   * @returns {Promise<boolean>} - Sucesso da operação
   */
  async deleteFile(publicId) {
    try {
      const success = await this.provider.delete(publicId);
      
      if (success) {
        this.uploadHistory.delete(publicId);
      }
      
      return success;
    } catch (error) {
      console.error('Erro ao deletar arquivo:', error);
      throw error;
    }
  }
  
  /**
   * Obtém URL de um arquivo
   * @param {string} publicId - ID público do arquivo
   * @param {Object} options - Opções de URL
   * @returns {Promise<string>} - URL do arquivo
   */
  async getFileUrl(publicId, options = {}) {
    return await this.provider.getUrl(publicId, options);
  }
  
  /**
   * Obtém informações de um upload
   * @param {string} publicId - ID público do arquivo
   * @returns {Object|null} - Informações do upload
   */
  getUploadInfo(publicId) {
    return this.uploadHistory.get(publicId) || null;
  }
  
  /**
   * Limpa histórico de uploads antigos
   * @param {number} maxAge - Idade máxima em milissegundos
   */
  cleanupHistory(maxAge = 24 * 60 * 60 * 1000) { // 24 horas padrão
    const now = Date.now();
    
    for (const [publicId, info] of this.uploadHistory.entries()) {
      if (now - info.uploadedAt.getTime() > maxAge) {
        this.uploadHistory.delete(publicId);
      }
    }
  }
}

// Instância singleton do serviço
const uploadService = new UploadService();

// Limpeza automática do histórico a cada hora
setInterval(() => {
  uploadService.cleanupHistory();
}, 60 * 60 * 1000);

/**
 * Funções de conveniência para uso direto
 */
export const uploadSingle = asyncHandler(async (file, options = {}) => {
  return await uploadService.uploadFile(file, options);
});

export const uploadMultiple = asyncHandler(async (files, options = {}) => {
  return await uploadService.uploadMultiple(files, options);
});

export const generateImageVariants = asyncHandler(async (file, options = {}) => {
  return await uploadService.generateVariants(file, options);
});

export const deleteUpload = asyncHandler(async (publicId) => {
  return await uploadService.deleteFile(publicId);
});

export const getUploadUrl = asyncHandler(async (publicId, options = {}) => {
  return await uploadService.getFileUrl(publicId, options);
});

export {
  UploadService,
  StorageFactory,
  CloudinaryProvider,
  LocalProvider
};

export default uploadService;