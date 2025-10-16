import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

/**
 * Middleware avançado de validação de uploads
 * Implementa verificações de segurança robustas
 */

// Tipos MIME permitidos com suas extensões correspondentes
const ALLOWED_TYPES = {
  image: {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp'],
    'image/gif': ['.gif'],
    'image/bmp': ['.bmp']
  },
  video: {
    'video/mp4': ['.mp4'],
    'video/webm': ['.webm'],
    'video/quicktime': ['.mov']
  }
};

// Assinaturas de arquivo (magic numbers) para validação adicional
const FILE_SIGNATURES = {
  'image/jpeg': [
    [0xFF, 0xD8, 0xFF],
    [0xFF, 0xD8, 0xFF, 0xE0],
    [0xFF, 0xD8, 0xFF, 0xE1],
    [0xFF, 0xD8, 0xFF, 0xE2],
    [0xFF, 0xD8, 0xFF, 0xE3],
    [0xFF, 0xD8, 0xFF, 0xE8]
  ],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]
  ],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
  'image/bmp': [[0x42, 0x4D]],
  'video/mp4': [
    [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70],
    [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]
  ]
};

/**
 * Valida a assinatura do arquivo (magic numbers)
 * @param {Buffer} buffer - Buffer do arquivo
 * @param {string} mimeType - Tipo MIME declarado
 * @returns {boolean} - True se a assinatura for válida
 */
const validateFileSignature = (buffer, mimeType) => {
  const signatures = FILE_SIGNATURES[mimeType];
  if (!signatures) return true; // Se não temos assinatura definida, aceitar

  return signatures.some(signature => {
    if (buffer.length < signature.length) return false;
    return signature.every((byte, index) => buffer[index] === byte);
  });
};

/**
 * Sanitiza o nome do arquivo
 * @param {string} filename - Nome original do arquivo
 * @returns {string} - Nome sanitizado
 */
const sanitizeFilename = (filename) => {
  if (!filename) return 'file';
  
  // Remove caracteres perigosos e mantém apenas alfanuméricos, hífens e underscores
  const sanitized = filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 100); // Limita o tamanho
  
  return sanitized || 'file';
};

/**
 * Gera um nome único e seguro para o arquivo
 * @param {string} originalName - Nome original do arquivo
 * @param {string} mimeType - Tipo MIME do arquivo
 * @returns {string} - Nome único gerado
 */
const generateSecureFilename = (originalName, mimeType) => {
  const sanitizedName = sanitizeFilename(path.parse(originalName).name);
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(8).toString('hex');
  
  // Determina a extensão baseada no MIME type
  let extension = '.bin';
  for (const [type, exts] of Object.entries({...ALLOWED_TYPES.image, ...ALLOWED_TYPES.video})) {
    if (type === mimeType) {
      extension = exts[0];
      break;
    }
  }
  
  return `${timestamp}_${randomBytes}_${sanitizedName}${extension}`;
};

/**
 * Cria um filtro de arquivo avançado
 * @param {Array} allowedTypes - Tipos permitidos ('image', 'video')
 * @param {Object} options - Opções adicionais
 * @returns {Function} - Função de filtro
 */
export const createAdvancedFileFilter = (allowedTypes = ['image'], options = {}) => {
  const maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB padrão
  
  return (req, file, cb) => {
    try {
      console.log(`[uploadValidation] Validando arquivo: ${file.originalname}, MIME: ${file.mimetype}`);
      
      // Validação básica de tipo MIME
      const isValidType = allowedTypes.some(type => {
        const allowedMimes = ALLOWED_TYPES[type];
        return allowedMimes && Object.keys(allowedMimes).includes(file.mimetype);
      });
      
      if (!isValidType) {
        const allowedMimes = allowedTypes.flatMap(type => 
          Object.keys(ALLOWED_TYPES[type] || {})
        );
        return cb(new multer.MulterError(
          'LIMIT_UNEXPECTED_FILE', 
          `Tipo de arquivo não permitido. Tipos aceitos: ${allowedMimes.join(', ')}`
        ));
      }
      
      // Validação de extensão
      const fileExt = path.extname(file.originalname).toLowerCase();
      const validExtensions = allowedTypes.flatMap(type => 
        Object.values(ALLOWED_TYPES[type] || {}).flat()
      );
      
      if (!validExtensions.includes(fileExt)) {
        return cb(new multer.MulterError(
          'LIMIT_UNEXPECTED_FILE',
          `Extensão de arquivo não permitida. Extensões aceitas: ${validExtensions.join(', ')}`
        ));
      }
      
      // Validação de nome de arquivo
      if (!file.originalname || file.originalname.length > 255) {
        return cb(new multer.MulterError(
          'LIMIT_UNEXPECTED_FILE',
          'Nome de arquivo inválido ou muito longo'
        ));
      }
      
      // Verificação de caracteres suspeitos no nome
      const suspiciousPatterns = [
        /\.\./,           // Path traversal
        /[<>:"|?*]/,      // Caracteres inválidos no Windows
        /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Nomes reservados Windows
        /^\./,            // Arquivos ocultos
        /\.(exe|bat|cmd|scr|pif|com|vbs|js|jar|app|deb|rpm)$/i // Executáveis
      ];
      
      if (suspiciousPatterns.some(pattern => pattern.test(file.originalname))) {
        return cb(new multer.MulterError(
          'LIMIT_UNEXPECTED_FILE',
          'Nome de arquivo contém caracteres ou padrões não permitidos'
        ));
      }
      
      console.log(`[uploadValidation] Arquivo ${file.originalname} passou na validação inicial`);
      cb(null, true);
      
    } catch (error) {
      console.error('[uploadValidation] Erro na validação:', error);
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Erro na validação do arquivo'));
    }
  };
};

/**
 * Middleware para validação adicional após o upload
 * Verifica assinaturas de arquivo e outras validações avançadas
 */
export const validateUploadedFile = (allowedTypes = ['image']) => {
  return async (req, res, next) => {
    try {
      if (!req.file || !req.file.buffer) {
        return next(); // Sem arquivo, continuar
      }
      
      const { buffer, mimetype, originalname } = req.file;
      
      console.log(`[uploadValidation] Validação avançada do arquivo: ${originalname}`);
      
      // Validação de assinatura de arquivo (magic numbers)
      if (!validateFileSignature(buffer, mimetype)) {
        const error = new Error('Arquivo corrompido ou tipo de arquivo não corresponde ao conteúdo');
        error.status = 400;
        error.code = 'INVALID_FILE_SIGNATURE';
        return next(error);
      }
      
      // Validação de tamanho mínimo (evita arquivos vazios ou muito pequenos)
      const minSize = mimetype.startsWith('image/') ? 100 : 1000; // 100 bytes para imagem, 1KB para vídeo
      if (buffer.length < minSize) {
        const error = new Error('Arquivo muito pequeno ou corrompido');
        error.status = 400;
        error.code = 'FILE_TOO_SMALL';
        return next(error);
      }
      
      // Gerar nome seguro para o arquivo
      req.file.secureFilename = generateSecureFilename(originalname, mimetype);
      
      // Adicionar metadados de segurança
      req.file.security = {
        validated: true,
        signatureValid: true,
        sanitizedName: sanitizeFilename(originalname),
        uploadTimestamp: new Date().toISOString(),
        hash: crypto.createHash('sha256').update(buffer).digest('hex').substring(0, 16)
      };
      
      console.log(`[uploadValidation] Arquivo ${originalname} passou em todas as validações`);
      next();
      
    } catch (error) {
      console.error('[uploadValidation] Erro na validação avançada:', error);
      error.status = 500;
      error.code = 'VALIDATION_ERROR';
      next(error);
    }
  };
};

/**
 * Middleware para limpeza de arquivos temporários em caso de erro
 */
export const cleanupOnError = (req, res, next) => {
  const originalSend = res.send;
  const originalJson = res.json;
  
  const cleanup = () => {
    if (req.file && req.file.path && req.file.path.includes('/tmp/')) {
      try {
        const fs = require('fs');
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
          console.log(`[uploadValidation] Arquivo temporário removido: ${req.file.path}`);
        }
      } catch (error) {
        console.warn(`[uploadValidation] Falha ao remover arquivo temporário: ${error.message}`);
      }
    }
  };
  
  // Interceptar respostas de erro
  res.send = function(data) {
    if (res.statusCode >= 400) {
      cleanup();
    }
    return originalSend.call(this, data);
  };
  
  res.json = function(data) {
    if (res.statusCode >= 400) {
      cleanup();
    }
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Configuração de limites seguros para diferentes tipos de upload
 */
export const UPLOAD_LIMITS = {
  avatar: {
    fileSize: 5 * 1024 * 1024,    // 5MB
    files: 1,
    fields: 5
  },
  media: {
    fileSize: 50 * 1024 * 1024,   // 50MB
    files: 1,
    fields: 10
  },
  document: {
    fileSize: 10 * 1024 * 1024,   // 10MB
    files: 1,
    fields: 5
  }
};

export default {
  createAdvancedFileFilter,
  validateUploadedFile,
  cleanupOnError,
  UPLOAD_LIMITS,
  sanitizeFilename,
  generateSecureFilename
};