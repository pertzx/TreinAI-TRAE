// controllers/multerConfigServerless.js
import multer from 'multer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { put } from '@vercel/blob';
import { getBrazilDate } from '../helpers/getBrazilDate.js';

/**
 * Configuração de upload otimizada para ambiente serverless (Vercel)
 * Usa Vercel Blob para armazenamento persistente de arquivos
 * 
 * @param {string} dir - diretório virtual (usado apenas para organização no blob)
 * @param {string} fieldName - nome do campo do form que contém o arquivo
 * @param {object} opts - opções de configuração
 */
export const uploadServerless = (dir, fieldName, opts = {}) => {
  console.log('[uploadServerless] Iniciando upload serverless com dir:', dir, 'fieldName:', fieldName);
  
  if (!dir || !fieldName) {
    throw new Error('uploadServerless(dir, fieldName) precisa de dois parâmetros.');
  }

  const targetMaxBytes = typeof opts.maxBytes === 'number' ? opts.maxBytes : (1 * 1024 * 1024); // 1 MB
  const incomingLimit = typeof opts.incomingLimit === 'number' ? opts.incomingLimit : (10 * 1024 * 1024); // 10 MB
  const maxWidth = typeof opts.maxWidth === 'number' ? opts.maxWidth : 2000;

  // Usar memoryStorage para processar em memória (compatível com serverless)
  const storage = multer.memoryStorage();

  const fileFilter = (req, file, cb) => {
    console.log('[uploadServerless] fileFilter para arquivo:', file.originalname, 'mimetype:', file.mimetype);
    if (/^image\/(jpeg|png|webp|gif|bmp|jpg)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Apenas arquivos de imagem são permitidos.'), false);
    }
  };

  const limits = { fileSize: incomingLimit };
  const uploader = multer({ storage, fileFilter, limits });

  // Middleware que processa e faz upload para Vercel Blob
  return (req, res, next) => {
    console.log('[uploadServerless] Middleware executado para fieldName:', fieldName);
    
    const mw = uploader.single(fieldName);
    mw(req, res, async (err) => {
      if (err) {
        console.error('[uploadServerless] Erro no multer:', err);
        return next(err);
      }

      // Se não houver arquivo, seguir
      if (!req.file || !req.file.buffer) {
        console.log('[uploadServerless] Nenhum arquivo enviado.');
        return next();
      }

      console.log('[uploadServerless] Arquivo recebido:', req.file.originalname, 'tamanho:', req.file.size);

      try {
        const originalBuffer = req.file.buffer;
        let image = sharp(originalBuffer, { failOnError: true });
        const metadata = await image.metadata().catch(() => ({}));
        
        console.log('[uploadServerless] Metadados:', metadata);

        // Redimensionar se necessário
        if (metadata.width && metadata.width > maxWidth) {
          console.log('[uploadServerless] Redimensionando de', metadata.width, 'para', maxWidth);
          image = image.resize({ width: maxWidth, withoutEnlargement: true });
        }

        // Compressão otimizada
        const tryFormats = ['webp', 'jpeg'];
        let finalBuffer = null;
        let finalFormat = null;

        for (const fmt of tryFormats) {
          for (let quality of [80, 70, 60, 50, 40, 30]) {
            const pipeline = image.clone();
            
            if (fmt === 'webp') {
              pipeline.webp({ quality });
            } else if (fmt === 'jpeg') {
              pipeline.jpeg({ quality, mozjpeg: true });
            }

            const buffer = await pipeline.toBuffer();
            
            if (buffer.length <= targetMaxBytes) {
              finalBuffer = buffer;
              finalFormat = fmt;
              console.log('[uploadServerless] Compressão bem-sucedida:', fmt, 'quality:', quality, 'tamanho:', buffer.length);
              break;
            }
          }
          if (finalBuffer) break;
        }

        // Se não conseguiu comprimir suficientemente, usar o menor possível
        if (!finalBuffer) {
          console.log('[uploadServerless] Usando compressão máxima');
          finalBuffer = await image.jpeg({ quality: 20, mozjpeg: true }).toBuffer();
          finalFormat = 'jpeg';
        }

        // Gerar nome único para o arquivo
        const timestamp = getBrazilDate().replace(/[^\d]/g, '');
        const uniqueId = uuidv4().split('-')[0];
        const extension = finalFormat === 'webp' ? '.webp' : '.jpg';
        const filename = `${timestamp}_${uniqueId}${extension}`;
        
        // Path virtual para organização no blob
        const blobPath = `${dir}/${filename}`;

        console.log('[uploadServerless] Fazendo upload para Vercel Blob:', blobPath);

        // Upload para Vercel Blob
        const blob = await put(blobPath, finalBuffer, {
          access: 'public',
          contentType: `image/${finalFormat}`,
        });

        console.log('[uploadServerless] Upload concluído:', blob.url);

        // Adicionar informações do arquivo ao req para uso posterior
        req.file.filename = filename;
        req.file.path = blob.url;
        req.file.size = finalBuffer.length;
        req.file.mimetype = `image/${finalFormat}`;
        req.file.blobUrl = blob.url;

        next();

      } catch (error) {
        console.error('[uploadServerless] Erro no processamento:', error);
        next(error);
      }
    });
  };
};

/**
 * Upload de mídia para anúncios (versão serverless)
 */
export const uploadMidiaAnuncioServerless = (dir = 'midias-anuncio', fieldName = 'midia') => {
  return uploadServerless(dir, fieldName, {
    maxBytes: 2 * 1024 * 1024, // 2 MB
    incomingLimit: 15 * 1024 * 1024, // 15 MB
    maxWidth: 1920
  });
};

/**
 * Fallback para desenvolvimento local (quando VERCEL_ENV não está definido)
 */
export const getUploadMiddleware = (dir, fieldName, opts = {}) => {
  // Em ambiente serverless (Vercel), usar Blob storage
  if (process.env.VERCEL_ENV || process.env.NODE_ENV === 'production') {
    return uploadServerless(dir, fieldName, opts);
  }
  
  // Em desenvolvimento local, usar upload tradicional
  // (importar dinamicamente para evitar erro se não existir)
  try {
    const { upload } = require('./multerConfig.js');
    return upload(dir, fieldName, opts);
  } catch (error) {
    console.warn('[getUploadMiddleware] Fallback para serverless devido a erro:', error.message);
    return uploadServerless(dir, fieldName, opts);
  }
};