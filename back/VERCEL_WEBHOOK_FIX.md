# Correções para Webhook do Stripe no Vercel

## Problema Identificado
O webhook do Stripe estava falhando em produção no Vercel com o erro:
```
StripeSignatureVerificationError: No signatures found matching the expected signature for payload
```

## Análise dos Logs de Produção
- Logs mostravam que o webhook estava recebendo requisições do Stripe
- Signature header estava presente e válida
- Webhook secret estava configurado corretamente
- O problema era específico do ambiente Vercel (funcionava localmente)

## Causa Raiz
O Vercel processa o body das requisições de forma diferente em serverless functions, causando problemas na verificação de assinatura do Stripe que requer o body raw exato.

## Soluções Implementadas

### 1. Configuração do vercel.json
```json
{
  "functions": {
    "index.js": {
      "maxDuration": 30
    }
  }
}
```

### 2. Middleware express.raw com verify
```javascript
app.post('/webhook', express.raw({
  type: 'application/json',
  limit: '1mb',
  verify: (req, res, buf) => {
    // Garantir que o body seja preservado como Buffer para Vercel
    req.rawBody = buf;
  }
}), StripeWebhook);
```

### 3. Função StripeWebhook Atualizada
```javascript
export const StripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  // Usar rawBody se disponível (para Vercel), senão usar req.body
  const body = req.rawBody || req.body;
  
  // ... resto da função usa 'body' em vez de 'req.body'
  event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
}
```

## Referências
- [Stripe Webhook Signature Verification](https://docs.stripe.com/webhooks/signature)
- [Vercel Serverless Functions Body Parsing](https://vercel.com/docs/functions/serverless-functions)
- [Reddit Discussion: Stripe Webhook Error on Vercel](https://www.reddit.com/r/nextjs/comments/ykakt2/stripe_webhook_error_on_vercel_server_no/)

## Status
✅ Correções aplicadas
⏳ Aguardando teste em produção