// lib/uploader.js
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { getBrazilDate } from '../helpers/getBrazilDate.js';
import { errorHandler, asyncHandler, createError } from '../middlewares/errorHandler.js';
import { 
  createAdvancedFileFilter, 
  validateUploadedFile, 
  cleanupOnError,
  UPLOAD_LIMITS,
  generateSecureFilename 
} from '../middlewares/uploadValidation.js';
import uploadService, { uploadSingle, uploadMultiple } from '../services/uploadService.js';

// ESM helpers para ter __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Função otimizada para processar imagem com configurações avançadas
 * @param {Buffer} buffer - Buffer da imagem
 * @param {string} filename - Nome do arquivo
 * @param {Object} options - Opções de processamento
 * @returns {Object} - { buffer, format, metadata }
 */
const processImageAdvanced = async (buffer, filename, options = {}) => {
  try {
    console.log(`[processImageAdvanced] Processando imagem: ${filename}`);
    
    const {
      maxWidth = 2000,
      maxHeight = 2000,
      targetMaxBytes = 1 * 1024 * 1024, // 1MB
      removeMetadata = true,
      progressive = true,
      formats = ['webp', 'jpeg'] // Ordem de preferência
    } = options;
    
    let image = sharp(buffer, { failOnError: true });
    const metadata = await image.metadata().catch(() => ({}));
    console.log('[processImageAdvanced] Metadados obtidos:', metadata);

    // Remove metadados EXIF por segurança
    if (removeMetadata) {
      image = image.rotate(); // Auto-rotaciona baseado no EXIF e remove metadados
    }

    // Redimensiona se necessário
    if (metadata.width && metadata.width > maxWidth) {
      console.log('[processImageAdvanced] Redimensionando largura de', metadata.width, 'para', maxWidth);
      image = image.resize({ 
        width: maxWidth, 
        height: maxHeight,
        fit: 'inside',
        withoutEnlargement: true 
      });
    }

    // Tentativa de compressão com múltiplos formatos e qualidades
    let finalBuffer = null;
    let finalFormat = null;
    let finalMetadata = null;

    for (const format of formats) {
      // Tentativas de qualidade decrescente
      const qualities = format === 'webp' ? [85, 75, 65, 55, 45, 35] : [85, 75, 65, 55, 45, 35];
      
      for (const quality of qualities) {
        const pipeline = image.clone();
        
        if (format === 'webp') {
          pipeline.webp({ 
            quality, 
            effort: 6, // Máximo esforço de compressão
            smartSubsample: true 
          });
        } else if (format === 'jpeg') {
          pipeline.jpeg({ 
            quality, 
            progressive,
            mozjpeg: true, // Melhor compressão
            optimiseScans: true
          });
        } else if (format === 'png') {
          pipeline.png({ 
            quality, 
            compressionLevel: 9,
            progressive,
            palette: true // Reduz cores se possível
          });
        }

        const buff = await pipeline.toBuffer();
        console.log(`[processImageAdvanced] Tentativa ${format} qualidade ${quality}: ${buff.length} bytes`);
        
        if (buff.length <= targetMaxBytes) {
          finalBuffer = buff;
          finalFormat = format;
          finalMetadata = await sharp(buff).metadata();
          console.log('[processImageAdvanced] Formato escolhido:', format, 'qualidade:', quality);
          break;
        }
      }
      if (finalBuffer) break;
    }

    // Última tentativa com redimensionamento mais agressivo
    if (!finalBuffer) {
      console.log('[processImageAdvanced] Tentativa final com resize agressivo');
      const aggressiveWidth = Math.min(1024, maxWidth * 0.7);
      const reduced = await image.clone()
        .resize({ 
          width: aggressiveWidth, 
          withoutEnlargement: true 
        })
        .webp({ quality: 30, effort: 6 })
        .toBuffer()
        .catch(() => null);
        
      if (reduced && reduced.length <= targetMaxBytes) {
        finalBuffer = reduced;
        finalFormat = 'webp';
        finalMetadata = await sharp(reduced).metadata();
        console.log('[processImageAdvanced] Última tentativa bem-sucedida');
      }
    }

    if (!finalBuffer) {
      const errMsg = `Não foi possível reduzir a imagem para ${Math.round(targetMaxBytes / 1024)} KB. Escolha uma imagem menor.`;
      console.error('[processImageAdvanced] Erro:', errMsg);
      const e = new Error(errMsg);
      e.status = 400;
      throw e;
    }

    return {
      buffer: finalBuffer,
      format: finalFormat,
      metadata: finalMetadata,
      originalSize: buffer.length,
      compressedSize: finalBuffer.length,
      compressionRatio: ((buffer.length - finalBuffer.length) / buffer.length * 100).toFixed(2)
    };

  } catch (error) {
    console.error('[processImageAdvanced] Erro ao processar imagem:', error);
    throw new Error(`Falha no processamento da imagem: ${error.message}`);
  }
};

/**
 * Cria e retorna middleware multer otimizado para upload de um único arquivo,
 * processando a imagem para garantir que fique <= maxBytes com validações de segurança.
 *
 * @param {string} dir - diretório relativo à raiz do projeto (ex: 'uploads/perfil')
 * @param {string} fieldName - nome do campo do form que contém o arquivo (ex: 'avatar')
 * @param {object} opts - opções (opcional)
 *   - maxBytes: número máximo de bytes desejado para o arquivo final (default: 1 * 1024 * 1024)
 *   - incomingLimit: limite máximo aceitável para upload bruto em bytes (default: 10 * 1024 * 1024)
 *   - maxWidth: largura máxima (px) para redimensionamento (default: 2000)
 *   - allowedTypes: tipos de arquivo permitidos (default: ['image'])
 *   - enableAdvancedValidation: habilita validações avançadas (default: true)
 */
export const upload = (dir, fieldName, opts = {}) => {
  console.log('[upload] Iniciando upload otimizado com dir:', dir, 'fieldName:', fieldName, 'opts:', opts);
  if (!dir || !fieldName) throw new Error('upload(dir, fieldName) precisa de dois parâmetros.');

  const targetMaxBytes = typeof opts.maxBytes === 'number' ? opts.maxBytes : (1 * 1024 * 1024); // 1 MB
  const incomingLimit = typeof opts.incomingLimit === 'number' ? opts.incomingLimit : (10 * 1024 * 1024); // allow bigger input to compress
  const maxWidth = typeof opts.maxWidth === 'number' ? opts.maxWidth : 2000;
  const allowedTypes = opts.allowedTypes || ['image'];
  const enableAdvancedValidation = opts.enableAdvancedValidation !== false;

  // Detectar ambiente serverless (Vercel)
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT;
  
  // Em ambiente serverless, usar /tmp; em desenvolvimento, usar diretório original
  let uploadDir;
  if (isServerless) {
    // Em serverless, usar /tmp como diretório temporário
    uploadDir = '/tmp';
    console.log('[upload] Ambiente serverless detectado, usando /tmp directory');
  } else {
    // Em desenvolvimento local, usar diretório original
    uploadDir = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
    console.log('[upload] Ambiente local, uploadDir absoluto:', uploadDir);
    
    // garante que a pasta exista apenas em desenvolvimento local
    if (!fs.existsSync(uploadDir)) {
      console.log('[upload] Criando diretório:', uploadDir);
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  }

  // usar memoryStorage para processar (compressão) antes de persistir
  const storage = multer.memoryStorage();

  // Usar filtro avançado se habilitado, senão usar o filtro básico
  const fileFilter = enableAdvancedValidation 
    ? createAdvancedFileFilter(allowedTypes, { maxFileSize: incomingLimit })
    : (req, file, cb) => {
        console.log('[upload] fileFilter básico chamado para arquivo:', file.originalname, 'mimetype:', file.mimetype);
        if (/^image\/(jpeg|png|webp|gif|bmp|jpg)$/.test(file.mimetype)) cb(null, true);
        else cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Apenas arquivos de imagem são permitidos.'), false);
      };

  // permitir upload bruto maior (vamos comprimir depois)
  const limits = { 
    fileSize: incomingLimit,
    files: 1,
    fields: 5
  };

  const uploader = multer({ storage, fileFilter, limits });

  // middleware final que primeiro guarda em memória (multer), depois processa com sharp e escreve no disco
  return [
    // Middleware de limpeza em caso de erro
    cleanupOnError,
    
    // Middleware principal do multer
    (req, res, next) => {
      console.log('[upload] Middleware multer executado para fieldName:', fieldName);
      const mw = uploader.single(fieldName);
      mw(req, res, async (err) => {
        if (err) {
          console.error('[upload] Erro no multer:', err);
          // Tratamento específico para diferentes tipos de erro
          if (err instanceof multer.MulterError) {
            switch (err.code) {
              case 'LIMIT_FILE_SIZE':
                err.message = `Arquivo muito grande. Tamanho máximo permitido: ${Math.round(incomingLimit / (1024 * 1024))}MB`;
                err.status = 413;
                break;
              case 'LIMIT_UNEXPECTED_FILE':
                err.status = 400;
                break;
              case 'LIMIT_FILE_COUNT':
                err.message = 'Muitos arquivos enviados';
                err.status = 400;
                break;
              default:
                err.status = 400;
            }
          }
          return next(err);
        }

        // se não houver arquivo (campo vazio), apenas seguir
        if (!req.file || !req.file.buffer) {
          console.log('[upload] Nenhum arquivo enviado ou buffer vazio.');
          return next();
        }

        console.log('[upload] Arquivo recebido:', req.file.originalname, 'tamanho:', req.file.size, 'mimetype:', req.file.mimetype);

        try {
          const originalBuffer = req.file.buffer;
          
          // Usar processamento avançado
          const processResult = await processImageAdvanced(originalBuffer, req.file.originalname, {
            maxWidth,
            targetMaxBytes,
            removeMetadata: true,
            progressive: true
          });

          const { buffer: finalBuffer, format: finalFormat, metadata: finalMetadata } = processResult;

          // gerar nome de arquivo seguro
          const filename = enableAdvancedValidation 
            ? generateSecureFilename(req.file.originalname, req.file.mimetype)
            : (() => {
                const originalName = String(req.file.originalname || 'file');
                const ext = finalFormat === 'webp' ? '.webp' : (finalFormat === 'jpeg' ? '.jpg' : path.extname(originalName) || '.jpg');
                const baseName = path.basename(originalName, path.extname(originalName)).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 40);
                const unique = `${getBrazilDate()}-${Math.random().toString(36).slice(2, 8)}-${uuidv4().slice(0, 6)}`;
                return `${unique}__${baseName}${ext}`;
              })();
          
          // Em ambiente serverless (produção), usar Cloudinary
          // Em desenvolvimento local, salvar no sistema de arquivos
          if (isServerless) {
            console.log('[upload] Ambiente serverless - fazendo upload para Cloudinary');
            
            // Importar Cloudinary dinamicamente para evitar erro em desenvolvimento
            const { uploadToCloudinary } = await import('../config/cloudinaryConfig.js');
            
            try {
              // Fazer upload para Cloudinary
              const cloudinaryResult = await uploadToCloudinary(finalBuffer, dir.replace(/^uploads\//, ''));
              
              // Preencher req.file com dados do Cloudinary
              req.file.filename = filename;
              req.file.path = cloudinaryResult.secure_url;
              req.file.cloudinary_public_id = cloudinaryResult.public_id;
              req.file.size = finalBuffer.length;
              req.file.mimetype = finalFormat === 'webp' ? 'image/webp' : (finalFormat === 'jpeg' ? 'image/jpeg' : req.file.mimetype);
              req.file.url = cloudinaryResult.secure_url; // URL pública para acesso
              req.file.processInfo = processResult; // Informações do processamento
              
              console.log('[upload] Upload para Cloudinary concluído:', cloudinaryResult.secure_url);
              console.log('[upload] Compressão aplicada:', processResult.compressionRatio + '%');
            } catch (cloudinaryError) {
              console.error('[upload] Erro no upload para Cloudinary:', cloudinaryError);
              const e = new Error('Erro ao fazer upload da imagem para o serviço de armazenamento');
              e.status = 500;
              throw e;
            }
          } else {
            // Em desenvolvimento local, salvar no sistema de arquivos
            const filepath = path.join(uploadDir, filename);
            console.log('[upload] Ambiente local - salvando arquivo:', filepath);

            // escreve arquivo otimizado no disco
            await fs.promises.writeFile(filepath, finalBuffer);
            console.log('[upload] Arquivo salvo com sucesso em:', filepath);

            // preencher req.file com os dados do arquivo gravado
            req.file.filename = filename;
            req.file.path = filepath;
            req.file.size = finalBuffer.length;
            req.file.mimetype = finalFormat === 'webp' ? 'image/webp' : (finalFormat === 'jpeg' ? 'image/jpeg' : req.file.mimetype);
            req.file.url = `/uploads/${dir.replace(/^uploads\//, '')}/${filename}`; // URL relativa para desenvolvimento
            req.file.processInfo = processResult; // Informações do processamento
          }

          console.log('[upload] Finalizado com sucesso.');
          return next();
        } catch (e) {
          console.error('[upload] Erro no processamento:', e);
          // Adicionar informações específicas do erro
          if (!e.status) e.status = 500;
          if (!e.code) e.code = 'PROCESSING_ERROR';
          return next(e);
        }
      });
    },
    
    // Middleware de validação adicional se habilitado
    ...(enableAdvancedValidation ? [validateUploadedFile(allowedTypes)] : [])
  ];
};


// suposição: getBrazilDate() existe no seu código
// import { getBrazilDate } from './utils'

/**
 * Função principal de upload otimizada
 * Integra validação avançada, processamento otimizado e upload inteligente
 * @param {string} uploadType - Tipo de upload
 * @param {boolean} enableAdvancedValidation - Habilitar validação avançada
 * @returns {Function} - Middleware de upload
 */
const createOptimizedUpload = (uploadType = 'default', enableAdvancedValidation = true) => {
  const config = createUploadConfig(uploadType);
  const upload = multer(config);
  
  return [
    upload.single('file'),
    cleanupOnError,
    asyncHandler(async (req, res, next) => {
      try {
        if (!req.file) {
          throw createError('Nenhum arquivo foi enviado', 'NO_FILE_UPLOADED', 400);
        }
        
        // Validação avançada se habilitada
        if (enableAdvancedValidation) {
          await validateUploadedFile(req.file);
        }
        
        // Upload usando o serviço otimizado
        const uploadOptions = {
          optimize: true,
          optimization: {
            preset: uploadType,
            maxSizeKB: config.limits.fileSize / 1024
          },
          folder: `uploads/${uploadType}`,
          enableValidation: enableAdvancedValidation
        };
        
        const result = await uploadSingle(req.file, uploadOptions);
        
        // Adicionar resultado ao request para uso posterior
        req.uploadResult = result;
        
        next();
      } catch (error) {
        next(error);
      }
    })
  ];
};

/**
 * Upload múltiplo otimizado
 * @param {string} uploadType - Tipo de upload
 * @param {number} maxFiles - Máximo de arquivos
 * @returns {Function} - Middleware de upload múltiplo
 */
const createOptimizedMultipleUpload = (uploadType = 'default', maxFiles = 5) => {
  const config = createUploadConfig(uploadType);
  config.limits.files = maxFiles;
  
  const upload = multer(config);
  
  return [
    upload.array('files', maxFiles),
    cleanupOnError,
    asyncHandler(async (req, res, next) => {
      try {
        if (!req.files || req.files.length === 0) {
          throw createError('Nenhum arquivo foi enviado', 'NO_FILES_UPLOADED', 400);
        }
        
        const uploadOptions = {
          optimize: true,
          optimization: {
            preset: uploadType,
            maxSizeKB: config.limits.fileSize / 1024
          },
          folder: `uploads/${uploadType}/batch-${Date.now()}`,
          concurrency: 3
        };
        
        const result = await uploadMultiple(req.files, uploadOptions);
        
        req.uploadResults = result;
        
        next();
      } catch (error) {
        next(error);
      }
    })
  ];
};

/**
 * Criar configuração de upload baseada no tipo
 * @param {string} uploadType - Tipo de upload (profile, gallery, document, etc.)
 * @returns {Object} - Configuração do multer
 */
const createUploadConfig = (uploadType = 'default') => {
  const configs = {
    profile: {
      storage: multer.memoryStorage(),
      limits: { fileSize: UPLOAD_LIMITS.PROFILE.maxSize, files: 1 },
      fileFilter: createAdvancedFileFilter(['image'])
    },
    gallery: {
      storage: multer.memoryStorage(),
      limits: { fileSize: UPLOAD_LIMITS.GALLERY.maxSize, files: 10 },
      fileFilter: createAdvancedFileFilter(['image'])
    },
    document: {
      storage: multer.memoryStorage(),
      limits: { fileSize: UPLOAD_LIMITS.DOCUMENT.maxSize, files: 5 },
      fileFilter: createAdvancedFileFilter(['document', 'image'])
    },
    default: {
      storage: multer.memoryStorage(),
      limits: { fileSize: UPLOAD_LIMITS.DEFAULT.maxSize, files: 1 },
      fileFilter: createAdvancedFileFilter(['image'])
    }
  };
  
  return configs[uploadType] || configs.default;
};

// Exportar as novas funções otimizadas
export { 
  createOptimizedUpload,
  createOptimizedMultipleUpload,
  createUploadConfig,
  UPLOAD_LIMITS
};

// Manter compatibilidade com código existente
export const uploadProfile = createOptimizedUpload('profile', true);
export const uploadGallery = createOptimizedUpload('gallery', true);
export const uploadDocument = createOptimizedUpload('document', true);

export const uploadMidiaAnuncio = (dir = 'uploads/midias-anuncio', fieldName = 'midia') => {
  if (!dir || !fieldName) throw new Error('upload(dir, fieldName) precisa de dois parâmetros.');

  const targetMaxBytes = 1 * 1024 * 1024; // 1 MB para imagens (validação extra se quiser)
  const incomingLimit = 50 * 1024 * 1024; // 50 MB para permitir vídeos
  const maxWidth = 2000;

  // Detectar ambiente serverless (Vercel)
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT;
  
  // Em ambiente serverless, usar /tmp; em desenvolvimento, usar diretório original
  let uploadDir;
  if (isServerless) {
    uploadDir = '/tmp';
    console.log('[uploadMidiaAnuncio] Ambiente serverless detectado, usando /tmp directory');
  } else {
    uploadDir = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    console.log('[uploadMidiaAnuncio] Ambiente local, uploadDir:', uploadDir);
  }

  const storage = multer.memoryStorage();

  const fileFilter = (req, file, cb) => {
    if (/^(image\/(jpeg|png|webp|gif|bmp)|video\/(mp4|webm))$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Apenas arquivos de imagem ou vídeo são permitidos.'), false);
    }
  };

  const uploader = multer({ storage, fileFilter, limits: { fileSize: incomingLimit } });

  return (req, res, next) => {
    const mw = uploader.single(fieldName);
    mw(req, res, async (err) => {
      if (err) return next(err);
      if (!req.file || !req.file.buffer) return next();

      try {
        const isVideo = req.file.mimetype.startsWith('video/');
        const originalNameRaw = String(req.file.originalname || 'file');
        const originalExt = path.extname(originalNameRaw) || (isVideo ? '.mp4' : '.webp');
        const baseNameRaw = path.basename(originalNameRaw, originalExt);
        const baseName = baseNameRaw.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 40) || 'arquivo';
        const unique = `${getBrazilDate?.() || new Date().toISOString().slice(0,10)}-${Math.random().toString(36).slice(2,8)}-${uuidv4().slice(0,6)}`;

        if (isVideo) {
          // vídeo: em produção usar Cloudinary, em desenvolvimento salvar localmente
          const ext = originalExt || '.mp4';
          const filename = `${unique}__${baseName}${ext}`;
          
          if (isServerless) {
            console.log('[uploadMidiaAnuncio] Ambiente serverless - fazendo upload de vídeo para Cloudinary');
            
            try {
              // Importar Cloudinary dinamicamente
              const { uploadToCloudinary } = await import('../config/cloudinaryConfig.js');
              
              // Fazer upload para Cloudinary
              const cloudinaryResult = await uploadToCloudinary(req.file.buffer, dir.replace(/^uploads\//, ''), 'video');
              
              // Preencher req.file com dados do Cloudinary
              req.file.filename = filename;
              req.file.path = cloudinaryResult.secure_url;
              req.file.cloudinary_public_id = cloudinaryResult.public_id;
              req.file.size = req.file.buffer.length;
              req.file.url = cloudinaryResult.secure_url; // URL pública para acesso
              
              console.log('[uploadMidiaAnuncio] Upload de vídeo para Cloudinary concluído:', cloudinaryResult.secure_url);
            } catch (cloudinaryError) {
              console.error('[uploadMidiaAnuncio] Erro no upload de vídeo para Cloudinary:', cloudinaryError);
              const e = new Error('Erro ao fazer upload do vídeo para o serviço de armazenamento');
              e.status = 500;
              throw e;
            }
          } else {
            // Em desenvolvimento local, salvar no sistema de arquivos
            const filepath = path.join(uploadDir, filename);
            await fs.promises.writeFile(filepath, req.file.buffer);
            req.file.filename = filename;
            req.file.path = filepath;
            req.file.url = `/uploads/${dir.replace(/^uploads\//, '')}/${filename}`; // URL relativa para desenvolvimento
          }
          
          return next();
        } else {
          // imagem: processa, converte para webp (ou jpeg se preferir) e salva
          let image = sharp(req.file.buffer, { failOnError: true });
          const metadata = await image.metadata();

          // resize se necessário
          if (metadata.width && metadata.width > maxWidth) {
            image = image.resize({ width: maxWidth, withoutEnlargement: true });
          }

          // Prefira webp (bom tamanho). Se quiser jpeg, troque para .jpeg
          const finalFormat = 'webp';
          const ext = finalFormat === 'webp' ? '.webp' : '.jpg';

          // ajustar qualidade conforme desejar
          const finalBuffer = await image.toFormat(finalFormat, { quality: 80 }).toBuffer();

          const filename = `${unique}__${baseName}${ext}`;
          
          if (isServerless) {
            console.log('[uploadMidiaAnuncio] Ambiente serverless - fazendo upload de imagem para Cloudinary');
            
            try {
              // Importar Cloudinary dinamicamente
              const { uploadToCloudinary } = await import('../config/cloudinaryConfig.js');
              
              // Fazer upload para Cloudinary
              const cloudinaryResult = await uploadToCloudinary(finalBuffer, dir.replace(/^uploads\//, ''));
              
              // Preencher req.file com dados do Cloudinary
              req.file.filename = filename;
              req.file.path = cloudinaryResult.secure_url;
              req.file.cloudinary_public_id = cloudinaryResult.public_id;
              req.file.size = finalBuffer.length;
              req.file.mimetype = finalFormat === 'webp' ? 'image/webp' : 'image/jpeg';
              req.file.url = cloudinaryResult.secure_url; // URL pública para acesso
              
              console.log('[uploadMidiaAnuncio] Upload de imagem para Cloudinary concluído:', cloudinaryResult.secure_url);
            } catch (cloudinaryError) {
              console.error('[uploadMidiaAnuncio] Erro no upload de imagem para Cloudinary:', cloudinaryError);
              const e = new Error('Erro ao fazer upload da imagem para o serviço de armazenamento');
              e.status = 500;
              throw e;
            }
          } else {
            // Em desenvolvimento local, salvar no sistema de arquivos
            const filepath = path.join(uploadDir, filename);
            await fs.promises.writeFile(filepath, finalBuffer);

            // garantir dados úteis para quem vier depois
            req.file.filename = filename;
            req.file.path = filepath;
            req.file.size = finalBuffer.length;
            req.file.mimetype = finalFormat === 'webp' ? 'image/webp' : 'image/jpeg';
            req.file.url = `/uploads/${dir.replace(/^uploads\//, '')}/${filename}`; // URL relativa para desenvolvimento
          }

          return next();
        }
      } catch (e) {
        return next(e);
      }
    });
  };
};
