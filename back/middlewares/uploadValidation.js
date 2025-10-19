import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

/**
 * Formatos modernos e seguros suportados
 * Baseado nas melhores práticas de 2024 para web
 */
export const SUPPORTED_FORMATS = {
  image: {
    // Formatos modernos com melhor compressão e segurança
    'image/webp': ['.webp'],     // Amplamente suportado, boa compressão
    'image/avif': ['.avif'],     // Melhor compressão, suporte crescente
    'image/jpeg': ['.jpg', '.jpeg'], // Fallback compatível
    'image/png': ['.png']        // Para transparência quando necessário
  },
  video: {
    // Formatos otimizados para web
    'video/webm': ['.webm'],     // Codec VP9/AV1, open source
    'video/mp4': ['.mp4']        // H.264/H.265, amplamente compatível
  }
};

/**
 * Limites de upload por tipo de arquivo
 */
export const UPLOAD_LIMITS = {
  image: {
    fileSize: 10 * 1024 * 1024,  // 10MB para imagens modernas
    files: 1
  },
  video: {
    fileSize: 50 * 1024 * 1024, // 50MB para vídeos
    files: 1
  },
  gallery: {
    fileSize: 10 * 1024 * 1024,  // 10MB por imagem
    files: 10                     // Múltiplas imagens
  }
};

/**
 * Sanitiza nome do arquivo
 */
export const sanitizeFilename = (filename) => {
  if (!filename) return 'file';
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 100) || 'file';
};

/**
 * Gera nome seguro para arquivo
 */
export const generateSecureFilename = (originalName, mimeType) => {
  const sanitizedName = sanitizeFilename(path.parse(originalName).name);
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(8).toString('hex');
  
  // Determina extensão baseada no MIME type
  let extension = '.bin';
  for (const [type, exts] of Object.entries({...SUPPORTED_FORMATS.image, ...SUPPORTED_FORMATS.video})) {
    if (type === mimeType) {
      extension = exts[0];
      break;
    }
  }
  
  return `${timestamp}_${randomBytes}_${sanitizedName}${extension}`;
};

/**
 * Filtro simplificado para upload
 */
export const createFileFilter = (allowedTypes = ['image']) => {
  return (req, file, cb) => {
    try {
      const isValidType = allowedTypes.some(type => {
        const formats = SUPPORTED_FORMATS[type];
        return formats && formats[file.mimetype];
      });

      if (!isValidType) {
        const allowedFormats = allowedTypes
          .flatMap(type => Object.keys(SUPPORTED_FORMATS[type] || {}))
          .join(', ');
        return cb(new Error(`Formato não suportado. Permitidos: ${allowedFormats}`), false);
      }

      cb(null, true);
    } catch (error) {
      cb(new Error('Erro na validação do arquivo'), false);
    }
  };
};

/**
 * Middleware de validação pós-upload
 */
export const validateUploadedFile = (allowedTypes = ['image']) => {
  return async (req, res, next) => {
    try {
      if (!req.file && !req.files) {
        return next();
      }

      const files = req.files ? Object.values(req.files).flat() : [req.file];
      
      for (const file of files) {
        if (!file) continue;

        // Validar tamanho baseado no tipo
        const fileType = allowedTypes.find(type => SUPPORTED_FORMATS[type][file.mimetype]);
        const limit = UPLOAD_LIMITS[fileType];
        
        if (limit && file.size > limit.fileSize) {
          throw new Error(`Arquivo muito grande. Máximo: ${Math.round(limit.fileSize / 1024 / 1024)}MB`);
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Cleanup em caso de erro
 */
export const cleanupOnError = (req, res, next) => {
  const originalSend = res.send;
  const originalJson = res.json;
  
  const cleanup = () => {
    if (req.file?.path) {
      ('fs').unlink(req.file.path, () => {});
    }
    if (req.files) {
      Object.values(req.files).flat().forEach(file => {
        if (file.path) {
          require('fs').unlink(file.path, () => {});
        }
      });
    }
  };

  res.send = function(data) {
    if (res.statusCode >= 400) cleanup();
    return originalSend.call(this, data);
  };

  res.json = function(data) {
    if (res.statusCode >= 400) cleanup();
    return originalJson.call(this, data);
  };

  next();
};

export default {
  createFileFilter,
  validateUploadedFile,
  cleanupOnError,
  UPLOAD_LIMITS,
  sanitizeFilename,
  generateSecureFilename,
  SUPPORTED_FORMATS
};