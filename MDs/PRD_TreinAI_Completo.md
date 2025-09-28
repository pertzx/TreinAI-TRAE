# PRD (Product Requirements Document) - TreinAI

## 📋 Visão Geral do Produto

**Nome do Produto:** TreinAI  
**Versão:** 1.0.0  
**Data de Criação:** Janeiro 2025  
**Tipo:** Plataforma de Fitness e Wellness com IA  

### 🎯 Missão
Democratizar o acesso a treinamento personalizado e orientação nutricional através de inteligência artificial, conectando usuários com profissionais qualificados e oferecendo ferramentas inteligentes para alcançar objetivos de saúde e fitness.

### 🔍 Visão
Ser a principal plataforma de fitness e wellness no Brasil, oferecendo soluções personalizadas e acessíveis para todos os níveis de experiência.

---

## 🏗️ Arquitetura Técnica

### **Backend**
- **Framework:** Node.js com Express.js
- **Banco de Dados:** MongoDB (MongoDB Atlas)
- **Autenticação:** JWT (JSON Web Tokens)
- **Pagamentos:** Stripe
- **IA:** OpenAI GPT-4
- **Upload de Arquivos:** Multer + Sharp (processamento de imagens)
- **Segurança:** bcrypt, express-rate-limit, CORS

### **Frontend**
- **Framework:** React 19 com Vite
- **Estilização:** TailwindCSS 4.1
- **Roteamento:** React Router DOM
- **Gráficos:** ApexCharts, Recharts
- **Animações:** Framer Motion
- **Ícones:** React Icons

---

## 👥 Personas e Segmentos de Usuário

### **1. Usuário Final (Aluno)**
- Pessoas buscando orientação fitness e nutricional
- Diferentes níveis: iniciante, intermediário, avançado
- Objetivos: hipertrofia, emagrecimento, condicionamento, saúde, força, resistência

### **2. Profissionais**
- **Personal Trainers:** Criação e acompanhamento de treinos
- **Nutricionistas:** Orientação nutricional e planos alimentares
- **Fisioterapeutas:** Reabilitação e exercícios terapêuticos

### **3. Estabelecimentos (Locais)**
- Academias
- Clínicas de fisioterapia
- Consultórios de nutricionista
- Lojas de suplementos

### **4. Administradores**
- Gestão da plataforma
- Moderação de conteúdo
- Suporte ao usuário

---

## 🚀 Funcionalidades Implementadas

### **🔐 Sistema de Autenticação e Usuários**
- ✅ Cadastro e login com email/senha
- ✅ Autenticação JWT
- ✅ Perfis de usuário com avatar
- ✅ Sistema de roles (user, admin, coach)
- ✅ Recuperação de senha
- ✅ Histórico de login e dispositivos

### **💳 Sistema de Planos e Pagamentos**
- ✅ Integração completa com Stripe
- ✅ Planos: Free, Pro, Max, Coach
- ✅ Assinaturas recorrentes
- ✅ Webhooks para sincronização de pagamentos
- ✅ Sistema de créditos/impressões
- ✅ Gestão de cancelamentos e reembolsos

### **🏋️ Sistema de Treinos**
- ✅ Criação de treinos personalizados
- ✅ Biblioteca de exercícios com imagens
- ✅ Geração automática de treinos com IA
- ✅ Histórico de treinos executados
- ✅ Acompanhamento de progresso
- ✅ Sistema de séries, repetições e PSE
- ✅ Drag & drop para reordenar exercícios

### **🤖 Inteligência Artificial**
- ✅ ChatBot para criação de treinos (TreinAI)
- ✅ NutriAI para orientação nutricional
- ✅ Análise de perfil para recomendações personalizadas
- ✅ Geração automática de planos baseados em objetivos

### **👨‍⚕️ Sistema de Profissionais**
- ✅ Cadastro de profissionais (Personal, Nutricionista, Fisioterapeuta)
- ✅ Sistema de alunos e relacionamentos
- ✅ Geolocalização para busca por proximidade
- ✅ Sistema de avaliações e reviews
- ✅ Chat entre profissional e aluno

### **💬 Sistema de Chat**
- ✅ Chat em tempo real entre usuários
- ✅ Grupos de chat
- ✅ Histórico de mensagens
- ✅ Sistema de notificações
- ✅ Chat com IA (TreinAI e NutriAI)

### **📍 Sistema de Locais**
- ✅ Cadastro de estabelecimentos
- ✅ Geolocalização e busca por proximidade
- ✅ Sistema de avaliações
- ✅ Upload de imagens
- ✅ Categorização por tipo de estabelecimento

### **📊 Dashboard e Analytics**
- ✅ Dashboard personalizado por usuário
- ✅ Gráficos de progresso (peso, IMC)
- ✅ Histórico de treinos
- ✅ Estatísticas de uso
- ✅ Gráficos de tokens/créditos

### **⚙️ Sistema de Configurações**
- ✅ Temas (claro/escuro)
- ✅ Preferências de idioma
- ✅ Configurações de notificações
- ✅ Gestão de perfil

### **🛡️ Sistema Administrativo**
- ✅ Painel administrativo completo
- ✅ Gestão de usuários
- ✅ Moderação de anúncios
- ✅ Sistema de reports
- ✅ Gestão de locais
- ✅ Sistema de suporte

### **📱 Interface e UX**
- ✅ Design responsivo
- ✅ Animações fluidas (Framer Motion)
- ✅ Componentes reutilizáveis
- ✅ Sistema de toasts/notificações
- ✅ Loading states
- ✅ Onboarding para novos usuários

---

## 📈 Modelos de Monetização

### **Planos de Assinatura**
1. **Free** - Funcionalidades básicas
2. **Pro** - Acesso a IA e recursos avançados
3. **Max** - Todos os recursos + prioridade
4. **Coach** - Ferramentas para profissionais

### **Sistema de Créditos**
- Créditos para uso de IA
- Compra avulsa de créditos
- Recarga automática

### **Marketplace de Locais**
- Assinaturas para estabelecimentos
- Destaque em buscas
- Analytics para proprietários

---

## 🔒 Segurança e Compliance

### **Implementado**
- ✅ Criptografia de senhas (bcrypt)
- ✅ Rate limiting
- ✅ Validação de dados
- ✅ CORS configurado
- ✅ JWT com expiração
- ✅ Upload seguro de arquivos

### **Dados Pessoais**
- ✅ Armazenamento seguro de informações pessoais
- ✅ Controle de acesso baseado em roles
- ✅ Logs de atividade

---

## 📊 Métricas e KPIs

### **Métricas de Usuário**
- Número de logins
- Tempo de sessão
- Treinos completados
- Uso de IA
- Retenção de usuários

### **Métricas de Negócio**
- Taxa de conversão Free → Pago
- Churn rate
- LTV (Lifetime Value)
- Receita recorrente (MRR)

### **Métricas de Produto**
- Engajamento com IA
- Uso de funcionalidades
- Feedback de usuários
- Performance da plataforma

---

## 🎨 Design System

### **Temas**
- ✅ Modo escuro/claro
- ✅ Cores consistentes
- ✅ Tipografia padronizada

### **Componentes**
- ✅ Header responsivo
- ✅ Menu lateral
- ✅ Cards de conteúdo
- ✅ Formulários padronizados
- ✅ Botões e estados

---

## 🔄 Integrações

### **Implementadas**
- ✅ OpenAI GPT-4 (IA conversacional)
- ✅ Stripe (pagamentos)
- ✅ MongoDB Atlas (banco de dados)
- ✅ Geolocalização (busca por proximidade)

### **APIs Externas**
- ✅ Processamento de imagens
- ✅ Validação de dados geográficos
- ✅ Sistema de notificações

---

## 📱 Compatibilidade

### **Dispositivos Suportados**
- ✅ Desktop (Windows, Mac, Linux)
- ✅ Tablets
- ✅ Smartphones (responsivo)

### **Navegadores**
- ✅ Chrome
- ✅ Firefox
- ✅ Safari
- ✅ Edge

---

## 🚀 Roadmap de Desenvolvimento

### **Fase Atual - MVP Completo**
- ✅ Todas as funcionalidades core implementadas
- ✅ Sistema de pagamentos funcional
- ✅ IA integrada e operacional
- ✅ Interface completa e responsiva

### **Próximas Fases**
- 📱 Aplicativo mobile nativo
- 🔔 Sistema de notificações push
- 📹 Vídeos de exercícios
- 🏆 Sistema de gamificação
- 📈 Analytics avançados
- 🌐 Internacionalização

---

## 💡 Diferenciais Competitivos

1. **IA Personalizada:** Treinos e nutrição adaptados ao perfil individual
2. **Ecossistema Completo:** Usuários, profissionais e estabelecimentos em uma plataforma
3. **Geolocalização:** Busca inteligente por proximidade
4. **Flexibilidade:** Múltiplos planos para diferentes necessidades
5. **Interface Moderna:** UX/UI otimizada e responsiva
6. **Integração Completa:** Pagamentos, IA e gestão unificados

---

## 📞 Suporte e Manutenção

### **Sistema de Suporte**
- ✅ Tickets de suporte integrados
- ✅ Base de conhecimento
- ✅ Chat de suporte
- ✅ Sistema de reports

### **Monitoramento**
- ✅ Logs de erro
- ✅ Métricas de performance
- ✅ Alertas automáticos
- ✅ Backup automático

---

**Documento gerado automaticamente através da análise do código-fonte do TreinAI**  
**Última atualização:** Janeiro 2025