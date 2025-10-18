import Anuncio from "../models/Anuncios.js";
import dotenv from "dotenv";
import fs from 'fs'
import path from "path";
import User from "../models/User.js";
import Ticket from "../models/Ticket.js"
import mongoose from "mongoose";

dotenv.config();

// =======================
const deleteFileIfExists = (filename) => {
    if (!filename) return;
    const filePath = path.join('uploads/midias-anuncio', filename);
    if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (err) { console.warn('Erro removendo arquivo:', filePath, err); }
    }
};

export const criarAnuncio = async (req, res) => {
    try {
        const { link, userId, titulo, descricao, anuncioTipo, country, countryCode, state, city } = req.body;
        const backendUrl = process.env.BASEURL?.replace(/\/+$/, '');
        const uploadedFile = req.file;

        // Function to delete uploaded file if exists
        const deleteUploadedFile = () => {
            if (uploadedFile) {
                const filePath = path.join('uploads/midias-anuncio', uploadedFile.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        };

        // Verify if professional exists
        const user = await User.findById(userId);
        if (!user) {
            deleteUploadedFile();
            return res.status(404).json({ msg: "user não encontrado" });
        }

        // Check number of existing ads for this professional
        const existingAdsCount = await Anuncio.countDocuments({ userId });
        if (existingAdsCount >= 5) {
            deleteUploadedFile();
            return res.status(400).json({
                msg: "Limite máximo de 5 anúncios atingido. Exclua ou edite um anúncio existente."
            });
        }

        // File size checks
        if (uploadedFile) {
            const fileSize = uploadedFile.size;
            const isVideo = uploadedFile.mimetype.startsWith('video/');
            const isImage = uploadedFile.mimetype.startsWith('image/');
            const MB = 1024 * 1024;

            if (isImage && fileSize > MB) {
                deleteUploadedFile();
                return res.status(400).json({
                    msg: "Imagem deve ser menor que 1MB"
                });
            }

            if (isVideo && fileSize > 35 * MB) {
                deleteUploadedFile();
                return res.status(400).json({
                    msg: "Vídeo deve ser menor que 35MB"
                });
            }
        }

        const midiaUrl = uploadedFile ? (uploadedFile.url || `/uploads/midias-anuncio/${uploadedFile.filename}`) : null;

        // Create object with required fields
        const anuncioData = {
            link,
            userId,
            titulo,
            descricao,
            anuncioTipo,
            midiaUrl
        };

        // Only add location fields if they exist and are not null/undefined
        if (country) anuncioData.country = country;
        if (countryCode) anuncioData.countryCode = countryCode;
        if (state) anuncioData.state = state;
        if (city) anuncioData.city = city;

        const novoAnuncio = await Anuncio.create(anuncioData);

        novoAnuncio.save();

        return res.status(201).json({
            msg: "Anúncio criado com sucesso",
            data: novoAnuncio
        });

    } catch (error) {
        if (req.file) {
            const filePath = path.join('uploads/midias-anuncio', req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        console.log('Erro ao criar anúncio:', error);

        return res.status(500).json({
            msg: "Erro ao criar anúncio",
            error: error.msg
        });
    }
}

export const editarAnuncio = async (req, res) => {
    try {
        const { anuncioId, link, userId, titulo, descricao, anuncioTipo, country, countryCode, state, city } = req.body;
        const backendUrl = process.env.BASEURL?.replace(/\/+$/, '');
        const uploadedFile = req.file;

        // valida básicos
        if (!anuncioId || !userId) {
            if (uploadedFile) deleteFileIfExists(uploadedFile.filename);
            return res.status(400).json({ msg: "anuncioId e userId são obrigatórios para editar", success: false });
        }

        const anuncio = await Anuncio.findOne({ anuncioId });
        if (!anuncio) {
            if (uploadedFile) deleteFileIfExists(uploadedFile.filename);
            return res.status(404).json({ msg: "Anúncio não encontrado", success: false });
        }

        // Verifica ownership / permissões (admins podem editar)
        const user = await User.findById(userId);
        if (!user) {
            if (uploadedFile) deleteFileIfExists(uploadedFile.filename);
            return res.status(404).json({ msg: "user não encontrado", success: false });
        }
        if (anuncio.userId !== userId && user.role !== 'admin') {
            if (uploadedFile) deleteFileIfExists(uploadedFile.filename);
            return res.status(403).json({ msg: "Não autorizado a editar este anúncio", success: false });
        }

        // valida upload (se houver)
        const MB = 1024 * 1024;
        if (uploadedFile) {
            const fileSize = uploadedFile.size;
            const isVideo = uploadedFile.mimetype.startsWith('video/');
            const isImage = uploadedFile.mimetype.startsWith('image/');

            // Se o cliente mudou o anuncioTipo, respeitamos; se não enviou anuncioTipo, usamos o existente
            const effectiveTipo = anuncioTipo || anuncio.anuncioTipo;

            if (effectiveTipo === 'imagem' && !isImage) {
                deleteFileIfExists(uploadedFile.filename);
                return res.status(400).json({ msg: "Tipo esperado: imagem", success: false });
            }
            if (effectiveTipo === 'video' && !isVideo) {
                deleteFileIfExists(uploadedFile.filename);
                return res.status(400).json({ msg: "Tipo esperado: vídeo", success: false });
            }

            if (isImage && fileSize > MB * 1) {
                deleteFileIfExists(uploadedFile.filename);
                return res.status(400).json({ msg: "Imagem deve ser menor que 1MB", success: false });
            }
            if (isVideo && fileSize > MB * 35) {
                deleteFileIfExists(uploadedFile.filename);
                return res.status(400).json({ msg: `Vídeo deve ser menor que 35MB`, success: false });
            }
        }

        // Monta o objeto de atualização. **Importante**: só sobrescrevemos midiaUrl se houver upload novo.
        const anuncioData = {};
        if (typeof link !== 'undefined') anuncioData.link = link;
        if (typeof titulo !== 'undefined') anuncioData.titulo = titulo;
        if (typeof descricao !== 'undefined') anuncioData.descricao = descricao;
        if (typeof anuncioTipo !== 'undefined') anuncioData.anuncioTipo = anuncioTipo;

        if (typeof country !== 'undefined') anuncioData.country = country;
        if (typeof countryCode !== 'undefined') anuncioData.countryCode = countryCode;
        if (typeof state !== 'undefined') anuncioData.state = state;
        if (typeof city !== 'undefined') anuncioData.city = city;

        // tratamos midia: se enviou arquivo novo, removemos antigo e guardamos novo midiaUrl
        if (uploadedFile) {
            try {
                // Remove arquivo antigo se houver
                if (anuncio.midiaUrl) {
                    // Se é URL do Cloudinary, deletar do Cloudinary
                    if (anuncio.midiaUrl.includes('cloudinary.com')) {
                        try {
                            const { deleteFromCloudinary } = await import('../config/cloudinaryConfig.js');
                            await deleteFromCloudinary(anuncio.midiaUrl);
                            console.log('[AnunciosController] Mídia antiga removida do Cloudinary');
                        } catch (cloudinaryError) {
                            console.warn('[AnunciosController] Falha ao remover mídia antiga do Cloudinary:', cloudinaryError);
                        }
                    } else {
                        // Se é arquivo local, deletar do sistema de arquivos
                        const oldFilename = anuncio.midiaUrl.split('/').pop();
                        deleteFileIfExists(oldFilename);
                    }
                }
            } catch (err) {
                console.warn('Erro ao deletar mídia antiga (continua):', err);
            }

            // Usar path do Cloudinary em produção ou URL local em desenvolvimento
            const newMidiaUrl = uploadedFile.url || `/uploads/midias-anuncio/${uploadedFile.filename}`;
            anuncioData.midiaUrl = newMidiaUrl;
        }
        // Se NÃO houve upload, não tocamos no campo midiaUrl (preserva existente)

        const updated = await Anuncio.findOneAndUpdate({ anuncioId }, anuncioData, { new: true });

        return res.status(200).json({
            msg: "Anúncio editado com sucesso",
            anuncio: updated,
            success: true
        });

    } catch (error) {
        if (req.file) deleteFileIfExists(req.file.filename);
        console.error('Erro ao editar anúncio:', error);
        return res.status(500).json({
            msg: "Erro ao editar anúncio",
            error: error?.message || error,
            success: true
        });
    }
};

/**
 * Busca anúncios com base em critérios de localização e quantidade
 * Implementa lógica de priorização otimizada para grandes volumes de dados
 * @param {Object} req - Objeto de requisição Express
 * @param {Object} req.query - Parâmetros de consulta
 * @param {string} [req.query.userId] - ID do usuário para buscar anúncios específicos
 * @param {string} [req.query.country] - País para filtrar anúncios
 * @param {string} [req.query.state] - Estado para filtrar anúncios
 * @param {string} [req.query.city] - Cidade para filtrar anúncios
 * @param {string} [req.query.quantidade] - Número máximo de anúncios a retornar
 * @param {Object} res - Objeto de resposta Express
 * @returns {Promise<Object>} Lista de anúncios priorizados por proximidade e impressões
 */
export const getAnuncios = async (req, res) => {
    try {
        // Suporte tanto para req.body (POST) quanto req.query (GET) para compatibilidade
        const requestData = req.body || req.query || {};
        const { anunciosVisualizados = [], userId, country = null, state = null, city = null, quantidade } = requestData;

        // console.log('[getAnuncios] Parâmetros de entrada:', { userId, country, state, city, quantidade, anunciosVisualizados });

        // Validação e processamento do array de anúncios visualizados
        let excludeAnuncioIds = [];
        if (anunciosVisualizados) {
            try {
                // Se for string, tentar fazer parse do JSON
                const anunciosArray = typeof anunciosVisualizados === 'string'
                    ? JSON.parse(anunciosVisualizados)
                    : anunciosVisualizados;

                if (Array.isArray(anunciosArray)) {
                    // Validar e converter IDs para ObjectId
                    excludeAnuncioIds = anunciosArray
                        .filter(id => {
                            if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
                                return true;
                            }
                            // console.warn('[getAnuncios] ID inválido ignorado:', id);
                            return false;
                        })
                        .map(id => new mongoose.Types.ObjectId(`${id}`));

                    // console.log(`[getAnuncios] ${excludeAnuncioIds.length} IDs válidos para exclusão`);
                } else {
                    // console.warn('[getAnuncios] Parâmetro anuncios não é um array válido');
                }
            } catch (error) {
                // console.warn('[getAnuncios] Erro ao processar array de anúncios visualizados:', error.message);
            }
        }

        // Validação do parâmetro quantidade
        let limitQuantidade = null;
        if (quantidade !== undefined && quantidade !== null && quantidade !== '') {
            const quantidadeNum = parseInt(Number(quantidade), 10);

            if (isNaN(quantidadeNum) || quantidadeNum <= 0 || !Number.isInteger(quantidadeNum)) {
                return res.status(400).json({
                    msg: "Parâmetro 'quantidade' deve ser um número inteiro positivo",
                    error: "INVALID_QUANTIDADE_PARAMETER"
                });
            }

            limitQuantidade = quantidadeNum;
        }

        // Caso específico: buscar anúncios de um usuário específico
        if (userId) {
            // console.log('[getAnuncios] Buscando anúncios para o userId:', userId);

            // Validate userId format
            if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
                return res.status(400).json({
                    msg: "userId inválido",
                    error: "INVALID_USERID"
                });
            }

            // Verificação de segurança - verificar se o usuário existe
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    msg: "Usuário não encontrado",
                    error: "USER_NOT_FOUND"
                });
            }

            // Buscar TODOS os anúncios do usuário específico, SEM filtros adicionais
            const anuncios = await Anuncio.find({ userId })
                .sort({ 'estatisticas.impressoes': 1 })
                .exec();

            // console.log(`[getAnuncios] Encontrados ${anuncios.length} anúncios para o usuário ${userId}`);

            return res.status(200).json({
                anuncios,
                success: true,
                totalRetornados: anuncios.length,
                limiteSolicitado: null
            });
        }

        // console.log('[getAnuncios] Iniciando busca de anúncios com priorização por impressões');

        // Pipeline principal: priorizar impressões, depois localização hierárquica
        const pipeline = [
            // Estágio 1: Filtro básico por status ativo
            {
                $match: {
                    status: 'ativo'
                }
            },

            // Estágio 2: Filtro de exclusão de anúncios já visualizados (se houver)
            ...(excludeAnuncioIds.length > 0 ? [{
                $match: {
                    _id: { $nin: excludeAnuncioIds }
                }
            }] : []),

            // Estágio 3: Lookup para dados do usuário (saldo)
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userData'
                }
            },

            // Estágio 4: Filtrar apenas anúncios com saldo > 0
            {
                $match: {
                    'userData.saldoDeImpressoes': { $gt: 0 }
                }
            },

            // Estágio 5: Adicionar campos para ordenação hierárquica
            {
                $addFields: {
                    impressoesTotais: {
                        $ifNull: ['$estatisticas.impressoes', 0]
                    },
                    // Classificação de localização (0 = mais específico, 3 = menos específico)
                    locationPriority: {
                        $cond: {
                            if: {
                                $and: [
                                    { $ne: [country, null] },
                                    { $ne: [country, ''] }
                                ]
                            },
                            then: {
                                $switch: {
                                    branches: [
                                        // Mesma cidade = prioridade 0 (mais específico)
                                        {
                                            case: {
                                                $and: [
                                                    { $eq: ['$country', country] },
                                                    { $eq: ['$state', state] },
                                                    { $eq: ['$city', city] },
                                                    { $ne: [city, null] },
                                                    { $ne: [city, ''] }
                                                ]
                                            },
                                            then: 0
                                        },
                                        // Mesmo estado = prioridade 1
                                        {
                                            case: {
                                                $and: [
                                                    { $eq: ['$country', country] },
                                                    { $eq: ['$state', state] },
                                                    { $ne: [state, null] },
                                                    { $ne: [state, ''] }
                                                ]
                                            },
                                            then: 1
                                        },
                                        // Mesmo país = prioridade 2
                                        {
                                            case: {
                                                $eq: ['$country', country]
                                            },
                                            then: 2
                                        }
                                    ],
                                    default: 3 // Outros locais = prioridade 3 (menos específico)
                                }
                            },
                            else: 3 // Sem localização = prioridade 3
                        }
                    }
                }
            },

            // Estágio 6: Ordenação hierárquica - IMPRESSÕES PRIMEIRO, depois localização
            {
                $sort: {
                    impressoesTotais: 1,      // Prioridade 1: Menor número de impressões
                    locationPriority: 1,      // Prioridade 2: Localização mais específica
                    _id: 1                    // Prioridade 3: Consistência
                }
            },

            // Estágio 7: Aplicar limite se especificado
            ...(limitQuantidade ? [{ $limit: limitQuantidade }] : []),

            // Estágio 8: Remover campos temporários
            {
                $project: {
                    userData: 0,
                    impressoesTotais: 0,
                    locationPriority: 0
                }
            }
        ];

        // console.log('[getAnuncios] Executando pipeline com priorização por impressões');

        // Executar agregação
        const anuncios = await Anuncio.aggregate(pipeline);

        // console.log(`[getAnuncios] Pipeline retornou ${anuncios.length} anúncios`);

        // Se não encontrou anúncios (por saldo ou exclusão), tentar fallback
        if (anuncios.length === 0) {
            // console.log('[getAnuncios] Nenhum anúncio encontrado, tentando fallback');

            // Determinar tipo de fallback baseado na presença de exclusões
            const isExclusionFallback = excludeAnuncioIds.length > 0;
            const fallbackMessage = isExclusionFallback
                ? 'sem filtro de exclusão de anúncios visualizados'
                : 'sem filtro de saldo';

            // console.log(`[getAnuncios] Executando fallback ${fallbackMessage}`);

            const fallbackPipeline = [
                // Estágio 1: Filtro básico por status ativo
                {
                    $match: {
                        status: 'ativo'
                    }
                },

                // Estágio 2: Filtro de exclusão de anúncios já visualizados (se houver)
                ...(excludeAnuncioIds.length > 0 ? [{
                    $match: {
                        _id: { $nin: excludeAnuncioIds }
                    }
                }] : []),

                // Estágio 3: Adicionar campos para ordenação
                {
                    $addFields: {
                        impressoesTotais: {
                            $ifNull: ['$estatisticas.impressoes', 0]
                        },
                        locationPriority: {
                            $cond: {
                                if: {
                                    $and: [
                                        { $ne: [country, null] },
                                        { $ne: [country, ''] }
                                    ]
                                },
                                then: {
                                    $switch: {
                                        branches: [
                                            {
                                                case: {
                                                    $and: [
                                                        { $eq: ['$country', country] },
                                                        { $eq: ['$state', state] },
                                                        { $eq: ['$city', city] },
                                                        { $ne: [city, null] },
                                                        { $ne: [city, ''] }
                                                    ]
                                                },
                                                then: 0
                                            },
                                            {
                                                case: {
                                                    $and: [
                                                        { $eq: ['$country', country] },
                                                        { $eq: ['$state', state] },
                                                        { $ne: [state, null] },
                                                        { $ne: [state, ''] }
                                                    ]
                                                },
                                                then: 1
                                            },
                                            {
                                                case: {
                                                    $eq: ['$country', country]
                                                },
                                                then: 2
                                            }
                                        ],
                                        default: 3
                                    }
                                },
                                else: 3
                            }
                        }
                    }
                },

                // Estágio 4: Ordenação hierárquica
                {
                    $sort: {
                        impressoesTotais: 1,
                        locationPriority: 1,
                        _id: 1
                    }
                },

                // Estágio 5: Aplicar limite se especificado
                ...(limitQuantidade ? [{ $limit: limitQuantidade }] : []),

                // Estágio 6: Remover campos temporários
                {
                    $project: {
                        impressoesTotais: 0,
                        locationPriority: 0
                    }
                }
            ];

            const anunciosFallback = await Anuncio.aggregate(fallbackPipeline);
            // console.log(`[getAnuncios] Fallback retornou ${anunciosFallback.length} anúncios`);

            // Se o fallback não retornou resultados, executar fallback final sem lógica de remoção
            if (anunciosFallback.length === 0) {
                // console.log('[getAnuncios] Fallback não retornou resultados, executando fallback final sem filtros');

                const fallbackFinalPipeline = [
                    // Estágio 1: Filtro básico por status ativo apenas
                    {
                        $match: {
                            status: 'ativo'
                        }
                    },

                    // Estágio 2: Adicionar campos para ordenação
                    {
                        $addFields: {
                            impressoesTotais: {
                                $ifNull: ['$estatisticas.impressoes', 0]
                            },
                            locationPriority: {
                                $cond: {
                                    if: {
                                        $and: [
                                            { $ne: [country, null] },
                                            { $ne: [country, ''] }
                                        ]
                                    },
                                    then: {
                                        $switch: {
                                            branches: [
                                                {
                                                    case: {
                                                        $and: [
                                                            { $eq: ['$country', country] },
                                                            { $eq: ['$state', state] },
                                                            { $eq: ['$city', city] }
                                                        ]
                                                    },
                                                    then: 1
                                                },
                                                {
                                                    case: {
                                                        $and: [
                                                            { $eq: ['$country', country] },
                                                            { $eq: ['$state', state] }
                                                        ]
                                                    },
                                                    then: 2
                                                },
                                                {
                                                    case: { $eq: ['$country', country] },
                                                    then: 3
                                                }
                                            ],
                                            default: 4
                                        }
                                    },
                                    else: 5
                                }
                            }
                        }
                    },

                    // Estágio 3: Ordenação hierárquica por localização e impressões
                    {
                        $sort: {
                            locationPriority: 1,
                            impressoesTotais: 1
                        }
                    },

                    // Estágio 4: Aplicar limite se especificado
                    ...(limitQuantidade ? [{ $limit: limitQuantidade }] : []),

                    // Estágio 5: Remover campos temporários
                    {
                        $project: {
                            impressoesTotais: 0,
                            locationPriority: 0
                        }
                    }
                ];

                const anunciosFallbackFinal = await Anuncio.aggregate(fallbackFinalPipeline);
                // console.log(`[getAnuncios] Fallback final retornou ${anunciosFallbackFinal.length} anúncios`);

                // Gerar tickets para cada anúncio retornado do fallback final
                const anunciosFallbackFinalComTickets = await Promise.all(anunciosFallbackFinal.map(async (anuncio) => {
                    // Criar ticket para impressão
                    const ticketImpressao = new Ticket();
                    await ticketImpressao.save();

                    // Criar ticket para clique
                    const ticketClique = new Ticket();
                    await ticketClique.save();

                    // Adicionar tickets ao anúncio
                    return {
                        ...anuncio,
                        ticketImpressao: ticketImpressao.valor,
                        ticketClique: ticketClique.valor
                    };
                }));

                return res.status(200).json({
                    anuncios: anunciosFallbackFinalComTickets,
                    success: true,
                    totalRetornados: anunciosFallbackFinalComTickets.length,
                    limiteSolicitado: limitQuantidade,
                    debug: 'Fallback final - sem filtros de exclusão ou saldo',
                    anunciosExcluidosOriginal: excludeAnuncioIds.length
                });
            }

            // Gerar tickets para cada anúncio retornado do fallback
            const anunciosFallbackComTickets = await Promise.all(anunciosFallback.map(async (anuncio) => {
                // Criar ticket para impressão
                const ticketImpressao = new Ticket();
                await ticketImpressao.save();

                // Criar ticket para clique
                const ticketClique = new Ticket();
                await ticketClique.save();

                // Adicionar tickets ao anúncio
                return {
                    ...anuncio,
                    ticketImpressao: ticketImpressao.valor,
                    ticketClique: ticketClique.valor
                };
            }));

            return res.status(200).json({
                anuncios: anunciosFallbackComTickets,
                success: true,
                totalRetornados: anunciosFallbackComTickets.length,
                limiteSolicitado: limitQuantidade,
                debug: `Fallback - ${fallbackMessage}`,
                anunciosExcluidosOriginal: excludeAnuncioIds.length
            });
        }

        // Gerar tickets para cada anúncio retornado
        const anunciosComTickets = await Promise.all(anuncios.map(async (anuncio) => {
            // Criar ticket para impressão
            const ticketImpressao = new Ticket();
            await ticketImpressao.save();

            // Criar ticket para clique
            const ticketClique = new Ticket();
            await ticketClique.save();

            // Adicionar tickets ao anúncio
            return {
                ...anuncio,
                ticketImpressao: ticketImpressao.valor,
                ticketClique: ticketClique.valor
            };
        }));

        return res.status(200).json({
            anuncios: anunciosComTickets,
            success: true,
            totalRetornados: anunciosComTickets.length,
            limiteSolicitado: limitQuantidade,
            anunciosExcluidosOriginal: excludeAnuncioIds.length
        });

    } catch (error) {
        // console.error('[getAnuncios] Erro ao buscar anúncios:', error);
        return res.status(500).json({
            msg: "Erro interno do servidor ao buscar anúncios",
            error: "INTERNAL_SERVER_ERROR"
        });
    }
};

export const deletarAnuncio = async (req, res) => {
    try {
        const { anuncioId, userId } = req.body;

        const anuncio = await Anuncio.findOne({ anuncioId });
        if (!anuncio) {
            return res.status(404).json({ msg: "Anúncio não encontrado" });
        }

        // Basic security check - verify if the professional owns this ad
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ msg: "user não encontrado" });
        }

        if (anuncio.userId !== userId && user.role !== 'admin') {
            return res.status(403).json({ msg: "Não autorizado a deletar este anúncio" });
        }

        // Delete media file if exists
        if (anuncio.midiaUrl) {
            const filename = anuncio.midiaUrl.split('/').pop();
            const filePath = path.join('uploads/midias-anuncio', filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        // Delete from database
        await Anuncio.findOneAndDelete({ anuncioId });

        return res.status(200).json({ msg: "Anúncio deletado com sucesso" });

    } catch (error) {
        return res.status(500).json({
            msg: "Erro ao deletar anúncio",
            error: error.msg
        });
    }
}

export const marcarClique = async (req, res) => {
    try {
        const { anuncioId, userId, ticketClique } = req.body;

        // Validações básicas
        if (!anuncioId) {
            return res.status(400).json({
                msg: "ID do anúncio é obrigatório",
                error: "ANUNCIO_ID_REQUIRED"
            });
        }

        if (!userId) {
            return res.status(400).json({
                msg: "ID do usuário é obrigatório",
                error: "USER_ID_REQUIRED"
            });
        }

        if (!ticketClique) {
            return res.status(400).json({
                msg: "Ticket de clique é obrigatório",
                error: "TICKET_CLIQUE_REQUIRED"
            });
        }

        // Verificar se o ticket existe
        const ticket = await Ticket.findOne({ valor: ticketClique });
        if (!ticket) {
            return res.status(404).json({
                msg: "Ticket de clique inválido ou não encontrado",
                error: "INVALID_TICKET"
            });
        }

        // Verificação pra saber se realmente é um usuario, segurança contra falsa requisição
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                msg: "Usuário não encontrado",
                error: "USER_NOT_FOUND"
            });
        }

        // Buscar o anúncio
        const anuncio = await Anuncio.findById(anuncioId);
        if (!anuncio) {
            return res.status(404).json({
                msg: "Anúncio não encontrado",
                error: "ANUNCIO_NOT_FOUND"
            });
        }

        // Obter IP do usuário para auditoria
        const userIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress ||
            (req.connection.socket ? req.connection.socket.remoteAddress : null);

        // Incrementar contador agregado de cliques
        anuncio.estatisticas.cliques += 1;

        // Salvar as alterações
        await anuncio.save();

        // Remover o ticket após uso
        await Ticket.findByIdAndDelete(ticket._id);

        console.log(`[marcarClique] Clique registrado - Anúncio: ${anuncioId}, Usuário: ${userId}, IP: ${userIp}, Ticket: ${ticketClique}`);

        return res.status(200).json({
            msg: "Clique registrado com sucesso",
            success: true,
            totalCliques: anuncio.estatisticas.cliques
        });

    } catch (error) {
        console.error('[marcarClique] Erro ao registrar clique:', error);
        return res.status(500).json({
            msg: "Erro interno do servidor ao registrar clique",
            error: "INTERNAL_SERVER_ERROR"
        });
    }
};
export const marcarImpressao = async (req, res) => {
    try {
        const { anuncioId, userId, ticketImpressao } = req.body;

        // Validações básicas
        if (!anuncioId) {
            return res.status(400).json({
                msg: "ID do anúncio é obrigatório",
                error: "ANUNCIO_ID_REQUIRED"
            });
        }

        if (!userId) {
            return res.status(400).json({
                msg: "ID do usuário é obrigatório",
                error: "USER_ID_REQUIRED"
            });
        }

        if (!ticketImpressao) {
            return res.status(400).json({
                msg: "Ticket de impressão é obrigatório",
                error: "TICKET_IMPRESSAO_REQUIRED"
            });
        }

        // Verificar se o ticket existe
        const ticket = await Ticket.findOne({ valor: ticketImpressao });
        if (!ticket) {
            return res.status(404).json({
                msg: "Ticket de impressão inválido ou não encontrado",
                error: "INVALID_TICKET"
            });
        }

        // Verificação pra saber se realmente é um usuario, segurança contra falsa requisição
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                msg: "Usuário não encontrado",
                error: "USER_NOT_FOUND"
            });
        }

        // Buscar o anúncio
        const anuncio = await Anuncio.findById(anuncioId);
        if (!anuncio) {
            return res.status(404).json({
                msg: "Anúncio não encontrado",
                error: "ANUNCIO_NOT_FOUND"
            });
        }

        // Obter IP do usuário para auditoria
        const userIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress ||
            (req.connection.socket ? req.connection.socket.remoteAddress : null);

        // Incrementar contador agregado de impressões
        anuncio.estatisticas.impressoes += 1;

        // Decrementar saldo de impressões do usuário
        user.saldoDeImpressoes -= 1;
        await user.save();

        // Salvar as alterações do anúncio
        await anuncio.save();

        // Remover o ticket após uso
        await Ticket.findByIdAndDelete(ticket._id);

        console.log(`[marcarImpressao] Impressão registrada - Anúncio: ${anuncioId}, Usuário: ${userId}, IP: ${userIp}, Ticket: ${ticketImpressao}`);

        return res.status(200).json({
            msg: "Impressão registrada com sucesso",
            success: true,
            totalImpressoes: anuncio.estatisticas.impressoes,
            saldoRestante: user.saldoDeImpressoes
        });

    } catch (error) {
        console.error('[marcarImpressao] Erro ao registrar impressão:', error);
        return res.status(500).json({
            msg: "Erro interno do servidor ao registrar impressão",
            error: "INTERNAL_SERVER_ERROR"
        });
    }
};