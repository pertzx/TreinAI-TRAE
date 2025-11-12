import Local from '../models/Local.js';
import User from '../models/User.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinaryConfig.js';
import { v4 as uuidv4 } from 'uuid';
import { getBrazilDate } from '../helpers/getBrazilDate.js';
import Stripe from 'stripe';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  maxNetworkRetries: 3,
  timeout: 30000
});

// Configuração do multer para upload via Cloudinary (memory storage)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido. Use apenas JPEG, PNG ou WEBP.'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  }
});

// Helper para validar dados do local
const validateLocalData = (data) => {
  const errors = {};

  if (!data.localName || data.localName.trim().length < 3) {
    errors.localName = 'Nome do local deve ter pelo menos 3 caracteres';
  }

  if (!data.localDescricao || data.localDescricao.trim().length < 10) {
    errors.localDescricao = 'Descrição deve ter pelo menos 10 caracteres';
  }

  if (!data.link || !isValidUrl(data.link)) {
    errors.link = 'Link deve ser uma URL válida';
  }

  if (!data.localType) {
    errors.localType = 'Tipo de local é obrigatório';
  }

  if (!data.country) {
    errors.country = 'País é obrigatório';
  }

  if (!data.state) {
    errors.state = 'Estado é obrigatório';
  }

  if (!data.city) {
    errors.city = 'Cidade é obrigatória';
  }

  if (!data.userId) {
    errors.userId = 'ID do usuário é obrigatório';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

// =======================
// Função auxiliar para excluir local em caso de erro no pagamento
// =======================
export const excluirLocalPorErro = async (localId) => {
  try {
    const local = await Local.findOne({ localId: localId });
    if (!local) return { success: false, error: 'Local não encontrado' };

    // Função para deletar imagem (mesma lógica do editarProfissional)
    const tryDeleteImage = async (imageUrl) => {
      try {
        if (!imageUrl || typeof imageUrl !== 'string') return;

        // Se é URL do Cloudinary, deletar do Cloudinary
        if (imageUrl.includes('cloudinary.com')) {
          try {
            await deleteFromCloudinary(imageUrl);
            console.log('[LocalController] Imagem antiga removida do Cloudinary');
          } catch (cloudinaryError) {
            console.warn('[LocalController] Falha ao remover imagem antiga do Cloudinary:', cloudinaryError);
          }
        } else {
          // Se é URL local, deletar do sistema de arquivos
          const parsed = imageUrl.split('/').pop();
          if (!parsed) return;
          const filename = parsed.split('?')[0].split('#')[0];

          const candidatePath = path.join(process.cwd(), 'uploads', 'image-local', filename);

          // apenas remove se o arquivo estiver dentro do upload dir e existir
          if (candidatePath.includes('image-local') && fs.existsSync(candidatePath)) {
            try {
              fs.unlinkSync(candidatePath);
              console.log('[LocalController] Imagem local removida:', candidatePath);
            } catch (err) {
              console.warn('Falha ao remover arquivo local:', candidatePath, err);
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao tentar apagar imagem:', err);
      }
    };

    // Remover imagem se existir (usando imagePath ou imageUrl)
    if (local.imagePath) {
      await tryDeleteImage(local.imagePath);
    }
    if (local.imageUrl) {
      await tryDeleteImage(local.imageUrl);
    }

    // Deletar local do banco
    const localExcluido = await Local.findOneAndDelete({ localId: localId });
    console.log(`[LocalController] Local ${localId} excluído devido a erro no pagamento`);
    return { success: true, localExcluido };
  } catch (error) {
    console.error('Erro ao excluir local por erro:', error);
    throw error;
  }
};

// =======================
// Função auxiliar para ativar local após pagamento bem-sucedido
// =======================
export const ativarLocalAposPagamento = async (localId, subscriptionId) => {
  try {
    const localAtualizado = await Local.findOneAndUpdate(
      { localId: localId },
      {
        status: 'ativo',
        subscriptionId: subscriptionId,
        atualizadoEm: new Date(getBrazilDate())
      }
    );

    if (!localAtualizado) {
      throw new Error(`Local ${localId} não encontrado`);
    }

    console.log(`[LocalController] Local ${localId} ativado com sucesso. SubscriptionId: ${subscriptionId}`);
    return { success: true, local: localAtualizado };
  } catch (error) {
    console.error('Erro ao ativar local após pagamento:', error);
    throw error;
  }
};

// =======================
// POST /criar-local-direto
// Cria um local diretamente no banco e redireciona para pagamento Stripe
// Status inicial: 'inativo'
// =======================
export const criarLocalDireto = async (req, res) => {
  // const session = await mongoose.startSession();
  try {
    // return await session.withTransaction(async () => {

    // });

    const {
      localName,
      localDescricao,
      link,
      localType,
      country,
      countryCode,
      state,
      city,
      userId
    } = req.body;

    // Validar dados
    const validation = validateLocalData(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: validation.errors
      });
    }

    // Verificar se usuário existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Garantir que o usuário autenticado corresponde ao userId informado
    if (req.userEmail && String(user.email) !== String(req.userEmail)) {
      return res.status(403).json({
        success: false,
        message: 'Não autorizado a criar local para outro usuário'
      });
    }

    // Processar imagem usando a mesma lógica do editarProfissional
    let imageUrl = null;
    console.log("[LocalController.js] req.file:", req.file);
    console.log("[LocalController.js] req.body:", req.body);
    if (req.file) {
      console.log("Tem file");
      try {
        // Em produção usar Cloudinary, em desenvolvimento usar local
        // Mesma lógica do editarProfissional: req.file.url || path local
        if (req.file.url) {
          // Se já foi processado pelo middleware (Cloudinary)
          imageUrl = req.file.url;
          console.log("imageUrl:", imageUrl);
        } else if (req.file.buffer) {
          // Upload para Cloudinary
          const cloudinaryResult = await uploadToCloudinary(req.file.buffer, 'image-local', 'image');
          imageUrl = cloudinaryResult.secure_url;
          console.log("cloudinaryResult:", cloudinaryResult);
        } else {
          // Fallback para upload local
          imageUrl = `/uploads/image-local/${req.file.filename}`;
          console.log("imageUrl fallback:", imageUrl);
        }
        console.log('[LocalController] Imagem processada:', imageUrl);
      } catch (uploadError) {
        console.error('Erro no upload da imagem:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Erro no upload da imagem'
        });
      }
    }

    // Gerar ID único para o local
    const localId = uuidv4();

    // Criar local no banco com status inativo
    const novoLocal = new Local({
      localId,
      localName: localName.trim(),
      localDescricao: localDescricao.trim(),
      link: link.trim(),
      localType,
      country,
      countryCode,
      state,
      city,
      userId,
      imageUrl, // Usar imageUrl em vez de imagePath para consistência
      subscriptionId: 'temp_' + localId, // ID temporário até o pagamento
      status: 'inativo', // Status inicial válido
      criadoEm: new Date(getBrazilDate()),
      atualizadoEm: new Date(getBrazilDate())
    });

    const localSalvo = await novoLocal.save();

    // Criar sessão de pagamento no Stripe
    try {
      // Mapear tipos de local para preços
      const tipoNorm = String(localType || '').toLowerCase().trim();
      const priceMap = {
        'clinica-de-fisioterapia': process.env.STRIPE_PRICEID_100,
        'consultorio-de-nutricionista': process.env.STRIPE_PRICEID_100,
        'academia': process.env.STRIPE_PRICEID_180,
        'loja': process.env.STRIPE_PRICEID_180,
        'outros': process.env.STRIPE_PRICEID_50
      };

      const unitPrice = priceMap[tipoNorm];
      if (!unitPrice) {
        // Se não encontrar preço, a transação fará rollback automático
        return res.status(400).json({
          success: false,
          message: `Tipo de local inválido: ${localType}. Tipos aceitos: ${Object.keys(priceMap).join(', ')}`,
          code: 'INVALID_LOCAL_TYPE'
        });
      }

      // Buscar ou criar customer no Stripe
      let customerId = user?.planInfos?.stripeCustomerId || null;
      if (!customerId) {
        try {
          const customers = await stripe.customers.list({ email: user.email, limit: 1 });
          customerId = customers.data[0]?.id || null;

          if (!customerId) {
            const customer = await stripe.customers.create({
              email: user.email,
              name: user.name || user.email,
              metadata: {
                app: 'treinai',
                userId: String(userId)
              }
            });
            customerId = customer.id;
          }

          // Atualizar usuário com customerId
          if (!user.planInfos) user.planInfos = {};
          user.planInfos.stripeCustomerId = customerId;
          await user.save();
        } catch (customerError) {
          console.error('Erro ao criar/buscar customer:', customerError);
          return res.status(500).json({
            success: false,
            message: 'Erro ao configurar pagamento',
            code: 'STRIPE_CUSTOMER_ERROR'
          });
        }
      }

      // Criar sessão de checkout
      const sessionMetadata = {
        app: 'treinai',
        flow: 'create_local_payment',
        userId: String(userId),
        localId: String(localSalvo.localId), // Usar localId em vez de _id
        localType: tipoNorm,
        localName: localName.trim(),
        imageUrl: imageUrl || ''
      };

      const sessionParams = {
        mode: 'subscription',
        line_items: [{
          price: unitPrice,
          quantity: 1,
        }],
        success_url: `${process.env.FRONTEND_URL}/pagamento-sucesso?session_id={CHECKOUT_SESSION_ID}&type=local_payment&local_id=${localSalvo.localId}`,
        cancel_url: `${process.env.FRONTEND_URL}/pagamento-cancelado?type=local_payment&local_id=${localSalvo.localId}`,
        expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutos
        metadata: sessionMetadata,
        subscription_data: {
          metadata: {
            ...sessionMetadata,
            description: `Assinatura para ${tipoNorm} - ${localName.trim()}`
          },
        },
        customer: customerId,
        allow_promotion_codes: true,
        billing_address_collection: 'auto'
      };

      const stripeSession = await stripe.checkout.sessions.create(sessionParams);

      // Atualizar local com sessionId para rastreamento
      localSalvo.metadata = {
        stripeSessionId: stripeSession.id,
        stripeCustomerId: customerId
      };
      await localSalvo.save();

      // Retornar resposta com URL de pagamento
      return res.status(201).json({
        success: true,
        message: 'Local criado com sucesso. Redirecionando para pagamento...',
        local: {
          id: localSalvo._id,
          localId: localSalvo.localId,
          localName: localSalvo.localName,
          localDescricao: localSalvo.localDescricao,
          localType: localSalvo.localType,
          status: localSalvo.status,
          imageUrl: localSalvo.imageUrl
        },
        payment: {
          sessionId: stripeSession.id,
          url: stripeSession.url,
          expiresAt: stripeSession.expires_at
        },
        requiresPayment: true
      });

    } catch (stripeError) {
      console.error('Erro ao criar sessão de pagamento:', stripeError);

      return res.status(500).json({
        success: false,
        message: 'Erro ao configurar pagamento',
        code: 'STRIPE_SESSION_ERROR',
        error: process.env.NODE_ENV === 'development' ? stripeError.message : undefined
      });
    }

  } catch (error) {
    console.error('Erro ao criar local:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =======================
// POST /avaliar-local
// Criar uma nova avaliação para um local
// =======================
export const avaliarLocal = async (req, res) => {
  try {
    const { localId, userId, estrelas, comentario, nomeAvaliador } = req.body;

    // Validações básicas
    if (!localId || !userId || !estrelas) {
      return res.status(400).json({
        success: false,
        message: 'localId, userId e estrelas são obrigatórios'
      });
    }

    if (estrelas < 1 || estrelas > 5) {
      return res.status(400).json({
        success: false,
        message: 'Estrelas deve ser um número entre 1 e 5'
      });
    }

    // Verificar se o local existe
    const local = await Local.findOne({
      $or: [
        { localId },
        { _id: localId }
      ]
    });
    if (!local) {
      return res.status(404).json({
        success: false,
        message: 'Local não encontrado'
      });
    }

    // Verificar se o usuário já avaliou este local
    const avaliacaoExistente = local.avaliacoes?.find(av => av.userId === userId);
    if (avaliacaoExistente) {
      return res.status(400).json({
        success: false,
        message: 'Você já avaliou este local'
      });
    }

    // Sanitizar dados
    const novaAvaliacao = {
      userId,
      estrelas: parseInt(estrelas),
      comentario: comentario ? comentario.trim().substring(0, 500) : '',
      nomeAvaliador: nomeAvaliador ? nomeAvaliador.trim().substring(0, 100) : 'Usuário Anônimo',
      dataAvaliacao: new Date(),
      aceito: false, // Avaliações precisam ser moderadas
      moderadoPor: null,
      dataModeração: null
    };

    // Adicionar avaliação ao local
    await Local.findByIdAndUpdate(
      localId,
      { $push: { avaliacoes: novaAvaliacao } },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Avaliação enviada com sucesso! Ela será analisada antes de ser publicada.',
      avaliacao: novaAvaliacao
    });

  } catch (error) {
    console.error('Erro ao criar avaliação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =======================
// GET /avaliacoes-local/:localId
// Listar avaliações aceitas de um local
// =======================
export const listarAvaliacoesLocal = async (req, res) => {
  try {
    const { localId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!localId) {
      return res.status(400).json({
        success: false,
        message: 'localId é obrigatório'
      });
    }

    const local = await Local.findOne({
      $or: [
        { localId },
        { _id: localId }
      ]
    }).lean();
    if (!local) {
      return res.status(404).json({
        success: false,
        message: 'Local não encontrado'
      });
    }

    // Filtrar apenas avaliações aceitas
    const avaliacoesAceitas = local.avaliacoes?.filter(av => av.aceito) || [];

    // Ordenar por data mais recente
    avaliacoesAceitas.sort((a, b) => new Date(b.dataAvaliacao) - new Date(a.dataAvaliacao));

    // Paginação
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const avaliacoesPaginadas = avaliacoesAceitas.slice(startIndex, endIndex);

    // Calcular estatísticas
    const estatisticas = {
      total: avaliacoesAceitas.length,
      mediaEstrelas: avaliacoesAceitas.length > 0
        ? avaliacoesAceitas.reduce((acc, av) => acc + av.estrelas, 0) / avaliacoesAceitas.length
        : 0,
      distribuicaoEstrelas: {
        5: avaliacoesAceitas.filter(av => av.estrelas === 5).length,
        4: avaliacoesAceitas.filter(av => av.estrelas === 4).length,
        3: avaliacoesAceitas.filter(av => av.estrelas === 3).length,
        2: avaliacoesAceitas.filter(av => av.estrelas === 2).length,
        1: avaliacoesAceitas.filter(av => av.estrelas === 1).length
      }
    };

    res.json({
      success: true,
      data: {
        avaliacoes: avaliacoesPaginadas,
        estatisticas,
        paginacao: {
          paginaAtual: parseInt(page),
          totalPaginas: Math.ceil(avaliacoesAceitas.length / limit),
          totalItens: avaliacoesAceitas.length,
          itensPorPagina: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Erro ao listar avaliações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =======================
// GET /avaliacoes-pendentes
// Listar avaliações pendentes de moderação (admin)
// =======================
export const listarAvaliacoesPendentes = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    // Buscar locais com avaliações pendentes
    const locaisComAvaliacoesPendentes = await Local.find({
      'avaliacoes.aceito': false
    }).lean();

    // Extrair todas as avaliações pendentes
    let avaliacoesPendentes = [];
    locaisComAvaliacoesPendentes.forEach(local => {
      const pendentes = local.avaliacoes?.filter(av => !av.aceito) || [];
      pendentes.forEach(avaliacao => {
        avaliacoesPendentes.push({
          ...avaliacao,
          localId: local._id,
          localName: local.localName,
          localType: local.localType
        });
      });
    });

    // Ordenar por data mais recente
    avaliacoesPendentes.sort((a, b) => new Date(b.dataAvaliacao) - new Date(a.dataAvaliacao));

    // Paginação
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const avaliacoesPaginadas = avaliacoesPendentes.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        avaliacoes: avaliacoesPaginadas,
        paginacao: {
          paginaAtual: parseInt(page),
          totalPaginas: Math.ceil(avaliacoesPendentes.length / limit),
          totalItens: avaliacoesPendentes.length,
          itensPorPagina: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Erro ao listar avaliações pendentes:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =======================
// POST /moderar-avaliacao
// Moderar uma avaliação (aceitar/rejeitar) - admin
// =======================
export const moderarAvaliacao = async (req, res) => {
  try {
    const { localId, avaliacaoId, aceitar, moderadorId, motivoRejeicao } = req.body;

    if (!localId || !avaliacaoId || aceitar === undefined || !moderadorId) {
      return res.status(400).json({
        success: false,
        message: 'localId, avaliacaoId, aceitar e moderadorId são obrigatórios'
      });
    }

    const local = await Local.findOne({
      $or: [
        { localId },
        { _id: localId }
      ]
    });
    if (!local) {
      return res.status(404).json({
        success: false,
        message: 'Local não encontrado'
      });
    }

    // Encontrar a avaliação
    const avaliacaoIndex = local.avaliacoes?.findIndex(av => av._id.toString() === avaliacaoId);
    if (avaliacaoIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Avaliação não encontrada'
      });
    }

    // Atualizar status da avaliação
    local.avaliacoes[avaliacaoIndex].aceito = aceitar;
    local.avaliacoes[avaliacaoIndex].moderadoPor = moderadorId;
    local.avaliacoes[avaliacaoIndex].dataModeração = new Date();

    if (!aceitar && motivoRejeicao) {
      local.avaliacoes[avaliacaoIndex].motivoRejeicao = motivoRejeicao.trim().substring(0, 200);
    }

    await local.save();

    res.json({
      success: true,
      message: `Avaliação ${aceitar ? 'aceita' : 'rejeitada'} com sucesso`,
      avaliacao: local.avaliacoes[avaliacaoIndex]
    });

  } catch (error) {
    console.error('Erro ao moderar avaliação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =======================
// DELETE /deletar-local/:localId
// Deleta um local (usado para rollback em caso de falha no pagamento)
// =======================
export const deletarLocalPorId = async (req, res) => {
  try {
    const { localId } = req.params;
    const { userId } = req.body;

    if (!localId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'localId e userId são obrigatórios'
      });
    }

    // Buscar local
    const local = await Local.findOne({
      $or: [
        { localId },
        { _id: localId }
      ]
    });

    if (!local) {
      return res.status(404).json({
        success: false,
        message: 'Local não encontrado'
      });
    }

    // Verificar se o usuário é o dono do local
    if (String(local.userId) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Não autorizado a deletar este local'
      });
    }

    // Deletar imagem no Cloudinary se existir
    if (local.imageUrl) {
      try {
        await deleteFromCloudinary(local.imageUrl);
      } catch (imageError) {
        console.warn('Falha ao remover imagem antiga do Cloudinary:', imageError?.message || imageError);
      }
    }

    // Deletar local do banco
    await Local.findByIdAndDelete(local._id);

    res.json({
      success: true,
      message: 'Local deletado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar local:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =======================
// PUT /ativar-local/:localId
// Ativa um local após pagamento bem-sucedido
// =======================
export const ativarLocal = async (req, res) => {
  try {
    const { localId } = req.params;
    const { subscriptionId } = req.body;

    if (!localId) {
      return res.status(400).json({
        success: false,
        message: 'localId é obrigatório'
      });
    }

    // Buscar local
    const local = await Local.findOne({
      $or: [
        { localId },
        { _id: localId }
      ]
    });

    if (!local) {
      return res.status(404).json({
        success: false,
        message: 'Local não encontrado'
      });
    }

    // Atualizar status para ativo
    local.status = 'ativo';
    local.atualizadoEm = new Date(getBrazilDate());

    if (subscriptionId) {
      local.subscriptionId = subscriptionId;
    }

    const localAtualizado = await local.save();

    res.json({
      success: true,
      message: 'Local ativado com sucesso',
      local: {
        id: localAtualizado._id,
        localId: localAtualizado.localId,
        status: localAtualizado.status,
        subscriptionId: localAtualizado.subscriptionId
      }
    });

  } catch (error) {
    console.error('Erro ao ativar local:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =======================
// GET /locais (buscar locais)
// =======================
export const buscarLocais = async (req, res) => {
  try {
    const {
      q,
      country,
      state,
      city,
      localType,
      page = 1,
      limit = 10,
      status = 'ativo'
    } = req.query;

    // Construir filtros
    const filters = { status };

    if (q) {
      filters.$or = [
        { localName: { $regex: q, $options: 'i' } },
        { localDescricao: { $regex: q, $options: 'i' } }
      ];
    }

    if (country) filters.country = country;
    if (state) filters.state = state;
    if (city) filters.city = city;
    if (localType) filters.localType = localType;

    // Paginação
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Buscar locais
    const locais = await Local.find(filters)
      .populate('userId', 'name username email')
      .sort({ criadoEm: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Local.countDocuments(filters);

    res.json({
      success: true,
      data: {
        items: locais,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Erro ao buscar locais:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =======================
// POST /editar-local  (editarLocal)
// body: localId (ou _id), localName, localDescricao, country, countryCode, state, city, lat, lng, removeImage
// optional file: req.file (multer single 'image')
// =======================
export const editarLocal = async (req, res) => {
  try {
    const {
      localId,
      link,
      localName,
      localDescricao,
      country,
      countryCode,
      state,
      city,
      lat,
      lng,
      localType, // Capturar localType para validação
    } = req.body || {};

    if (!localId) {
      return res.status(400).json({ success: false, msg: "Parâmetro localId obrigatório." });
    }

    // Verificar se está tentando alterar o tipo de local (não permitido)
    if (localType !== undefined) {
      return res.status(400).json({
        success: false,
        msg: "Não é permitido alterar o tipo de local após a criação devido às diferenças de preço."
      });
    }

    // procura tolerante: localId, _id, localId field
    const queryOr = [
      { localId: localId },
    ];
    // se for um ObjectId válido, já coberto pela _id; se não, a query acima ainda funciona
    const local = await Local.findOne({ $or: queryOr });

    if (!local) {
      return res.status(404).json({ success: false, msg: "Local não encontrado." });
    }

    // checar propriedade via token (se disponível)
    try {
      if (req.userEmail) {
        const requester = await User.findOne({ email: req.userEmail });
        if (requester && String(local.userId) !== String(requester._id)) {
          return res.status(403).json({ success: false, msg: "Não autorizado a editar este local." });
        }
      }
    } catch (authErr) {
      console.warn('Falha na verificação de propriedade:', authErr?.message || authErr);
    }

    // atualizar campos se vierem
    if (link !== undefined) local.link = String(link || "");
    if (localName !== undefined) local.localName = String(localName || "");
    if (localDescricao !== undefined) local.localDescricao = String(localDescricao || "");
    if (country !== undefined) local.country = country ? String(country).trim() : null;
    if (countryCode !== undefined) local.countryCode = countryCode ? String(countryCode).trim().toUpperCase() : null;
    if (state !== undefined) local.state = state ? String(state).trim() : null;
    if (city !== undefined) local.city = city ? String(city).trim() : null;
    if (lat !== undefined) local.lat = lat ? parseFloat(lat) : null;
    if (lng !== undefined) local.lng = lng ? parseFloat(lng) : null;

    // se veio arquivo novo, substituir
    if (req.file) {
      // apagar arquivo antigo do Cloudinary se existir
      if (local.imageUrl) {
        try {
          await deleteFromCloudinary(local.imageUrl);
        } catch (e) {
          console.warn("Erro ao apagar imagem antiga do Cloudinary:", e?.message || e);
        }
      }

      // fazer upload da nova imagem para Cloudinary
      try {
        const cloudinaryResult = await uploadToCloudinary(req.file.buffer, 'image-local', 'image');
        local.imageUrl = cloudinaryResult.secure_url;
        console.log('Nova imagem enviada para Cloudinary:', cloudinaryResult.secure_url);
      } catch (uploadError) {
        console.error('Erro no upload da nova imagem para Cloudinary:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Erro no upload da nova imagem'
        });
      }
    }

    // se removeImage=true, apagar imagem atual
    if (req.body.removeImage === 'true' || req.body.removeImage === true) {
      if (local.imageUrl) {
        try {
          await deleteFromCloudinary(local.imageUrl);
        } catch (e) {
          console.warn("Erro ao apagar imagem do Cloudinary:", e?.message || e);
        }
      }
      local.imageUrl = null;
    }

    local.atualizadoEm = new Date(getBrazilDate());
    await local.save();

    return res.json({ success: true, msg: "Local editado com sucesso.", local });
  } catch (error) {
    console.error("Erro ao editar local:", error);
    return res.status(500).json({ success: false, msg: "Erro interno do servidor." });
  }
};

// =======================
// GET /meus-locais
// Lista todos os locais do usuário logado
// =======================
export const meusLocais = async (req, res) => {
  try {
    let { userId } = req.query;

    // Se autenticado, forçar userId do token para evitar IDOR
    if (req.userEmail) {
      try {
        const requester = await User.findOne({ email: req.userEmail });
        if (requester) userId = String(requester._id);
      } catch (e) { /* ignore */ }
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId é obrigatório'
      });
    }

    // Buscar locais do usuário
    const locais = await Local.find({ userId: userId })
      .sort({ criadoEm: -1 })
      .lean();

    // Calcular estatísticas dos locais
    const estatisticas = {
      total: locais.length,
      ativos: locais.filter(local => local.status === 'ativo').length,
      inativos: locais.filter(local => local.status === 'inativo').length,
      totalImpressoes: locais.reduce((acc, local) => acc + (local.estatisticas?.impressoes || 0), 0),
      totalCliques: locais.reduce((acc, local) => acc + (local.estatisticas?.cliques || 0), 0),
      mediaAvaliacoes: locais.reduce((acc, local) => {
        const avaliacoesAceitas = local.avaliacoes?.filter(av => av.aceito) || [];
        if (avaliacoesAceitas.length > 0) {
          const media = avaliacoesAceitas.reduce((sum, av) => sum + av.estrelas, 0) / avaliacoesAceitas.length;
          return acc + media;
        }
        return acc;
      }, 0) / (locais.filter(local => local.avaliacoes?.some(av => av.aceito)).length || 1)
    };

    res.json({
      success: true,
      data: {
        locais,
        estatisticas
      }
    });

  } catch (error) {
    console.error('Erro ao buscar locais do usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
