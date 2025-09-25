import { APIPerformanceMetric, APIErrorLog, AISystemLog } from '../models/AISystemLogs.js';

/**
 * Utilitário para registrar ações do sistema AI
 */
export class AISystemLogger {
    /**
     * Registra uma ação do sistema AI
     * @param {string} action - Ação realizada
     * @param {string} userId - ID do usuário
     * @param {boolean} success - Se a ação foi bem-sucedida
     * @param {number} executionTime - Tempo de execução em ms
     * @param {Object} metadata - Metadados adicionais
     */
    static async logAction(action, userId, success, executionTime, metadata = {}) {
        try {
            const aiLog = new AISystemLog({
                action,
                userId,
                success,
                executionTime,
                timestamp: new Date(),
                metadata
            });

            await aiLog.save();
        } catch (error) {
            console.error('Erro ao salvar log do sistema AI:', error);
        }
    }

    /**
     * Registra métricas de performance de API
     * @param {string} apiName - Nome da API
     * @param {string} requestId - ID da requisição
     * @param {string} userId - ID do usuário
     * @param {number} responseTime - Tempo de resposta em ms
     * @param {boolean} success - Se a requisição foi bem-sucedida
     * @param {number} statusCode - Código de status HTTP
     * @param {number} dataSize - Tamanho dos dados em bytes
     * @param {boolean} cacheHit - Se foi um cache hit
     * @param {Object} metadata - Metadados adicionais
     */
    static async logAPIPerformance(apiName, requestId, userId, responseTime, success, statusCode, dataSize, cacheHit = false, metadata = {}) {
        try {
            const performanceMetric = new APIPerformanceMetric({
                apiName,
                requestId,
                userId,
                responseTime,
                success,
                statusCode,
                dataSize,
                cacheHit,
                timestamp: new Date(),
                metadata
            });

            await performanceMetric.save();
        } catch (error) {
            console.error('Erro ao salvar métricas de performance:', error);
        }
    }

    /**
     * Registra erro de API externa
     * @param {string} apiName - Nome da API
     * @param {string} requestId - ID da requisição
     * @param {string} userId - ID do usuário
     * @param {string} errorType - Tipo do erro
     * @param {string} errorMessage - Mensagem do erro
     * @param {string} severity - Severidade do erro (LOW, MEDIUM, HIGH)
     * @param {number} statusCode - Código de status HTTP
     * @param {number} retryCount - Número de tentativas
     * @param {Object} metadata - Metadados adicionais
     */
    static async logAPIError(apiName, requestId, userId, errorType, errorMessage, severity, statusCode, retryCount = 0, metadata = {}) {
        try {
            const errorLog = new APIErrorLog({
                apiName,
                requestId,
                userId,
                errorType,
                errorMessage,
                severity,
                statusCode,
                retryCount,
                timestamp: new Date(),
                metadata
            });

            await errorLog.save();
        } catch (error) {
            console.error('Erro ao salvar log de erro da API:', error);
        }
    }

    /**
     * Wrapper para executar uma função e registrar automaticamente
     * @param {string} action - Nome da ação
     * @param {string} userId - ID do usuário
     * @param {Function} fn - Função a ser executada
     * @param {Object} metadata - Metadados adicionais
     * @returns {Promise<any>} Resultado da função
     */
    static async executeAndLog(action, userId, fn, metadata = {}) {
        const startTime = Date.now();
        let success = false;
        let result = null;
        let error = null;

        try {
            result = await fn();
            success = true;
            return result;
        } catch (err) {
            error = err;
            success = false;
            throw err;
        } finally {
            const executionTime = Date.now() - startTime;
            
            const logMetadata = {
                ...metadata,
                hasError: !success,
                errorMessage: error?.message || null
            };

            await this.logAction(action, userId, success, executionTime, logMetadata);
        }
    }

    /**
     * Registra uso de cache
     * @param {string} cacheKey - Chave do cache
     * @param {boolean} hit - Se foi um cache hit
     * @param {string} userId - ID do usuário
     * @param {Object} metadata - Metadados adicionais
     */
    static async logCacheUsage(cacheKey, hit, userId, metadata = {}) {
        try {
            await this.logAction('CACHE_ACCESS', userId, true, 0, {
                cacheKey,
                cacheHit: hit,
                ...metadata
            });
        } catch (error) {
            console.error('Erro ao registrar uso de cache:', error);
        }
    }

    /**
     * Registra estatísticas de uma sessão de usuário
     * @param {string} userId - ID do usuário
     * @param {string} sessionType - Tipo da sessão (WORKOUT, NUTRITION, etc.)
     * @param {number} duration - Duração da sessão em ms
     * @param {Object} stats - Estatísticas da sessão
     */
    static async logUserSession(userId, sessionType, duration, stats = {}) {
        try {
            await this.logAction('USER_SESSION', userId, true, duration, {
                sessionType,
                stats
            });
        } catch (error) {
            console.error('Erro ao registrar sessão do usuário:', error);
        }
    }
}

/**
 * Decorator para automatizar logging de métodos
 * @param {string} action - Nome da ação
 * @param {Function} getUserId - Função para extrair userId dos argumentos
 */
export function logAIAction(action, getUserId = (args) => args[0]?.user?.id) {
    return function(target, propertyName, descriptor) {
        const method = descriptor.value;

        descriptor.value = async function(...args) {
            const userId = getUserId(args);
            const startTime = Date.now();
            let success = false;
            let result = null;

            try {
                result = await method.apply(this, args);
                success = true;
                return result;
            } catch (error) {
                success = false;
                throw error;
            } finally {
                const executionTime = Date.now() - startTime;
                
                AISystemLogger.logAction(action, userId, success, executionTime, {
                    method: propertyName,
                    className: target.constructor.name
                }).catch(err => {
                    console.error('Erro no decorator de logging:', err);
                });
            }
        };

        return descriptor;
    };
}

export default AISystemLogger;