import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { getBrazilDate } from '../helpers/getBrazilDate.js';
import { errorHandler, asyncHandler, createError } from '../middlewares/errorHandler.js';
import { uploadToCloudinary } from '../config/cloudinaryConfig.js';
import { 
  createFileFilter, 
  validateUploadedFile, 
  cleanupOnError,
  UPLOAD_LIMITS,
  generateSecureFilename,
  SUPPORTED_FORMATS
} from '../middlewares/uploadValidation.js';

// ESM helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Detecta se está rodando em ambiente serverless
 */
const isServerless = () => {
  return !!(process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
};

/**
 * Processamento otimizado de imagens modernas
 * Suporta WebP, AVIF, JPEG e PNG
 */
const processImage = async (buffer, options = {}) => {
  try {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 85,
      format = 'webp' // Formato padrão moderno
    } = options;

    let processor = sharp(buffer, { failOnError: false })
      .rotate() // Auto-rotação baseada em EXIF
      .resize(maxWidth, maxHeight, { 
        fit: 'inside',
        withoutEnlargement: true 
      });

    // Aplicar formato específico
    switch (format) {
      case 'webp':
        processor = processor.webp({ quality, effort: 6 });
        break;
      case 'avif':
        processor = processor.avif({ quality, effort: 6 });
        break;
      case 'jpeg':
        processor = processor.jpeg({ quality, progressive: true });
        break;
      case 'png':
        processor = processor.png({ compressionLevel: 9 });
        break;
      default:
        processor = processor.webp({ quality, effort: 6 });
    }

    const processedBuffer = await processor.toBuffer();
    const metadata = await sharp(processedBuffer).metadata();

    return {
      buffer: processedBuffer,
      format: metadata.format,
      size: processedBuffer.length,
      width: metadata.width,
      height: metadata.height
    };
  } catch (error) {
    console.error('Erro no processamento da imagem:', error);
    throw new Error('Falha no processamento da imagem');
  }
};

/**
 * Configuração de storage adaptável para serverless e local
 */
const createStorage = (uploadPath = 'uploads') => {
  if (isServerless()) {
    // Em ambiente serverless, usar memoryStorage
    return multer.memoryStorage();
  }

  // Em ambiente local, usar diskStorage
  const fullPath = path.join(__dirname, '..', uploadPath);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }

  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, fullPath);
    },
    filename: (req, file, cb) => {
      const secureFilename = generateSecureFilename(file.originalname, file.mimetype);
      cb(null, secureFilename);
    }
  });
};

/**
 * Configuração simplificada de upload
 */
export const createUpload = (type = 'image', options = {}) => {
  const {
    maxFiles = 1,
    uploadPath = `uploads/${type}s`,
    processImages = true
  } = options;

  const allowedTypes = type === 'media' ? ['image', 'video'] : [type];
  const limits = UPLOAD_LIMITS[type] || UPLOAD_LIMITS.image;

  const upload = multer({
    storage: createStorage(uploadPath),
    fileFilter: createFileFilter(allowedTypes),
    limits: {
      fileSize: limits.fileSize,
      files: maxFiles
    }
  });

  // Middleware de processamento
  const processMiddleware = asyncHandler(async (req, res, next) => {
    if (!req.file && !req.files) return next();

    const files = req.files ? Object.values(req.files).flat() : [req.file];

    for (const file of files) {
      if (!file || !file.mimetype.startsWith('image/')) continue;
      
      if (processImages) {
        try {
          let buffer;
          
          if (isServerless()) {
            // Em ambiente serverless, usar buffer diretamente
            buffer = file.buffer;
            
            // Processar imagem
            const processed = await processImage(buffer, {
              format: file.mimetype === 'image/avif' ? 'avif' : 'webp'
            });

            // Upload para Cloudinary
             const cloudinaryResult = await uploadToCloudinary(
               processed.buffer, 
               uploadPath.replace('uploads/', ''),
               'image'
             );

            // Atualizar informações do arquivo
            file.cloudinaryUrl = cloudinaryResult.secure_url;
            file.cloudinaryPublicId = cloudinaryResult.public_id;
            file.path = cloudinaryResult.secure_url; // Para compatibilidade
            
          } else {
            // Em ambiente local, ler arquivo do disco
            buffer = fs.readFileSync(file.path);
            
            // Processar imagem
             const processed = await processImage(buffer, {
               format: file.mimetype === 'image/avif' ? 'avif' : 'webp'
             });

             // Salvar versão processada
             const processedPath = file.path.replace(/\.[^/.]+$/, '.webp');
             fs.writeFileSync(processedPath, processed.buffer);
             
             // Atualizar path do arquivo
             file.path = processedPath;
             file.filename = path.basename(processedPath);
          }
          
        } catch (error) {
          console.error('Erro no processamento de imagem:', error);
          // Em caso de erro, manter arquivo original
        }
      } else if (isServerless() && file.buffer) {
        // Para arquivos não processados em ambiente serverless, fazer upload direto
        try {
          const resourceType = file.mimetype.startsWith('video/') ? 'video' : 'image';
          const cloudinaryResult = await uploadToCloudinary(
            file.buffer, 
            uploadPath.replace('uploads/', ''),
            resourceType
          );

          // Atualizar informações do arquivo
          file.cloudinaryUrl = cloudinaryResult.secure_url;
          file.cloudinaryPublicId = cloudinaryResult.public_id;
          file.path = cloudinaryResult.secure_url; // Para compatibilidade
          
        } catch (error) {
          console.error('Erro no upload para Cloudinary:', error);
          throw createError(500, 'Erro no upload do arquivo');
        }
      }
    }

    next();
  });

  return {
    single: (fieldName) => [
      cleanupOnError,
      upload.single(fieldName),
      validateUploadedFile(allowedTypes),
      processMiddleware
    ],
    multiple: (fieldName, maxCount = maxFiles) => [
      cleanupOnError,
      upload.array(fieldName, maxCount),
      validateUploadedFile(allowedTypes),
      processMiddleware
    ]
  };
};

/**
 * Configurações pré-definidas para diferentes tipos de upload
 */
export const uploadImage = createUpload('image', {
  uploadPath: 'uploads/images',
  processImages: true
});

export const uploadVideo = createUpload('video', {
  uploadPath: 'uploads/videos',
  processImages: false
});

export const uploadMedia = createUpload('media', {
  uploadPath: 'uploads/media',
  processImages: true
});

export const uploadGallery = createUpload('image', {
  maxFiles: 10,
  uploadPath: 'uploads/gallery',
  processImages: true
});

/**
 * Upload para perfil (compatibilidade)
 */
export const uploadProfile = uploadImage;

/**
 * Upload para documentos (apenas imagens)
 */
export const uploadDocument = createUpload('image', {
  uploadPath: 'uploads/documents',
  processImages: false // Manter original para documentos
});

/**
 * Upload para anúncios (mídia mista)
 */
export const uploadMidiaAnuncio = (dir = 'uploads/midias-anuncio', fieldName = 'midia') => {
  const customUpload = createUpload('media', {
    uploadPath: dir.replace('uploads/', ''),
    processImages: true
  });
  
  return customUpload.single(fieldName);
};

// Exportações para compatibilidade
export { UPLOAD_LIMITS, SUPPORTED_FORMATS };

export default {
  createUpload,
  uploadImage,
  uploadVideo,
  uploadMedia,
  uploadGallery,
  uploadProfile,
  uploadDocument,
  uploadMidiaAnuncio,
  UPLOAD_LIMITS,
  SUPPORTED_FORMATS
};
