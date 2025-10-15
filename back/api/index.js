// api/index.js - Entrada para Vercel Serverless Functions
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from '../routes/authRoutes.js';
import reportRoutes from '../routes/reportRoutes.js';
import userRoutes from '../routes/userRoutes.js';
import tokenRoutes from '../routes/tokenRoutes.js';
import { StripeWebhook } from '../controllers/stripe.js';
import rateLimit from 'express-rate-limit';
import { securityHeaders, apiSecurityHeaders } from '../middlewares/securityHeaders.js';
import redisCache from '../config/redis.js';
import { sanitizeInput } from '../middlewares/validationMiddleware.js';
import gamificationRoutes from '../routes/gamificationRoutes.js';
import adminRoutes from '../routes/adminRoutes.js';

// Configurar dotenv
dotenv.config();

const app = express();

// Stripe Webhook (usa raw body)
app.post('/webhook', express.raw({ type: 'application/json' }), StripeWebhook);

// Rate limiting mais conservador para serverless
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // Reduzido para serverless
  message: "Muitas requisições. Tente novamente mais tarde."
});

app.use(limiter);
app.use(securityHeaders);

// Configuração CORS simplificada para serverless
const corsOptions = {
    origin: function (origin, callback) {
        // Em desenvolvimento, permite QUALQUER origem
        if (process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }
        
        // Em produção, apenas origens específicas do .env
        const allowedOrigins = [
            process.env.FRONTEND_URL,
            ...(process.env.ALLOWED_ORIGINS?.split(',') || []),
        ].filter(Boolean);
        
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Não permitido pelo CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-CSRF-Token'
    ],
    exposedHeaders: ['X-CSRF-Token'],
    maxAge: 86400,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(sanitizeInput);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Conexão com MongoDB (otimizada para serverless)
const MONGO_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.vcxrbu2.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

let isConnected = false;

async function connectDB() {
  if (isConnected) {
    return;
  }
  
  try {
    await mongoose.connect(MONGO_URI, {
      bufferCommands: false, // Importante para serverless
      maxPoolSize: 1, // Limite de conexões para serverless
    });
    isConnected = true;
    console.log('✅ MongoDB conectado');
  } catch (err) {
    console.error('❌ Erro MongoDB:', err.message);
    throw err;
  }
}

// Inicializar Redis (opcional para serverless)
async function connectRedis() {
  try {
    if (process.env.REDIS_URL) {
      await redisCache.connect();
      console.log('✅ Redis conectado');
    }
  } catch (err) {
    console.warn('⚠️ Redis não conectado:', err.message);
  }
}

// Middleware para conectar DB antes de cada request
app.use(async (req, res, next) => {
  try {
    await connectDB();
    await connectRedis();
    next();
  } catch (error) {
    console.error('Erro de conexão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: 'TreinAI-TRAE API',
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

// Rotas da API
app.use('/', apiSecurityHeaders, authRoutes);
app.use('/reports', apiSecurityHeaders, reportRoutes);
app.use('/', apiSecurityHeaders, userRoutes);
app.use('/tokens', apiSecurityHeaders, tokenRoutes);
app.use('/gamification', apiSecurityHeaders, gamificationRoutes);
app.use('/admin', apiSecurityHeaders, adminRoutes);

// Handler de erro global
app.use((error, req, res, next) => {
  console.error('Erro global:', error);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Algo deu errado'
  });
});

// Exportar para Vercel
export default app;