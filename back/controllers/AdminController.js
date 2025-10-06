import Anuncio from "../models/Anuncios.js";
import User from "../models/User.js";
import Support from "../models/Support.js";
// import { APIErrorLog, APIPerformanceMetric, AISystemLog } from "../models/AISystemLogs.js";
import { getBrazilDate } from "../helpers/getBrazilDate.js";
import redisCache from '../config/redis.js';
import RedisManager from '../utils/redisManager.js';
import Ranking from "../models/Gamification/Ranking.js";

export const getUsers = async (req, res) => {
    try {
        const { adminId } = req.body;

        const user = await User.findById(adminId);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem acessar esta rota.' });
        }

        const users = await User.find()

        return res.status(200).json({ users, success: true, msg: 'Sucesso ao buscar usuários como admin.' });
    } catch (error) {
        return res.status(500).json({ success: false, msg: "Erro ao buscar usuários.", error: error.message || String(error) });
    }
};

// Visualizar logs de erro das APIs externas
export const getAPIErrorLogs = async (req, res) => {
    try {
        const { adminId, page = 1, limit = 20, apiName, errorType, severity, resolved } = req.body;

        const user = await User.findById(adminId);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem acessar esta rota.' });
        }

        // Construir filtros
        const filters = {};
        if (apiName) filters.apiName = apiName;
        if (errorType) filters.errorType = errorType;
        if (severity) filters.severity = severity;
        if (typeof resolved === 'boolean') filters.resolved = resolved;

        // Paginação
        const skip = (page - 1) * limit;

        // Buscar logs com filtros
        const errorLogs = await APIErrorLog.find(filters)
            .populate('userId', 'name email')
            .populate('resolvedBy', 'name email')
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const totalLogs = await APIErrorLog.countDocuments(filters);

        // Estatísticas dos logs
        const errorStats = await APIErrorLog.aggregate([
            { $match: filters },
            {
                $group: {
                    _id: {
                        apiName: '$apiName',
                        errorType: '$errorType'
                    },
                    count: { $sum: 1 },
                    avgRetryCount: { $avg: '$retryCount' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Logs por severidade
        const severityStats = await APIErrorLog.aggregate([
            { $match: filters },
            {
                $group: {
                    _id: '$severity',
                    count: { $sum: 1 }
                }
            }
        ]);

        return res.status(200).json({
            success: true,
            msg: 'Logs de erro carregados com sucesso',
            data: {
                logs: errorLogs,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalLogs,
                    totalPages: Math.ceil(totalLogs / limit)
                },
                stats: {
                    errorsByType: errorStats,
                    errorsBySeverity: severityStats
                }
            }
        });

    } catch (error) {
        console.error('Erro ao carregar logs de erro:', error);
        return res.status(500).json({
            success: false,
            msg: "Erro ao carregar logs de erro",
            error: error.message || String(error)
        });
    }
};

// Resolver log de erro
export const resolveAPIError = async (req, res) => {
    try {
        const { adminId, errorLogId } = req.body;

        const user = await User.findById(adminId);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem acessar esta rota.' });
        }

        const errorLog = await APIErrorLog.findById(errorLogId);
        if (!errorLog) {
            return res.status(404).json({ success: false, msg: 'Log de erro não encontrado' });
        }

        if (errorLog.resolved) {
            return res.status(400).json({ success: false, msg: 'Este erro já foi resolvido' });
        }

        errorLog.resolved = true;
        errorLog.resolvedAt = new Date();
        errorLog.resolvedBy = adminId;
        await errorLog.save();

        return res.status(200).json({
            success: true,
            msg: 'Log de erro marcado como resolvido',
            data: errorLog
        });

    } catch (error) {
        console.error('Erro ao resolver log de erro:', error);
        return res.status(500).json({
            success: false,
            msg: "Erro ao resolver log de erro",
            error: error.message || String(error)
        });
    }
};

// Obter estatísticas detalhadas do sistema AI
export const getDetailedAIAnalytics = async (req, res) => {
    try {
        const { adminId, timeRange = '7d' } = req.body;

        const user = await User.findById(adminId);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem acessar esta rota.' });
        }

        // Calcular período
        let startDate;
        switch (timeRange) {
            case '1d':
                startDate = new Date(getBrazilDate() - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                startDate = new Date(getBrazilDate() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(getBrazilDate() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(getBrazilDate() - 7 * 24 * 60 * 60 * 1000);
        }

        // Analytics de uso do sistema AI
        const aiUsageAnalytics = await AISystemLog.aggregate([
            { $match: { timestamp: { $gte: startDate } } },
            {
                $group: {
                    _id: {
                        action: '$action',
                        success: '$success'
                    },
                    count: { $sum: 1 },
                    avgExecutionTime: { $avg: '$executionTime' },
                    totalExecutionTime: { $sum: '$executionTime' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Performance das APIs por período
        const apiPerformanceAnalytics = await APIPerformanceMetric.aggregate([
            { $match: { timestamp: { $gte: startDate } } },
            {
                $group: {
                    _id: {
                        apiName: '$apiName',
                        success: '$success'
                    },
                    count: { $sum: 1 },
                    avgResponseTime: { $avg: '$responseTime' },
                    totalDataSize: { $sum: '$dataSize' },
                    cacheHits: {
                        $sum: { $cond: ['$cacheHit', 1, 0] }
                    }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Usuários mais ativos no sistema AI
        const topAIUsers = await AISystemLog.aggregate([
            { $match: { timestamp: { $gte: startDate } } },
            {
                $group: {
                    _id: '$userId',
                    totalActions: { $sum: 1 },
                    successfulActions: {
                        $sum: { $cond: ['$success', 1, 0] }
                    },
                    avgExecutionTime: { $avg: '$executionTime' }
                }
            },
            { $sort: { totalActions: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $project: {
                    userId: '$_id',
                    userName: '$user.name',
                    userEmail: '$user.email',
                    totalActions: 1,
                    successfulActions: 1,
                    successRate: {
                        $multiply: [
                            { $divide: ['$successfulActions', '$totalActions'] },
                            100
                        ]
                    },
                    avgExecutionTime: { $round: ['$avgExecutionTime', 2] }
                }
            }
        ]);

        // Tendências de erro por dia
        const errorTrends = await APIErrorLog.aggregate([
            { $match: { timestamp: { $gte: startDate } } },
            {
                $group: {
                    _id: {
                        date: {
                            $dateToString: {
                                format: '%Y-%m-%d',
                                date: '$timestamp'
                            }
                        },
                        apiName: '$apiName'
                    },
                    errorCount: { $sum: 1 }
                }
            },
            { $sort: { '_id.date': 1 } }
        ]);

        const analyticsData = {
            timeRange,
            period: {
                start: startDate.toISOString(),
                end: new Date().toISOString()
            },
            aiUsage: aiUsageAnalytics,
            apiPerformance: apiPerformanceAnalytics,
            topUsers: topAIUsers,
            errorTrends: errorTrends,
            summary: {
                totalAIActions: aiUsageAnalytics.reduce((sum, item) => sum + item.count, 0),
                totalAPIRequests: apiPerformanceAnalytics.reduce((sum, item) => sum + item.count, 0),
                totalErrors: errorTrends.reduce((sum, item) => sum + item.errorCount, 0),
                avgSystemPerformance: aiUsageAnalytics.length > 0 ?
                    aiUsageAnalytics.reduce((sum, item) => sum + item.avgExecutionTime, 0) / aiUsageAnalytics.length : 0
            }
        };

        return res.status(200).json({
            success: true,
            msg: 'Analytics detalhadas carregadas com sucesso',
            data: analyticsData
        });

    } catch (error) {
        console.error('Erro ao carregar analytics detalhadas:', error);
        return res.status(500).json({
            success: false,
            msg: "Erro ao carregar analytics detalhadas",
            error: error.message || String(error)
        });
    }
};

export const getAnunciosByAdmin = async (req, res) => {
    try {
        const { adminId } = req.query;

        const user = await User.findById(adminId);
        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem acessar esta rota.' });
        }

        // Lógica para buscar anúncios
        const anuncios = await Anuncio.find();

        return res.status(200).json({ anuncios, success: true, msg: 'Sucesso ao buscar anúncios como admin.' });
    } catch (error) {
        return res.status(500).json({ success: false, msg: "Erro ao buscar anúncios.", error: error.message || String(error) });
    }
}

export const alterarStatusAnuncio = async (req, res) => {
    try {
        const { adminId, anuncioId, novoStatus } = req.body;

        const user = await User.findById(adminId);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ msg: 'Acesso negado. Apenas administradores podem acessar esta rota.' });
        }

        const anuncio = await Anuncio.findOne({ anuncioId });
        if (!anuncio) {
            return res.status(404).json({ msg: 'Anúncio não encontrado.' });
        }

        if (novoStatus !== 'ativo' && novoStatus !== 'inativo') {
            return res.status(400).json({ msg: 'Status inválido. Use "ativo" ou "inativo".' });
        }

        if (anuncio.status === novoStatus) {
            return res.status(400).json({ msg: `O anúncio já está com o status "${novoStatus}".` });
        }

        anuncio.status = novoStatus;
        await anuncio.save();

        return res.status(200).json({ success: true, msg: `Status do anúncio alterado para "${novoStatus}".`, anuncio });
    } catch (error) {
        return res.status(500).json({ success: false, msg: "Erro ao alterar status do anúncio.", error: error.message || String(error) });
    }
}

// get /supports-by-admin
export const getSupportsByAdmin = async (req, res) => {
    try {
        // paginação opcional (se não quiser, passe page/perPage ausentes e ele retorna tudo)
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const perPage = Math.min(100, Math.max(1, parseInt(req.query.perPage, 10) || 20));
        const search = (req.query.search || '').toString().trim();
        const adminId = req.query.adminId;

        if (!adminId) return res.json({ msg: 'adminId é obrigatorio', success: false });

        const user = await User.findById(adminId);
        if (!user) return res.json({ msg: 'Não encontrei seu usuario.', success: false });

        if (user && user.role !== 'admin') {
            return res.json({ msg: 'Somente admins podem fazer isso.', success: false });
        }

        // Build filter incrementally so we can combine search + responded + privado
        const and = [];

        // busca opcional em assunto/descricao (OR dentro do $and)
        if (search) {
            and.push({
                $or: [
                    { assunto: { $regex: search, $options: 'i' } },
                    { descricao: { $regex: search, $options: 'i' } }
                ]
            });
        }

        // filtro respondido / não respondido
        const respondedRaw = (req.query.responded || '').toString().toLowerCase(); // e.g. 'responded' | 'unresponded' | 'all' | 'true' | 'false'
        if (respondedRaw && respondedRaw !== 'all') {
            if (['responded', 'true', '1'].includes(respondedRaw)) {
                // resposta existe e não é string vazia
                and.push({ resposta: { $exists: true, $ne: null }, });
            } else if (['unresponded', 'false', '0'].includes(respondedRaw)) {
                // resposta inexistente ou vazia
                and.push({
                    $or: [
                        { resposta: { $exists: false } },
                        { resposta: null },
                        { resposta: '' }
                    ]
                });
            }
        }

        // opcional: filtrar por privado (privado=true|false)
        if (typeof req.query.privado !== 'undefined') {
            const pRaw = req.query.privado.toString().toLowerCase();
            const pBool = ['true', '1', 'yes'].includes(pRaw);
            and.push({ privado: pBool });
        }

        // combine into filter
        const filter = and.length ? { $and: and } : {};

        // total usando mesmo filter
        const total = await Support.countDocuments(filter);

        const supports = await Support.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * perPage)
            .limit(perPage)
            .populate({ path: 'userId', select: 'name email' })
            .lean();

        return res.status(200).json({
            supports,
            pagination: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
            success: true,
            msg: 'Sucesso ao buscar pedidos de suporte.'
        });
    } catch (error) {
        console.error('getSupports error:', error);
        return res.status(500).json({
            success: false,
            msg: "Erro ao buscar pedidos de suporte.",
            error: error.message || String(error)
        });
    }
}

export const adicionarRespostaSupport = async (req, res) => {
    try {
        const { adminId, supportId, resposta } = req.body;

        // Verificações basicas
        if (!adminId) return res.json({ msg: 'adminId é obrigatorio', success: false })

        const user = await User.findById(adminId)
        if (!user) return res.json({ msg: 'Não encontrei seu usuario.', success: false })

        if (user && user.role !== 'admin') {
            return res.json({ msg: 'Somente admins podem fazer isso.', success: false })
        }

        // logica
        if (!supportId) return res.json({ msg: 'supportId é obrigatorio', success: false })

        const support = await Support.findOne({ supportId });

        if (!support) return res.json({ msg: 'Não encontrei o pedido de ajuda.', success: false })

        if (!resposta) return res.json({ msg: 'Você nao passou a resposta', success: false })

        support.resposta = resposta
        support.respondidoEm = getBrazilDate();

        await support.save()
    } catch (error) {
        return res.json({ msg: "Erro ao adicionar resposta", success: false, error })
    }
}

export const alterarVisibilidadeSuporte = async (req, res) => {
    try {
        const { adminId, supportId } = req.body
        let { boolean } = req.body

        if (!adminId) return res.json({ msg: 'adminId é obrigatório', success: false })

        const user = await User.findById(adminId)
        if (!user) return res.json({ msg: 'Não encontrei seu usuário.', success: false })
        if (user.role !== 'admin') return res.json({ msg: 'Somente admins podem fazer isso.', success: false })

        if (!supportId) return res.json({ msg: 'supportId é obrigatório', success: false })

        const support = await Support.findOne({ supportId })
        if (!support) return res.json({ msg: 'Não encontrei o pedido de ajuda.', success: false })

        if (typeof boolean === 'undefined' || boolean === null) {
            return res.json({ msg: 'Você não passou o boolean', success: false })
        }

        // aceitar 'true'/'false' de strings e outros formatos
        if (typeof boolean === 'string') {
            if (boolean === 'true' || boolean === '1') boolean = true
            else if (boolean === 'false' || boolean === '0') boolean = false
        }
        boolean = !!boolean

        if (support.privado === boolean) {
            return res.json({ msg: 'Esse valor já existe.', success: false })
        }

        support.privado = boolean
        const saved = await support.save()

        return res.json({ msg: 'Visibilidade atualizada', success: true, support: saved })
    } catch (error) {
        console.error('alterarVisibilidadeSuporte error', error)
        return res.status(500).json({ msg: 'Erro ao alterar visibilidade', success: false, error: error.message })
    }
}

// Dashboard administrativo com métricas do sistema AI
export const getAIDashboard = async (req, res) => {
    try {
        const { adminId } = req.query;

        // Verificar se adminId foi fornecido
        if (!adminId) {
            return res.status(400).json({
                success: false,
                msg: 'ID do administrador é obrigatório'
            });
        }

        const user = await User.findById(adminId);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                msg: 'Acesso negado. Apenas administradores podem acessar esta rota.'
            });
        }

        // Estatísticas gerais do sistema
        const totalUsers = await User.countDocuments();
        const totalAdmins = await User.countDocuments({ role: 'admin' });
        const activeUsers = await User.countDocuments({
            lastLogin: { $gte: new Date(getBrazilDate() - 30 * 24 * 60 * 60 * 1000) } // últimos 30 dias
        });

        // Estatísticas do sistema AI
        // REMOVIDO: Sistema de analytics não utilizado
        const totalAnalytics = 0; // await UserAnalytics.countDocuments();
        const usersWithWorkouts = 0; // await UserAnalytics.countDocuments({ 'workoutMetrics.0': { $exists: true } });

        // Métricas de performance das APIs AI (últimos 7 dias)
        const sevenDaysAgo = new Date(getBrazilDate() - 7 * 24 * 60 * 60 * 1000);
        const recentWorkouts = [{ total: 0 }]; // await UserAnalytics.aggregate([...]);
        const recentAIGeneratedWorkouts = [{ total: 0 }]; // await UserAnalytics.aggregate([...]);

        // Estatísticas do cache Redis
        const cacheStats = await redisCache.getStats();

        // Métricas de uso das APIs externas (simuladas - em produção viriam de logs)
        const apiMetrics = {
            exerciseDB: {
                requests: 150,
                successRate: 98.5,
                avgResponseTime: 245,
                errors: 2
            },
            wgerAPI: {
                requests: 89,
                successRate: 96.2,
                avgResponseTime: 312,
                errors: 3
            },
            openAI: {
                requests: 67,
                successRate: 99.1,
                avgResponseTime: 1850,
                errors: 1
            }
        };

        // Top exercícios mais buscados (últimos 30 dias)
        const thirtyDaysAgo = new Date(getBrazilDate() - 30 * 24 * 60 * 60 * 1000);
        const topExercises = []; // await UserAnalytics.aggregate([...]) - REMOVIDO: Sistema de analytics não utilizado

        const dashboardData = {
            systemStats: {
                totalUsers,
                totalAdmins,
                activeUsers,
                totalAnalytics,
                usersWithWorkouts
            },
            aiMetrics: {
                recentWorkouts: recentWorkouts[0]?.total || 0,
                aiGeneratedWorkouts: recentAIGeneratedWorkouts[0]?.total || 0,
                aiUsageRate: recentWorkouts[0]?.total > 0 ?
                    ((recentAIGeneratedWorkouts[0]?.total || 0) / recentWorkouts[0].total * 100).toFixed(1) : 0
            },
            cacheStats,
            apiMetrics,
            topExercises: topExercises.map(ex => ({
                name: ex._id,
                count: ex.count
            })),
            lastUpdated: new Date().toISOString()
        };

        return res.status(200).json({
            success: true,
            msg: 'Dashboard AI carregado com sucesso',
            data: dashboardData
        });

    } catch (error) {
        console.error('Erro ao carregar dashboard AI:', error);
        return res.status(500).json({
            success: false,
            msg: "Erro ao carregar dashboard AI",
            error: error.message || String(error)
        });
    }
};

// Gerenciamento avançado do cache Redis
export const manageCacheRedis = async (req, res) => {
    try {
        const { action, pattern, ttl } = req.body;
        const adminId = req.user.id;

        let result;

        switch (action) {
            case 'stats':
                result = await RedisManager.getDetailedStats(adminId);
                break;

            case 'clear':
                if (!pattern) {
                    return res.status(400).json({
                        success: false,
                        message: 'Padrão é obrigatório para limpeza'
                    });
                }
                result = await RedisManager.clearByPattern(adminId, pattern);
                break;

            case 'optimize':
                result = await RedisManager.optimizeCache(adminId);
                break;

            case 'analyze-ttl':
                result = await RedisManager.analyzeTTL(adminId, pattern || '*');
                break;

            case 'set-ttl':
                if (!pattern || !ttl) {
                    return res.status(400).json({
                        success: false,
                        message: 'Padrão e TTL são obrigatórios'
                    });
                }
                result = await RedisManager.setTTLByPattern(adminId, pattern, parseInt(ttl));
                break;

            case 'flush':
                // Ação perigosa - limpar todo o cache
                await redisCache.flush();
                result = {
                    success: true,
                    message: 'Cache completamente limpo',
                    action: 'flush'
                };
                break;

            default:
                return res.status(400).json({
                    success: false,
                    message: 'Ação não reconhecida'
                });
        }

        res.json(result);

    } catch (error) {
        console.error('Erro no gerenciamento do cache Redis:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
};

// Monitorar performance das APIs AI
export const getAPIPerformanceMetrics = async (req, res) => {
    try {
        const { adminId, timeRange = '7d' } = req.body;

        const user = await User.findById(adminId);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem acessar esta rota.' });
        }

        // Calcular período baseado no timeRange
        let startDate;
        switch (timeRange) {
            case '1d':
                startDate = new Date(getBrazilDate() - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                startDate = new Date(getBrazilDate() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(getBrazilDate() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(getBrazilDate() - 7 * 24 * 60 * 60 * 1000);
        }

        // Métricas de uso do sistema AI
        const aiUsageMetrics = []; // await UserAnalytics.aggregate([...]) - REMOVIDO: Sistema de analytics não utilizado

        // Estatísticas de cache por tipo
        const cachePatterns = [
            'exercise_search:*',
            'workout_generation:*',
            'fitness_trends:*'
        ];

        const cacheMetrics = {};
        for (const pattern of cachePatterns) {
            try {
                const keys = await redisCache.client?.keys(pattern) || [];
                cacheMetrics[pattern.replace(':*', '')] = {
                    totalKeys: keys.length,
                    pattern
                };
            } catch (error) {
                cacheMetrics[pattern.replace(':*', '')] = {
                    totalKeys: 0,
                    error: error.message
                };
            }
        }

        // Simular métricas de API (em produção, isso viria de logs reais)
        const apiPerformanceData = {
            exerciseDB: {
                totalRequests: Math.floor(Math.random() * 500) + 100,
                successfulRequests: Math.floor(Math.random() * 480) + 95,
                failedRequests: Math.floor(Math.random() * 20) + 2,
                avgResponseTime: Math.floor(Math.random() * 300) + 200,
                cacheHitRate: Math.floor(Math.random() * 30) + 70
            },
            wgerAPI: {
                totalRequests: Math.floor(Math.random() * 300) + 50,
                successfulRequests: Math.floor(Math.random() * 280) + 45,
                failedRequests: Math.floor(Math.random() * 15) + 2,
                avgResponseTime: Math.floor(Math.random() * 400) + 250,
                cacheHitRate: Math.floor(Math.random() * 25) + 65
            },
            openAI: {
                totalRequests: Math.floor(Math.random() * 200) + 30,
                successfulRequests: Math.floor(Math.random() * 190) + 28,
                failedRequests: Math.floor(Math.random() * 10) + 1,
                avgResponseTime: Math.floor(Math.random() * 2000) + 1500,
                cacheHitRate: Math.floor(Math.random() * 40) + 80
            }
        };

        const performanceData = {
            timeRange,
            period: {
                start: startDate.toISOString(),
                end: new Date().toISOString()
            },
            aiUsage: {
                totalUsers: aiUsageMetrics.length,
                totalWorkouts: aiUsageMetrics.reduce((sum, user) => sum + user.recentWorkouts.length, 0),
                totalPerformanceRecords: aiUsageMetrics.reduce((sum, user) => sum + user.recentPerformance.length, 0)
            },
            cacheMetrics,
            apiPerformance: apiPerformanceData,
            systemHealth: {
                redisConnected: redisCache.isReady(),
                cacheStats: await redisCache.getStats()
            }
        };

        return res.status(200).json({
            success: true,
            msg: 'Métricas de performance carregadas com sucesso',
            data: performanceData
        });

    } catch (error) {
        console.error('Erro ao carregar métricas de performance:', error);
        return res.status(500).json({
            success: false,
            msg: "Erro ao carregar métricas de performance",
            error: error.message || String(error)
        });
    }
};

export const criarRanking = async (req, res) => {
    try {
        const { adminId, endDate, rankingName, startDate } = req.body;

        // Validações de entrada
        if (!adminId || !endDate || !rankingName || !startDate) {
            return res.status(400).json({
                success: false,
                msg: 'Dados incompletos. AdminId, endDate, rankingName e startDate são obrigatórios.'
            });
        }

        const user = await User.findById(adminId);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                msg: 'Acesso negado. Somente admins podem criar rankings.'
            });
        }

        // Validação e parse das datas
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        const now = new Date();

        if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
            return res.status(400).json({
                success: false,
                msg: 'Datas de início ou término inválidas.'
            });
        }

        // Regras de negócio para datas
        if (startDateObj >= endDateObj) {
            return res.status(400).json({
                success: false,
                msg: 'A data de início deve ser anterior à data de término.'
            });
        }

        if (endDateObj <= now) {
            return res.status(400).json({
                success: false,
                msg: 'A data de término deve ser futura.'
            });
        }

        // Verificações de unicidade e conflitos
        const nameExists = await Ranking.exists({ rankingName });
        if (nameExists) {
            return res.status(409).json({
                success: false,
                msg: 'Nome de ranking já existe.'
            });
        }

        const overlapping = await Ranking.exists({
            $or: [
                { startDate: { $lte: startDateObj }, endDate: { $gte: startDateObj } },
                { startDate: { $lte: endDateObj }, endDate: { $gte: endDateObj } },
                { startDate: { $gte: startDateObj }, endDate: { $lte: endDateObj } }
            ]
        });

        if (overlapping) {
            return res.status(409).json({
                success: false,
                msg: 'Já existe um ranking com período sobreposto.'
            });
        }

        // Criação do ranking
        const newRanking = await Ranking.create({
            rankingName,
            startDate: startDateObj,
            endDate: endDateObj,
            createdBy: adminId
        });

        return res.status(201).json({
            success: true,
            msg: 'Ranking criado com sucesso.',
            newRanking
        });
    } catch (error) {
        console.error('Erro ao criar ranking:', error);
        return res.status(500).json({
            success: false,
            msg: 'Erro ao criar ranking.',
            error: error.message || String(error)
        });
    }
};

export const editarRanking = async (req, res) => {
    try {
        const { adminId, rankingId, startDate, endDate, rankingName } = req.body;

        // Validações de entrada
        if (!adminId || !rankingId || !startDate || !endDate || !rankingName) {
            return res.status(400).json({
                success: false,
                msg: 'Dados incompletos. AdminId, rankingId, startDate, endDate e rankingName são obrigatórios.'
            });
        }

        const user = await User.findById(adminId);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                msg: 'Acesso negado. Somente admins podem editar rankings.'
            });
        }

        // Validação e parse das datas
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        const now = new Date();

        if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
            return res.status(400).json({
                success: false,
                msg: 'Datas de início ou término inválidas.'
            });
        }

        if (startDateObj >= endDateObj) {
            return res.status(400).json({
                success: false,
                msg: 'A data de início deve ser anterior à data de término.'
            });
        }

        // Busca o ranking e verifica se pode ser editado
        const ranking = await Ranking.findById(rankingId);
        if (!ranking) {
            return res.status(404).json({
                success: false,
                msg: 'Ranking não encontrado.'
            });
        }

        if (ranking.endDate <= now) {
            return res.status(400).json({
                success: false,
                msg: 'Ranking já foi finalizado e não pode mais ser editado.'
            });
        }

        // Verifica conflito de nome (exceto ele mesmo)
        const nameConflict = await Ranking.exists({
            _id: { $ne: rankingId },
            rankingName
        });
        if (nameConflict) {
            return res.status(409).json({
                success: false,
                msg: 'Nome de ranking já está em uso.'
            });
        }

        // Verifica sobreposição de período (exceto ele mesmo)
        const overlapping = await Ranking.exists({
            _id: { $ne: rankingId },
            $or: [
                { startDate: { $lte: startDateObj }, endDate: { $gte: startDateObj } },
                { startDate: { $lte: endDateObj }, endDate: { $gte: endDateObj } },
                { startDate: { $gte: startDateObj }, endDate: { $lte: endDateObj } }
            ]
        });

        if (overlapping) {
            return res.status(409).json({
                success: false,
                msg: 'Já existe um ranking com período sobreposto.'
            });
        }

        // Atualização
        const updated = await Ranking.findByIdAndUpdate(
            rankingId,
            {
                rankingName,
                startDate: startDateObj,
                endDate: endDateObj,
                updatedAt: new Date()
            },
            { new: true }
        );

        return res.status(200).json({
            success: true,
            msg: 'Ranking editado com sucesso.',
            ranking: updated
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            msg: 'Erro ao editar ranking.',
            error: err.message || String(err)
        });
    }
};
export const deletarRanking = async (req, res) => {
    try {
        const { adminId, rankingId } = req.body;

        // Analise básica dos dados
        if (!adminId || !rankingId) {
            return res.status(400).json({ success: false, msg: 'Dados incompletos. AdminId e rankingId são obrigatórios.' });
        }

        const user = await User.findById(adminId);
        if (!user) {
            return res.status(404).json({ success: false, msg: 'Admin não encontrado.' });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({ success: false, msg: 'Acesso negado. Somente admins podem deletar rankings.' });
        }

        // Verificação se o ranking já existe
        const existingRanking = await Ranking.findById(rankingId);
        if (!existingRanking) {
            return res.status(404).json({ success: false, msg: 'Ranking não encontrado.' });
        }

        // Deleção
        await Ranking.findByIdAndDelete(rankingId);

        return res.status(200).json({
            success: true,
            msg: 'Ranking deletado com sucesso',
            rankingId
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            msg: "Erro ao deletar ranking.",
            error: err.message || String(err)
        });
    }
};

export const getRankings = async (req, res) => {
    try {
        const { adminId, page = 1 } = req.query;

        console.log('adminId: ', adminId)

        if (!adminId) {
            return res.status(400).json({ success: false, msg: 'AdminId é obrigatório.' });
        }

        // Verificação do admin
        const user = await User.findById(adminId);
        if (!user) {
            return res.status(404).json({ success: false, msg: 'Admin não encontrado.' });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({ success: false, msg: 'Acesso negado. Somente admins podem ver rankings.' });
        }

        // Paginacao
        const perPage = 30
        const rankings = await Ranking.find()
            .sort({ startDate: -1 })
            .skip((page - 1) * perPage)
            .limit(perPage);

        return res.status(200).json({
            success: true,
            msg: 'Rankings obtidos com sucesso',
            rankings
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            msg: "Erro ao obter rankings.",
            error: error.message || String(error)
        });
    }
}
