# 🎮 API Endpoints - Sistema de Gamificação TreinAI

## 📋 Visão Geral
Esta documentação detalha todos os endpoints disponíveis no sistema de gamificação otimizado do TreinAI.

**Base URL:** `http://localhost:4000/api/gamification`  
**Autenticação:** Bearer Token (JWT) obrigatório em todas as rotas

---

## 👤 Endpoints de Usuário

### 1. **Obter Dados de Gamificação do Usuário**
```http
GET /user/:userId
```

**Headers:**
```
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "totalPoints": 1250,
    "level": 8,
    "streaks": {
      "workout": {
        "current": 5,
        "longest": 12,
        "lastDate": "2025-01-15T10:30:00.000Z"
      }
    },
    "badges": [
      {
        "id": "first_workout",
        "name": "Primeiro Treino",
        "unlockedAt": "2025-01-10T08:00:00.000Z"
      }
    ],
    "activeChallenges": [...],
    "completedChallenges": [...],
    "stats": {
      "totalWorkouts": 45,
      "totalExercises": 320,
      "totalMinutes": 1800,
      "badgesEarned": 8,
      "challengesCompleted": 3,
      "rankingPosition": 15
    }
  }
}
```

### 2. **Adicionar Pontos**
```http
POST /user/:userId/points
```

**Body:**
```json
{
  "points": 50,
  "actionType": "workout_completed",
  "metadata": {
    "workoutId": "workout123",
    "duration": 45,
    "exercises": 8
  }
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "totalPoints": 1300,
    "pointsAdded": 50,
    "newLevel": 8,
    "levelUp": false,
    "challengeProgress": [
      {
        "challengeId": "challenge123",
        "progress": 75,
        "completed": false
      }
    ],
    "completedChallenges": [],
    "newBadges": [
      {
        "id": "workout_count_50",
        "name": "50 Treinos",
        "description": "Complete 50 treinos"
      }
    ],
    "stats": {
      "totalWorkouts": 46,
      "totalExercises": 328,
      "totalMinutes": 1845
    }
  }
}
```

### 3. **Registrar Treino Completo**
```http
POST /user/:userId/workout
```

**Body:**
```json
{
  "workoutId": "workout123",
  "duration": 45,
  "exercises": 8,
  "points": 50
}
```

---

## 🏆 Endpoints de Desafios

### 4. **Participar de Desafio**
```http
POST /user/:userId/challenge/:challengeId/join
```

**Resposta:**
```json
{
  "success": true,
  "message": "Desafio aceito com sucesso!",
  "challenge": {
    "id": "challenge123",
    "title": "30 Dias de Treino",
    "progress": 0,
    "target": 30,
    "startedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

### 5. **Obter Progresso de Desafios**
```http
GET /user/:userId/challenge-progress
```

**Query Parameters:**
- `status` (opcional): `active`, `completed`, `all`
- `category` (opcional): `fitness`, `nutrition`, `social`

**Resposta:**
```json
{
  "success": true,
  "data": {
    "activeChallenges": [
      {
        "challengeId": "challenge123",
        "title": "30 Dias de Treino",
        "description": "Complete 30 treinos em 30 dias",
        "category": "fitness",
        "progress": {
          "current": 15,
          "target": 30,
          "percentage": 50
        },
        "milestones": [
          {
            "target": 10,
            "reached": true,
            "reachedAt": "2025-01-12T14:20:00.000Z"
          },
          {
            "target": 20,
            "reached": false
          }
        ],
        "timeRemaining": "15 dias",
        "rewards": {
          "points": 500,
          "badges": ["consistency_master"],
          "title": "Guerreiro dos 30 Dias"
        }
      }
    ],
    "completedChallenges": [...],
    "stats": {
      "totalActive": 2,
      "totalCompleted": 5,
      "successRate": 83.3
    }
  }
}
```

---

## 📊 Endpoints de Ranking

### 6. **Obter Ranking Geral**
```http
GET /ranking
```

### 7. **Obter Ranking por Período**
```http
GET /ranking/:period
```

**Períodos válidos:** `weekly`, `monthly`, `yearly`

**Resposta:**
```json
{
  "success": true,
  "data": {
    "period": "monthly",
    "startDate": "2025-01-01T00:00:00.000Z",
    "endDate": "2025-01-31T23:59:59.000Z",
    "userRankings": [
      {
        "position": 1,
        "userId": "user456",
        "username": "João Silva",
        "totalPoints": 2500,
        "level": 12,
        "badges": 15
      },
      {
        "position": 2,
        "userId": "user123",
        "username": "Maria Santos",
        "totalPoints": 2300,
        "level": 11,
        "badges": 12
      }
    ],
    "userPosition": {
      "position": 15,
      "totalPoints": 1300,
      "pointsToNext": 200
    }
  }
}
```

---

## 🔔 Endpoints de Notificações

### 8. **Obter Notificações do Usuário**
```http
GET /user/:userId/notifications
```

**Query Parameters:**
- `page` (opcional): Número da página (padrão: 1)
- `limit` (opcional): Itens por página (padrão: 20)
- `type` (opcional): `badge`, `challenge`, `level`, `streak`
- `read` (opcional): `true`, `false`, `all`

**Resposta:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif123",
        "type": "badge",
        "title": "Novo Badge Desbloqueado!",
        "message": "Você conquistou o badge '50 Treinos'",
        "data": {
          "badgeId": "workout_count_50",
          "badgeName": "50 Treinos"
        },
        "read": false,
        "createdAt": "2025-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 45,
      "hasNext": true,
      "hasPrev": false
    },
    "stats": {
      "total": 45,
      "unread": 8,
      "read": 37
    }
  }
}
```

### 9. **Marcar Notificação como Lida**
```http
PATCH /user/:userId/notifications/:notificationId/read
```

### 10. **Marcar Todas as Notificações como Lidas**
```http
PATCH /user/:userId/notifications/read-all
```

### 11. **Limpar Notificações Antigas**
```http
DELETE /user/:userId/notifications/clean
```

**Query Parameters:**
- `days` (opcional): Dias para manter (padrão: 30)

### 12. **Obter Estatísticas de Notificações**
```http
GET /user/:userId/notifications/stats
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "total": 45,
    "unread": 8,
    "read": 37,
    "byType": {
      "badge": 20,
      "challenge": 15,
      "level": 8,
      "streak": 2
    },
    "last7Days": 12,
    "last30Days": 35
  }
}
```

---

## 🏆 Endpoints de Badges

### 13. **Obter Badges do Usuário**
```http
GET /user/:userId/badges
```

**Query Parameters:**
- `category` (opcional): `training`, `streaks`, `points`, `levels`, `challenges`, `time`
- `rarity` (opcional): `common`, `rare`, `epic`, `legendary`

**Resposta:**
```json
{
  "success": true,
  "data": {
    "badges": [
      {
        "id": "first_workout",
        "name": "Primeiro Treino",
        "description": "Complete seu primeiro treino",
        "icon": "🏃‍♂️",
        "category": "training",
        "rarity": "common",
        "points": 10,
        "unlockedAt": "2025-01-10T08:00:00.000Z"
      }
    ],
    "stats": {
      "total": 8,
      "byCategory": {
        "training": 4,
        "streaks": 2,
        "points": 1,
        "levels": 1
      },
      "byRarity": {
        "common": 5,
        "rare": 2,
        "epic": 1
      }
    }
  }
}
```

### 14. **Obter Badges Disponíveis**
```http
GET /user/:userId/badges/available
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "categories": {
      "training": [
        {
          "id": "first_workout",
          "name": "Primeiro Treino",
          "description": "Complete seu primeiro treino",
          "icon": "🏃‍♂️",
          "rarity": "common",
          "points": 10,
          "unlocked": true,
          "unlockedAt": "2025-01-10T08:00:00.000Z"
        },
        {
          "id": "workout_count_10",
          "name": "10 Treinos",
          "description": "Complete 10 treinos",
          "icon": "💪",
          "rarity": "common",
          "points": 50,
          "unlocked": false,
          "progress": {
            "current": 8,
            "required": 10,
            "percentage": 80
          }
        }
      ]
    },
    "stats": {
      "totalAvailable": 25,
      "unlocked": 8,
      "inProgress": 5,
      "locked": 12
    }
  }
}
```

---

## 👨‍💼 Endpoints Administrativos

### 15. **Listar Todos os Desafios (Admin)**
```http
GET /admin/challenges
```

### 16. **Criar Desafio (Admin)**
```http
POST /admin/challenges
```

**Body:**
```json
{
  "title": "Desafio de Janeiro",
  "description": "Complete 20 treinos em janeiro",
  "type": "workout_count",
  "category": "fitness",
  "actionType": "workout_completed",
  "period": "monthly",
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-01-31T23:59:59.000Z",
  "requirements": {
    "target": 20,
    "unit": "treinos"
  },
  "rewards": {
    "points": 500,
    "badges": ["january_warrior"],
    "title": "Guerreiro de Janeiro"
  }
}
```

### 17. **Atualizar Desafio (Admin)**
```http
PUT /admin/challenges/:challengeId
```

### 18. **Deletar Desafio (Admin)**
```http
DELETE /admin/challenges/:challengeId
```

### 19. **Ativar/Desativar Desafio (Admin)**
```http
PATCH /admin/challenges/:challengeId/toggle
```

### 20. **Criar Notificação Personalizada (Admin)**
```http
POST /user/:userId/notifications
```

**Body:**
```json
{
  "type": "custom",
  "title": "Mensagem Especial",
  "message": "Parabéns pelo seu progresso!",
  "data": {
    "customField": "valor"
  }
}
```

---

## 🔒 Códigos de Status

- **200** - Sucesso
- **201** - Criado com sucesso
- **400** - Dados inválidos
- **401** - Não autorizado
- **403** - Acesso negado
- **404** - Não encontrado
- **429** - Muitas requisições (rate limit)
- **500** - Erro interno do servidor

---

## 📝 Notas Importantes

1. **Autenticação:** Todas as rotas requerem token JWT válido
2. **Rate Limiting:** Rotas administrativas têm limite de requisições
3. **Paginação:** Endpoints de listagem suportam paginação
4. **Filtros:** Muitos endpoints suportam filtros via query parameters
5. **Timestamps:** Todas as datas estão em formato ISO 8601 (UTC)

---

*Documentação gerada automaticamente - TreinAI API v2.0*