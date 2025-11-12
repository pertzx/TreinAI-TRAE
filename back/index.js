// server.js
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import userRoutes from './routes/userRoutes.js';
import tokenRoutes from './routes/tokenRoutes.js';
import chatWebSocketServer from './websocket/websocketServer.js';
import { StripeWebhook } from './controllers/stripe.js';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import { securityHeaders, apiSecurityHeaders } from './middlewares/securityHeaders.js';
import redisCache from './config/redis.js';
import { sanitizeInput } from './middlewares/validationMiddleware.js';
import gamificationRoutes from './routes/gamificationRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import { secureAccessGuard } from './middlewares/secureAccessGuard.js'

// cria __filename e __dirname em ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();

// Configurar trust proxy para ambientes de produção com proxy reverso
// Isso é necessário para o express-rate-limit funcionar corretamente
if (process.env.NODE_ENV === 'production') {
  // Em produção, confiar no primeiro proxy (Vercel, Heroku, etc.)
  app.set('trust proxy', 1);
} else {
  // Em desenvolvimento, pode haver proxies locais (como ngrok)
  app.set('trust proxy', true);
}

// Middleware customizado para capturar raw body ANTES do parsing - DEVE vir PRIMEIRO
// IMPORTANTE: Não usar encoding para preservar o formato exato do Stripe
app.use('/webhook', (req, res, next) => {
    const chunks = [];
    
    console.log('🔍 [MIDDLEWARE] Iniciando captura do raw body para webhook (sem encoding)');
    console.log('🔍 [MIDDLEWARE] Headers recebidos:', JSON.stringify(req.headers, null, 2));
    
    req.on('data', (chunk) => {
        chunks.push(chunk);
        console.log('🔍 [MIDDLEWARE] Chunk recebido, tamanho:', chunk.length);
    });
    
    req.on('end', () => {
        const rawBuffer = Buffer.concat(chunks);
        const rawString = rawBuffer.toString('utf8');
        
        console.log('🔍 [MIDDLEWARE] Raw body capturado com sucesso');
        console.log('🔍 [MIDDLEWARE] Tamanho total do buffer:', rawBuffer.length);
        console.log('🔍 [MIDDLEWARE] Tamanho total da string:', rawString.length);
        console.log('🔍 [MIDDLEWARE] Preview do body (primeiros 200 chars):', rawString.substring(0, 200));
        
        // Armazenar tanto o buffer quanto a string para compatibilidade
        req.rawBody = rawString;
        req.rawBuffer = rawBuffer;
        req.body = rawString; // Manter compatibilidade
        
        console.log('🔍 [MIDDLEWARE] req.rawBody definido:', !!req.rawBody);
        console.log('🔍 [MIDDLEWARE] req.rawBuffer definido:', !!req.rawBuffer);
        console.log('🔍 [MIDDLEWARE] req.body definido:', !!req.body);
        
        next();
    });
    
    req.on('error', (err) => {
        console.error('❌ [MIDDLEWARE] Erro ao capturar raw body:', err);
        res.status(400).send('Erro ao processar webhook');
    });
});

// Stripe Webhook (usa raw body) - DEVE vir DEPOIS do middleware de captura
app.post('/webhook', StripeWebhook);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 500, // 500 requisições por IP (aumentado para navegação normal)
  message: "Muitas requisiçoes. Tente novamente mais tarde.",
  // Configurações para resolver warnings de proxy
  validate: {
    xForwardedForHeader: false, // Desabilita warning para X-Forwarded-For
    forwardedHeader: false, // Desabilita warning para Forwarded header
    trustProxy: false // Desabilita warning de trust proxy
  }
})

// Outros middlewares
app.use(limiter)

// Headers de segurança globais
app.use(securityHeaders);

// Configuração CORS baseada no ambiente
const corsOptions = {
    origin: function (origin, callback) {
        // Em desenvolvimento, permite QUALQUER origem
        if (process.env.NODE_ENV !== 'production') {
            console.log(`🔧 CORS [DEV]: Permitindo origem: ${origin || 'sem origin'}`);
            return callback(null, true);
        }
        
        // Em produção, apenas origens específicas do .env
        const allowedOrigins = [
            process.env.FRONTEND_URL, // URL de produção do frontend
            ...(process.env.ALLOWED_ORIGINS?.split(',') || []), // URLs adicionais do .env
        ].filter(Boolean); // Remove valores undefined/null
        
        console.log(`🔒 CORS [PROD]: Verificando origem: ${origin}`);
        console.log(`🔒 CORS [PROD]: Origens permitidas:`, allowedOrigins);
        
        // Rejeita requisições sem origin em produção
        if (!origin) {
            console.log('❌ CORS [PROD]: Requisição sem origin rejeitada');
            return callback(new Error('Origem não especificada não permitida em produção'));
        }
        
        if (allowedOrigins.includes(origin)) {
            console.log(`✅ CORS [PROD]: Origem permitida: ${origin}`);
            callback(null, true);
        } else {
            console.log(`❌ CORS [PROD]: Origem rejeitada: ${origin}`);
            callback(new Error('Não permitido pelo CORS'));
        }
    },
    credentials: true, // Permite cookies
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
    maxAge: 86400, // Cache preflight por 24 horas
    optionsSuccessStatus: 200 // Para suporte a navegadores legados
};

app.use(cors(corsOptions));

// Aplicar sanitizeInput APENAS para rotas que não sejam webhook
app.use((req, res, next) => {
    if (req.path === '/webhook') {
        return next(); // Pular sanitização para webhook
    }
    sanitizeInput(req, res, next);
});

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware de segurança automático para rotas com userId/profissionalId
// Mantido antes do registro das rotas para interceptação global
app.use(secureAccessGuard);

// Conexão com MongoDB
const MONGO_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.vcxrbu2.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Banco de dados conectado com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao conectar ao banco:', err.message);
    process.exit(1);
  }
}

// Inicializar Redis
async function connectRedis() {
  try {
    await redisCache.connect();
    console.log('✅ Redis inicializado com sucesso!');
  } catch (err) {
    console.warn('⚠️ Redis não pôde ser conectado:', err.message);
    console.warn('⚠️ Aplicação continuará sem cache Redis');
  }
}

// Conectar aos bancos de dados
connectDB();
connectRedis();

// Rotas da API
app.use('/', apiSecurityHeaders, authRoutes);
app.use('/reports', apiSecurityHeaders, reportRoutes);
app.use('/', apiSecurityHeaders, userRoutes);
app.use('/tokens', apiSecurityHeaders, tokenRoutes);
app.use('/gamification', apiSecurityHeaders, gamificationRoutes);
app.use('/admin', apiSecurityHeaders, adminRoutes);

// Iniciar servidor
// Detectar ambiente serverless
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY;

import { startTokenCleanupJob } from './jobs/tokenCleanup.js';

if (!isServerless) {
  // Ambiente local - inicializar servidor tradicional
  const PORT = process.env.PORT || 4000;
  const HOST = process.env.HOST || '0.0.0.0';

  const server = app.listen(PORT, HOST, () => {
    console.log(`🚀 Servidor rodando em ${HOST}:${PORT}`);
    console.log(`📱 Acesso local: http://localhost:${PORT}`);
    console.log(`🌐 Acesso rede: http://localhost:${PORT}`);
  });

  // Inicializar WebSocket Server apenas em ambiente local
  chatWebSocketServer.initialize(server);
  chatWebSocketServer.startHeartbeat();
  
  // Inicializar job de limpeza de tokens
  startTokenCleanupJob();
} else {
  console.log('🔧 Ambiente serverless detectado - WebSocket desabilitado');
}

// Export default para Vercel serverless
export default app;

// Exportar instância do WebSocket para uso nos controllers
export { chatWebSocketServer };
