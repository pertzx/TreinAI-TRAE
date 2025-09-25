# 📚 Documentação da API TreinAI

## 📋 Índice
- [Visão Geral](#visão-geral)
- [Autenticação e Segurança](#autenticação-e-segurança)
- [Rotas da API](#rotas-da-api)
  - [Autenticação](#autenticação)
  - [Analytics](#analytics)
  - [Gamificação](#gamificação)
  - [Relatórios](#relatórios)
  - [Busca Web](#busca-web)
- [Modelos de Dados](#modelos-de-dados)
- [Middlewares](#middlewares)
- [Códigos de Status](#códigos-de-status)
- [Exemplos de Uso](#exemplos-de-uso)

---

## 🎯 Visão Geral

A API TreinAI é uma plataforma completa para gerenciamento de treinos, analytics de performance, gamificação e integração com IA para geração de exercícios personalizados.

**Base URL:** `http://localhost:4000`

**Versão:** 1.0.0

**Tecnologias:**
- Node.js + Express
- MongoDB + Mongoose
- Redis (Cache)
- OpenAI API
- Stripe (Pagamentos)
- JWT (Autenticação)

---

## 🔐 Autenticação e Segurança

### Tipos de Autenticação
- **JWT Token:** Enviado via cookie `authToken` ou header `Authorization: Bearer <token>`
- **CSRF Protection:** Token obrigatório em headers `x-csrf-token`
- **Rate Limiting:** Limitação de requisições por IP/usuário
- **Validação de Email:** Verificação real de emails em cadastros

### Headers Obrigatórios
```http
Authorization: Bearer <jwt_token>
x-csrf-token: <csrf_token>
Content-Type: application/json
```

---

## 🛣️ Rotas da API

### 🔑 Autenticação (`/`)

#### `GET /csrf-token`
Obtém token CSRF para proteção contra ataques CSRF.

**Resposta:**
```json
{
  "csrfToken": "abc123def456..."
}
```

#### `POST /login`
Realiza login do usuário.

**Body:**
```json
{
  "email": "usuario@email.com",
  "password": "senha123"
}
```

**Resposta:**
```json
{
  "msg": "Login realizado com sucesso!",
  "user": {
    "username": "João Silva",
    "email": "usuario@email.com",
    "planInfos": {...},
    "preferences": {...}
  }
}
```

#### `POST /signup`
Cadastra novo usuário.

**Body:**
```json
{
  "username": "João Silva",
  "email": "usuario@email.com",
  "password": "senha123"
}
```

#### `GET /dashboard`
🔒 **Rota Protegida** - Retorna dados do dashboard do usuário.

**Resposta:**
```json
{
  "msg": "Bem-vindo ao dashboard, João!",
  "user": {
    "username": "João Silva",
    "email": "usuario@email.com",
    "perfil": {...},
    "meusTreinos": [...],
    "stats": {...}
  }
}
```

#### `POST /change-theme`
Altera tema do usuário (light/dark).

#### `POST /complete-onboarding`
Completa processo de onboarding do usuário.

#### `POST /atualizar-perfil`
🔒 **Rota Protegida** - Atualiza perfil do usuário com upload de avatar.

#### `POST /gerar-exercicio-ia`
🔒 **Rota Protegida** - Gera exercício personalizado usando IA.

#### `POST /gerar-treino-ia`
🔒 **Rota Protegida** - Gera treino completo usando IA.

#### `DELETE /excluir-treino`
🔒 **Rota Protegida** - Remove treino do usuário.

**Query Params:**
- `email`: Email do usuário
- `treinoId`: ID do treino
- `profissionalId`: ID do profissional (opcional)

#### `DELETE /excluir-exercicio`
🔒 **Rota Protegida** - Remove exercício específico de um treino.

**Query Params:**
- `email`: Email do usuário
- `treinoId`: ID do treino
- `exercicioId`: ID do exercício

---

### 📊 Analytics (`/analytics`)

Todas as rotas de analytics são protegidas por autenticação.

#### `GET /dashboard/:userId`
Retorna dashboard de analytics do usuário.

#### `POST /workout-metrics/:userId`
Registra métricas de treino.

**Body:**
```json
{
  "workoutId": "treino123",
  "duration": 45,
  "exerciseCount": 8,
  "caloriesBurned": 350,
  "intensity": "alta",
  "muscleGroups": ["peito", "triceps"],
  "satisfaction": 4
}
```

#### `POST /body-metrics/:userId`
Registra métricas corporais.

**Body:**
```json
{
  "weight": 75.5,
  "bodyFat": 15.2,
  "bmi": 24.1,
  "measurements": {
    "chest": 102,
    "waist": 85,
    "bicep": 38
  }
}
```

#### `POST /performance-metrics/:userId`
Registra métricas de performance em exercícios.

#### `POST /goals/:userId`
Cria nova meta para o usuário.

#### `PUT /goals/:userId/:goalId/progress`
Atualiza progresso de uma meta.

#### `GET /progress-report/:userId`
Gera relatório de progresso do usuário.

---

### 🎮 Gamificação (`/gamification`)

Todas as rotas são protegidas por autenticação.

#### `GET /user/:userId`
Retorna dados de gamificação do usuário.

**Resposta:**
```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "points": 1250,
    "level": 5,
    "badges": [...],
    "achievements": [...],
    "availableChallenges": [...]
  }
}
```

#### `POST /user/:userId/points`
Adiciona pontos manualmente ao usuário.

#### `POST /user/:userId/workout-completed`
Registra treino completado para gamificação.

#### `POST /challenges`
🔒 **Admin Only** - Cria novo desafio.

#### `POST /user/:userId/challenges/:challengeId/join`
Usuário participa de um desafio.

#### `GET /ranking`
Retorna ranking geral de usuários.

---

### 📋 Relatórios (`/reports`)

Todas as rotas são protegidas por autenticação.

#### `POST /generate/:clientId`
Gera relatório para cliente.

#### `GET /`
Lista todos os relatórios do usuário.

#### `GET /:reportId`
Retorna relatório específico.

#### `POST /:reportId/share`
Compartilha relatório.

#### `POST /templates`
Cria template de relatório.

#### `GET /templates`
Lista templates disponíveis.

---

---

## 📄 Modelos de Dados

### 👤 User
```javascript
{
  username: String,
  email: String (unique),
  password: String (hashed),
  avatar: String,
  role: ['user', 'admin'],
  isCoach: Boolean,
  saldoDeImpressoes: Number,
  
  planInfos: {
    status: ['ativo', 'inativo'],
    planType: ['free', 'pro', 'max', 'coach'],
    expirationDate: Date,
    subscriptionId: String,
    stripeCustomerId: String
  },
  
  preferences: {
    theme: ['light', 'dark'],
    language: ['pt', 'en'],
    notifications: Boolean,
    onboardCompleted: Boolean
  },
  
  perfil: {
    objetivo: String,
    pesoAtual: [{ valor: Number, publicadoEm: Date }],
    altura: [{ valor: Number, publicadoEm: Date }],
    nivelExperiencia: ['iniciante', 'intermediario', 'avancado'],
    idade: Number,
    genero: ['masculino', 'feminino', 'outro']
  },
  
  meusTreinos: [{
    treinoId: String,
    treinoName: String,
    ordem: Number,
    descricao: String,
    exercicios: [{
      exercicioId: String,
      ordem: Number,
      musculo: String,
      nome: String,
      instrucoes: String,
      series: Number,
      repeticoes: Number,
      pse: Number
    }],
    criadoEm: Date
  }],
  
  historico: [{
    treinoId: String,
    treinoName: String,
    dataExecucao: Date,
    duracao: Number,
    exerciciosFeitos: [...]
  }]
}
```

### 📊 Analytics
```javascript
{
  userId: ObjectId,
  workoutMetrics: [{
    date: Date,
    workoutId: String,
    duration: Number,
    exerciseCount: Number,
    caloriesBurned: Number,
    intensity: ['baixa', 'moderada', 'alta', 'extrema'],
    muscleGroups: [String],
    satisfaction: Number (1-5)
  }],
  
  bodyMetrics: [{
    date: Date,
    weight: Number,
    bodyFat: Number,
    bmi: Number,
    measurements: {
      chest: Number,
      waist: Number,
      bicep: Number
    }
  }],
  
  performanceMetrics: [{
    date: Date,
    exerciseId: String,
    exerciseName: String,
    sets: [...]
  }]
}
```

### 🎮 Gamification
```javascript
{
  userId: ObjectId,
  points: Number,
  level: Number,
  experience: Number,
  badges: [{
    badgeId: String,
    name: String,
    description: String,
    earnedAt: Date
  }],
  achievements: [...],
  challenges: [...]
}
```

---

## 🛡️ Middlewares

### Segurança
- **`verificarToken`**: Valida JWT token
- **`validateCSRF`**: Valida token CSRF
- **`rateLimitMiddleware`**: Controla rate limiting
- **`securityHeaders`**: Adiciona headers de segurança
- **`sanitizeInput`**: Sanitiza dados de entrada

### Validação
- **`validateLogin`**: Valida dados de login
- **`validateSignup`**: Valida dados de cadastro
- **`validateEmailReal`**: Verifica se email existe
- **`validateUpdateProfile`**: Valida atualização de perfil

### Performance
- **`apiPerformanceMiddleware`**: Monitora performance
- **`aiSystemLogger`**: Log de sistema IA

---

## 📊 Códigos de Status

| Código | Descrição |
|--------|-----------|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 400 | Dados inválidos |
| 401 | Não autorizado |
| 403 | Token CSRF inválido |
| 404 | Recurso não encontrado |
| 429 | Rate limit excedido |
| 500 | Erro interno do servidor |

---

## 💡 Exemplos de Uso

### Login Completo
```javascript
// 1. Obter token CSRF
const csrfResponse = await fetch('/api/auth/csrf-token');
const { csrfToken } = await csrfResponse.json();

// 2. Fazer login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-csrf-token': csrfToken
  },
  body: JSON.stringify({
    email: 'usuario@email.com',
    password: 'senha123'
  }),
  credentials: 'include'
});

const loginData = await loginResponse.json();
```

### Acessar Dashboard
```javascript
const dashboardResponse = await fetch('/api/auth/dashboard', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + jwtToken
  },
  credentials: 'include'
});

const userData = await dashboardResponse.json();
```

### Registrar Métricas de Treino
```javascript
const metricsResponse = await fetch('/analytics/workout-metrics/userId123', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + jwtToken
  },
  body: JSON.stringify({
    workoutId: 'treino123',
    duration: 45,
    exerciseCount: 8,
    caloriesBurned: 350,
    intensity: 'alta',
    muscleGroups: ['peito', 'triceps'],
    satisfaction: 4
  })
});
```

---

## 🔧 Configuração

### Variáveis de Ambiente
```env
# Database
MONGODB_URI=mongodb://localhost:27017/treinai

# JWT
SECRET_JWT=sua_chave_secreta_jwt

# APIs Externas
OPENAI_API_KEY=sk-...
EXERCISEDB_API_KEY=sua_chave_exercisedb
WGER_API_KEY=sua_chave_wger

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Redis
REDIS_URL=redis://localhost:6379
```

### Instalação
```bash
# Backend
cd back
npm install
npm start

# Frontend
cd front
npm install
npm run dev
```

---

## 📞 Suporte

Para dúvidas ou problemas com a API, entre em contato:

- **Email:** suporte@treinai.com
- **Documentação:** [Link para docs]
- **Status da API:** [Link para status]

---

*Documentação gerada automaticamente - Última atualização: Janeiro 2025*