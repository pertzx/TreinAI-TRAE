import sharp from 'sharp';
import { createError } from './errorHandler.js';

/**
 * Otimizador avançado para processamento de imagens e vídeos
 * Implementa múltiplas estratégias de otimização e fallbacks
 */

/**
 * Configurações de otimização por tipo de uso
 */
export const OPTIMIZATION_PRESETS = {
  profile: {
    maxWidth: 400,
    maxHeight: 400,
    quality: 85,
    format: 'webp',
    maxSizeKB: 200,
    progressive: true
  },
  thumbnail: {
    maxWidth: 150,
    maxHeight: 150,
    quality: 80,
    format: 'webp',
    maxSizeKB: 50,
    progressive: false
  },
  gallery: {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 90,
    format: 'webp',
    maxSizeKB: 800,
    progressive: true
  },
  banner: {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 85,
    format: 'webp',
    maxSizeKB: 1000,
    progressive: true
  },
  document: {
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 95,
    format: 'jpeg',
    maxSizeKB: 2000,
    progressive: false
  }
};

/**
 * Formatos suportados e suas configurações
 */
const FORMAT_CONFIG = {
  webp: {
    quality: 85,
    effort: 4,
    lossless: false
  },
  jpeg: {
    quality: 85,
    progressive: true,
    mozjpeg: true
  },
  png: {
    quality: 85,
    compressionLevel: 8,
    progressive: false
  },
  avif: {
    quality: 80,
    effort: 4,
    lossless: false
  }
};

/**
 * Detecta o tipo de imagem baseado no buffer
 * @param {Buffer} buffer - Buffer da imagem
 * @returns {Promise<Object>} - Metadados da imagem
 */
export const analyzeImage = async (buffer) => {
  try {
    const metadata = await sharp(buffer).metadata();
    
    return {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      channels: metadata.channels,
      density: metadata.density,
      hasAlpha: metadata.hasAlpha,
      isAnimated: metadata.pages > 1,
      size: buffer.length,
      aspectRatio: metadata.width / metadata.height
    };
  } catch (error) {
    throw createError('Erro ao analisar imagem', 'IMAGE_ANALYSIS_ERROR', 400);
  }
};

/**
 * Calcula dimensões otimizadas mantendo aspect ratio
 * @param {number} originalWidth - Largura original
 * @param {number} originalHeight - Altura original
 * @param {number} maxWidth - Largura máxima
 * @param {number} maxHeight - Altura máxima
 * @returns {Object} - Novas dimensões
 */
const calculateOptimalDimensions = (originalWidth, originalHeight, maxWidth, maxHeight) => {
  const aspectRatio = originalWidth / originalHeight;
  
  let newWidth = originalWidth;
  let newHeight = originalHeight;
  
  // Se excede largura máxima
  if (newWidth > maxWidth) {
    newWidth = maxWidth;
    newHeight = Math.round(newWidth / aspectRatio);
  }
  
  // Se ainda excede altura máxima
  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    newWidth = Math.round(newHeight * aspectRatio);
  }
  
  // Garantir que são números pares (melhor para codecs)
  newWidth = Math.round(newWidth / 2) * 2;
  newHeight = Math.round(newHeight / 2) * 2;
  
  return { width: newWidth, height: newHeight };
};

/**
 * Aplica otimizações baseadas no formato
 * @param {sharp.Sharp} sharpInstance - Instância do Sharp
 * @param {string} format - Formato de saída
 * @param {number} quality - Qualidade desejada
 * @returns {sharp.Sharp} - Instância configurada
 */
const applyFormatOptimization = (sharpInstance, format, quality) => {
  const config = FORMAT_CONFIG[format];
  
  switch (format) {
    case 'webp':
      return sharpInstance.webp({
        quality: quality || config.quality,
        effort: config.effort,
        lossless: config.lossless
      });
      
    case 'jpeg':
      return sharpInstance.jpeg({
        quality: quality || config.quality,
        progressive: config.progressive,
        mozjpeg: config.mozjpeg
      });
      
    case 'png':
      return sharpInstance.png({
        quality: quality || config.quality,
        compressionLevel: config.compressionLevel,
        progressive: config.progressive
      });
      
    case 'avif':
      return sharpInstance.avif({
        quality: quality || config.quality,
        effort: config.effort,
        lossless: config.lossless
      });
      
    default:
      return sharpInstance.jpeg({
        quality: quality || 85,
        progressive: true
      });
  }
};

/**
 * Otimiza imagem com múltiplas tentativas para atingir tamanho alvo
 * @param {Buffer} inputBuffer - Buffer da imagem original
 * @param {Object} options - Opções de otimização
 * @returns {Promise<Object>} - Resultado da otimização
 */
export const optimizeImage = async (inputBuffer, options = {}) => {
  try {
    const preset = OPTIMIZATION_PRESETS[options.preset] || OPTIMIZATION_PRESETS.gallery;
    const config = { ...preset, ...options };
    
    // Analisar imagem original
    const originalMetadata = await analyzeImage(inputBuffer);
    
    // Se já está dentro dos limites, retornar original otimizado
    if (originalMetadata.size <= config.maxSizeKB * 1024 && 
        originalMetadata.width <= config.maxWidth && 
        originalMetadata.height <= config.maxHeight) {
      
      const optimized = await sharp(inputBuffer)
        .rotate() // Auto-rotacionar baseado em EXIF
        .withMetadata(false) // Remove metadados sensíveis
        .pipe(applyFormatOptimization(sharp(), config.format, config.quality))
        .toBuffer();
      
      return {
        buffer: optimized,
        metadata: await analyzeImage(optimized),
        optimizationApplied: 'minimal',
        compressionRatio: optimized.length / inputBuffer.length
      };
    }
    
    // Calcular dimensões otimizadas
    const { width, height } = calculateOptimalDimensions(
      originalMetadata.width,
      originalMetadata.height,
      config.maxWidth,
      config.maxHeight
    );
    
    // Estratégias de otimização em ordem de prioridade
    const strategies = [
      { quality: config.quality, format: config.format },
      { quality: config.quality - 10, format: config.format },
      { quality: config.quality - 20, format: config.format },
      { quality: config.quality, format: 'jpeg' }, // Fallback para JPEG
      { quality: config.quality - 15, format: 'jpeg' },
      { quality: config.quality - 30, format: 'jpeg' }
    ];
    
    for (const strategy of strategies) {
      try {
        let sharpInstance = sharp(inputBuffer)
          .rotate() // Auto-rotacionar baseado em EXIF
          .resize(width, height, {
            fit: 'inside',
            withoutEnlargement: true,
            kernel: sharp.kernel.lanczos3
          })
          .withMetadata(false); // Remove metadados sensíveis
        
        // Aplicar otimizações específicas do formato
        sharpInstance = applyFormatOptimization(sharpInstance, strategy.format, strategy.quality);
        
        const optimizedBuffer = await sharpInstance.toBuffer();
        
        // Verificar se atende aos critérios
        if (optimizedBuffer.length <= config.maxSizeKB * 1024) {
          return {
            buffer: optimizedBuffer,
            metadata: await analyzeImage(optimizedBuffer),
            optimizationApplied: `${strategy.format}_q${strategy.quality}`,
            compressionRatio: optimizedBuffer.length / inputBuffer.length,
            strategy
          };
        }
      } catch (strategyError) {
        console.warn('Estratégia de otimização falhou:', strategy, strategyError.message);
        continue;
      }
    }
    
    // Se nenhuma estratégia funcionou, aplicar compressão agressiva
    const aggressiveBuffer = await sharp(inputBuffer)
      .rotate()
      .resize(Math.round(width * 0.8), Math.round(height * 0.8), {
        fit: 'inside',
        withoutEnlargement: true,
        kernel: sharp.kernel.lanczos3
      })
      .withMetadata(false)
      .jpeg({ quality: 60, progressive: true })
      .toBuffer();
    
    return {
      buffer: aggressiveBuffer,
      metadata: await analyzeImage(aggressiveBuffer),
      optimizationApplied: 'aggressive',
      compressionRatio: aggressiveBuffer.length / inputBuffer.length,
      warning: 'Compressão agressiva aplicada para atingir tamanho limite'
    };
    
  } catch (error) {
    console.error('Erro na otimização de imagem:', error);
    throw createError('Erro no processamento da imagem', 'IMAGE_OPTIMIZATION_ERROR', 500);
  }
};

/**
 * Gera múltiplas versões de uma imagem (thumbnail, medium, large)
 * @param {Buffer} inputBuffer - Buffer da imagem original
 * @param {Object} options - Opções de geração
 * @returns {Promise<Object>} - Versões geradas
 */
export const generateImageVariants = async (inputBuffer, options = {}) => {
  try {
    const variants = {};
    const presets = options.presets || ['thumbnail', 'profile', 'gallery'];
    
    // Processar cada preset em paralelo
    const promises = presets.map(async (presetName) => {
      try {
        const result = await optimizeImage(inputBuffer, { preset: presetName });
        return { preset: presetName, result };
      } catch (error) {
        console.error(`Erro ao gerar variante ${presetName}:`, error);
        return { preset: presetName, error: error.message };
      }
    });
    
    const results = await Promise.allSettled(promises);
    
    results.forEach((result) => {
      if (result.status === 'fulfilled' && !result.value.error) {
        variants[result.value.preset] = result.value.result;
      } else {
        console.error(`Falha na geração da variante:`, result.reason || result.value.error);
      }
    });
    
    if (Object.keys(variants).length === 0) {
      throw createError('Nenhuma variante pôde ser gerada', 'VARIANT_GENERATION_ERROR', 500);
    }
    
    return variants;
    
  } catch (error) {
    console.error('Erro na geração de variantes:', error);
    throw createError('Erro na geração de variantes da imagem', 'VARIANT_GENERATION_ERROR', 500);
  }
};

/**
 * Otimiza imagem para diferentes dispositivos/resoluções
 * @param {Buffer} inputBuffer - Buffer da imagem original
 * @param {Array} breakpoints - Breakpoints de resolução
 * @returns {Promise<Object>} - Versões responsivas
 */
export const generateResponsiveImages = async (inputBuffer, breakpoints = [480, 768, 1024, 1920]) => {
  try {
    const originalMetadata = await analyzeImage(inputBuffer);
    const responsiveImages = {};
    
    for (const width of breakpoints) {
      // Só gerar se a imagem original for maior que o breakpoint
      if (originalMetadata.width > width) {
        const height = Math.round((width / originalMetadata.width) * originalMetadata.height);
        
        const optimized = await sharp(inputBuffer)
          .rotate()
          .resize(width, height, {
            fit: 'inside',
            withoutEnlargement: true,
            kernel: sharp.kernel.lanczos3
          })
          .withMetadata(false)
          .webp({ quality: 85, effort: 4 })
          .toBuffer();
        
        responsiveImages[`${width}w`] = {
          buffer: optimized,
          width,
          height,
          size: optimized.length
        };
      }
    }
    
    return responsiveImages;
    
  } catch (error) {
    console.error('Erro na geração de imagens responsivas:', error);
    throw createError('Erro na geração de imagens responsivas', 'RESPONSIVE_GENERATION_ERROR', 500);
  }
};

/**
 * Valida e otimiza vídeo (placeholder para futuras implementações)
 * @param {Buffer} inputBuffer - Buffer do vídeo
 * @param {Object} options - Opções de otimização
 * @returns {Promise<Object>} - Resultado da otimização
 */
export const optimizeVideo = async (inputBuffer, options = {}) => {
  // Por enquanto, apenas validação básica
  // Implementação futura pode incluir FFmpeg para processamento de vídeo
  
  try {
    const maxSizeKB = options.maxSizeKB || 10000; // 10MB padrão
    
    if (inputBuffer.length > maxSizeKB * 1024) {
      throw createError(
        `Vídeo muito grande. Máximo permitido: ${maxSizeKB}KB`,
        'VIDEO_TOO_LARGE',
        413
      );
    }
    
    return {
      buffer: inputBuffer,
      size: inputBuffer.length,
      optimizationApplied: 'validation_only',
      note: 'Processamento avançado de vídeo será implementado em versão futura'
    };
    
  } catch (error) {
    console.error('Erro na otimização de vídeo:', error);
    throw createError('Erro no processamento do vídeo', 'VIDEO_OPTIMIZATION_ERROR', 500);
  }
};

/**
 * Função principal de otimização que detecta tipo e aplica estratégia adequada
 * @param {Buffer} inputBuffer - Buffer do arquivo
 * @param {string} mimeType - Tipo MIME do arquivo
 * @param {Object} options - Opções de otimização
 * @returns {Promise<Object>} - Resultado da otimização
 */
export const optimizeMedia = async (inputBuffer, mimeType, options = {}) => {
  try {
    if (mimeType.startsWith('image/')) {
      return await optimizeImage(inputBuffer, options);
    } else if (mimeType.startsWith('video/')) {
      return await optimizeVideo(inputBuffer, options);
    } else {
      throw createError('Tipo de mídia não suportado', 'UNSUPPORTED_MEDIA_TYPE', 400);
    }
  } catch (error) {
    console.error('Erro na otimização de mídia:', error);
    throw error;
  }
};

export default {
  optimizeImage,
  optimizeVideo,
  optimizeMedia,
  generateImageVariants,
  generateResponsiveImages,
  analyzeImage,
  OPTIMIZATION_PRESETS
};