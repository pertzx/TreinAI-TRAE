# Google Analytics 4 Server-Side - Eventos Detalhados para TreinAI

## 📊 Resumo Executivo

Este documento detalha todos os eventos que devem ser implementados no Google Analytics 4 (GA4) para a plataforma TreinAI usando implementação server-side. Os eventos foram categorizados por funcionalidade e incluem instruções específicas de implementação, parâmetros personalizados e métricas de conversão.

---

## 📋 Índice
1. [Configuração Server-Side](#configuração-server-side)
2. [Setup da API](#setup-da-api)
3. [Middleware e Utilitários](#middleware-e-utilitários)
4. [Eventos de Autenticação](#eventos-de-autenticação)
5. [Eventos de Treino](#eventos-de-treino)
6. [Eventos de Gamificação](#eventos-de-gamificação)
7. [Eventos de E-commerce](#eventos-de-e-commerce)
8. [Eventos de Chat](#eventos-de-chat)
9. [Eventos de Perfil](#eventos-de-perfil)
10. [Eventos de Navegação](#eventos-de-navegação)
11. [Eventos de IA](#eventos-de-ia)
12. [Eventos de Admin](#eventos-de-admin)
13. [Eventos de Erro](#eventos-de-erro)
14. [Eventos de Performance](#eventos-de-performance)
15. [Implementação Faseada](#implementação-faseada)
16. [Métricas de Conversão](#métricas-de-conversão)
17. [Testes Sugeridos](#testes-sugeridos)

---

## 🎯 Categorias de Eventos

### 1. **AUTENTICAÇÃO E ONBOARDING**
### 2. **TREINOS E EXERCÍCIOS**
### 3. **GAMIFICAÇÃO E RANKINGS**
### 4. **PAGAMENTOS E PLANOS**
### 5. **CHAT E COMUNICAÇÃO**
### 6. **PERFIL E CONFIGURAÇÕES**
### 7. **NAVEGAÇÃO E ENGAJAMENTO**
### 8. **IA E FUNCIONALIDADES AVANÇADAS**
### 9. **ADMIN E ANALYTICS**
### 10. **ERROS E PERFORMANCE**

---

## 🚀 Configuração Server-Side

### 1. Dependências Necessárias
```bash
# No backend (pasta /back)
npm install @google-analytics/data googleapis uuid
```

### 2. Configuração do Google Cloud Console

#### Passo 1: Criar Projeto no Google Cloud
1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Anote o **Project ID**

#### Passo 2: Ativar APIs
1. Vá para **APIs & Services > Library**
2. Ative as seguintes APIs:
   - **Google Analytics Reporting API**
   - **Google Analytics Data API**
   - **Measurement Protocol (Google Analytics 4)**

#### Passo 3: Criar Service Account
1. Vá para **IAM & Admin > Service Accounts**
2. Clique em **Create Service Account**
3. Nome: `treinai-analytics-service`
4. Descrição: `Service account para Google Analytics do TreinAI`
5. Clique em **Create and Continue**

#### Passo 4: Configurar Permissões
1. Adicione as seguintes roles:
   - **Analytics Editor**
   - **Analytics Viewer**
2. Clique em **Continue** e depois **Done**

#### Passo 5: Gerar Chave JSON
1. Clique no service account criado
2. Vá para a aba **Keys**
3. Clique em **Add Key > Create new key**
4. Selecione **JSON** e clique em **Create**
5. Salve o arquivo como `google-analytics-service-account.json`

### 3. Configuração no Google Analytics 4

#### Passo 1: Adicionar Service Account ao GA4
1. Acesse [Google Analytics](https://analytics.google.com/)
2. Vá para **Admin > Property > Property Access Management**
3. Clique em **+** para adicionar usuário
4. Adicione o email do service account (ex: `treinai-analytics-service@projeto-id.iam.gserviceaccount.com`)
5. Selecione a role **Editor**

#### Passo 2: Obter IDs Necessários
1. **Measurement ID**: Encontre em **Admin > Property > Data Streams**
2. **Property ID**: Encontre na URL ou em **Admin > Property Settings**

### 4. Configuração de Ambiente

#### Variáveis de Ambiente (.env)
```bash
# Google Analytics Configuration
GA_MEASUREMENT_ID=G-XXXXXXXXXX
GA_PROPERTY_ID=123456789
GOOGLE_APPLICATION_CREDENTIALS=./config/google-analytics-service-account.json
GA_API_SECRET=your_api_secret_here

# Ambiente
NODE_ENV=production
```

#### Estrutura de Arquivos
```
back/
├── config/
│   ├── google-analytics-service-account.json
│   └── analytics.js
├── utils/
│   ├── analytics.js
│   └── measurementProtocol.js
├── middleware/
│   └── analyticsMiddleware.js
```

---

## 🛠️ Setup da API

### 1. Configuração Base do Analytics
```javascript
// back/config/analytics.js
const { GoogleAuth } = require('google-auth-library');
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
require('dotenv').config();

class AnalyticsConfig {
  constructor() {
    this.measurementId = process.env.GA_MEASUREMENT_ID;
    this.propertyId = process.env.GA_PROPERTY_ID;
    this.apiSecret = process.env.GA_API_SECRET;
    
    // Inicializar cliente de dados
    this.analyticsDataClient = new BetaAnalyticsDataClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
    
    // Configurar autenticação
    this.auth = new GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/analytics.readonly']
    });
  }

  async getClient() {
    return await this.auth.getClient();
  }

  getPropertyId() {
    return `properties/${this.propertyId}`;
  }
}

module.exports = new AnalyticsConfig();
```

### 2. Measurement Protocol para Eventos
```javascript
// back/utils/measurementProtocol.js
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

class MeasurementProtocol {
  constructor() {
    this.measurementId = process.env.GA_MEASUREMENT_ID;
    this.apiSecret = process.env.GA_API_SECRET;
    this.baseUrl = 'https://www.google-analytics.com/mp/collect';
  }

  async sendEvent(clientId, userId, eventName, parameters = {}) {
    try {
      const payload = {
        client_id: clientId || uuidv4(),
        user_id: userId,
        events: [{
          name: eventName,
          params: {
            ...parameters,
            timestamp_micros: Date.now() * 1000,
            session_id: parameters.session_id || uuidv4(),
            engagement_time_msec: parameters.engagement_time_msec || 1
          }
        }]
      };

      const response = await axios.post(
        `${this.baseUrl}?measurement_id=${this.measurementId}&api_secret=${this.apiSecret}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ Evento ${eventName} enviado para GA4:`, {
        userId,
        eventName,
        status: response.status
      });

      return { success: true, status: response.status };
    } catch (error) {
      console.error(`❌ Erro ao enviar evento ${eventName}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async sendMultipleEvents(clientId, userId, events) {
    try {
      const payload = {
        client_id: clientId || uuidv4(),
        user_id: userId,
        events: events.map(event => ({
          name: event.name,
          params: {
            ...event.params,
            timestamp_micros: Date.now() * 1000,
            session_id: event.params?.session_id || uuidv4()
          }
        }))
      };

      const response = await axios.post(
        `${this.baseUrl}?measurement_id=${this.measurementId}&api_secret=${this.apiSecret}`,
        payload
      );

      console.log(`✅ ${events.length} eventos enviados para GA4`);
      return { success: true, status: response.status };
    } catch (error) {
      console.error('❌ Erro ao enviar múltiplos eventos:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new MeasurementProtocol();
```

### 3. Utilitário Principal de Analytics
```javascript
// back/utils/analytics.js
const measurementProtocol = require('./measurementProtocol');
const analyticsConfig = require('../config/analytics');

class Analytics {
  constructor() {
    this.mp = measurementProtocol;
  }

  // Método principal para enviar eventos
  async trackEvent(userId, eventName, parameters = {}, clientId = null) {
    // Adicionar metadados padrão
    const enrichedParams = {
      ...parameters,
      app_version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV,
      server_timestamp: new Date().toISOString()
    };

    return await this.mp.sendEvent(clientId, userId, eventName, enrichedParams);
  }

  // Método para eventos de conversão
  async trackConversion(userId, eventName, value, currency = 'BRL', parameters = {}) {
    const conversionParams = {
      ...parameters,
      currency,
      value: parseFloat(value)
    };

    return await this.trackEvent(userId, eventName, conversionParams);
  }

  // Método para eventos de e-commerce
  async trackEcommerce(userId, eventName, items, transactionId, value, parameters = {}) {
    const ecommerceParams = {
      ...parameters,
      currency: 'BRL',
      transaction_id: transactionId,
      value: parseFloat(value),
      items: items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        category: item.category,
        quantity: item.quantity || 1,
        price: parseFloat(item.price)
      }))
    };

    return await this.trackEvent(userId, eventName, ecommerceParams);
  }

  // Método para eventos de usuário
  async setUserProperties(userId, properties) {
    const userParams = {
      user_properties: properties
    };

    return await this.trackEvent(userId, 'user_properties_set', userParams);
  }

  // Método para batch de eventos
  async trackMultipleEvents(userId, events, clientId = null) {
    const enrichedEvents = events.map(event => ({
      name: event.name,
      params: {
        ...event.params,
        app_version: process.env.APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV,
        server_timestamp: new Date().toISOString()
      }
    }));

    return await this.mp.sendMultipleEvents(clientId, userId, enrichedEvents);
  }
}

module.exports = new Analytics();
```

---

## 🔧 Middleware e Utilitários

### 1. Middleware de Analytics
```javascript
// back/middleware/analyticsMiddleware.js
const analytics = require('../utils/analytics');

// Middleware para capturar eventos automaticamente
const analyticsMiddleware = (eventName, paramExtractor) => {
  return async (req, res, next) => {
    // Executar a função original
    const originalSend = res.send;
    
    res.send = function(data) {
      // Capturar dados da resposta
      const responseData = typeof data === 'string' ? JSON.parse(data) : data;
      
      // Extrair parâmetros se a função foi fornecida
      const parameters = paramExtractor ? paramExtractor(req, responseData) : {};
      
      // Enviar evento para GA4 (não bloquear resposta)
      if (req.user && req.user._id) {
        analytics.trackEvent(
          req.user._id.toString(),
          eventName,
          {
            ...parameters,
            user_plan: req.user.planInfos?.planType || 'free',
            request_path: req.path,
            request_method: req.method,
            response_status: res.statusCode
          },
          req.headers['x-client-id'] || req.sessionID
        ).catch(error => {
          console.error('Analytics middleware error:', error);
        });
      }
      
      // Enviar resposta original
      originalSend.call(this, data);
    };
    
    next();
  };
};

// Middleware para capturar erros
const errorAnalyticsMiddleware = (err, req, res, next) => {
  // Enviar evento de erro para GA4
  if (req.user && req.user._id) {
    analytics.trackEvent(
      req.user._id.toString(),
      'api_error',
      {
        error_message: err.message,
        error_stack: err.stack,
        error_code: err.code || 'unknown',
        endpoint: req.path,
        method: req.method,
        user_plan: req.user.planInfos?.planType || 'free'
      }
    ).catch(analyticsError => {
      console.error('Error analytics middleware error:', analyticsError);
    });
  }
  
  next(err);
};

module.exports = {
  analyticsMiddleware,
  errorAnalyticsMiddleware
};
```

### 2. Helpers para Parâmetros
```javascript
// back/utils/analyticsHelpers.js

// Calcular nível de engajamento
const calculateEngagementLevel = (user, sessionData = {}) => {
  const workoutCount = user.gamification?.workouts || 0;
  const streak = user.gamification?.streak || 0;
  const sessionTime = sessionData.duration || 0;
  
  let score = 0;
  
  // Pontuação baseada em treinos
  if (workoutCount > 50) score += 3;
  else if (workoutCount > 20) score += 2;
  else if (workoutCount > 5) score += 1;
  
  // Pontuação baseada em streak
  if (streak > 30) score += 3;
  else if (streak > 7) score += 2;
  else if (streak > 3) score += 1;
  
  // Pontuação baseada em tempo de sessão
  if (sessionTime > 1800) score += 2; // 30 min
  else if (sessionTime > 600) score += 1; // 10 min
  
  if (score >= 6) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
};

// Calcular qualidade do treino
const calculateWorkoutQuality = (treinoData) => {
  const { duracao, exercicios } = treinoData;
  
  let qualityScore = 0;
  
  // Duração adequada (20-90 minutos)
  if (duracao >= 1200 && duracao <= 5400) qualityScore += 2;
  else if (duracao >= 600 && duracao <= 7200) qualityScore += 1;
  
  // Número de exercícios (4-12 exercícios)
  const exerciseCount = exercicios?.length || 0;
  if (exerciseCount >= 4 && exerciseCount <= 12) qualityScore += 2;
  else if (exerciseCount >= 2 && exerciseCount <= 15) qualityScore += 1;
  
  // PSE médio (2-8 é ideal)
  const avgPSE = exercicios?.reduce((sum, ex) => sum + (ex.pse || 5), 0) / exerciseCount;
  if (avgPSE >= 2 && avgPSE <= 8) qualityScore += 1;
  
  if (qualityScore >= 4) return 'excellent';
  if (qualityScore >= 2) return 'good';
  return 'basic';
};

// Categorizar página
const getPageCategory = (path) => {
  if (path.includes('/treino')) return 'workout';
  if (path.includes('/chat')) return 'communication';
  if (path.includes('/ranking')) return 'gamification';
  if (path.includes('/perfil')) return 'profile';
  if (path.includes('/planos')) return 'pricing';
  if (path.includes('/admin')) return 'admin';
  return 'general';
};

// Detectar fonte de conversão
const getConversionSource = (req) => {
  const referer = req.headers.referer || '';
  const userAgent = req.headers['user-agent'] || '';
  
  if (referer.includes('google')) return 'google_search';
  if (referer.includes('facebook')) return 'facebook';
  if (referer.includes('instagram')) return 'instagram';
  if (userAgent.includes('Mobile')) return 'mobile_direct';
  
  return 'direct';
};

module.exports = {
  calculateEngagementLevel,
  calculateWorkoutQuality,
  getPageCategory,
  getConversionSource
};
```

---

## 1. 🔐 AUTENTICAÇÃO E ONBOARDING

### 1.1 Eventos de Login/Registro

#### `user_signup`
**Quando disparar**: Usuário completa cadastro
**Localização**: Backend - authController.js (função signup)
**Implementação**:
```javascript
// back/controllers/authController.js
const analytics = require('../utils/analytics');

// No final da função signup, após salvar usuário
const result = await analytics.trackEvent(
  newUser._id.toString(),
  'sign_up',
  {
    method: 'email',
    user_plan: 'free',
    registration_source: req.headers.referer || 'direct',
    device_type: req.headers['user-agent'].includes('Mobile') ? 'mobile' : 'desktop',
    country: newUser.country || 'BR',
    state: newUser.state || 'unknown'
  },
  req.headers['x-client-id'] || req.sessionID
);
```

#### `user_login`
**Quando disparar**: Login bem-sucedido
**Localização**: Backend - authController.js (função login)
**Implementação**:
```javascript
// back/controllers/authController.js
const analytics = require('../utils/analytics');
const { calculateEngagementLevel } = require('../utils/analyticsHelpers');

// No final da função login, após validação
const result = await analytics.trackEvent(
  user._id.toString(),
  'login',
  {
    method: 'email',
    user_plan: user.planInfos?.planType || 'free',
    engagement_level: calculateEngagementLevel(user),
    days_since_signup: Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24)),
    device_type: req.headers['user-agent'].includes('Mobile') ? 'mobile' : 'desktop',
    login_streak: user.gamification?.streak || 0
  },
  req.headers['x-client-id'] || req.sessionID
);
```

#### `device_verification`
**Quando disparar**: Verificação de dispositivo
**Localização**: Backend - authController.js (middleware de verificação)
**Implementação**:
```javascript
// back/controllers/authController.js
const analytics = require('../utils/analytics');

// Na função de verificação de dispositivo
const result = await analytics.trackEvent(
  req.user._id.toString(),
  'device_verification',
  {
    verification_status: isNewDevice ? 'new_device' : 'known_device',
    device_fingerprint: deviceFingerprint,
    location_allowed: locationAllowed,
    verification_method: 'automatic',
    risk_level: calculateRiskLevel(deviceData)
  },
  req.headers['x-client-id'] || req.sessionID
);
```

#### `onboarding_step_completed`
**Quando disparar**: Cada etapa do onboarding concluída
**Localização**: Backend - authController.js ou userController.js
**Implementação**:
```javascript
// back/controllers/userController.js
const analytics = require('../utils/analytics');

// Ao completar cada etapa do onboarding
const result = await analytics.trackEvent(
  req.user._id.toString(),
  'onboarding_step_completed',
  {
    step_name: stepName, // 'profile_setup', 'preferences', 'first_workout'
    step_number: stepNumber,
    completion_time_seconds: completionTime,
    total_steps: totalSteps,
    user_plan: req.user.planInfos?.planType || 'free'
  },
  req.headers['x-client-id'] || req.sessionID
);
```

#### `onboarding_completed`
**Quando disparar**: Onboarding totalmente concluído
**Localização**: Backend - userController.js
**Implementação**:
```javascript
// back/controllers/userController.js
const analytics = require('../utils/analytics');

// Ao completar todo o onboarding
const result = await analytics.trackEvent(
  req.user._id.toString(),
  'onboarding_completed',
  {
    total_time_minutes: Math.floor(totalTime / 60),
    steps_completed: stepsCompleted,
    completion_rate: (stepsCompleted / totalSteps) * 100,
    user_plan: req.user.planInfos?.planType || 'free',
    profile_completeness: calculateProfileCompleteness(req.user)
  },
  req.headers['x-client-id'] || req.sessionID
);
```

---

## 2. 💪 TREINOS E EXERCÍCIOS

### 2.1 Eventos de Treino

#### `workout_started`
**Quando disparar**: Usuário inicia um treino
**Localização**: Backend - gamificationController.js (função iniciarTreino)
**Implementação**:
```javascript
// back/controllers/gamificationController.js
const analytics = require('../utils/analytics');

// No início da função iniciarTreino
const result = await analytics.trackEvent(
  req.user._id.toString(),
  'workout_started',
  {
    workout_type: treinoData.tipo || 'custom',
    workout_id: treinoData._id?.toString(),
    exercise_count: treinoData.exercicios?.length || 0,
    estimated_duration_minutes: Math.floor((treinoData.duracao || 0) / 60),
    difficulty_level: calculateDifficulty(treinoData.exercicios),
    is_ai_generated: treinoData.isAIGenerated || false,
    user_plan: req.user.planInfos?.planType || 'free',
    workout_streak: req.user.gamification?.streak || 0
  },
  req.headers['x-client-id'] || req.sessionID
);
```

#### `workout_completed`
**Quando disparar**: Treino finalizado com sucesso
**Localização**: Backend - gamificationController.js (função finalizarTreino)
**Implementação**:
```javascript
// back/controllers/gamificationController.js
const analytics = require('../utils/analytics');
const { calculateWorkoutQuality } = require('../utils/analyticsHelpers');

// No final da função finalizarTreino
const result = await analytics.trackEvent(
  req.user._id.toString(),
  'workout_completed',
  {
    workout_type: treinoData.tipo || 'custom',
    workout_id: treinoData._id?.toString(),
    duration_minutes: Math.floor(treinoData.duracao / 60),
    exercises_completed: treinoData.exercicios?.length || 0,
    calories_burned: treinoData.calorias || 0,
    average_pse: calculateAveragePSE(treinoData.exercicios),
    workout_quality: calculateWorkoutQuality(treinoData),
    points_earned: pontosGanhos,
    new_streak: novoStreak,
    is_personal_record: isPersonalRecord,
    user_plan: req.user.planInfos?.planType || 'free'
  },
  req.headers['x-client-id'] || req.sessionID
);
```

#### `exercise_completed`
**Quando disparar**: Exercício individual completado
**Localização**: Backend - gamificationController.js (função atualizarExercicio)
**Implementação**:
```javascript
// back/controllers/gamificationController.js
const analytics = require('../utils/analytics');

// Ao completar cada exercício
const result = await analytics.trackEvent(
  req.user._id.toString(),
  'exercise_completed',
  {
    exercise_name: exercicio.nome,
    exercise_type: exercicio.tipo || 'strength',
    sets_completed: exercicio.series || 0,
    reps_completed: exercicio.repeticoes || 0,
    weight_used: exercicio.peso || 0,
    pse_rating: exercicio.pse || 5,
    rest_time_seconds: exercicio.descanso || 0,
    workout_id: treinoId,
    exercise_order: exercicioIndex + 1,
    user_plan: req.user.planInfos?.planType || 'free'
  },
  req.headers['x-client-id'] || req.sessionID
);
```

#### `workout_abandoned`
**Quando disparar**: Usuário sai do treino sem finalizar
**Localização**: Backend - middleware ou função específica
**Implementação**:
```javascript
// back/controllers/gamificationController.js
const analytics = require('../utils/analytics');

// Quando treino é abandonado
const result = await analytics.trackEvent(
  req.user._id.toString(),
  'workout_abandoned',
  {
    workout_type: treinoData.tipo || 'custom',
    workout_id: treinoData._id?.toString(),
    time_spent_minutes: Math.floor(timeSpent / 60),
    exercises_completed: exerciciosCompletos,
    total_exercises: treinoData.exercicios?.length || 0,
    completion_percentage: (exerciciosCompletos / treinoData.exercicios?.length) * 100,
    abandonment_reason: reason || 'unknown',
    user_plan: req.user.planInfos?.planType || 'free'
  },
  req.headers['x-client-id'] || req.sessionID
);
```

### 2.2 Eventos de IA para Treinos

#### `ai_workout_generated`
**Quando disparar**: IA gera novo treino
**Localização**: `UsingIA.js` - função `criarTreinoIA`
**Implementação**:
```javascript
import { trackEvent } from '../utils/analytics';

trackEvent('ai_workout_generated', {
  event_category: 'ai_interaction',
  workout_name: parsed.treinoGerado.treinoName,
  exercise_count: parsed.treinoGerado.exercicios.length,
  generation_time: generationTime,
  tokens_used: tokensUsed,
  user_plan: user.planInfos.planType,
  professional_id: profissionalId || null
});
```

#### `ai_exercise_generated`
**Quando disparar**: IA gera exercício individual
**Localização**: `UsingIA.js` - função `criarExercicioIA`
**Implementação**:
```javascript
import { trackEvent } from '../utils/analytics';

trackEvent('ai_exercise_generated', {
  event_category: 'ai_interaction',
  exercise_name: parsed.exercicioGerado.nome,
  muscle_group: parsed.exercicioGerado.musculo,
  workout_id: treinoId,
  generation_time: generationTime,
  tokens_used: tokensUsed
});
```

---

## 3. 🏆 GAMIFICAÇÃO E RANKINGS

### 3.1 Eventos de Pontuação

#### `points_earned`
**Quando disparar**: Usuário ganha pontos
**Localização**: Backend - gamificationController.js (função finalizarTreino)
**Implementação**:
```javascript
// back/controllers/gamificationController.js
const analytics = require('../utils/analytics');

// Ao ganhar pontos
const result = await analytics.trackEvent(
  req.user._id.toString(),
  'points_earned',
  {
    points_amount: pontosGanhos,
    points_source: 'workout_completion', // 'workout_completion', 'streak_bonus', 'achievement'
    total_points: user.gamification.totalPoints + pontosGanhos,
    workout_id: treinoId,
    streak_multiplier: streakMultiplier,
    bonus_points: bonusPoints,
    user_plan: req.user.planInfos?.planType || 'free'
  },
  req.headers['x-client-id'] || req.sessionID
);
```

#### `personal_record_achieved`
**Quando disparar**: Novo recorde pessoal
**Localização**: Backend - gamificationController.js (função de cálculo de recordes)
**Implementação**:
```javascript
// back/controllers/gamificationController.js
const analytics = require('../utils/analytics');

// Quando novo recorde é alcançado
const result = await analytics.trackEvent(
  req.user._id.toString(),
  'personal_record_achieved',
  {
    record_type: recordType, // 'weight', 'reps', 'duration', 'calories'
    exercise_name: exercicio.nome,
    previous_value: previousRecord,
    new_value: newRecord,
    improvement_percentage: ((newRecord - previousRecord) / previousRecord) * 100,
    workout_id: treinoId,
    achievement_date: new Date().toISOString(),
    user_plan: req.user.planInfos?.planType || 'free'
  },
  req.headers['x-client-id'] || req.sessionID
);
```

#### `level_up`
**Quando disparar**: Usuário sobe de nível
**Localização**: Backend - gamificationController.js (função de cálculo de nível)
**Implementação**:
```javascript
// back/controllers/gamificationController.js
const analytics = require('../utils/analytics');

// Ao subir de nível
const result = await analytics.trackEvent(
  req.user._id.toString(),
  'level_up',
  {
    previous_level: previousLevel,
    new_level: newLevel,
    total_points: user.gamification.totalPoints,
    points_to_next_level: pointsToNextLevel,
    level_up_reward: levelUpReward,
    time_to_level_up_days: Math.floor(timeSinceLastLevel / (1000 * 60 * 60 * 24)),
    user_plan: req.user.planInfos?.planType || 'free'
  },
  req.headers['x-client-id'] || req.sessionID
);
```

#### `streak_milestone`
**Quando disparar**: Marco de sequência alcançado
**Localização**: Backend - gamificationController.js (função de streak)
**Implementação**:
```javascript
// back/controllers/gamificationController.js
const analytics = require('../utils/analytics');

// Ao alcançar marco de streak
const result = await analytics.trackEvent(
  req.user._id.toString(),
  'streak_milestone',
  {
    streak_count: currentStreak,
    milestone_type: getMilestoneType(currentStreak), // '7_days', '30_days', '100_days'
    streak_reward: streakReward,
    longest_streak: user.gamification.longestStreak,
    is_new_record: currentStreak > user.gamification.longestStreak,
    user_plan: req.user.planInfos?.planType || 'free'
  },
  req.headers['x-client-id'] || req.sessionID
);
```

#### `achievement_unlocked`
**Quando disparar**: Nova conquista desbloqueada
**Localização**: Backend - gamificationController.js (sistema de conquistas)
**Implementação**:
```javascript
// back/controllers/gamificationController.js
const analytics = require('../utils/analytics');

// Ao desbloquear conquista
const result = await analytics.trackEvent(
  req.user._id.toString(),
  'achievement_unlocked',
  {
    achievement_id: achievement.id,
    achievement_name: achievement.name,
    achievement_category: achievement.category, // 'workout', 'streak', 'social', 'milestone'
    achievement_rarity: achievement.rarity, // 'common', 'rare', 'epic', 'legendary'
    reward_points: achievement.rewardPoints,
    unlock_date: new Date().toISOString(),
    total_achievements: user.gamification.achievements.length + 1,
    user_plan: req.user.planInfos?.planType || 'free'
  },
  req.headers['x-client-id'] || req.sessionID
);
```

### 3.2 Eventos de Ranking

#### `ranking_position_changed`
**Quando disparar**: Posição no ranking muda
**Localização**: Backend - AdminController.js ou gamificationController.js
**Implementação**:
```javascript
// back/controllers/gamificationController.js
const analytics = require('../utils/analytics');

// Quando posição no ranking muda
const result = await analytics.trackEvent(
  req.user._id.toString(),
  'ranking_position_changed',
  {
    previous_position: previousPosition,
    new_position: newPosition,
    position_change: previousPosition - newPosition, // positivo = subiu
    ranking_type: rankingType, // 'global', 'local', 'friends'
    total_participants: totalParticipants,
    points_difference_to_next: pointsDifferenceToNext,
    user_plan: req.user.planInfos?.planType || 'free'
  },
  req.headers['x-client-id'] || req.sessionID
);
```

#### `ranking_viewed`
**Quando disparar**: Usuário visualiza página de rankings
**Localização**: Frontend - Recordes.jsx
**Implementação**:
```javascript
// front/src/components/Recordes.jsx
const analytics = require('../utils/analytics');

// Ao visualizar ranking
const result = await analytics.trackEvent(
  user._id.toString(),
  'ranking_viewed',
  {
    user_position: userPosition,
    total_competitors: totalCompetitors,
    ranking_type: rankingType, // 'active', 'historical'
    view_duration: viewDuration,
    page_source: 'rankings_page',
    user_plan: user.planInfos?.planType || 'free'
  },
  clientId
);
```

---

## 4. 💳 PAGAMENTOS E PLANOS

### 4.1 Eventos de Conversão

#### `plan_upgrade_initiated`
**Quando disparar**: Usuário clica para fazer upgrade
**Localização**: Frontend - páginas de planos
**Implementação**:
```javascript
gtag('event', 'plan_upgrade_initiated', {
  event_category: 'conversion',
  custom_parameters: {
    current_plan: user.planInfos.planType,
    target_plan: targetPlan, // 'pro', 'max', 'coach'
    upgrade_source: 'pricing_page', // ou 'dashboard', 'feature_limit'
    plan_price: getPlanPrice(targetPlan)
  }
});
```

#### `checkout_started`
**Quando disparar**: Sessão de checkout criada
**Localização**: Backend - paymentController.js (função initializePayment)
**Implementação**:
```javascript
// back/controllers/paymentController.js
const analytics = require('../utils/analytics');

// Ao iniciar checkout
const result = await analytics.trackEcommerce(
  req.user._id.toString(),
  'begin_checkout',
  [{
    id: planId,
    name: planName,
    category: 'subscription',
    price: planPrice,
    quantity: 1
  }],
  checkoutSessionId,
  planPrice,
  {
    payment_method: paymentMethod, // 'credit_card', 'pix', 'boleto'
    plan_duration: planDuration, // 'monthly', 'quarterly', 'annual'
    discount_applied: discountAmount || 0,
    coupon_code: couponCode || null,
    user_plan: req.user.planInfos?.planType || 'free',
    checkout_source: checkoutSource // 'pricing_page', 'workout_limit', 'feature_gate'
  }
);
```

#### `purchase_completed`
**Quando disparar**: Pagamento confirmado via webhook
**Localização**: Backend - paymentController.js (webhook de confirmação)
**Implementação**:
```javascript
// back/controllers/paymentController.js
const analytics = require('../utils/analytics');

// Ao completar compra
const result = await analytics.trackEcommerce(
  user._id.toString(),
  'purchase',
  [{
    id: planId,
    name: planName,
    category: 'subscription',
    price: planPrice,
    quantity: 1
  }],
  transactionId,
  finalPrice,
  {
    payment_method: paymentMethod,
    plan_duration: planDuration,
    discount_applied: discountAmount || 0,
    coupon_code: couponCode || null,
    subscription_start_date: subscriptionStartDate,
    subscription_end_date: subscriptionEndDate,
    is_renewal: isRenewal || false,
    user_lifetime_value: calculateLifetimeValue(user),
    conversion_source: conversionSource
  }
);

// Também trackear como conversão
await analytics.trackConversion(
  user._id.toString(),
  'subscription_purchase',
  finalPrice,
  'BRL',
  {
    plan_type: planName,
    payment_method: paymentMethod,
    conversion_path: conversionPath
  }
);
```

#### `subscription_cancelled`
**Quando disparar**: Assinatura cancelada
**Localização**: Backend - subscriptionController.js (função cancelSubscription)
**Implementação**:
```javascript
// back/controllers/subscriptionController.js
const analytics = require('../utils/analytics');

// Ao cancelar assinatura
const result = await analytics.trackEvent(
  req.user._id.toString(),
  'subscription_cancelled',
  {
    plan_type: subscription.planType,
    cancellation_reason: cancellationReason, // 'price', 'features', 'usage', 'other'
    subscription_duration_days: Math.floor((new Date() - subscription.startDate) / (1000 * 60 * 60 * 24)),
    total_paid: subscription.totalPaid,
    remaining_days: Math.floor((subscription.endDate - new Date()) / (1000 * 60 * 60 * 24)),
    workouts_completed: user.gamification.totalWorkouts,
    last_workout_date: user.gamification.lastWorkoutDate,
    cancellation_source: cancellationSource, // 'settings', 'billing', 'support'
    retention_offer_shown: retentionOfferShown || false
  },
  req.headers['x-client-id'] || req.sessionID
);
```

---

## 5. 💬 CHAT E COMUNICAÇÃO

### 5.1 Eventos de Chat

#### `chat_message_sent`
**Quando disparar**: Mensagem enviada no chat
**Localização**: `chatController.js` - função `enviarMensagem`
**Implementação**:
```javascript
gtag('event', 'chat_message_sent', {
  event_category: 'communication',
  custom_parameters: {
    chat_type: chat.isIndividualChat ? 'individual' : 'group',
    message_length: conteudo.length,
    has_reply: !!respondendoA,
    user_plan: user.planInfos.planType,
    chat_participants: chat.membros.length
  }
});
```

#### `chat_opened`
**Quando disparar**: Chat aberto/visualizado
**Localização**: Frontend - `ChatsOptimized.jsx`
**Implementação**:
```javascript
gtag('event', 'chat_opened', {
  event_category: 'engagement',
  custom_parameters: {
    chat_id: selectedChat.ChatId,
    chat_type: selectedChat.isIndividualChat ? 'individual' : 'group',
    unread_messages: unreadCount,
    last_activity: lastActivity
  }
});
```

#### `voice_message_used`
**Quando disparar**: Usuário usa reconhecimento de voz
**Localização**: Frontend - componente de voz no chat
**Implementação**:
```javascript
gtag('event', 'voice_message_used', {
  event_category: 'feature_usage',
  custom_parameters: {
    voice_duration: voiceDuration,
    transcription_accuracy: transcriptionAccuracy,
    user_plan: user.planInfos.planType,
    feature_adoption: 'voice_to_text'
  }
});
```

---

## 6. 👤 PERFIL E CONFIGURAÇÕES

### 6.1 Eventos de Perfil

#### `profile_updated`
**Quando disparar**: Perfil atualizado
**Localização**: `authController.js` - função `atualizarPerfil`
**Implementação**:
```javascript
gtag('event', 'profile_updated', {
  event_category: 'user_engagement',
  custom_parameters: {
    fields_updated: updatedFields, // array dos campos alterados
    avatar_changed: !!req.file,
    profile_completion: calculateProfileCompletion(user),
    update_source: 'profile_page'
  }
});
```

#### `avatar_uploaded`
**Quando disparar**: Avatar atualizado
**Localização**: `authController.js` - quando avatar é alterado
**Implementação**:
```javascript
gtag('event', 'avatar_uploaded', {
  event_category: 'user_engagement',
  custom_parameters: {
    file_size: req.file.size,
    file_type: req.file.mimetype,
    upload_method: 'direct_upload',
    is_first_avatar: !user.avatar || user.avatar.includes('avatar_base.jpg')
  }
});
```

#### `preferences_changed`
**Quando disparar**: Preferências alteradas
**Localização**: Frontend - página de configurações
**Implementação**:
```javascript
gtag('event', 'preferences_changed', {
  event_category: 'user_engagement',
  custom_parameters: {
    theme_changed: oldTheme !== newTheme,
    notifications_enabled: user.preferences.notifications,
    language_changed: oldLanguage !== newLanguage,
    preference_type: preferenceType // 'theme', 'notifications', 'language'
  }
});
```

---

## 7. 🧭 NAVEGAÇÃO E ENGAJAMENTO

### 7.1 Eventos de Navegação

#### `page_view_enhanced`
**Quando disparar**: Visualização de página com contexto
**Localização**: Frontend - todas as páginas principais
**Implementação**:
```javascript
import { trackPageView } from '../utils/analytics';

// Hook personalizado para tracking de páginas
const usePageTracking = () => {
  const location = useLocation();
  const user = useContext(AuthContext);
  
  useEffect(() => {
    trackPageView(location.pathname, document.title);
  }, [location]);
};

// Ou diretamente no componente
trackPageView(window.location.pathname, document.title);
```

#### `feature_accessed`
**Quando disparar**: Acesso a funcionalidades específicas
**Localização**: Frontend - componentes principais
**Implementação**:
```javascript
import { trackEvent } from '../utils/analytics';

trackEvent('feature_accessed', {
  event_category: 'feature_usage',
  feature_name: featureName, // 'my_workouts', 'rankings', 'chat', 'ai_generation'
  user_plan: user.planInfos.planType,
  access_method: accessMethod, // 'menu', 'button', 'shortcut'
  feature_available: isFeatureAvailable(featureName, user.planInfos.planType)
});
```

#### `search_performed`
**Quando disparar**: Busca realizada
**Localização**: Frontend - componentes de busca
**Implementação**:
```javascript
import ReactGA from 'react-ga4';

ReactGA.event('search', {
  search_term: searchTerm,
  search_category: 'exercises', // ou 'workouts', 'users'
  results_count: resultsCount,
  search_source: 'exercise_library',
  user_plan: user.planInfos.planType
});
```

### 7.2 Eventos de Engajamento

#### `session_milestone`
**Quando disparar**: Marcos de tempo de sessão
**Localização**: Frontend - timer global
**Implementação**:
```javascript
gtag('event', 'session_milestone', {
  event_category: 'engagement',
  custom_parameters: {
    session_duration: sessionDuration, // 5min, 15min, 30min, 1h
    pages_visited: pagesVisited,
    actions_performed: actionsPerformed,
    user_plan: user.planInfos.planType,
    engagement_level: calculateEngagementLevel(sessionData)
  }
});
```

#### `feature_limit_reached`
**Quando disparar**: Usuário atinge limite do plano
**Localização**: Frontend - quando funcionalidade é bloqueada
**Implementação**:
```javascript
gtag('event', 'feature_limit_reached', {
  event_category: 'conversion_opportunity',
  custom_parameters: {
    current_plan: user.planInfos.planType,
    blocked_feature: blockedFeature,
    usage_count: currentUsage,
    limit_value: limitValue,
    upgrade_prompt_shown: true
  }
});
```

---

## 8. 🤖 IA E FUNCIONALIDADES AVANÇADAS

### `ai_workout_generated`
**Quando disparar**: IA gera treino personalizado
**Localização**: Backend - aiController.js (função generateWorkout)
**Implementação**:
```javascript
// back/controllers/aiController.js
const analytics = require('../utils/analytics');

// Ao gerar treino com IA
const result = await analytics.trackEvent(
  req.user._id.toString(),
  'ai_workout_generated',
  {
    workout_type: workoutType, // 'strength', 'cardio', 'mixed', 'rehabilitation'
    difficulty_level: difficultyLevel, // 'beginner', 'intermediate', 'advanced'
    duration_minutes: workoutDuration,
    exercises_count: exercisesCount,
    user_preferences: userPreferences, // array de preferências
    generation_time_ms: generationTime,
    ai_model_version: aiModelVersion,
    tokens_consumed: tokensUsed,
    user_plan: req.user.planInfos?.planType || 'free',
    customization_level: customizationLevel // 'basic', 'detailed', 'expert'
  },
  req.headers['x-client-id'] || req.sessionID
);
```

### `ai_exercise_generated`
**Quando disparar**: IA gera exercício específico
**Localização**: Backend - aiController.js (função generateExercise)
**Implementação**:
```javascript
// back/controllers/aiController.js
const analytics = require('../utils/analytics');

// Ao gerar exercício com IA
const result = await analytics.trackEvent(
  req.user._id.toString(),
  'ai_exercise_generated',
  {
    exercise_type: exerciseType, // 'strength', 'cardio', 'flexibility', 'balance'
    muscle_groups: muscleGroups, // array de grupos musculares
    equipment_required: equipmentRequired, // array de equipamentos
    difficulty_level: difficultyLevel,
    generation_context: generationContext, // 'workout_creation', 'exercise_replacement', 'progression'
    user_limitations: userLimitations, // lesões ou limitações
    ai_confidence_score: confidenceScore,
    tokens_consumed: tokensUsed,
    user_plan: req.user.planInfos?.planType || 'free'
  },
  req.headers['x-client-id'] || req.sessionID
);
```

### `ai_chat_interaction`
**Quando disparar**: Interação com chat de IA
**Localização**: Backend - aiChatController.js (função sendMessage)
**Implementação**:
```javascript
// back/controllers/aiChatController.js
const analytics = require('../utils/analytics');

// Ao interagir com chat de IA
const result = await analytics.trackEvent(
  req.user._id.toString(),
  'ai_chat_interaction',
  {
    interaction_type: interactionType, // 'question', 'request', 'feedback', 'clarification'
    message_length: messageContent.length,
    response_time_ms: responseTime,
    conversation_turn: conversationTurn, // número da mensagem na conversa
    topic_category: topicCategory, // 'workout', 'nutrition', 'technique', 'motivation'
    ai_confidence_score: confidenceScore,
    tokens_consumed: tokensUsed,
    user_satisfaction: userRating || null, // se disponível
    user_plan: req.user.planInfos?.planType || 'free'
  },
  req.headers['x-client-id'] || req.sessionID
);
```

### `ai_recommendation_accepted`
**Quando disparar**: Usuário aceita recomendação da IA
**Localização**: Backend - aiController.js (função acceptRecommendation)
**Implementação**:
```javascript
// back/controllers/aiController.js
const analytics = require('../utils/analytics');

// Ao aceitar recomendação da IA
const result = await analytics.trackEvent(
  req.user._id.toString(),
  'ai_recommendation_accepted',
  {
    recommendation_type: recommendationType, // 'workout_modification', 'exercise_suggestion', 'rest_time', 'progression'
    recommendation_context: recommendationContext,
    ai_confidence_score: confidenceScore,
    user_feedback_score: userFeedbackScore || null,
    implementation_success: implementationSuccess,
    recommendation_id: recommendationId,
    user_plan: req.user.planInfos?.planType || 'free'
  },
  req.headers['x-client-id'] || req.sessionID
);
```

---

## 9. 👨‍💼 ADMIN E ANALYTICS

### `admin_action_performed`
**Quando disparar**: Ação administrativa realizada
**Localização**: Backend - AdminController.js (funções administrativas)
**Implementação**:
```javascript
// back/controllers/AdminController.js
const analytics = require('../utils/analytics');

// Ao realizar ação administrativa
const result = await analytics.trackEvent(
  req.user._id.toString(),
  'admin_action_performed',
  {
    action_type: actionType, // 'user_management', 'ranking_creation', 'system_maintenance', 'content_moderation'
    admin_id: req.user._id.toString(),
    affected_users_count: affectedUsersCount,
    action_success: actionSuccess,
    action_duration_ms: actionDuration,
    action_details: actionDetails, // objeto com detalhes específicos
    system_impact_level: systemImpactLevel, // 'low', 'medium', 'high', 'critical'
    requires_approval: requiresApproval
  },
  req.headers['x-client-id'] || req.sessionID
);
```

### `ranking_created`
**Quando disparar**: Novo ranking criado
**Localização**: Backend - AdminController.js (função criarRanking)
**Implementação**:
```javascript
// back/controllers/AdminController.js
const analytics = require('../utils/analytics');

// Ao criar ranking
const result = await analytics.trackEvent(
  req.user._id.toString(),
  'ranking_created',
  {
    ranking_name: rankingData.nome,
    ranking_type: rankingData.tipo, // 'workout_count', 'points', 'streak', 'custom'
    start_date: rankingData.dataInicio,
    end_date: rankingData.dataFim,
    duration_days: Math.floor((new Date(rankingData.dataFim) - new Date(rankingData.dataInicio)) / (1000 * 60 * 60 * 24)),
    admin_id: req.user._id.toString(),
    expected_participants: expectedParticipants,
    prize_pool: prizePool || 0,
    ranking_visibility: rankingVisibility // 'public', 'private', 'invite_only'
  },
  req.headers['x-client-id'] || req.sessionID
);
```

---

## 10. ⚠️ ERROS E PERFORMANCE

### `api_error`
**Quando disparar**: Erro de API
**Localização**: Backend - middleware de erro global
**Implementação**:
```javascript
// back/middleware/errorAnalyticsMiddleware.js
const analytics = require('../utils/analytics');

// Middleware de captura de erros
const errorAnalyticsMiddleware = async (err, req, res, next) => {
  const userId = req.user?._id?.toString() || 'anonymous';
  
  await analytics.trackEvent(
    userId,
    'api_error',
    {
      error_message: err.message,
      error_code: err.code || 'UNKNOWN',
      error_stack: err.stack?.substring(0, 500), // primeiros 500 chars
      endpoint: req.originalUrl,
      http_method: req.method,
      user_agent: req.get('User-Agent'),
      ip_address: req.ip,
      request_id: req.headers['x-request-id'] || 'unknown',
      user_plan: req.user?.planInfos?.planType || 'free',
      error_severity: getErrorSeverity(err), // 'low', 'medium', 'high', 'critical'
      response_time_ms: Date.now() - req.startTime
    },
    req.headers['x-client-id'] || req.sessionID
  );
  
  next(err);
};
```

### `frontend_error`
**Quando disparar**: Erro no frontend
**Localização**: Frontend - Error Boundary ou handler global
**Implementação**:
```javascript
// front/src/utils/errorHandler.js
const analytics = require('../utils/analytics');

// Handler de erro do frontend
const handleFrontendError = async (error, errorInfo) => {
  const userId = getCurrentUser()?._id || 'anonymous';
  
  await analytics.trackEvent(
    userId,
    'frontend_error',
    {
      error_message: error.message,
      error_name: error.name,
      error_stack: error.stack?.substring(0, 500),
      component_stack: errorInfo?.componentStack?.substring(0, 500),
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      error_boundary: errorInfo?.errorBoundary || 'global',
      user_plan: getCurrentUser()?.planInfos?.planType || 'free'
    },
    getClientId()
  );
};

// Error Boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    handleFrontendError(error, errorInfo);
  }
}
```
  ---

## 11. 📊 EXEMPLOS DE USO E TESTES

### 11.1 Configuração de Teste Local

#### Arquivo de Teste - `back/tests/analytics.test.js`
```javascript
const request = require('supertest');
const app = require('../app');
const analytics = require('../utils/analytics');

// Mock do analytics para testes
jest.mock('../utils/analytics');

describe('Analytics Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Deve rastrear evento de login com sucesso', async () => {
    const loginData = {
      email: 'test@example.com',
      password: 'password123'
    };

    const response = await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .expect(200);

    expect(analytics.trackEvent).toHaveBeenCalledWith(
      expect.any(String), // userId
      'user_login',
      expect.objectContaining({
        login_method: 'email',
        login_success: true,
        user_plan: expect.any(String)
      }),
      expect.any(String) // clientId
    );
  });

  test('Deve rastrear evento de treino iniciado', async () => {
    const workoutData = {
      workoutId: 'workout123',
      exercises: ['exercise1', 'exercise2']
    };

    const response = await request(app)
      .post('/api/workouts/start')
      .set('Authorization', 'Bearer valid-token')
      .send(workoutData)
      .expect(200);

    expect(analytics.trackEvent).toHaveBeenCalledWith(
      expect.any(String),
      'workout_started',
      expect.objectContaining({
        workout_type: expect.any(String),
        exercises_count: 2,
        estimated_duration: expect.any(Number)
      }),
      expect.any(String)
    );
  });

  test('Deve rastrear evento de erro de API', async () => {
    // Simular erro interno
    const response = await request(app)
      .get('/api/invalid-endpoint')
      .expect(404);

    expect(analytics.trackEvent).toHaveBeenCalledWith(
      'anonymous',
      'api_error',
      expect.objectContaining({
        error_code: expect.any(String),
        endpoint: '/api/invalid-endpoint',
        http_method: 'GET'
      }),
      expect.any(String)
    );
  });
});
```

### 11.2 Validação de Eventos em Desenvolvimento

#### Hook de Debug - `back/utils/analyticsDebug.js`
```javascript
const analytics = require('./analytics');

class AnalyticsDebugger {
  constructor() {
    this.events = [];
    this.isEnabled = process.env.NODE_ENV === 'development';
  }

  // Intercepta eventos para debug
  trackEvent(userId, eventName, parameters, clientId) {
    if (this.isEnabled) {
      const debugEvent = {
        timestamp: new Date().toISOString(),
        userId,
        eventName,
        parameters,
        clientId,
        stackTrace: new Error().stack
      };
      
      this.events.push(debugEvent);
      console.log('🔍 Analytics Debug:', debugEvent);
      
      // Validar estrutura do evento
      this.validateEvent(debugEvent);
    }
    
    // Chamar o analytics real
    return analytics.trackEvent(userId, eventName, parameters, clientId);
  }

  validateEvent(event) {
    const requiredFields = ['userId', 'eventName', 'parameters'];
    const missingFields = requiredFields.filter(field => !event[field]);
    
    if (missingFields.length > 0) {
      console.error('❌ Evento inválido - campos obrigatórios ausentes:', missingFields);
    }
    
    // Validar tipos de parâmetros
    if (typeof event.parameters !== 'object') {
      console.error('❌ Parâmetros devem ser um objeto');
    }
    
    console.log('✅ Evento válido');
  }

  getEventHistory() {
    return this.events;
  }

  clearHistory() {
    this.events = [];
  }

  // Gerar relatório de eventos
  generateReport() {
    const eventCounts = this.events.reduce((acc, event) => {
      acc[event.eventName] = (acc[event.eventName] || 0) + 1;
      return acc;
    }, {});

    return {
      totalEvents: this.events.length,
      eventCounts,
      uniqueUsers: [...new Set(this.events.map(e => e.userId))].length,
      timeRange: {
        start: this.events[0]?.timestamp,
        end: this.events[this.events.length - 1]?.timestamp
      }
    };
  }
}

module.exports = new AnalyticsDebugger();
```

### 11.3 Testes de Integração com Google Analytics

#### Teste de Conexão - `back/tests/ga4Connection.test.js`
```javascript
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const config = require('../config/analytics');

describe('Google Analytics 4 Connection Tests', () => {
  let analyticsDataClient;

  beforeAll(() => {
    analyticsDataClient = new BetaAnalyticsDataClient({
      keyFilename: config.serviceAccountPath,
    });
  });

  test('Deve conectar com GA4 API com sucesso', async () => {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${config.propertyId}`,
      dateRanges: [
        {
          startDate: '7daysAgo',
          endDate: 'today',
        },
      ],
      dimensions: [
        {
          name: 'eventName',
        },
      ],
      metrics: [
        {
          name: 'eventCount',
        },
      ],
    });

    expect(response).toBeDefined();
    expect(response.rows).toBeDefined();
  }, 10000);

  test('Deve validar propriedades do GA4', async () => {
    // Verificar se a propriedade existe e está acessível
    const [response] = await analyticsDataClient.getMetadata({
      name: `properties/${config.propertyId}/metadata`,
    });

    expect(response).toBeDefined();
    expect(response.dimensions).toBeDefined();
    expect(response.metrics).toBeDefined();
  });
});
```

### 11.4 Monitoramento em Tempo Real

#### Dashboard de Analytics - `back/routes/analytics-dashboard.js`
```javascript
const express = require('express');
const router = express.Router();
const analyticsDebug = require('../utils/analyticsDebug');
const { BetaAnalyticsDataClient } = require('@google-analytics/data');

// Endpoint para visualizar eventos em desenvolvimento
router.get('/debug/events', (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Disponível apenas em desenvolvimento' });
  }

  const report = analyticsDebug.generateReport();
  const recentEvents = analyticsDebug.getEventHistory().slice(-50);

  res.json({
    report,
    recentEvents,
    timestamp: new Date().toISOString()
  });
});

// Endpoint para dados em tempo real do GA4
router.get('/realtime', async (req, res) => {
  try {
    const analyticsDataClient = new BetaAnalyticsDataClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });

    const [response] = await analyticsDataClient.runRealtimeReport({
      property: `properties/${process.env.GA4_PROPERTY_ID}`,
      dimensions: [
        { name: 'eventName' },
        { name: 'country' }
      ],
      metrics: [
        { name: 'activeUsers' },
        { name: 'eventCount' }
      ],
    });

    res.json({
      activeUsers: response.totals?.[0]?.metricValues?.[0]?.value || 0,
      events: response.rows?.map(row => ({
        eventName: row.dimensionValues[0].value,
        country: row.dimensionValues[1].value,
        activeUsers: row.metricValues[0].value,
        eventCount: row.metricValues[1].value
      })) || []
    });
  } catch (error) {
    console.error('Erro ao buscar dados em tempo real:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
```

### 11.5 Validação de Dados

#### Script de Validação - `back/scripts/validateAnalytics.js`
```javascript
const analytics = require('../utils/analytics');
const analyticsDebug = require('../utils/analyticsDebug');

// Função para testar todos os eventos principais
async function testAllEvents() {
  console.log('🧪 Iniciando testes de validação de analytics...\n');

  const testUserId = 'test-user-123';
  const testClientId = 'test-client-456';

  // Teste de eventos de autenticação
  await analytics.trackEvent(testUserId, 'user_signup', {
    signup_method: 'email',
    user_plan: 'free',
    referral_source: 'organic'
  }, testClientId);

  await analytics.trackEvent(testUserId, 'user_login', {
    login_method: 'email',
    login_success: true,
    user_plan: 'premium'
  }, testClientId);

  // Teste de eventos de treino
  await analytics.trackEvent(testUserId, 'workout_started', {
    workout_type: 'strength',
    exercises_count: 5,
    estimated_duration: 45,
    user_plan: 'premium'
  }, testClientId);

  await analytics.trackEvent(testUserId, 'workout_completed', {
    workout_type: 'strength',
    actual_duration: 42,
    exercises_completed: 5,
    workout_quality: 'excellent'
  }, testClientId);

  // Teste de eventos de IA
  await analytics.trackEvent(testUserId, 'ai_workout_generated', {
    workout_type: 'cardio',
    difficulty_level: 'intermediate',
    generation_time_ms: 1500,
    tokens_consumed: 150
  }, testClientId);

  // Teste de eventos de erro
  await analytics.trackEvent(testUserId, 'api_error', {
    error_message: 'Test error',
    error_code: 'TEST_ERROR',
    endpoint: '/api/test',
    http_method: 'POST'
  }, testClientId);

  console.log('\n✅ Todos os testes de eventos foram executados!');
  
  // Gerar relatório
  const report = analyticsDebug.generateReport();
  console.log('\n📊 Relatório de Testes:');
  console.log(`Total de eventos: ${report.totalEvents}`);
  console.log(`Usuários únicos: ${report.uniqueUsers}`);
  console.log('Contagem por evento:', report.eventCounts);
}

// Executar testes se chamado diretamente
if (require.main === module) {
  testAllEvents().catch(console.error);
}

module.exports = { testAllEvents };
```

### 11.6 Comandos de Teste

#### Package.json Scripts
```json
{
  "scripts": {
    "test:analytics": "jest back/tests/analytics.test.js",
    "test:ga4": "jest back/tests/ga4Connection.test.js",
    "validate:analytics": "node back/scripts/validateAnalytics.js",
    "debug:analytics": "NODE_ENV=development node -e \"require('./back/utils/analyticsDebug').clearHistory(); console.log('Debug mode ativado');\""
  }
}
```

#### Comandos para Execução
```bash
# Executar todos os testes de analytics
npm run test:analytics

# Testar conexão com GA4
npm run test:ga4

# Validar implementação de eventos
npm run validate:analytics

# Ativar modo debug
npm run debug:analytics

# Executar servidor com debug de analytics
NODE_ENV=development DEBUG=analytics npm start
```
  endpoint: req.path,
  status_code: statusCode,
  user_id: req.user?._id,
  error_category: categorizeError(error)
});
```

#### `frontend_error`
**Quando disparar**: Erro no frontend
**Localização**: Frontend - error boundary
**Implementação**:
```javascript
import ReactGA from 'react-ga4';

ReactGA.event('exception', {
  description: error.message,
  fatal: true,
  error_type: 'frontend_error',
  component_name: componentName,
  error_stack: error.stack,
  user_agent: navigator.userAgent,
  page_url: window.location.href
});
```

### 10.2 Eventos de Performance

#### `page_load_performance`
**Quando disparar**: Página carregada
**Localização**: Frontend - performance observer
**Implementação**:
```javascript
gtag('event', 'page_load_performance', {
  event_category: 'performance',
  custom_parameters: {
    load_time: loadTime,
    page_name: pageName,
    connection_type: navigator.connection?.effectiveType,
    user_plan: user?.planInfos?.planType,
    performance_score: calculatePerformanceScore(metrics)
  }
});
```

---

## 🛠️ IMPLEMENTAÇÃO TÉCNICA COM REACTGA

### Configuração Inicial do ReactGA

#### 1. Instalação do ReactGA
```bash
npm install react-ga4
# ou
yarn add react-ga4
```

#### 2. Configuração Inicial
```javascript
// src/utils/analytics.js
import ReactGA from 'react-ga4';

const TRACKING_ID = process.env.REACT_APP_GA_MEASUREMENT_ID;

export const initGA = () => {
  ReactGA.initialize(TRACKING_ID, {
    debug: process.env.NODE_ENV === 'development',
    titleCase: false,
    gaOptions: {
      custom_map: {
        'custom_parameter_1': 'user_plan',
        'custom_parameter_2': 'feature_usage',
        'custom_parameter_3': 'engagement_level'
      }
    }
  });
};

// Configurar usuário quando logado
export const setUser = (user) => {
  ReactGA.set({
    userId: user._id,
    user_plan: user.planInfos.planType,
    user_role: user.role,
    registration_date: user.createdAt
  });
};
```

#### 3. Inicialização no App.jsx
```javascript
// src/App.jsx
import { useEffect } from 'react';
import { initGA, usePageTracking } from './utils/analytics';

function App() {
  usePageTracking(); // Hook para tracking automático de páginas
  
  useEffect(() => {
    initGA();
  }, []);

  return (
    <div className="App">
      {/* Seu app aqui */}
    </div>
  );
}

export default App;
```
import { useEffect } from 'react';
import { initGA } from './utils/analytics';

function App() {
  useEffect(() => {
    initGA();
  }, []);

  return (
    // Seu componente App
  );
}
```

### Configuração de Ambiente

#### 1. Variáveis de Ambiente
```bash
# .env
REACT_APP_GA_MEASUREMENT_ID=G-XXXXXXXXXX
REACT_APP_VERSION=1.0.0
NODE_ENV=development
```

#### 2. Configuração Condicional
```javascript
// src/utils/analytics.js
import ReactGA from 'react-ga4';

const TRACKING_ID = process.env.REACT_APP_GA_MEASUREMENT_ID;
const isDevelopment = process.env.NODE_ENV === 'development';

export const initGA = () => {
  if (!TRACKING_ID) {
    console.warn('GA Measurement ID não encontrado');
    return;
  }

  ReactGA.initialize(TRACKING_ID, {
    debug: isDevelopment,
    titleCase: false,
    gaOptions: {
      custom_map: {
        'custom_parameter_1': 'user_plan',
        'custom_parameter_2': 'feature_usage',
        'custom_parameter_3': 'engagement_level'
      }
    }
  });

  if (isDevelopment) {
    console.log('Google Analytics inicializado em modo debug');
  }
};

// Wrapper com validação
export const trackEvent = (eventName, parameters = {}) => {
  if (!TRACKING_ID) return;
  
  try {
    ReactGA.event(eventName, {
      ...parameters,
      timestamp: new Date().toISOString(),
      app_version: process.env.REACT_APP_VERSION,
      environment: process.env.NODE_ENV
    });
    
    if (isDevelopment) {
      console.log('GA Event:', eventName, parameters);
    }
  } catch (error) {
    console.error('Erro ao enviar evento GA:', error);
  }
};
```
```javascript
// src/utils/analytics.js
import ReactGA from 'react-ga4';

export const trackEvent = (eventName, parameters = {}) => {
  ReactGA.event(eventName, {
    ...parameters,
    timestamp: new Date().toISOString(),
    app_version: process.env.REACT_APP_VERSION,
    environment: process.env.NODE_ENV
  });
};

// Wrapper para page views
export const trackPageView = (path, title) => {
  ReactGA.send({
    hitType: 'pageview',
    page: path,
    title: title,
    custom_parameters: {
      user_plan: localStorage.getItem('userPlan') || 'anonymous',
      session_duration: Date.now() - parseInt(localStorage.getItem('sessionStart') || '0'),
      page_category: getPageCategory(path)
    }
  });
};

// Exemplo de uso
trackEvent('workout_completed', {
  workout_duration: 1800,
  exercises_completed: 8,
  points_earned: 150
});
```

### Parâmetros Personalizados Globais

#### Configuração de Dimensões Personalizadas
1. **user_plan** - Plano do usuário (free, pro, max, coach)
2. **feature_usage** - Funcionalidade utilizada
3. **engagement_level** - Nível de engajamento (low, medium, high)
4. **conversion_stage** - Estágio no funil de conversão
5. **error_category** - Categoria do erro
6. **performance_tier** - Tier de performance (fast, medium, slow)

### Métricas Calculadas

#### 1. Taxa de Conversão por Plano
```javascript
const conversionRate = (purchasedUsers / totalUsers) * 100;
```

#### 2. Lifetime Value (LTV)
```javascript
const ltv = averageMonthlyRevenue * averageSubscriptionDuration;
```

#### 3. Engagement Score
```javascript
const engagementScore = (
  (workoutsCompleted * 0.4) +
  (chatMessages * 0.2) +
  (sessionDuration * 0.3) +
  (featuresUsed * 0.1)
) / 4;
```

---

## 📈 DASHBOARDS E RELATÓRIOS SUGERIDOS

### 1. Dashboard de Conversão
- Taxa de conversão por plano
- Funil de onboarding
- Abandono de checkout
- Revenue por plano

### 2. Dashboard de Engajamento
- Tempo de sessão médio
- Páginas por sessão
- Taxa de retenção
- Funcionalidades mais usadas

### 3. Dashboard de Produto
- Treinos completados
- Uso da IA
- Performance do chat
- Gamificação (streaks, pontos)

### 4. Dashboard de Performance
- Tempo de carregamento
- Erros por página
- Taxa de erro da API
- Satisfação do usuário

---

## 🎯 METAS E OBJETIVOS

### Objetivos de Conversão
1. **Registro de Usuário** - Meta: +25% trimestral
2. **Upgrade para Pro** - Meta: 15% dos usuários free
3. **Retenção 30 dias** - Meta: 60%
4. **Completion Rate Onboarding** - Meta: 85%

### Objetivos de Engajamento
1. **Treinos por Usuário/Mês** - Meta: 12 treinos
2. **Tempo Médio de Sessão** - Meta: 15 minutos
3. **Taxa de Uso da IA** - Meta: 70% dos usuários ativos
4. **Streak Médio** - Meta: 7 dias

### Objetivos de Performance
1. **Tempo de Carregamento** - Meta: <3 segundos
2. **Taxa de Erro** - Meta: <1%
3. **Disponibilidade** - Meta: 99.9%
4. **Satisfação do Usuário** - Meta: 4.5/5

---

## 🔧 FERRAMENTAS COMPLEMENTARES

### 1. Google Tag Manager (GTM)
- Gerenciamento centralizado de tags
- Triggers baseados em eventos personalizados
- Variáveis dinâmicas para parâmetros

### 2. Firebase Analytics
- Eventos de aplicativo mobile (se aplicável)
- Análise de cohort
- Funis de conversão avançados

### 3. Hotjar/FullStory
- Heatmaps de interação
- Gravações de sessão
- Feedback qualitativo

### 4. Mixpanel/Amplitude
- Análise de produto avançada
- Segmentação de usuários
- A/B testing

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Configuração Base (Semana 1)
- [ ] Configurar GA4 e GTM
- [ ] Implementar eventos de autenticação
- [ ] Configurar parâmetros personalizados
- [ ] Testar eventos básicos

### Fase 2: Eventos Core (Semana 2)
- [ ] Implementar eventos de treino
- [ ] Adicionar eventos de gamificação
- [ ] Configurar eventos de pagamento
- [ ] Validar dados no GA4

### Fase 3: Eventos Avançados (Semana 3)
- [ ] Implementar eventos de IA
- [ ] Adicionar eventos de chat
- [ ] Configurar eventos de erro
- [ ] Otimizar performance

### Fase 4: Dashboards e Análise (Semana 4)
- [ ] Criar dashboards personalizados
- [ ] Configurar alertas automáticos
- [ ] Treinar equipe em análise
- [ ] Documentar processos

---

## 🧪 TESTES SUGERIDOS

```javascript
// src/utils/analytics.test.js
import { trackEvent } from '../utils/analytics';

// Teste de evento básico
const testBasicEvent = () => {
  trackEvent('test_event', {
    event_category: 'test',
    test_parameter: 'test_value'
  });
  
  console.log('Evento de teste disparado - verificar no GA4 Real-time');
};

// Teste de conversão
const testConversionEvent = () => {
  ReactGA.event('purchase', {
    currency: 'BRL',
    value: 99.90,
    transaction_id: 'test_123',
    items: [{
      item_id: 'test_plan',
      item_name: 'Plano Teste',
      category: 'subscription',
      price: 99.90,
      quantity: 1
    }]
  });
  
  console.log('Evento de conversão disparado - verificar no GA4');
};

// Validação no GA4 Real-time
// 1. Abrir GA4 > Reports > Realtime
// 2. Disparar evento de teste
// 3. Verificar aparição em tempo real
// 4. Validar parâmetros personalizados

// Hook para testes em desenvolvimento
export const useAnalyticsDebug = () => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      window.testGA = {
        trackEvent: testBasicEvent,
        trackConversion: testConversionEvent
      };
      
      console.log('Analytics Debug disponível em window.testGA');
    }
  }, []);
};
```

---

## 🎯 CONCLUSÃO

A implementação completa destes eventos fornecerá insights valiosos sobre:

1. **Comportamento do Usuário**: Como os usuários interagem com a plataforma
2. **Performance do Produto**: Quais funcionalidades geram mais engajamento
3. **Oportunidades de Conversão**: Onde otimizar o funil de vendas
4. **Qualidade da Experiência**: Identificar pontos de atrito
5. **ROI de Funcionalidades**: Quais features justificam o investimento

**Próximos Passos**:
1. Priorizar eventos por impacto no negócio
2. Implementar em fases para facilitar testes
3. Validar dados constantemente
4. Iterar baseado em insights obtidos
5. Expandir análises conforme necessário

Este sistema de analytics robusto permitirá decisões baseadas em dados e otimização contínua da experiência do usuário na plataforma TreinAI.