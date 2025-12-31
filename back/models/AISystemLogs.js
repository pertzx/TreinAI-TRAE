import mongoose from 'mongoose';

const apiErrorLogSchema = new mongoose.Schema({
    apiName: { type: String, required: true },
    errorType: { type: String, required: true },
    severity: { 
        type: String, 
        enum: ['low', 'medium', 'high', 'critical'], 
        default: 'medium' 
    },
    message: { type: String },
    stack: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    retryCount: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now }
});

const apiPerformanceMetricSchema = new mongoose.Schema({
    apiName: { type: String, required: true },
    responseTime: { type: Number, required: true }, // em ms
    statusCode: { type: Number, required: true },
    success: { type: Boolean, required: true },
    endpoint: { type: String },
    method: { type: String },
    dataSize: { type: Number }, // bytes
    cacheHit: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
});

const aiSystemLogSchema = new mongoose.Schema({
    action: { type: String, required: true }, // ex: 'generate_workout', 'analyze_performance'
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    inputTokens: { type: Number },
    outputTokens: { type: Number },
    model: { type: String },
    executionTime: { type: Number }, // ms
    success: { type: Boolean, default: true },
    error: { type: String },
    timestamp: { type: Date, default: Date.now }
});

export const APIErrorLog = mongoose.model('APIErrorLog', apiErrorLogSchema);
export const APIPerformanceMetric = mongoose.model('APIPerformanceMetric', apiPerformanceMetricSchema);
export const AISystemLog = mongoose.model('AISystemLog', aiSystemLogSchema);
