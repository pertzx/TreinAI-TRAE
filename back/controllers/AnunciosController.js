import Anuncio from "../models/Anuncios.js";
import dotenv from "dotenv";
import fs from 'fs'
import path from "path";
import User from "../models/User.js";

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

        const midiaUrl = uploadedFile ? `/uploads/midias-anuncio/${uploadedFile.filename}` : null;

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
                    const oldFilename = anuncio.midiaUrl.split('/').pop();
                    deleteFileIfExists(oldFilename);
                }
            } catch (err) {
                console.warn('Erro ao deletar mídia antiga (continua):', err);
            }

            const newMidiaUrl = `${backendUrl}/uploads/midias-anuncio/${uploadedFile.filename}`;
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
        const { userId, country = null, state = null, city = null, quantidade } = req.query;

        console.log('[getAnuncios] Parâmetros de entrada:', { userId, country, state, city, quantidade });

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
            console.log('[getAnuncios] Buscando anúncios para o userId:', userId);

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
                .sort({ 'estatisticas.impressoes.impressoesTotais': 1 })
                .exec();

            console.log(`[getAnuncios] Encontrados ${anuncios.length} anúncios para o usuário ${userId}`);

            return res.status(200).json({
                anuncios,
                success: true,
                totalRetornados: anuncios.length,
                limiteSolicitado: null
            });
        }

        console.log('[getAnuncios] Iniciando busca de anúncios com priorização por impressões');

        // Pipeline principal: priorizar impressões, depois localização hierárquica
        const pipeline = [
            // Estágio 1: Filtro básico por status ativo
            {
                $match: {
                    status: 'ativo'
                }
            },
            
            // Estágio 2: Lookup para dados do usuário (saldo)
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userData'
                }
            },
            
            // Estágio 3: Filtrar apenas anúncios com saldo > 0
            {
                $match: {
                    'userData.saldoDeImpressoes': { $gt: 0 }
                }
            },
            
            // Estágio 4: Adicionar campos para ordenação hierárquica
            {
                $addFields: {
                    impressoesTotais: {
                        $ifNull: ['$estatisticas.impressoes.impressoesTotais', 0]
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
            
            // Estágio 5: Ordenação hierárquica - IMPRESSÕES PRIMEIRO, depois localização
            {
                $sort: {
                    impressoesTotais: 1,      // Prioridade 1: Menor número de impressões
                    locationPriority: 1,      // Prioridade 2: Localização mais específica
                    _id: 1                    // Prioridade 3: Consistência
                }
            },
            
            // Estágio 6: Aplicar limite se especificado
            ...(limitQuantidade ? [{ $limit: limitQuantidade }] : []),
            
            // Estágio 7: Remover campos temporários
            {
                $project: {
                    userData: 0,
                    impressoesTotais: 0,
                    locationPriority: 0
                }
            }
        ];

        console.log('[getAnuncios] Executando pipeline com priorização por impressões');
        
        // Executar agregação
        const anuncios = await Anuncio.aggregate(pipeline);
        
        console.log(`[getAnuncios] Pipeline retornou ${anuncios.length} anúncios`);

        // Se não encontrou anúncios com saldo, tentar sem filtro de saldo como fallback
        if (anuncios.length === 0) {
            console.log('[getAnuncios] Nenhum anúncio com saldo encontrado, tentando fallback sem filtro de saldo');
            
            const fallbackPipeline = [
                // Estágio 1: Filtro básico por status ativo
                {
                    $match: {
                        status: 'ativo'
                    }
                },
                
                // Estágio 2: Adicionar campos para ordenação
                {
                    $addFields: {
                        impressoesTotais: {
                            $ifNull: ['$estatisticas.impressoes.impressoesTotais', 0]
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
                
                // Estágio 3: Ordenação hierárquica
                {
                    $sort: {
                        impressoesTotais: 1,
                        locationPriority: 1,
                        _id: 1
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

            const anunciosFallback = await Anuncio.aggregate(fallbackPipeline);
            console.log(`[getAnuncios] Fallback retornou ${anunciosFallback.length} anúncios`);

            return res.status(200).json({
                anuncios: anunciosFallback,
                success: true,
                totalRetornados: anunciosFallback.length,
                limiteSolicitado: limitQuantidade,
                debug: 'Fallback - anúncios sem filtro de saldo'
            });
        }

        return res.status(200).json({
            anuncios,
            success: true,
            totalRetornados: anuncios.length,
            limiteSolicitado: limitQuantidade
        });

    } catch (error) {
        console.error('[getAnuncios] Erro ao buscar anúncios:', error);
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
        const { anuncioId, userId } = req.body;

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

        // Verificar se o usuário já clicou hoje neste anúncio
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0); // Início do dia atual

        const amanha = new Date(hoje);
        amanha.setDate(hoje.getDate() + 1); // Início do próximo dia

        const jaClicouHoje = anuncio.estatisticas.cliques.cliquesDetalhados?.some(clique =>
            clique.userId === userId &&
            clique.dataClique >= hoje &&
            clique.dataClique < amanha
        );

        if (jaClicouHoje) {
            return res.status(409).json({
                msg: "Você já clicou neste anúncio hoje. Apenas um clique por dia é permitido.",
                error: "ALREADY_CLICKED_TODAY"
            });
        }

        // Obter IP do usuário para auditoria
        const userIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress ||
            (req.connection.socket ? req.connection.socket.remoteAddress : null);

        // Registrar o clique detalhado na nova estrutura
        if (!anuncio.estatisticas.cliques.cliquesDetalhados) {
            anuncio.estatisticas.cliques.cliquesDetalhados = [];
        }

        anuncio.estatisticas.cliques.cliquesDetalhados.push({
            userId: userId,
            dataClique: new Date(),
            ip: userIp
        });

        // Incrementar contador agregado de cliques
        anuncio.estatisticas.cliques.cliquesTotais += 1;

        // Salvar as alterações
        await anuncio.save();

        console.log(`[marcarClique] Clique registrado - Anúncio: ${anuncioId}, Usuário: ${userId}, IP: ${userIp}`);

        return res.status(200).json({
            msg: "Clique registrado com sucesso",
            success: true,
            totalCliques: anuncio.estatisticas.cliques.cliquesTotais
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
        const { anuncioId, userId } = req.body;

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

        // Verificar se o usuário já teve impressão hoje neste anúncio
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0); // Início do dia atual

        const amanha = new Date(hoje);
        amanha.setDate(hoje.getDate() + 1); // Início do próximo dia

        const jaViuHoje = anuncio.estatisticas.impressoes.impressoesDetalhadas?.some(impressao =>
            impressao.userId === userId &&
            impressao.data >= hoje &&
            impressao.data < amanha
        );

        if (jaViuHoje) {
            return res.status(409).json({
                msg: "Você já visualizou este anúncio hoje. Apenas uma impressão por dia é permitida.",
                error: "ALREADY_VIEWED_TODAY"
            });
        }

        // Registrar a impressão detalhada na nova estrutura
        if (!anuncio.estatisticas.impressoes.impressoesDetalhadas) {
            anuncio.estatisticas.impressoes.impressoesDetalhadas = [];
        }

        anuncio.estatisticas.impressoes.impressoesDetalhadas.push({
            userId: userId,
            data: new Date()
        });

        // Incrementar contador agregado de impressões
        anuncio.estatisticas.impressoes.impressoesTotais += 1;

        // Remover -1 saldoDeImpressoes do usuario dono do anuncio.
        if (anuncio.userId) {
            const userAnuncio = await User.findById(anuncio.userId);
            if (userAnuncio) {
                userAnuncio.saldoDeImpressoes -= 1;
                await userAnuncio.save();
            }
        }

        // Salvar as alterações
        await anuncio.save();

        console.log(`[marcarImpressao] Impressão registrada - Anúncio: ${anuncioId}, Usuário: ${userId}`);

        return res.status(200).json({
            msg: "Impressão registrada com sucesso",
            success: true,
            totalImpressoes: anuncio.estatisticas.impressoes.impressoesTotais
        });

    } catch (error) {
        console.error('[marcarImpressao] Erro ao registrar impressão:', error);
        return res.status(500).json({
            msg: "Erro interno do servidor ao registrar impressão",
            error: "INTERNAL_SERVER_ERROR"
        });
    }
};