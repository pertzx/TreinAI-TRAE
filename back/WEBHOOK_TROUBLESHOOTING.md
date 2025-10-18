# 🔧 Stripe Webhook Troubleshooting Guide

## Problema Resolvido: "No signatures found matching the expected signature"

### 🔍 Diagnóstico
O erro `No signatures found matching the expected signature for payload` indica que a verificação de assinatura do Stripe está falhando. Isso geralmente acontece quando:

1. **Request body não está em formato raw** - O corpo da requisição foi processado/transformado
2. **Middleware incorreto** - Body parser modificou o conteúdo antes da verificação
3. **Configuração de webhook secret** - Chave incorreta ou não configurada
4. **Headers ausentes** - Cabeçalho `stripe-signature` não presente

### ✅ Soluções Implementadas

#### 1. Middleware Express.raw Otimizado
```javascript
// index.js - DEVE vir ANTES de outros middlewares
app.post('/webhook', express.raw({ 
  type: 'application/json',
  limit: '1mb' // Limite de segurança
}), StripeWebhook);
```

#### 2. Verificações Robustas de Segurança
```javascript
// controllers/stripe.js - Debugging detalhado
console.log('🔍 Webhook Debug Info:');
console.log('- Content-Type:', req.headers['content-type']);
console.log('- Body type:', typeof req.body);
console.log('- Body is Buffer:', Buffer.isBuffer(req.body));
console.log('- Signature present:', !!sig);
```

#### 3. Validações de Entrada
- ✅ Verificação de cabeçalho `stripe-signature`
- ✅ Validação de formato do request body (Buffer/string)
- ✅ Verificação de configuração do webhook secret
- ✅ Validação de formato da assinatura Stripe

### 🧪 Como Testar Localmente

#### Usando Stripe CLI:
```bash
# 1. Instalar Stripe CLI
# https://stripe.com/docs/stripe-cli

# 2. Login no Stripe
stripe login

# 3. Escutar webhooks localmente
stripe listen --forward-to localhost:3001/webhook

# 4. Disparar eventos de teste
stripe trigger checkout.session.completed
stripe trigger invoice.paid
stripe trigger customer.subscription.deleted
```

#### Verificar Logs:
```bash
# No terminal do backend, verificar:
# ✅ "🔍 Webhook Debug Info" - informações de debugging
# ✅ "✅ Webhook signature verificada com sucesso" - sucesso
# ❌ "❌ Webhook constructEvent error" - erro detalhado
```

### 🔒 Configuração de Segurança

#### Variáveis de Ambiente (.env):
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
```

#### Dashboard Stripe:
1. Acesse **Developers > Webhooks**
2. Configure endpoint: `https://seudominio.com/webhook`
3. Selecione eventos específicos:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `invoice.paid`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
4. Copie o **Signing secret** para o `.env`

### 🚨 Troubleshooting Comum

#### Erro: "Request body vazio"
- **Causa**: Middleware body parser processou antes do webhook
- **Solução**: Mover `app.post('/webhook')` ANTES de `app.use(express.json())`

#### Erro: "Body não é Buffer nem string"
- **Causa**: Request body foi parseado como objeto JSON
- **Solução**: Usar `express.raw()` específico para webhook

#### Erro: "Webhook secret não configurado"
- **Causa**: `STRIPE_WEBHOOK_SECRET` ausente no `.env`
- **Solução**: Adicionar variável com valor do Dashboard Stripe

#### Erro: "Formato de assinatura inválido"
- **Causa**: Header `stripe-signature` malformado
- **Solução**: Verificar se requisição vem realmente do Stripe

### 📊 Monitoramento

#### Logs de Sucesso:
```
🔍 Webhook Debug Info:
- Content-Type: application/json
- Body type: object
- Body is Buffer: true
- Signature present: true
✅ Webhook signature verificada com sucesso
```

#### Logs de Erro:
```
❌ Request body não é Buffer nem string: object
❌ Webhook constructEvent error: No signatures found
🔍 Debugging signature verification:
- Raw body preview: {"id":"evt_xxxxx"...
```

### 🔄 Fluxo de Verificação
1. **Receber requisição** → Verificar headers e body
2. **Validar formato** → Buffer/string + signature header
3. **Construir evento** → `stripe.webhooks.constructEvent()`
4. **Processar evento** → Switch case por tipo de evento
5. **Responder** → Status 200 para confirmar recebimento

---
**Última atualização**: Janeiro 2025
**Status**: ✅ Problema resolvido com verificações robustas implementadas