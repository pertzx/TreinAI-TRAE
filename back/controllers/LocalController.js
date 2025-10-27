import Local from '../models/Local.js';
import User from '../models/User.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { getBrazilDate } from '../helpers/getBrazilDate.js';

// Configuração do multer para upload de imagens
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads', 'image-local');
    // Criar diretório se não existir
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

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
// POST /criar-local-direto
// Cria um local diretamente no banco (sem pagamento)
// Status inicial: 'pendente_pagamento'
// =======================
export const criarLocalDireto = async (req, res) => {
  try {
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

    // Processar imagem se enviada
    let imagePath = null;
    if (req.file) {
      imagePath = `uploads/image-local/${req.file.filename}`;
    }

    // Gerar ID único para o local
    const localId = uuidv4();

    // Criar local no banco
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
      imagePath,
      subscriptionId: 'temp_' + localId, // ID temporário até o pagamento
      status: 'inativo', // Status inicial válido
      criadoEm: new Date(getBrazilDate()),
      atualizadoEm: new Date(getBrazilDate())
    });

    const localSalvo = await novoLocal.save();

    res.status(201).json({
      success: true,
      message: 'Local criado com sucesso',
      local: {
        id: localSalvo._id,
        localId: localSalvo.localId,
        localName: localSalvo.localName,
        localDescricao: localSalvo.localDescricao,
        localType: localSalvo.localType,
        status: localSalvo.status,
        imagePath: localSalvo.imagePath
      }
    });

  } catch (error) {
    console.error('Erro ao criar local:', error);
    
    // Limpar arquivo de imagem se houve erro
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Erro ao limpar arquivo:', unlinkError);
      }
    }

    res.status(500).json({
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
    const local = await Local.findById(localId);
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

    const local = await Local.findById(localId).lean();
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

    const local = await Local.findById(localId);
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

    // Deletar arquivo de imagem se existir
    if (local.imagePath) {
      try {
        const imagePath = path.join(process.cwd(), local.imagePath);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (imageError) {
        console.error('Erro ao deletar imagem:', imageError);
        // Não falhar a operação por causa da imagem
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
      // apagar arquivo antigo se existir
      if (local.imagePath) {
        try {
          const oldPath = path.join(process.cwd(), local.imagePath);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        } catch (e) {
          console.warn("Erro ao apagar imagem antiga:", e?.message || e);
        }
      }
      // definir nova imagem
      local.imagePath = `uploads/image-local/${req.file.filename}`;
    }

    // se removeImage=true, apagar imagem atual
    if (req.body.removeImage === 'true' || req.body.removeImage === true) {
      if (local.imagePath) {
        try {
          const oldPath = path.join(process.cwd(), local.imagePath);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        } catch (e) {
          console.warn("Erro ao apagar imagem:", e?.message || e);
        }
      }
      local.imagePath = null;
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
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId é obrigatório'
      });
    }

    // Buscar locais do usuário
    const locais = await Local.find({ userId })
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
