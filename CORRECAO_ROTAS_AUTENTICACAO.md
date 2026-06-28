# Correção de Rotas - Autenticação por Cookie

## Resumo do Problema

O middleware `secureAccessGuard` foi criado para proteger rotas que recebem `userId` ou `profissionalId` no body/params/query. O problema é que:

1. **Muitas rotas ainda pedem `email` no body** em vez de usar `req.user` do cookie
2. **Profissionais precisam acessar dados de alunos** (diferente userId), o que o guard bloqueia
3. **O guard verifica se o ID é válido**, mas não verifica se o usuário tem permissão de acessar aquele recurso

---

## Estratégia de Correção

### 1. Rotas que DEVEM usar `req.user` (cookie)

Todas as rotas que manipulam dados do **próprio usuário logado** devem parar de pedir `email`/`userId` no body e usar `req.user` do middleware de autenticação.

**Arquivos a verificar:**
- `authRoutes.js` - rotas de atualização de perfil, treinos, etc.
- `userRoutes.js` - rotas de busca de dados do usuário
- `tokenRoutes.js` - rotas de estatísticas de tokens

### 2. Rotas que precisam de acesso a outros usuários (Profissional → Aluno)

**Abordagem:** Criar um middleware de autorização específico que verifica:
- Se é profissional
- Se o aluno está na lista de alunos aceitos do profissional

**Exemplo de implementação:**

```javascript
// middlewares/profissionalAuth.js
export const canAccessAluno = async (req, res, next) => {
  try {
    const { alunoId } = req.params; // ou req.body, req.query
    const profissionalUserId = req.user.id; // do cookie
    
    // Buscar profissional
    const profissional = await Profissional.findOne({ userId: profissionalUserId });
    if (!profissional) {
      return res.status(403).json({ msg: 'Apenas profissionais podem acessar esta rota' });
    }
    
    // Verificar se aluno está na lista de aceitos
    const alunoAceito = profissional.alunosAceitos?.some(
      a => a.userId === alunoId || a.alunoId === alunoId
    );
    
    if (!alunoAceito) {
      return res.status(403).json({ msg: 'Você não tem permissão para acessar os dados deste aluno' });
    }
    
    // Tudo OK, prosseguir
    req.alunoId = alunoId; // disponibilizar para o controller
    next();
  } catch (error) {
    console.error('[canAccessAluno] Erro:', error);
    res.status(500).json({ msg: 'Erro interno na verificação de permissões' });
  }
};
```

---

## Lista de Rotas que Precisam de Correção

### 1. `tokenRoutes.js`

| Rota | Problema | Correção |
|------|----------|----------|
| `POST /token-stats` | Recebe `email` no body | Usar `req.user.email` do cookie |

### 2. `authRoutes.js` - Rotas de Chat (Profissional → Aluno)

| Rota | Problema | Correção |
|------|----------|----------|
| `POST /enviar-mensagem` | Pode enviar mensagem como outro usuário se passar userId no body | Verificar se `req.user` tem permissão de enviar como o remetente |
| `POST /pegarChat` | Pode acessar chat de outros usuários | Verificar se `req.user` é participante do chat |
| `POST /iniciar-chat-por-userid` | Pode iniciar chat com qualquer userId | Adicionar validação de relação profissional-aluno |

### 3. `authRoutes.js` - Rotas de Profissionais

| Rota | Problema | Correção |
|------|----------|----------|
| `POST /adicionar-usuario-chat` | Adiciona usuário ao chat sem verificar permissão | Verificar se `req.user` é profissional e se o aluno está na lista de aceitos |
| `POST /remover-usuario-chat` | Remove usuário do chat sem verificar permissão | Verificar se `req.user` tem permissão de remover aquele usuário |

### 4. `authRoutes.js` - Outras Rotas que Usam Email

| Rota | Problema | Correção |
|------|----------|----------|
| `POST /excluir-treino` | Usa `email` na query | Usar `req.user` do cookie |
| `POST /atualizar-perfil` | Já usa `verificarToken`, verificar se ainda pede email no body | Remover email do body se existir |
| `POST /criar-meusTreinos` | Já usa `verificarToken`, verificar se ainda pede email no body | Remover email do body se existir |

### 5. `userRoutes.js`

| Rota | Problema | Correção |
|------|----------|----------|
| `GET /users/basic` | Busca dados de outros usuários por `userIds` na query | Adicionar middleware de autorização para verificar se o usuário logado tem permissão de ver aqueles dados |
| `GET /users/basic/:userId` | Busca dados de um usuário específico | Adicionar verificação de permissão |

---

## Recomendações de Implementação

### 1. Refatoração Gradual

Não tente corrigir tudo de uma vez. Priorize:

1. **Rotas críticas de autenticação** (login, signup) - já estão corretas
2. **Rotas que expõem dados sensíveis** (dados de usuário, tokens)
3. **Rotas de profissional-aluno** (chat, visualização de dados)

### 2. Middleware de Autorização

Crie middlewares específicos para cada tipo de autorização:

```javascript
// middlewares/authorization.js

// Apenas o próprio usuário pode acessar
export const isSelf = (req, res, next) => {
  const targetUserId = req.params.userId || req.body.userId || req.query.userId;
  if (req.user.id !== targetUserId) {
    return res.status(403).json({ msg: 'Você só pode acessar seus próprios dados' });
  }
  next();
};

// Profissional pode acessar alunos aceitos
export const isProfissionalOfAluno = async (req, res, next) => {
  // implementação como mostrado anteriormente
};

// Participante do chat pode acessar
export const isChatParticipant = async (req, res, next) => {
  const { chatId } = req.params;
  const userId = req.user.id;
  
  const chat = await Chat.findById(chatId);
  if (!chat) return res.status(404).json({ msg: 'Chat não encontrado' });
  
  const isParticipant = chat.participants.some(p => p.toString() === userId);
  if (!isParticipant) {
    return res.status(403).json({ msg: 'Você não é participante deste chat' });
  }
  
  next();
};
```

### 3. Testes

Após cada alteração, teste:

1. **Acesso próprio**: Usuário A acessando dados do Usuário A (deve funcionar)
2. **Acesso cruzado**: Usuário A tentando acessar dados do Usuário B (deve bloquear)
3. **Acesso profissional**: Profissional A acessando dados do Aluno B (deve funcionar se na lista)

### 4. Documentação

Atualize a documentação da API para refletir as mudanças:

- Remover `email` dos parâmetros de entrada onde não for mais necessário
- Adicionar informação sobre autenticação via cookie
- Documentar códigos de erro de autorização (403)

---

## Conclusão

A transição de autenticação por `email` no body para autenticação por cookie (`req.user`) é necessária para:

1. **Segurança**: Evitar que usuários spoofem a identidade passando email de outros
2. **Consistência**: Centralizar a lógica de autenticação no middleware
3. **Manutenibilidade**: Facilitar futuras alterações na lógica de auth

O middleware `secureAccessGuard` é uma boa primeira camada de proteção, mas precisa ser complementado com:
- Middleware de autenticação (`verificarToken`) em todas as rotas protegidas
- Middleware de autorização específico para cada tipo de acesso (self, profissional, etc.)

A correção pode ser feita gradualmente, priorizando as rotas mais críticas de segurança.