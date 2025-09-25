// server.js
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import gamificationRoutes from './routes/gamificationRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import { StripeWebhook } from './controllers/stripe.js';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import { securityHeaders, apiSecurityHeaders } from './middlewares/securityHeaders.js';

// cria __filename e __dirname em ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();

// Stripe Webhook (usa raw body)
app.post('/webhook', express.raw({ type: 'application/json' }), StripeWebhook);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // 100 requisições por IP
  message: "Muitas requisiçoes. Tente novamente mais tarde."
})

// Outros middlewares
app.use(limiter)

// Headers de segurança globais
app.use(securityHeaders);

// Configuração CORS segura
const corsOptions = {
    origin: function (origin, callback) {
        // Lista de origens permitidas
        const allowedOrigins = [
            'http://localhost:5173', // Desenvolvimento local
            'http://localhost:3000', // Desenvolvimento alternativo
            process.env.FRONTEND_URL, // URL de produção do frontend
        ].filter(Boolean); // Remove valores undefined/null
        
        // Permite requisições sem origin (mobile apps, Postman, etc.) apenas em desenvolvimento
        if (!origin && process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
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
    maxAge: 86400 // Cache preflight por 24 horas
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

connectDB()

// Rotas da API
app.use('/', apiSecurityHeaders, authRoutes);
app.use('/gamification', apiSecurityHeaders, gamificationRoutes);
app.use('/analytics', apiSecurityHeaders, analyticsRoutes);
app.use('/reports', apiSecurityHeaders, reportRoutes);

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
