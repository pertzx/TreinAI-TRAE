import mongoose from 'mongoose';

const { Schema } = mongoose;

// Schema para logs de erro das APIs externas
const APIErrorLogSchema = new Schema({
    apiName: {
        type: String,
        required: true,
        enum: ['exerciseDB', 'wgerAPI', 'openAI', 'redis']
    },
    endpoint: {
        type: String,
        required: true
    },
    method: {
        type: String,
        required: true,
        enum: ['GET', 'POST', 'PUT', 'DELETE']
    },
    statusCode: {
        type: Number,
        required: true
    },
    errorType: {
        type: String,
        required: true,
        enum: ['CONNECTION_ERROR', 'AUTH_ERROR', 'RATE_LIMIT', 'SERVER_ERROR', 'TIMEOUT', 'VALIDATION_ERROR']
    },
    errorMessage: {
        type: String,
        required: true
    },
    requestData: {
        type: Schema.Types.Mixed,
        default: null
    },
    responseData: {
        type: Schema.Types.Mixed,
        default: null
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    resolved: {
        type: Boolean,
        default: false
    },
    resolvedAt: {
        type: Date,
        default: null
    },
    resolvedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    retryCount: {
        type: Number,
        default: 0
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    }
});

// Schema para métricas de performance das APIs
const APIPerformanceMetricSchema = new Schema({
    apiName: {
        type: String,
        required: true,
        enum: ['exerciseDB', 'wgerAPI', 'openAI', 'redis']
    },
    endpoint: {
        type: String,
        required: true
    },
    method: {
        type: String,
        required: true,
        enum: ['GET', 'POST', 'PUT', 'DELETE']
    },
    responseTime: {
        type: Number,
        required: true // em milissegundos
    },
    statusCode: {
        type: Number,
        required: true
    },
    success: {
        type: Boolean,
        required: true
    },
    cacheHit: {
        type: Boolean,
        default: false
    },
    dataSize: {
        type: Number,
        default: 0 // tamanho da resposta em bytes
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    metadata: {
        type: Schema.Types.Mixed,
        default: {}
    }
});

// Schema para logs do sistema AI
const AISystemLogSchema = new Schema({
    action: {
        type: String,
        required: true,
        enum: ['exercise_search', 'workout_generation', 'fitness_trends', 'cache_operation', 'ai_request']
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    details: {
        type: Schema.Types.Mixed,
        required: true
    },
    success: {
        type: Boolean,
        required: true
    },
    executionTime: {
        type: Number,
        required: true // em milissegundos
    },
    errorMessage: {
        type: String,
        default: null
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    ipAddress: {
        type: String,
        default: null
    },
    userAgent: {
        type: String,
        default: null
    }
});

// Índices para otimização de consultas
APIErrorLogSchema.index({ apiName: 1, timestamp: -1 });
APIErrorLogSchema.index({ errorType: 1, timestamp: -1 });
APIErrorLogSchema.index({ resolved: 1, severity: -1 });
APIErrorLogSchema.index({ userId: 1, timestamp: -1 });

APIPerformanceMetricSchema.index({ apiName: 1, timestamp: -1 });
APIPerformanceMetricSchema.index({ success: 1, timestamp: -1 });
APIPerformanceMetricSchema.index({ userId: 1, timestamp: -1 });

AISystemLogSchema.index({ action: 1, timestamp: -1 });
AISystemLogSchema.index({ userId: 1, timestamp: -1 });
AISystemLogSchema.index({ success: 1, timestamp: -1 });

// Modelos
const APIErrorLog = mongoose.model('APIErrorLog', APIErrorLogSchema, 'api_error_logs');
const APIPerformanceMetric = mongoose.model('APIPerformanceMetric', APIPerformanceMetricSchema, 'api_performance_metrics');
const AISystemLog = mongoose.model('AISystemLog', AISystemLogSchema, 'ai_system_logs');

export { APIErrorLog, APIPerformanceMetric, AISystemLog };