# 🔧 Configuração de APIs Externas - TreinAI

Este documento explica como configurar as APIs externas necessárias para o funcionamento completo do sistema de **Treinos com IA**.

## 📋 APIs Necessárias

### 1. OpenAI API (✅ Já Configurada)
- **Função**: Geração de treinos personalizados e exercícios com IA
- **Status**: ✅ Configurada no `.env`
- **Variável**: `OPENAI_API_KEY`

### 2. ExerciseDB API (RapidAPI) (⚠️ Necessária Configuração)
- **Função**: Base de dados com mais de 1300 exercícios
- **Website**: https://rapidapi.com/justin-WFnsXH_t6/api/exercisedb
- **Plano Gratuito**: 100 requests/mês
- **Plano Básico**: $10/mês - 10,000 requests

#### Como Configurar:
1. Acesse https://rapidapi.com/justin-WFnsXH_t6/api/exercisedb
2. Crie uma conta no RapidAPI
3. Subscribe no plano desejado
4. Copie sua API Key
5. Substitua `sua_chave_exercisedb_aqui` no arquivo `.env`

### 3. Wger API (✅ Gratuita)
- **Função**: Base de dados open-source de exercícios
- **Website**: https://wger.de/api/v2/
- **Status**: ✅ Gratuita (sem necessidade de chave)
- **Documentação**: https://wger.de/en/software/api

## 🔧 Configuração no .env

```env
# APIs Externas para Exercícios
EXERCISEDB_API_KEY=sua_chave_exercisedb_aqui
EXERCISEDB_API_URL=https://exercisedb.p.rapidapi.com
WGER_API_URL=https://wger.de/api/v2
WGER_API_KEY=opcional_se_necessario

# Configurações de Cache
CACHE_TTL=3600
MAX_CACHE_SIZE=1000
```

## 🚀 Funcionalidades por API

### ExerciseDB
- ✅ Exercícios categorizados por grupo muscular
- ✅ Instruções detalhadas
- ✅ Imagens/GIFs dos exercícios
- ✅ Filtros por equipamento
- ✅ Níveis de dificuldade

### Wger API
- ✅ Base de dados open-source
- ✅ Exercícios em múltiplos idiomas
- ✅ Categorias detalhadas
- ✅ Sem limite de requests
- ✅ Backup gratuito para ExerciseDB

### OpenAI
- ✅ Geração de treinos personalizados
- ✅ Criação de exercícios customizados
- ✅ Instruções detalhadas
- ✅ Adaptação ao perfil do usuário

## 📊 Sistema de Fallback

O sistema foi projetado com **redundância**:

1. **Primeira tentativa**: ExerciseDB (dados mais ricos)
2. **Segunda tentativa**: Wger API (gratuita)
3. **Terceira tentativa**: OpenAI (geração própria)
4. **Fallback final**: Exercícios básicos pré-definidos

## 🔄 Cache Inteligente

- **TTL**: 1 hora (3600 segundos)
- **Tamanho máximo**: 1000 entradas
- **Benefícios**: 
  - Reduz custos de API
  - Melhora performance
  - Funciona offline parcialmente

## ⚡ Testando a Configuração

Após configurar as APIs, teste o sistema:

1. Acesse `/dashboard/ai-workout`
2. Configure um treino
3. Clique em "Gerar Treino com IA"
4. Verifique os logs do servidor para possíveis erros

## 🔍 Troubleshooting

### Erro: "ExerciseDB API key não configurada"
- Verifique se `EXERCISEDB_API_KEY` está no `.env`
- Confirme se a chave está correta no RapidAPI

### Erro: "Limite de requests excedido"
- Verifique seu plano no RapidAPI
- O sistema automaticamente usará Wger API como backup

### Erro: "OpenAI API não responde"
- Verifique se `OPENAI_API_KEY` está correta
- Confirme se há créditos na conta OpenAI

## 💡 Dicas de Otimização

1. **Use cache**: Mantenha `CACHE_TTL` em 3600 para melhor performance
2. **Monitore uso**: Acompanhe o consumo das APIs no dashboard
3. **Plano adequado**: Escolha o plano ExerciseDB baseado no uso esperado
4. **Backup sempre**: Wger API garante funcionamento mesmo sem ExerciseDB

---

**Status Atual**: ⚠️ ExerciseDB precisa ser configurada para funcionamento completo
**Próximo passo**: Configurar chave da ExerciseDB API no arquivo `.env`