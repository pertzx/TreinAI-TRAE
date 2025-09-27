import redisCache from '../config/redis.js';

/**
 * Gerenciador avançado do Redis para funcionalidades administrativas
 */
export class RedisManager {
    /**
     * Obter estatísticas detalhadas do cache
     * @param {string} adminId - ID do administrador
     * @returns {Promise<Object>} Estatísticas do cache
     */
    static async getDetailedStats(adminId) {
        try {
            const startTime = Date.now();
            
            // Verificar se o Redis está conectado
            if (!redisCache.client || !redisCache.isConnected()) {
                console.warn('Redis não está conectado. Retornando estatísticas vazias.');
                return {
                    success: false,
                    message: 'Redis não está conectado',
                    detailed: {
                        basicStats: { hits: 0, misses: 0, keys: 0 },
                        keyStats: {},
                        totalKeys: 0,
                        totalMemoryUsage: 0,
                        serverInfo: null,
                        executionTime: Date.now() - startTime
                    }
                };
            }
            
            // Estatísticas básicas do Redis
            const basicStats = await redisCache.getStats();
            
            // Informações detalhadas sobre as chaves
            const keyPatterns = [
                'exercise:*',
                'workout:*',
                'user:*',
                'ai:*',
                'nutrition:*',
                'trends:*',
                'api:*'
            ];

            const keyStats = {};
            let totalKeys = 0;
            let totalMemoryUsage = 0;

            for (const pattern of keyPatterns) {
                try {
                    const keys = await redisCache.client.keys(pattern);
                    const patternName = pattern.replace('*', '');
                    
                    keyStats[patternName] = {
                        count: keys.length,
                        keys: keys.slice(0, 10), // Primeiras 10 chaves como exemplo
                        hasMore: keys.length > 10
                    };

                    totalKeys += keys.length;

                    // Calcular uso de memória para algumas chaves (amostra)
                    if (keys.length > 0) {
                        const sampleKeys = keys.slice(0, Math.min(5, keys.length));
                        let patternMemory = 0;
                        
                        for (const key of sampleKeys) {
                            try {
                                const memory = await redisCache.client.memory('usage', key);
                                patternMemory += memory || 0;
                            } catch (err) {
                                // Ignorar erros de chaves individuais
                            }
                        }
                        
                        keyStats[patternName].avgMemoryPerKey = sampleKeys.length > 0 ? 
                            Math.round(patternMemory / sampleKeys.length) : 0;
                        keyStats[patternName].estimatedTotalMemory = 
                            keyStats[patternName].avgMemoryPerKey * keys.length;
                        
                        totalMemoryUsage += keyStats[patternName].estimatedTotalMemory;
                    }
                } catch (error) {
                    console.error(`Erro ao analisar padrão ${pattern}:`, error);
                    keyStats[pattern.replace('*', '')] = {
                        count: 0,
                        keys: [],
                        hasMore: false,
                        error: error.message
                    };
                }
            }

            // Informações do servidor Redis
            let serverInfo = {};
            try {
                if (redisCache.client && redisCache.isConnected()) {
                    const info = await redisCache.client.info();
                    const lines = info.split('\r\n');
                    
                    for (const line of lines) {
                        if (line.includes(':')) {
                            const [key, value] = line.split(':');
                            if (key && value) {
                                serverInfo[key.trim()] = value.trim();
                            }
                        }
                    }
                } else {
                    console.warn('Redis client não disponível para obter informações do servidor');
                }
            } catch (error) {
                console.error('Erro ao obter informações do servidor:', error);
                serverInfo = { error: 'Não foi possível obter informações do servidor' };
            }

            const executionTime = Date.now() - startTime;

            return {
                basic: basicStats,
                detailed: {
                    totalKeys,
                    estimatedMemoryUsage: totalMemoryUsage,
                    keysByPattern: keyStats,
                    serverInfo: {
                        version: serverInfo.redis_version,
                        uptime: serverInfo.uptime_in_seconds,
                        connectedClients: serverInfo.connected_clients,
                        usedMemory: serverInfo.used_memory_human,
                        maxMemory: serverInfo.maxmemory_human || 'unlimited',
                        keyspaceHits: serverInfo.keyspace_hits,
                        keyspaceMisses: serverInfo.keyspace_misses,
                        hitRate: serverInfo.keyspace_hits && serverInfo.keyspace_misses ? 
                            ((parseInt(serverInfo.keyspace_hits) / 
                              (parseInt(serverInfo.keyspace_hits) + parseInt(serverInfo.keyspace_misses))) * 100).toFixed(2) + '%' : 'N/A'
                    }
                },
                executionTime
            };

        } catch (error) {
            throw error;
        }
    }

    /**
     * Limpar cache por padrão
     * @param {string} adminId - ID do administrador
     * @param {string} pattern - Padrão das chaves a serem removidas
     * @returns {Promise<Object>} Resultado da operação
     */
    static async clearByPattern(adminId, pattern) {
        try {
            const startTime = Date.now();
            
            // Validar padrão
            if (!pattern || pattern.trim() === '') {
                throw new Error('Padrão não pode estar vazio');
            }

            // Padrões perigosos que requerem confirmação especial
            const dangerousPatterns = ['*', '**', 'user:*', 'exercise:*'];
            const isDangerous = dangerousPatterns.some(dangerous => 
                pattern.toLowerCase().includes(dangerous.toLowerCase())
            );

            // Buscar chaves que correspondem ao padrão
            const keys = await redisCache.client.keys(pattern);
            
            if (keys.length === 0) {
                return {
                    success: true,
                    message: 'Nenhuma chave encontrada para o padrão especificado',
                    keysDeleted: 0,
                    pattern,
                    executionTime: Date.now() - startTime
                };
            }

            // Deletar chaves em lotes para melhor performance
            const batchSize = 100;
            let deletedCount = 0;
            
            for (let i = 0; i < keys.length; i += batchSize) {
                const batch = keys.slice(i, i + batchSize);
                const deleted = await redisCache.client.del(...batch);
                deletedCount += deleted;
            }

            const executionTime = Date.now() - startTime;

            return {
                success: true,
                message: `${deletedCount} chaves removidas com sucesso`,
                keysDeleted: deletedCount,
                keysFound: keys.length,
                pattern,
                isDangerous,
                executionTime
            };

        } catch (error) {
            throw error;
        }
    }

    /**
     * Otimizar cache removendo chaves expiradas e antigas
     * @param {string} adminId - ID do administrador
     * @returns {Promise<Object>} Resultado da otimização
     */
    static async optimizeCache(adminId) {
        try {
            const startTime = Date.now();
            
            // Obter estatísticas antes da otimização
            const statsBefore = await redisCache.getStats();
            
            // Executar limpeza automática do Redis
            await redisCache.cleanupIfNeeded();
            
            // Forçar coleta de lixo no Redis (se suportado)
            try {
                await redisCache.client.memory('purge');
            } catch (error) {
                // Comando pode não estar disponível em todas as versões
                console.log('Comando MEMORY PURGE não disponível:', error.message);
            }

            // Obter estatísticas após a otimização
            const statsAfter = await redisCache.getStats();
            
            const executionTime = Date.now() - startTime;
            
            const optimization = {
                keysBefore: statsBefore.keys || 0,
                keysAfter: statsAfter.keys || 0,
                keysRemoved: (statsBefore.keys || 0) - (statsAfter.keys || 0),
                memoryBefore: statsBefore.memoryUsage || 0,
                memoryAfter: statsAfter.memoryUsage || 0,
                memorySaved: (statsBefore.memoryUsage || 0) - (statsAfter.memoryUsage || 0)
            };

            return {
                success: true,
                message: 'Cache otimizado com sucesso',
                optimization,
                executionTime
            };

        } catch (error) {
            throw error;
        }
    }

    /**
     * Analisar chaves por TTL (Time To Live)
     * @param {string} adminId - ID do administrador
     * @param {string} pattern - Padrão das chaves a analisar
     * @returns {Promise<Object>} Análise de TTL
     */
    static async analyzeTTL(adminId, pattern = '*') {
        try {
            const startTime = Date.now();
            
            // Verificar se o Redis está conectado
            if (!redisCache.client || !redisCache.isConnected()) {
                console.warn('Redis não está conectado. Retornando análise vazia.');
                return {
                    success: false,
                    message: 'Redis não está conectado',
                    analysis: null,
                    executionTime: Date.now() - startTime
                };
            }
            
            const keys = await redisCache.client.keys(pattern);
            
            if (keys.length === 0) {
                return {
                    success: true,
                    message: 'Nenhuma chave encontrada',
                    analysis: null,
                    executionTime: Date.now() - startTime
                };
            }

            // Analisar TTL das chaves (máximo 1000 para performance)
            const sampleKeys = keys.slice(0, 1000);
            const ttlAnalysis = {
                total: keys.length,
                analyzed: sampleKeys.length,
                withTTL: 0,
                withoutTTL: 0,
                expired: 0,
                ttlDistribution: {
                    '< 1h': 0,
                    '1h - 24h': 0,
                    '1d - 7d': 0,
                    '> 7d': 0
                },
                avgTTL: 0,
                minTTL: null,
                maxTTL: null
            };

            let totalTTL = 0;
            const ttlValues = [];

            for (const key of sampleKeys) {
                try {
                    const ttl = await redisCache.client.ttl(key);
                    
                    if (ttl === -2) {
                        ttlAnalysis.expired++;
                    } else if (ttl === -1) {
                        ttlAnalysis.withoutTTL++;
                    } else {
                        ttlAnalysis.withTTL++;
                        totalTTL += ttl;
                        ttlValues.push(ttl);
                        
                        // Distribuição por tempo
                        if (ttl < 3600) { // < 1h
                            ttlAnalysis.ttlDistribution['< 1h']++;
                        } else if (ttl < 86400) { // 1h - 24h
                            ttlAnalysis.ttlDistribution['1h - 24h']++;
                        } else if (ttl < 604800) { // 1d - 7d
                            ttlAnalysis.ttlDistribution['1d - 7d']++;
                        } else { // > 7d
                            ttlAnalysis.ttlDistribution['> 7d']++;
                        }
                    }
                } catch (error) {
                    // Ignorar erros de chaves individuais
                }
            }

            if (ttlValues.length > 0) {
                ttlAnalysis.avgTTL = Math.round(totalTTL / ttlValues.length);
                ttlAnalysis.minTTL = Math.min(...ttlValues);
                ttlAnalysis.maxTTL = Math.max(...ttlValues);
            }

            const executionTime = Date.now() - startTime;

            return {
                success: true,
                message: 'Análise de TTL concluída',
                pattern,
                analysis: ttlAnalysis,
                executionTime
            };

        } catch (error) {
            throw error;
        }
    }

    /**
     * Definir TTL para chaves por padrão
     * @param {string} adminId - ID do administrador
     * @param {string} pattern - Padrão das chaves
     * @param {number} ttlSeconds - TTL em segundos
     * @returns {Promise<Object>} Resultado da operação
     */
    static async setTTLByPattern(adminId, pattern, ttlSeconds) {
        try {
            const startTime = Date.now();
            
            if (!pattern || ttlSeconds < 0) {
                throw new Error('Padrão e TTL devem ser válidos');
            }

            const keys = await redisCache.client.keys(pattern);
            
            if (keys.length === 0) {
                return {
                    success: true,
                    message: 'Nenhuma chave encontrada',
                    keysUpdated: 0,
                    executionTime: Date.now() - startTime
                };
            }

            let updatedCount = 0;
            
            // Atualizar TTL em lotes
            const batchSize = 100;
            for (let i = 0; i < keys.length; i += batchSize) {
                const batch = keys.slice(i, i + batchSize);
                
                for (const key of batch) {
                    try {
                        await redisCache.client.expire(key, ttlSeconds);
                        updatedCount++;
                    } catch (error) {
                        // Ignorar erros de chaves individuais
                    }
                }
            }

            const executionTime = Date.now() - startTime;

            return {
                success: true,
                message: `TTL definido para ${updatedCount} chaves`,
                keysFound: keys.length,
                keysUpdated: updatedCount,
                ttlSeconds,
                executionTime
            };

        } catch (error) {
            throw error;
        }
    }
}

export default RedisManager;