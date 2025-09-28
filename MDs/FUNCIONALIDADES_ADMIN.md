# 🛡️ Funcionalidades Administrativas - TreinAI

## 📋 Visão Geral

Este documento descreve todas as funcionalidades disponíveis para administradores no sistema TreinAI. O sistema possui dois tipos de usuários: **User** (usuário comum) e **Admin** (administrador), sendo que apenas usuários com `role: 'admin'` têm acesso às funcionalidades administrativas.

---

## 🏠 Painel Administrativo

### **Acesso ao Painel**
- **Rota:** `/dashboard/admin`
- **Componente:** `AdminPage.jsx`
- **Verificação:** Apenas usuários com `user.role === 'admin'`

### **Seções do Painel**
O painel administrativo é dividido em 5 seções principais:

1. **👥 Usuários** - Gerenciamento de usuários
2. **📍 Locais** - Administração de locais/academias
3. **🛠️ Suportes** - Gerenciamento de tickets de suporte
4. **📣 Anúncios** - Moderação de anúncios
5. **📊 Reports** - Relatórios e analytics

---

## 👥 Gerenciamento de Usuários

### **Funcionalidades Disponíveis:**

#### **Listar Todos os Usuários**
- **Endpoint:** `POST /usuarios`
- **Parâmetros:** `{ adminId }`
- **Descrição:** Visualiza todos os usuários cadastrados no sistema
- **Dados Retornados:**
  - Lista completa de usuários
  - Informações de perfil
  - Status de conta
  - Dados de registro

#### **Estatísticas de Usuários**
- Total de usuários cadastrados
- Total de administradores
- Métricas de crescimento
- Análise de atividade

---

## 📣 Gerenciamento de Anúncios

### **Funcionalidades Disponíveis:**

#### **Visualizar Todos os Anúncios**
- **Endpoint:** `POST /anuncios-by-admin`
- **Parâmetros:** `{ adminId }`
- **Descrição:** Lista todos os anúncios do sistema para moderação

#### **Alterar Status de Anúncios**
- **Endpoint:** `POST /alterar-status-anuncio`
- **Parâmetros:** `{ adminId, anuncioId, novoStatus }`
- **Status Disponíveis:**
  - `ativo` - Anúncio aprovado e visível
  - `inativo` - Anúncio desativado/rejeitado
- **Descrição:** Aprovar ou rejeitar anúncios enviados pelos usuários

#### **Moderação de Conteúdo**
- Visualização de reports de anúncios
- Análise de conteúdo inadequado
- Histórico de moderação

---

## 🛠️ Sistema de Suporte

### **Funcionalidades Disponíveis:**

#### **Visualizar Tickets de Suporte**
- **Endpoint:** `GET /supports-by-admin`
- **Parâmetros:** `{ adminId, page, perPage, search, responded }`
- **Filtros Disponíveis:**
  - Busca por assunto/descrição
  - Status: respondido/não respondido
  - Paginação
  - Visibilidade (público/privado)

#### **Responder Tickets**
- **Endpoint:** `POST /adicionarRespostaSuportAdmin`
- **Parâmetros:** `{ adminId, supportId, resposta }`
- **Descrição:** Adicionar respostas oficiais aos tickets de suporte

#### **Gerenciar Visibilidade**
- **Endpoint:** `POST /alterarVisibilidade-by-admin`
- **Parâmetros:** `{ adminId, supportId, boolean }`
- **Descrição:** Tornar tickets públicos (FAQ) ou privados

#### **Funcionalidades do Sistema:**
- **Tickets Privados:** Visíveis apenas ao usuário e admins
- **Tickets Públicos:** Visíveis a todos (FAQ/dúvidas comuns)
- **Histórico de Respostas:** Rastreamento completo de interações

---

## 📊 Sistema de Analytics e Reports

### **Dashboard Administrativo**
- **Endpoint:** `POST /admin/ai-dashboard`
- **Métricas Disponíveis:**
  - Total de usuários ativos
  - Total de administradores
  - Estatísticas de uso do sistema
  - Performance das APIs
  - Logs de erro

### **Analytics Detalhadas**
- **Endpoint:** `POST /admin/detailed-analytics`
- **Parâmetros:** `{ adminId, timeRange }`
- **Dados Disponíveis:**
  - Métricas de treino dos usuários
  - Dados de performance
  - Estatísticas de nutrição
  - Análise de engajamento

### **Logs de Erro das APIs**
- **Endpoint:** `POST /admin/error-logs`
- **Filtros:**
  - Nome da API
  - Tipo de erro
  - Severidade
  - Status (resolvido/não resolvido)
- **Funcionalidades:**
  - Visualização detalhada de erros
  - Resolução de problemas
  - Histórico de correções

### **Resolver Erros**
- **Endpoint:** `POST /admin/resolve-error`
- **Parâmetros:** `{ adminId, errorLogId }`
- **Descrição:** Marcar erros como resolvidos

### **Métricas de Performance**
- **Endpoint:** `POST /admin/api-performance`
- **Dados:**
  - Tempo de resposta das APIs
  - Taxa de sucesso/erro
  - Uso de recursos
  - Gargalos identificados

---

## 🗄️ Gerenciamento de Cache Redis

### **Dashboard do Cache**
- **Endpoint:** `GET /admin/cache-dashboard`
- **Funcionalidades:**
  - Estatísticas detalhadas do Redis
  - Análise de TTL (Time To Live)
  - Uso de memória
  - Performance do cache

### **Manutenção do Cache**
- **Endpoint:** `POST /admin/cache-maintenance`
- **Operações Disponíveis:**
  - `stats` - Estatísticas detalhadas
  - `clear` - Limpar cache por padrão
  - `optimize` - Otimização automática
  - `analyze` - Análise de TTL
  - `defragment` - Desfragmentação
  - `backup` - Backup de chaves importantes

### **Monitoramento em Tempo Real**
- **Endpoint:** `GET /admin/cache-monitoring`
- **Recursos:**
  - Monitoramento contínuo
  - Alertas configuráveis
  - Métricas de performance
  - Detecção de problemas

### **Configuração de Alertas**
- **Endpoint:** `POST /admin/cache-alerts`
- **Tipos de Alerta:**
  - Uso excessivo de memória
  - Performance degradada
  - Falhas de conexão
  - TTL expirado

---

## 🎮 Sistema de Gamificação

### **Gerenciamento de Desafios**
- **Criar Desafios:** `POST /challenges`
- **Parâmetros:**
  - Título e descrição
  - Tipo de desafio
  - Requisitos
  - Recompensas
  - Data de início/fim

### **Tipos de Desafios Disponíveis:**
- Completar treinos
- Sequência de dias
- Metas de exercícios
- Desafios personalizados

### **Monitoramento:**
- Participantes ativos
- Progresso dos usuários
- Taxa de conclusão
- Engajamento

---

## 📍 Gerenciamento de Locais

### **Funcionalidades Planejadas:**
- Cadastro de academias/locais
- Aprovação de estabelecimentos
- Gerenciamento de profissionais
- Moderação de conteúdo

*Nota: Esta seção está em desenvolvimento*

---

## 📋 Sistema de Reports

### **Gerenciamento de Relatórios:**
- Visualização de todos os reports
- Análise de conteúdo reportado
- Ações de moderação
- Histórico de decisões

### **Tipos de Reports:**
- Reports de exercícios
- Reports de anúncios
- Reports de usuários
- Reports de conteúdo inadequado

---

## 🔒 Segurança e Permissões

### **Verificações de Segurança:**
- **Rate Limiting:** Limitação específica para rotas admin (15 min)
- **Headers de Segurança:** Headers extras para rotas administrativas
- **Validação de Role:** Verificação obrigatória de `user.role === 'admin'`
- **Logs de Auditoria:** Registro de todas as ações administrativas

### **Middleware de Segurança:**
- `adminRateLimit` - Rate limiting restritivo
- `adminSecurityHeaders` - Headers de segurança extras
- Validação de `adminId` em todas as rotas

---

## 🛠️ Ferramentas de Desenvolvimento

### **Logs do Sistema:**
- **AISystemLogs:** Logs detalhados do sistema de IA
- **APIErrorLog:** Logs de erro das APIs externas
- **APIPerformanceMetric:** Métricas de performance
- **Auditoria:** Registro de ações administrativas

### **Monitoramento:**
- Performance das APIs
- Uso de recursos
- Detecção de anomalias
- Alertas automáticos

---

## 📊 Relatórios Disponíveis

### **Relatórios de Sistema:**
1. **Dashboard Geral**
   - Usuários ativos
   - Performance do sistema
   - Estatísticas de uso

2. **Analytics Detalhadas**
   - Métricas de treino
   - Dados de performance
   - Engajamento dos usuários

3. **Relatórios de Erro**
   - Logs de API
   - Problemas identificados
   - Status de resolução

4. **Cache e Performance**
   - Uso de memória
   - Performance do Redis
   - Otimizações sugeridas

---

## 🚀 Funcionalidades Futuras

### **Em Desenvolvimento:**
- **AdminLocais:** Gerenciamento completo de locais
- **AdminReports:** Dashboard avançado de relatórios
- **Analytics Avançados:** Insights mais profundos
- **Automação:** Ações automáticas baseadas em regras

### **Planejadas:**
- Sistema de notificações para admins
- Dashboard em tempo real
- Relatórios personalizáveis
- API de integração para terceiros

---

## 📞 Suporte Técnico

Para questões técnicas relacionadas às funcionalidades administrativas:

1. **Logs de Sistema:** Consulte os logs detalhados no painel admin
2. **Performance:** Use as métricas de API para diagnóstico
3. **Cache:** Utilize as ferramentas de manutenção do Redis
4. **Erros:** Consulte o sistema de logs de erro integrado

---

*Documento atualizado em: Janeiro 2025*
*Versão do Sistema: TreinAI v2.0*