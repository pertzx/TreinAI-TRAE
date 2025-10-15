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

// cria __filename e __dirname em ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();

// Configurar trust proxy para ambiente serverless
if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.set('trust proxy', 1); // Confia no primeiro proxy (Vercel)
}

// Stripe Webhook (usa raw body)
app.post('/webhook', express.raw({ type: 'application/json' }), StripeWebhook);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 500, // 500 requisições por IP (aumentado para navegação normal)
  message: "Muitas requisiçoes. Tente novamente mais tarde.",
  // Configurações específicas para serverless
  validate: {
    xForwardedForHeader: false, // Desabilita validação X-Forwarded-For
    forwardedHeader: false, // Desabilita validação Forwarded header
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
        
        // Em ambiente serverless, permite requisições sem origin (health checks, etc.)
        const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
        if (!origin && isServerless) {
            console.log('✅ CORS [SERVERLESS]: Permitindo requisição sem origin (health check)');
            return callback(null, true);
        }
        
        // Rejeita requisições sem origin em produção não-serverless
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
app.use(sanitizeInput);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Conexão com MongoDB
const MONGO_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.vcxrbu2.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

async function connectDB() {
  try {
    // Configurações específicas para ambiente serverless
    const mongooseOptions = {
      serverSelectionTimeoutMS: 5000, // Timeout de 5 segundos
      socketTimeoutMS: 45000, // Socket timeout de 45 segundos
      bufferCommands: false, // Desabilita buffering para serverless
    };

    await mongoose.connect(MONGO_URI, mongooseOptions);
    console.log('✅ Banco de dados conectado com sucesso!');
    
    // Log adicional para debug em ambiente serverless
    if (process.env.VERCEL) {
      console.log('🔧 Conexão MongoDB estabelecida em ambiente Vercel serverless');
    }
  } catch (err) {
    console.error('❌ Erro ao conectar ao banco:', err.message);
    
    // Em ambiente serverless, não encerrar o processo
    if (process.env.VERCEL) {
      console.error('⚠️ Falha na conexão MongoDB em ambiente serverless - continuando execução');
      return;
    }
    
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
app.get('/', limiter, cors(corsOptions), (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>TreinAI-TRAE</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background-color: #f0f0f0;
        }
        .container {
          text-align: center;
          padding: 20px;
          background-color: #fff;
          border-radius: 8px;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        h1 {
          color: #333;
        }
        p {
          color: #666;
          margin-bottom: 20px;
        }
        .btn {
          display: inline-block;
          padding: 10px 20px;
          background-color: #007bff;
          color: #fff;
          text-decoration: none;
          border-radius: 5px;
          transition: background-color 0.3s ease;
        }
        .btn:hover {
          background-color: #0056b3;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>TreinAI-TRAE</h1>
        <p>Seja bem-vindo ao TreinAI-TRAE! Explore nossa plataforma para gerenciar treinamentos e interações com usuários.</p>
        <a href="${process.env.FRONTEND_URL}" class="btn">Acessar Aplicação</a>
      </div>
    </body>
    </html>
  `);
});

app.use('/', apiSecurityHeaders, authRoutes);
app.use('/reports', apiSecurityHeaders, reportRoutes);
app.use('/', apiSecurityHeaders, userRoutes);
app.use('/tokens', apiSecurityHeaders, tokenRoutes);
app.use('/gamification', apiSecurityHeaders, gamificationRoutes);
app.use('/admin', apiSecurityHeaders, adminRoutes);

// Verificar se está em ambiente serverless (Vercel)
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

if (!isServerless) {
  // Modo desenvolvimento local - iniciar servidor
  const PORT = process.env.PORT || 4000;
  const HOST = process.env.HOST || '0.0.0.0';

  const server = app.listen(PORT, HOST, () => {
    console.log(`🚀 Servidor rodando em ${HOST}:${PORT}`);
    console.log(`📱 Acesso local: http://localhost:${PORT}`);
    console.log(`🌐 Acesso rede: http://localhost:${PORT}`);
  });

  // Inicializar WebSocket Server apenas em desenvolvimento
  chatWebSocketServer.initialize(server);
  chatWebSocketServer.startHeartbeat();
}

// Exportar app para ambiente serverless e WebSocket para controllers
export default app;
export { chatWebSocketServer };
