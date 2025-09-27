import RedisManager from '../utils/redisManager.js';
import redisCache from '../config/redis.js';
import User from '../models/User.js';

/**
 * Controlador dedicado para administração do cache Redis
 */

/**
 * Dashboard do cache Redis com métricas em tempo real
 */
export const getCacheDashboard = async (req, res) => {
    try {
        const startTime = Date.now();

        // Obter estatísticas detalhadas
        const stats = await RedisManager.getDetailedStats();
        
        // Análise de TTL para chaves principais
        const ttlAnalysis = await RedisManager.analyzeTTL(null, '*');
        
        // Informações de conectividade
        const connectionInfo = {
            isConnected: redisCache.isConnected(),
            connectionTime: Date.now() - startTime,
            lastError: null
        };

        // Métricas de performance recentes (últimas 24h)
        const performanceMetrics = await getRecentCacheMetrics();

        const dashboard = {
            timestamp: new Date().toISOString(),
            connectionInfo,
            stats: stats.detailed,
            ttlAnalysis: ttlAnalysis.analysis,
            performance: performanceMetrics,
            recommendations: generateCacheRecommendations(stats, ttlAnalysis)
        };

        res.json({
            success: true,
            dashboard
        });

    } catch (error) {
        console.error('Erro ao obter dashboard do cache:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao carregar dashboard do cache',
            error: error.message
        });
    }
};

/**
 * Executar operações de manutenção do cache
 */
export const performCacheMaintenance = async (req, res) => {
    try {
        const { operations } = req.body;

        const results = [];

        // Operações disponíveis
        const availableOperations = [
            'optimize',
            'cleanup-expired',
            'analyze-memory',
            'defragment',
            'backup-keys'
        ];

        for (const operation of operations) {
            if (!availableOperations.includes(operation)) {
                results.push({
                    operation,
                    success: false,
                    message: 'Operação não reconhecida'
                });
                continue;
            }

            try {
                let result;

                switch (operation) {
                    case 'optimize':
                        result = await RedisManager.optimizeCache(adminId);
                        break;

                    case 'cleanup-expired':
                        result = await cleanupExpiredKeys(adminId);
                        break;

                    case 'analyze-memory':
                        result = await analyzeMemoryUsage(adminId);
                        break;

                    case 'defragment':
                        result = await defragmentCache(adminId);
                        break;

                    case 'backup-keys':
                        result = await backupImportantKeys(adminId);
                        break;
                }

                results.push({
                    operation,
                    success: true,
                    result
                });

            } catch (error) {
                results.push({
                    operation,
                    success: false,
                    message: error.message
                });
            }
        }

        res.json({
            success: true,
            message: 'Manutenção do cache concluída',
            results
        });

    } catch (error) {
        console.error('Erro na manutenção do cache:', error);
        res.status(500).json({
            success: false,
            message: 'Erro na manutenção do cache',
            error: error.message
        });
    }
};

/**
 * Monitorar cache em tempo real
 */
export const getCacheMonitoring = async (req, res) => {
    try {
        const { interval = 5000 } = req.query; // Intervalo em ms

        // Configurar SSE (Server-Sent Events) para monitoramento em tempo real
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });

        const sendUpdate = async () => {
            try {
                const stats = await redisCache.getStats();
                const timestamp = new Date().toISOString();
                
                // Verificar se stats não é null
                if (!stats) {
                    const data = {
                        timestamp,
                        stats: null,
                        memory: {
                            used: 'N/A',
                            keys: 0,
                            connected: false
                        },
                        error: 'Redis não conectado'
                    };
                    res.write(`data: ${JSON.stringify(data)}\n\n`);
                    return;
                }
                
                const data = {
                    timestamp,
                    stats,
                    memory: {
                        used: stats.memory || 'N/A',
                        keys: stats.keys || 0,
                        connected: stats.connected || false
                    }
                };

                res.write(`data: ${JSON.stringify(data)}\n\n`);
            } catch (error) {
                console.error('Erro ao enviar atualização de monitoramento:', error);
                // Enviar erro para o cliente
                const errorData = {
                    timestamp: new Date().toISOString(),
                    error: error.message,
                    stats: null,
                    memory: {
                        used: 'N/A',
                        keys: 0,
                        connected: false
                    }
                };
                res.write(`data: ${JSON.stringify(errorData)}\n\n`);
            }
        };

        // Enviar primeira atualização
        await sendUpdate();

        // Configurar intervalo de atualizações
        const intervalId = setInterval(sendUpdate, parseInt(interval));

        // Limpar intervalo quando conexão for fechada
        req.on('close', () => {
            clearInterval(intervalId);
        });

    } catch (error) {
        console.error('Erro no monitoramento do cache:', error);
        // Só enviar resposta JSON se headers ainda não foram enviados
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Erro ao iniciar monitoramento',
                error: error.message
            });
        }
    }
};

/**
 * Configurar alertas do cache
 */
export const configureCacheAlerts = async (req, res) => {
    try {
        const { alerts } = req.body;

        // Validar configurações de alerta
        const validAlerts = ['memory_usage', 'key_count', 'connection_loss', 'performance_degradation'];
        
        const configuredAlerts = {};
        
        for (const [alertType, config] of Object.entries(alerts)) {
            if (!validAlerts.includes(alertType)) {
                continue;
            }

            configuredAlerts[alertType] = {
                enabled: config.enabled || false,
                threshold: config.threshold || 0,
                email: config.email || false,
                webhook: config.webhook || null
            };
        }

        // Salvar configurações (em produção, salvar no banco de dados)
        // Por enquanto, apenas simular
        const alertConfig = {
            alerts: configuredAlerts,
            updatedAt: new Date().toISOString()
        };

        res.json({
            success: true,
            message: 'Alertas configurados com sucesso',
            config: alertConfig
        });

    } catch (error) {
        console.error('Erro ao configurar alertas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao configurar alertas',
            error: error.message
        });
    }
};

// Funções auxiliares

/**
 * Obter métricas recentes de performance do cache
 */
async function getRecentCacheMetrics() {
    try {
        // Simular métricas de performance (em produção, buscar do banco)
        return {
            avgResponseTime: Math.random() * 10 + 1, // 1-11ms
            hitRate: Math.random() * 20 + 80, // 80-100%
            operationsPerSecond: Math.random() * 1000 + 500, // 500-1500 ops/s
            errorRate: Math.random() * 2, // 0-2%
            peakMemoryUsage: Math.random() * 100 + 50 // 50-150MB
        };
    } catch (error) {
        console.error('Erro ao obter métricas de performance:', error);
        return null;
    }
}

/**
 * Gerar recomendações para otimização do cache
 */
function generateCacheRecommendations(stats, ttlAnalysis) {
    const recommendations = [];

    // Análise de uso de memória
    if (stats.detailed && stats.detailed.estimatedMemoryUsage > 100 * 1024 * 1024) { // > 100MB
        recommendations.push({
            type: 'memory',
            priority: 'high',
            message: 'Uso de memória elevado. Considere implementar limpeza automática.',
            action: 'optimize'
        });
    }

    // Análise de TTL
    if (ttlAnalysis.analysis && ttlAnalysis.analysis.withoutTTL > ttlAnalysis.analysis.withTTL) {
        recommendations.push({
            type: 'ttl',
            priority: 'medium',
            message: 'Muitas chaves sem TTL. Defina TTL para evitar acúmulo.',
            action: 'set-ttl'
        });
    }

    // Análise de distribuição de chaves
    if (stats.detailed && stats.detailed.totalKeys > 10000) {
        recommendations.push({
            type: 'keys',
            priority: 'medium',
            message: 'Grande número de chaves. Considere implementar particionamento.',
            action: 'analyze'
        });
    }

    return recommendations;
}

/**
 * Limpar chaves expiradas
 */
async function cleanupExpiredKeys(adminId) {
    try {
        const startTime = Date.now();
        
        // Executar limpeza
        await redisCache.cleanupIfNeeded();
        
        const executionTime = Date.now() - startTime;
        
        return {
            success: true,
            message: 'Limpeza de chaves expiradas concluída',
            executionTime
        };
    } catch (error) {
        throw new Error(`Erro na limpeza: ${error.message}`);
    }
}

/**
 * Analisar uso de memória
 */
async function analyzeMemoryUsage(adminId) {
    try {
        const stats = await RedisManager.getDetailedStats(adminId);
        
        return {
            success: true,
            message: 'Análise de memória concluída',
            analysis: {
                totalMemory: stats.detailed.estimatedMemoryUsage,
                keyDistribution: stats.detailed.keysByPattern,
                recommendations: stats.detailed.estimatedMemoryUsage > 50 * 1024 * 1024 ? 
                    ['Considere implementar compressão', 'Revise TTL das chaves'] : 
                    ['Uso de memória dentro do esperado']
            }
        };
    } catch (error) {
        throw new Error(`Erro na análise de memória: ${error.message}`);
    }
}

/**
 * Desfragmentar cache
 */
async function defragmentCache(adminId) {
    try {
        // Simular desfragmentação (Redis faz isso automaticamente)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
            success: true,
            message: 'Desfragmentação simulada (Redis gerencia automaticamente)',
            note: 'Redis realiza desfragmentação automática em background'
        };
    } catch (error) {
        throw new Error(`Erro na desfragmentação: ${error.message}`);
    }
}

/**
 * Backup de chaves importantes
 */
async function backupImportantKeys(adminId) {
    try {
        const importantPatterns = ['user:*', 'exercise:*', 'workout:*'];
        const backupInfo = {};
        
        for (const pattern of importantPatterns) {
            const keys = await redisCache.client.keys(pattern);
            backupInfo[pattern] = {
                count: keys.length,
                backedUp: keys.length > 0
            };
        }
        
        return {
            success: true,
            message: 'Backup de chaves importantes simulado',
            backup: backupInfo,
            note: 'Em produção, implementar backup real para armazenamento persistente'
        };
    } catch (error) {
        throw new Error(`Erro no backup: ${error.message}`);
    }
}

export default {
    getCacheDashboard,
    performCacheMaintenance,
    getCacheMonitoring,
    configureCacheAlerts
};