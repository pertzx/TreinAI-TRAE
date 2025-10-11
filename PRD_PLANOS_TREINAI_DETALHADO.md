# PRD - Planos de Assinatura TreinAI
## Product Requirements Document - Versão 2.0

---

## 📋 **Visão Geral**

Este documento detalha as funcionalidades específicas, benefícios, limitações e requisitos técnicos para cada plano de assinatura da plataforma TreinAI, garantindo uma experiência diferenciada e progressiva para cada nível de usuário.

---

## 🎯 **Objetivos do Produto**

- **Monetização Escalonada**: Oferecer valor crescente em cada tier de assinatura
- **Retenção de Usuários**: Criar incentivos para upgrade através de funcionalidades exclusivas
- **Segmentação de Mercado**: Atender diferentes perfis de usuários (iniciantes, entusiastas, profissionais)
- **Experiência Personalizada**: Adaptar recursos conforme necessidades específicas

---

## 📊 **Estrutura de Planos**

### 🆓 **PLANO FREE (Gratuito)**

#### **Descrição**
Plano de entrada para novos usuários experimentarem a plataforma com funcionalidades básicas limitadas.

#### **Benefícios**
- ✅ Acesso gratuito permanente
- ✅ Experiência completa de onboarding
- ✅ Interface intuitiva e responsiva
- ✅ Suporte básico via chat

#### **Funcionalidades Incluídas**
- **Treinos com IA**: 5 treinos por semana
- **Chat com Treinador IA**: Interações básicas
- **Feedback Pós-Treino**: Análise simples de desempenho
- **Onboarding Personalizado**: Configuração inicial do perfil
- **Biblioteca de Exercícios**: Acesso limitado (50 exercícios)

#### **Limitações**
- ❌ Máximo 5 treinos semanais
- ❌ Sem relatórios de progresso
- ❌ Sem personalização avançada
- ❌ Sem modo offline
- ❌ Anúncios na interface
- ❌ Suporte limitado (FAQ apenas)

#### **Requisitos Técnicos**
- Autenticação básica (email/senha)
- Armazenamento local limitado (5MB)
- API calls limitadas (100/dia)
- Cache de 24h para exercícios

#### **Fluxo do Usuário**
1. **Cadastro** → Email + senha
2. **Onboarding** → Questionário básico (5 perguntas)
3. **Dashboard** → Visão simplificada
4. **Treino** → Seleção limitada
5. **Feedback** → Formulário básico

---

### 💪 **PLANO PRO - Treino Inteligente**
**R$ 14,99/mês**

#### **Descrição**
Plano intermediário focado em usuários regulares que buscam treinos personalizados e acompanhamento de progresso.

#### **Benefícios**
- ✅ Treinos ilimitados e adaptativos
- ✅ IA avançada para personalização
- ✅ Relatórios detalhados de progresso
- ✅ Interface premium sem anúncios

#### **Funcionalidades Incluídas**
- **Treinos Diários Ilimitados**: Sem restrições de quantidade
- **IA Adaptativa**: Ajusta treinos baseado em feedback e performance
- **Ciclos de Treino**: Programas de 4, 8 ou 12 semanas
- **Imagens IA**: Visualizações geradas por IA para exercícios
- **Relatórios Semanais**: Análise detalhada de progresso
- **Modo Escuro**: Interface personalizada
- **Biblioteca Completa**: 500+ exercícios
- **Histórico Completo**: Todos os treinos salvos

#### **Recursos Exclusivos**
- **Smart Adaptation**: IA aprende padrões individuais
- **Progress Analytics**: Gráficos e métricas avançadas
- **Custom Workouts**: Criação de treinos personalizados
- **Offline Mode**: Treinos disponíveis sem internet

#### **Limitações**
- ❌ Sem plano nutricional
- ❌ Sem treino mental
- ❌ Sem funcionalidades de coach
- ❌ Suporte por email apenas

#### **Requisitos Técnicos**
- Autenticação avançada (2FA opcional)
- Armazenamento: 100MB por usuário
- API calls: 1000/dia
- Sincronização em tempo real
- Cache inteligente de 7 dias

#### **Fluxo do Usuário**
1. **Upgrade** → Pagamento via Stripe
2. **Onboarding Avançado** → 15 perguntas + testes físicos
3. **Dashboard Pro** → Métricas e gráficos
4. **Treino Adaptativo** → IA sugere modificações
5. **Relatórios** → Análise semanal automática

---

### 🧠 **PLANO MAX - Corpo e Mente**
**R$ 39,99/mês**

#### **Descrição**
Plano premium que combina treino físico, nutrição e bem-estar mental para uma experiência holística.

#### **Benefícios**
- ✅ Experiência completa 360°
- ✅ IA nutricional personalizada
- ✅ Treino mental e mindfulness
- ✅ Suporte prioritário

#### **Funcionalidades Incluídas**
**Herda todas do Pro, mais:**
- **NutriAI**: Plano alimentar personalizado com IA
- **Recomendações Inteligentes**: Refeições baseadas no treino do dia
- **ZenTrain**: Módulo de treino mental e meditação
- **Checklist Diário**: Integração treino + alimentação + mental
- **Modo Desafio**: Desafios semanais gamificados
- **Receitas IA**: Geração de receitas personalizadas
- **Tracking Nutricional**: Monitoramento de macros e calorias

#### **Recursos Exclusivos**
- **Holistic Dashboard**: Visão 360° da saúde
- **AI Meal Planning**: Cardápios adaptativos
- **Mental Wellness**: Exercícios de mindfulness
- **Challenge Mode**: Gamificação avançada
- **Nutrition Sync**: Integração com apps de nutrição
- **Priority Support**: Suporte em até 2h

#### **Limitações**
- ❌ Sem funcionalidades de coaching
- ❌ Sem white label
- ❌ Sem gestão de alunos

#### **Requisitos Técnicos**
- Armazenamento: 500MB por usuário
- API calls: 5000/dia
- Integração com APIs nutricionais
- Processamento de imagens (receitas)
- Notificações push avançadas

#### **Fluxo do Usuário**
1. **Upgrade** → Pagamento + configuração nutricional
2. **Perfil Completo** → Dados físicos + preferências alimentares
3. **Dashboard 360°** → Treino + nutrição + mental
4. **Rotina Diária** → Checklist integrado
5. **Desafios** → Participação em challenges

---

### 🧑‍🏫 **PLANO COACH - Para Personal Trainers**
**R$ 149,99/mês**

#### **Descrição**
Plano profissional para personal trainers que desejam gerenciar alunos e criar seu próprio negócio na plataforma.

#### **Benefícios**
- ✅ Plataforma white label personalizada
- ✅ Gestão completa de alunos
- ✅ Ferramentas de marketing e vendas
- ✅ Suporte premium 24/7

#### **Funcionalidades Incluídas**
**Herda todas do Max, mais:**
- **White Label**: Marca própria personalizada
- **Painel de Alunos**: Gestão completa de clientes
- **Dashboard de Feedbacks**: Análise de satisfação
- **CoachFunnels**: Funis de venda automatizados
- **RankFit**: Sistema de ranking e desafios
- **Link Personalizado**: URL própria para captação
- **Relatórios de Negócio**: Métricas de performance e receita

#### **Recursos Exclusivos**
- **Multi-Client Management**: Até 100 alunos
- **Custom Branding**: Logo, cores, domínio próprio
- **Sales Funnel Builder**: Criação de funis visuais
- **Student Analytics**: Métricas detalhadas por aluno
- **Automated Marketing**: Campanhas automáticas
- **Revenue Dashboard**: Controle financeiro
- **API Access**: Integrações personalizadas

#### **Limitações**
- ❌ Limite de 100 alunos ativos
- ❌ 5GB de armazenamento total
- ❌ Customizações limitadas ao template

#### **Requisitos Técnicos**
- Infraestrutura multi-tenant
- Armazenamento: 5GB por coach
- API calls: ilimitadas
- CDN para white label
- Sistema de pagamentos integrado
- Analytics avançado

#### **Fluxo do Usuário**
1. **Cadastro Coach** → Verificação profissional
2. **Setup White Label** → Personalização da marca
3. **Onboarding Alunos** → Convites e configuração
4. **Gestão Diária** → Dashboard de alunos
5. **Análise de Negócio** → Relatórios e métricas

---

## 🔧 **Requisitos Técnicos Gerais**

### **Infraestrutura**
- **Backend**: Node.js + Express
- **Database**: MongoDB + Redis (cache)
- **Frontend**: React + Vite
- **Pagamentos**: Stripe + webhooks
- **Storage**: AWS S3 para mídia
- **CDN**: CloudFlare para performance

### **Segurança**
- Autenticação JWT + refresh tokens
- Criptografia AES-256 para dados sensíveis
- Rate limiting por plano
- HTTPS obrigatório
- Compliance LGPD

### **Performance**
- Cache Redis por nível de plano
- CDN para assets estáticos
- Lazy loading de componentes
- Otimização de imagens automática

---

## 📱 **Experiência do Usuário**

### **Onboarding Diferenciado**
- **Free**: 5 perguntas básicas
- **Pro**: 15 perguntas + avaliação física
- **Max**: Perfil completo + preferências nutricionais
- **Coach**: Verificação profissional + setup de marca

### **Interface Adaptativa**
- Componentes condicionais por plano
- Cores e temas personalizados
- Funcionalidades progressivas
- Call-to-actions para upgrade

### **Notificações Inteligentes**
- **Free**: Lembretes básicos
- **Pro**: Sugestões de treino
- **Max**: Integração nutricional
- **Coach**: Alertas de alunos

---

## 💰 **Estratégia de Monetização**

### **Freemium Model**
- Free como aquisição
- Pro como conversão principal
- Max como retenção premium
- Coach como B2B expansion

### **Upgrade Incentives**
- Limitações claras no Free
- Trials gratuitos (7 dias)
- Descontos por anualidade
- Referral program

---

## 📈 **Métricas de Sucesso**

### **KPIs por Plano**
- **Free**: Taxa de ativação (>60%)
- **Pro**: Conversão Free→Pro (>15%)
- **Max**: Retenção mensal (>85%)
- **Coach**: LTV/CAC ratio (>3:1)

### **Métricas Técnicas**
- Uptime: >99.9%
- Response time: <200ms
- Error rate: <0.1%
- User satisfaction: >4.5/5

---

## 🚀 **Roadmap de Implementação**

### **Fase 1 - Core Features** (4 semanas)
- Estrutura de planos no backend
- Sistema de pagamentos
- Interface básica diferenciada

### **Fase 2 - Advanced Features** (6 semanas)
- IA adaptativa para Pro
- NutriAI para Max
- Dashboard de coach

### **Fase 3 - Premium Features** (8 semanas)
- White label completo
- Analytics avançado
- Integrações externas

---

## ✅ **Critérios de Aceitação**

### **Funcional**
- [ ] Usuário pode fazer upgrade/downgrade
- [ ] Funcionalidades são habilitadas/desabilitadas corretamente
- [ ] Pagamentos processados com sucesso
- [ ] Dados migrados entre planos

### **Técnico**
- [ ] Performance mantida em todos os planos
- [ ] Segurança implementada por nível
- [ ] Backup e recovery funcionais
- [ ] Monitoramento ativo

### **UX/UI**
- [ ] Interface intuitiva para cada plano
- [ ] Onboarding personalizado
- [ ] Feedback claro sobre limitações
- [ ] Processo de upgrade fluido

---

**Documento criado em**: Janeiro 2025  
**Versão**: 2.0  
**Próxima revisão**: Março 2025