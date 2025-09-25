import { APIPerformanceMetric, APIErrorLog, AISystemLog } from '../models/AISystemLogs.js';

// Middleware para monitorar performance das APIs AI
export const apiPerformanceMiddleware = (apiName) => {
    return async (req, res, next) => {
        const startTime = Date.now();
        const requestId = `${apiName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Adicionar informações de tracking ao request
        req.apiTracking = {
            apiName,
            requestId,
            startTime,
            userId: req.user?.id || null
        };

        // Interceptar a resposta para capturar métricas
        const originalSend = res.send;
        const originalJson = res.json;

        let responseData = null;
        let responseSize = 0;

        // Override do método send
        res.send = function(data) {
            responseData = data;
            responseSize = Buffer.byteLength(data || '', 'utf8');
            return originalSend.call(this, data);
        };

        // Override do método json
        res.json = function(data) {
            responseData = data;
            responseSize = Buffer.byteLength(JSON.stringify(data || {}), 'utf8');
            return originalJson.call(this, data);
        };

        // Capturar quando a resposta é finalizada
        res.on('finish', async () => {
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            const success = res.statusCode >= 200 && res.statusCode < 400;

            try {
                // Salvar métricas de performance
                const performanceMetric = new APIPerformanceMetric({
                    apiName,
                    requestId,
                    userId: req.apiTracking.userId,
                    responseTime,
                    success,
                    statusCode: res.statusCode,
                    dataSize: responseSize,
                    cacheHit: req.cacheHit || false,
                    timestamp: new Date(startTime),
                    metadata: {
                        userAgent: req.get('User-Agent'),
                        ip: req.ip,
                        method: req.method,
                        endpoint: req.originalUrl,
                        requestSize: req.get('Content-Length') || 0
                    }
                });

                await performanceMetric.save();

                // Se houve erro, salvar log de erro
                if (!success) {
                    const errorLog = new APIErrorLog({
                        apiName,
                        requestId,
                        userId: req.apiTracking.userId,
                        errorType: getErrorType(res.statusCode),
                        errorMessage: getErrorMessage(responseData, res.statusCode),
                        severity: getErrorSeverity(res.statusCode),
                        statusCode: res.statusCode,
                        retryCount: req.retryCount || 0,
                        timestamp: new Date(),
                        metadata: {
                            userAgent: req.get('User-Agent'),
                            ip: req.ip,
                            method: req.method,
                            endpoint: req.originalUrl,
                            responseTime
                        }
                    });

                    await errorLog.save();
                }

            } catch (error) {
                console.error('Erro ao salvar métricas de performance:', error);
            }
        });

        next();
    };
};

// Middleware específico para ações do sistema AI
export const aiSystemLogger = (action) => {
    return async (req, res, next) => {
        const startTime = Date.now();
        
        req.aiAction = {
            action,
            startTime,
            userId: req.user?.id || null
        };

        // Interceptar resposta para log
        const originalJson = res.json;
        
        res.json = function(data) {
            const endTime = Date.now();
            const executionTime = endTime - startTime;
            const success = res.statusCode >= 200 && res.statusCode < 400;

            // Salvar log do sistema AI de forma assíncrona
            setImmediate(async () => {
                try {
                    const aiLog = new AISystemLog({
                        action,
                        userId: req.aiAction.userId,
                        success,
                        executionTime,
                        timestamp: new Date(startTime),
                        metadata: {
                            statusCode: res.statusCode,
                            endpoint: req.originalUrl,
                            method: req.method,
                            userAgent: req.get('User-Agent'),
                            ip: req.ip,
                            responseSize: Buffer.byteLength(JSON.stringify(data || {}), 'utf8')
                        }
                    });

                    await aiLog.save();
                } catch (error) {
                    console.error('Erro ao salvar log do sistema AI:', error);
                }
            });

            return originalJson.call(this, data);
        };

        next();
    };
};

// Utilitário para determinar tipo de erro
function getErrorType(statusCode) {
    if (statusCode >= 400 && statusCode < 500) {
        return 'CLIENT_ERROR';
    } else if (statusCode >= 500) {
        return 'SERVER_ERROR';
    } else if (statusCode === 408) {
        return 'TIMEOUT';
    } else if (statusCode === 429) {
        return 'RATE_LIMIT';
    }
    return 'UNKNOWN';
}

// Utilitário para extrair mensagem de erro
function getErrorMessage(responseData, statusCode) {
    if (typeof responseData === 'string') {
        try {
            const parsed = JSON.parse(responseData);
            return parsed.message || parsed.error || `HTTP ${statusCode}`;
        } catch {
            return responseData.substring(0, 500) || `HTTP ${statusCode}`;
        }
    } else if (typeof responseData === 'object' && responseData !== null) {
        return responseData.message || responseData.error || `HTTP ${statusCode}`;
    }
    return `HTTP ${statusCode}`;
}

// Utilitário para determinar severidade do erro
function getErrorSeverity(statusCode) {
    if (statusCode >= 500) {
        return 'HIGH';
    } else if (statusCode === 429 || statusCode === 408) {
        return 'MEDIUM';
    } else if (statusCode >= 400) {
        return 'LOW';
    }
    return 'LOW';
}

// Middleware para capturar erros de APIs externas
export const externalAPIErrorHandler = (apiName) => {
    return (error, req, res, next) => {
        const errorLog = new APIErrorLog({
            apiName,
            requestId: req.apiTracking?.requestId || `error_${Date.now()}`,
            userId: req.user?.id || null,
            errorType: 'EXTERNAL_API_ERROR',
            errorMessage: error.message || 'Unknown external API error',
            severity: 'HIGH',
            statusCode: error.status || error.statusCode || 500,
            retryCount: req.retryCount || 0,
            timestamp: new Date(),
            metadata: {
                stack: error.stack,
                userAgent: req.get('User-Agent'),
                ip: req.ip,
                method: req.method,
                endpoint: req.originalUrl,
                apiResponse: error.response?.data || null
            }
        });

        // Salvar log de forma assíncrona
        errorLog.save().catch(saveError => {
            console.error('Erro ao salvar log de erro da API externa:', saveError);
        });

        next(error);
    };
};

export default {
    apiPerformanceMiddleware,
    aiSystemLogger,
    externalAPIErrorHandler
};