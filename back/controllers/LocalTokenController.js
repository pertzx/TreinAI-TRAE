import LocalToken from '../models/LocalToken.js';
import Local from '../models/Local.js';
import User from '../models/User.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinaryConfig.js';
import path from 'path';
import fs from 'fs/promises';
import nativeValidator from '../utils/nativeValidation.js';
import xss from 'xss';
import rateLimit from 'express-rate-limit';

// Função auxiliar para construir URL da imagem
const buildImageUrl = (filename) => {
  if (!filename) return null;
  
  // Se já é uma URL completa do Cloudinary, retornar como está
  if (filename.startsWith('http')) return filename;
  
  // Caso contrário, construir URL local
  return `/uploads/image-local/${filename}`;
};

// Função auxiliar para deletar imagem antiga
const deleteOldImage = async (imageUrl) => {
  if (!imageUrl) return;
  
  try {
    if (imageUrl.includes('cloudinary.com')) {
      // Extrair public_id do Cloudinary
      const publicId = imageUrl.split('/').pop().split('.')[0];
      await deleteFromCloudinary(publicId);
    } else {
      // Deletar arquivo local
      const filename = path.basename(imageUrl);
      const filePath = path.join(__dirname, '..', 'uploads', 'image-local', filename);
      await fs.unlink(filePath);
    }
  } catch (error) {
    console.warn('Erro ao deletar imagem antiga:', error.message);
  }
};

// Criar local com validação de token
const criarLocalComToken = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { 
      token, 
      localName, 
      localDescricao, 
      link,
      localType,
      country, 
      countryCode, 
      state, 
      city, 
      latitude, 
      longitude 
    } = req.body;

    // Log de auditoria
    console.log(`[AUDIT] Token creation attempt - IP: ${req.ip}, User-Agent: ${req.get('User-Agent')}, Token: ${token?.substring(0, 8)}...`);

    // Validações de segurança aprimoradas
    if (!token || !nativeValidator.isUUID(token)) {
      console.log(`[SECURITY] Invalid token format - IP: ${req.ip}`);
      return res.status(400).json({ 
        success: false, 
        message: 'Token inválido' 
      });
    }

    if (!localName || !nativeValidator.isLength(localName.trim(), { min: 2, max: 100 })) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nome do local deve ter entre 2 e 100 caracteres' 
      });
    }

    if (localDescricao && !nativeValidator.isLength(localDescricao.trim(), { min: 0, max: 1000 })) {
      return res.status(400).json({ 
        success: false, 
        message: 'Descrição deve ter no máximo 1000 caracteres' 
      });
    }

    if (link && !nativeValidator.isURL(link, { require_protocol: true })) {
      return res.status(400).json({ 
        success: false, 
        message: 'Link deve ser uma URL válida' 
      });
    }

    // Validar localType
    const tiposPermitidos = ['clinica-de-fisioterapia', 'academia', 'consultorio-de-nutricionista', 'loja', 'outros'];
    if (!localType || !tiposPermitidos.includes(localType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tipo de local é obrigatório e deve ser um dos tipos permitidos' 
      });
    }

    // Sanitizar dados de entrada
    const sanitizedData = {
      localName: xss(localName.trim()),
      localDescricao: localDescricao ? xss(localDescricao.trim()) : '',
      link: link ? nativeValidator.escape(link.trim()) : '',
      country: country ? xss(country.trim()) : '',
      state: state ? xss(state.trim()) : '',
      city: city ? xss(city.trim()) : ''
    };

    // Validar e usar token
    const validToken = await LocalToken.isValidToken(token);
    if (!validToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token inválido, expirado ou já utilizado' 
      });
    }

    // Verificar se o usuário existe
    const user = await User.findById(validToken.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuário não encontrado' 
      });
    }

    // Verificar duplicidade por nome e usuário com sanitização
    const existingLocal = await Local.findOne({
      userId: validToken.userId,
      localName: sanitizedData.localName,
      localType: validToken.localType
    });

    if (existingLocal) {
      console.log(`[SECURITY] Duplicate local attempt - User: ${validToken.userId}, Name: ${sanitizedData.localName}`);
      return res.status(409).json({ 
        success: false, 
        message: 'Já existe um local com este nome para este usuário' 
      });
    }

    // Validação adicional de imagem
    let imageUrl = null;
    if (req.file) {
      // Validações de segurança para imagem
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Tipo de arquivo não permitido. Use JPEG, PNG ou WebP' 
        });
      }

      const maxSize = 5 * 1024 * 1024; // 5MB
      if (req.file.size > maxSize) {
        return res.status(400).json({ 
          success: false, 
          message: 'Imagem muito grande. Máximo 5MB' 
        });
      }

      try {
        // Detectar ambiente serverless
        const isServerless = !!(process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
        
        if (isServerless) {
          // Upload para Cloudinary em ambiente serverless
          const result = await uploadToCloudinary(req.file.buffer, {
            folder: 'treinai-locals',
            public_id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            transformation: [
              { width: 1200, height: 800, crop: 'limit' },
              { quality: 'auto:good' },
              { format: 'auto' }
            ]
          });
          imageUrl = result.secure_url;
        } else {
          // Salvar localmente em ambiente de desenvolvimento
          const uploadsDir = path.join(__dirname, '..', 'uploads', 'image-local');
          await fs.mkdir(uploadsDir, { recursive: true });
          
          // Sanitizar nome do arquivo
          const sanitizedFilename = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
          const filename = `${Date.now()}_${sanitizedFilename}`;
          const filePath = path.join(uploadsDir, filename);
          await fs.writeFile(filePath, req.file.buffer);
          imageUrl = buildImageUrl(filename);
        }
        
        console.log(`[AUDIT] Image uploaded successfully - User: ${validToken.userId}, URL: ${imageUrl}`);
      } catch (uploadError) {
        console.error('Erro no upload da imagem:', uploadError);
        return res.status(500).json({ 
          success: false, 
          message: 'Erro ao processar imagem' 
        });
      }
    }

    // Preparar dados de localização com validação
    let locationData = null;
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      
      // Validar coordenadas
      if (!isNaN(lat) && !isNaN(lng) && 
          lat >= -90 && lat <= 90 && 
          lng >= -180 && lng <= 180) {
        locationData = {
          type: 'Point',
          coordinates: [lng, lat] // GeoJSON usa [longitude, latitude]
        };
      } else {
        return res.status(400).json({ 
          success: false, 
          message: 'Coordenadas inválidas' 
        });
      }
    }

    // Criar o local com dados sanitizados
    const localData = {
      userId: validToken.userId,
      localName: sanitizedData.localName,
      localDescricao: sanitizedData.localDescricao,
      link: sanitizedData.link,
      localType: localType || validToken.localType,
      imageUrl,
      country: sanitizedData.country || null,
      countryCode: countryCode?.trim() || null,
      state: sanitizedData.state || null,
      city: sanitizedData.city || null,
      location: locationData,
      subscriptionId: validToken.subscriptionId,
      status: 'ativo',
      criadoEm: new Date(),
      criadoVia: 'token_validation',
      tokenUsed: token
    };

    const novoLocal = new Local(localData);
    await novoLocal.save();

    // Marcar token como usado
    await LocalToken.useToken(token, novoLocal._id);

    // Log de auditoria de sucesso
    const duration = Date.now() - startTime;
    console.log(`[AUDIT] Local created successfully - ID: ${novoLocal._id}, User: ${validToken.userId}, Duration: ${duration}ms, IP: ${req.ip}`);

    res.status(201).json({
      success: true,
      message: 'Local criado com sucesso',
      data: {
        localId: novoLocal._id,
        localName: novoLocal.localName,
        status: novoLocal.status,
        imageUrl: novoLocal.imageUrl,
        criadoEm: novoLocal.criadoEm
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[ERROR] Failed to create local - Duration: ${duration}ms, IP: ${req.ip}, Error:`, error);
    
    // Não expor detalhes internos do erro
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
};

// Verificar tokens disponíveis para um usuário
const verificarTokensDisponiveis = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validação de entrada
    if (!userId || !nativeValidator.isMongoId(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID do usuário inválido' 
      });
    }

    // Log de auditoria
    console.log(`[AUDIT] Token verification request - User: ${userId}, IP: ${req.ip}`);

    // Verificar se o usuário existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuário não encontrado' 
      });
    }

    // Buscar tokens ativos para o usuário
    const tokensAtivos = await LocalToken.find({
      userId,
      status: 'active',
      expiresAt: { $gt: new Date() }
    }).select('token localType createdAt expiresAt metadata');

    res.json({
      success: true,
      data: {
        tokensDisponiveis: tokensAtivos.length,
        tokens: tokensAtivos.map(token => ({
          token: token.token,
          localType: token.localType,
          criadoEm: token.createdAt,
          expiraEm: token.expiresAt,
          valorPago: token.metadata?.amount ? (token.metadata.amount / 100) : null,
          moeda: token.metadata?.currency || null
        }))
      }
    });

  } catch (error) {
    console.error(`[ERROR] Failed to verify tokens - User: ${req.params.userId}, IP: ${req.ip}, Error:`, error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
};

// Limpar tokens expirados (função utilitária)
const limparTokensExpirados = async (req, res) => {
  try {
    console.log(`[AUDIT] Manual token cleanup requested - IP: ${req.ip}`);
    
    const resultado = await LocalToken.cleanExpiredTokens();
    
    console.log(`[AUDIT] Token cleanup completed - Removed: ${resultado.deletedCount} tokens`);
    
    res.json({
      success: true,
      message: `${resultado.deletedCount} tokens expirados foram removidos`,
      data: { tokensRemovidos: resultado.deletedCount }
    });

  } catch (error) {
    console.error(`[ERROR] Failed to cleanup tokens - IP: ${req.ip}, Error:`, error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
};

export {
  criarLocalComToken,
  verificarTokensDisponiveis,
  limparTokensExpirados
};