# Stripe em Produção — Guia completo de migração para a nova conta

Este guia cobre **tudo** que precisa ser feito para trocar a conta antiga da Stripe
pela nova conta (já ativada e em modo produção): chaves, produtos/preços, webhook
(com a lista exata de eventos), banco de dados e deploy na Vercel.

> Arquivos de referência: `back/.env.example` e `front/.env.example` (atualizados).

---

## Visão geral do que muda

| Item | Onde fica | O que fazer |
|---|---|---|
| Chave secreta (`sk_live_...`) | Vercel do **back** → `STRIPE_SECRET_KEY` | Trocar |
| Chave publicável (`pk_live_...`) | Vercel do **front** → `VITE_STRIPE_PUBLIC_KEY` | Trocar |
| Webhook secret (`whsec_...`) | Vercel do **back** → `STRIPE_WEBHOOK_SECRET` | Criar webhook novo e colar |
| Price IDs (6 no total) | Vercel do **back** → `STRIPE_PRICEID_*` | Recriar produtos na nova conta |
| Price IDs dos planos **no MongoDB** | Coleção `Plan` | Rodar `seedPlans.js` de novo (passo 4) |
| Customers antigos salvos nos usuários | Coleção `User` (`planInfos.stripeCustomerId`) | Limpar (passo 5) |

**Por que o Mongo entra nisso:** os planos (pro/max/coach) são lidos do banco, não
do `.env`. O `.env` só alimenta o script `seedPlans.js`, que grava o `priceId` na
coleção `Plan`. Se você trocar só o `.env` e não rodar o seed (ou editar no painel
admin), o checkout continuará usando os price IDs da conta antiga e **vai falhar**.

---

## Passo 1 — Pegar as chaves da nova conta

1. Acesse https://dashboard.stripe.com/apikeys
2. Confirme que o toggle **"Modo de teste" está DESLIGADO** (canto superior direito).
3. Copie:
   - **Chave publicável** → começa com `pk_live_` → vai para o **front** (`VITE_STRIPE_PUBLIC_KEY`)
   - **Chave secreta** → começa com `sk_live_` → vai para o **back** (`STRIPE_SECRET_KEY`)
     (clique em "Revelar chave" — ela só é mostrada uma vez, guarde em local seguro)

⚠️ Nunca coloque a `sk_live_` no front nem commite no git.

## Passo 2 — Recriar os produtos e preços (price IDs são por conta!)

Price IDs **não existem** na conta nova — é preciso recriar tudo em
https://dashboard.stripe.com/products → **"+ Adicionar produto"**.

Crie **6 preços**, todos **Recorrente / Mensal / BRL**:

### Planos (usuários)
| Produto (nome sugerido) | Preço | Vai na env |
|---|---|---|
| TreinAI Pro | R$ 39,99/mês | `STRIPE_PRICEID_PRO` |
| TreinAI Max | R$ 79,99/mês | `STRIPE_PRICEID_MAX` |
| TreinAI Coach | R$ 149,99/mês | `STRIPE_PRICEID_COACH` |

### Locais (anúncios de estabelecimentos)
| Produto (nome sugerido) | Preço | Vai na env | Usado para |
|---|---|---|---|
| Local — Clínica/Consultório | R$ 100,00/mês | `STRIPE_PRICEID_100` | clínica de fisioterapia, consultório do nutricionista |
| Local — Academia/Loja | R$ 180,00/mês | `STRIPE_PRICEID_180` | academia, loja |
| Local — Outro | R$ 50,00/mês | `STRIPE_PRICEID_50` | outro |

Depois de criar cada produto, abra-o e copie o **ID do preço** (começa com
`price_...`, **não** confunda com o ID do produto `prod_...`).

## Passo 3 — Configurar o Webhook (campo por campo)

Acesse https://dashboard.stripe.com/webhooks com o **modo produção ativo** (toggle
"Modo de teste"/sandbox DESLIGADO) e clique em **"+ Adicionar destino"**
(*Add destination* / "Criar um destino de eventos"). O assistente tem 3 telas —
abaixo, o que escolher em **cada campo**:

### Tela 1 — "Selecionar eventos" (*Select events*)

| Campo | O que escolher | Por quê |
|---|---|---|
| **Eventos de** / Escopo (*Events from*) | **Sua conta** (*Your account*) | "Contas conectadas" é só para plataformas Stripe Connect — não é o caso do TreinAI |
| **Versão da API** (*API version*) | **`dahlia`** (a estável). **NUNCA** escolha a `.preview` (ex.: `2026-06-24.preview`) em produção — previews mudam sem aviso e podem quebrar a assinatura dos eventos | Contas novas só oferecem as versões recentes. As versões 2025+ mudaram o payload da invoice (o campo `invoice.subscription` virou `invoice.parent.subscription_details.subscription`) — o backend **já foi adaptado** para ler os dois formatos (helper `getInvoiceSubscriptionId` em `back/controllers/stripe.js`), então `dahlia` funciona. ⚠️ Esse ajuste do código precisa estar **deployado** antes do primeiro pagamento real |
| **Tipo de payload** (*Payload style*: "Snapshot" vs "Thin"), se aparecer | **Snapshot** (eventos completos) | O handler usa `event.data.object` inteiro (invoice, session, subscription). Eventos "thin" mandam só IDs e exigiriam refetch — o código não faz isso |
| **Eventos** | Marque **exatamente os 6** listados abaixo (use a busca) | São os únicos que o `StripeWebhook` trata; qualquer outro cai no `default` e é ignorado, só gastando requisição |

Eventos a marcar (digite na busca e marque um a um):

```
checkout.session.completed
checkout.session.expired
invoice.paid
invoice.payment_succeeded
invoice.payment_failed
customer.subscription.deleted
```

O que cada um faz no sistema:
| Evento | Efeito no TreinAI |
|---|---|
| `checkout.session.completed` | Vincula assinatura ao usuário/local, gera token de local, credita saldo de impressões |
| `checkout.session.expired` | Limpa checkout abandonado (remove local pendente) |
| `invoice.paid` / `invoice.payment_succeeded` | **Ativa o plano** do usuário, define orçamento de IA (`aiBudgetBRL`), ativa local, envia email |
| `invoice.payment_failed` | Marca plano/local como inativo, remove local do fluxo de criação, envia email |
| `customer.subscription.deleted` | Cancelamento: volta usuário para o plano `free`, desativa local |

> Marque **os dois** eventos de invoice (`invoice.paid` E `invoice.payment_succeeded`):
> o código trata ambos no mesmo handler e tem proteção de idempotência
> (`lastProcessedInvoiceId` + coleção `ProcessedStripeEvent`), então não há
> risco de processar duas vezes.
>
> **NÃO** use "Selecionar todos os eventos" — só gera ruído e requisições inúteis.

### Tela 2 — "Tipo de destino" (*Destination type*)

Escolha **Webhook endpoint** (endpoint de webhook).
**Não** escolha *Amazon EventBridge* — isso é para quem consome eventos via AWS.

### Tela 3 — "Configurar destino" (*Destination details*)

| Campo | Valor |
|---|---|
| **Nome do destino** | Livre — ex.: `treinai-backend-producao` |
| **Descrição** | Opcional — ex.: "Webhook do backend TreinAI na Vercel" |
| **URL do endpoint** | `https://SEU-BACKEND.vercel.app/webhook` |
| "Ouvir eventos de contas conectadas" (se aparecer) | **Desmarcado** |

Sobre a URL: a rota é `/webhook` na **raiz** do backend (definida em
`back/index.js:88` e roteada no `back/vercel.json`). Use a URL do deploy do
**back**, não do front, e sem barra extra no final (`/webhook`, não `/webhook/`).

### Depois de criar — pegar o Signing Secret

1. Clique em **"Criar destino"** (*Create destination*).
2. Na página do endpoint criado, seção **"Segredo da assinatura"** (*Signing
   secret*), clique em **Revelar** e copie o valor — começa com `whsec_`.
3. Esse valor vai na env `STRIPE_WEBHOOK_SECRET` do **back** (passo 6).

⚠️ Avisos:
- O `whsec_` é **por endpoint**: se um dia criar outro (ex.: staging), cada um
  tem seu próprio segredo — não reutilize.
- O `whsec_` do modo teste é diferente do modo produção. Confirme que criou o
  endpoint com o modo produção ativo (a URL do dashboard não deve conter `/test/`).
- Se depois precisar mudar algo (eventos, versão da API), abra o endpoint e use
  o menu **"..." → Atualizar detalhes** — o `whsec_` continua o mesmo nesse caso.

## Passo 4 — Atualizar os price IDs no MongoDB (coleção `Plan`)

Os planos são administráveis pelo banco. Depois de preencher as envs
`STRIPE_PRICEID_PRO/MAX/COACH` (localmente, num `.env` na pasta `back/`), rode:

```bash
cd back
node scripts/seedPlans.js
```

O script conecta no Atlas (usa `DB_USER`, `DB_PASSWORD`, `DB_NAME`) e faz `$set`
dos `priceId` novos nos planos existentes — não apaga nada.

**Alternativa sem script:** se o painel admin permitir editar o `priceId` de cada
plano, você pode colar os `price_...` novos direto por lá.

Os price IDs dos **locais** (`_100`, `_180`, `_50`) são lidos direto do `.env` em
tempo de execução — para esses basta atualizar na Vercel (passo 6).

## Passo 5 — Limpar customers da conta antiga (importante!)

Usuários que já passaram pelo checkout têm `planInfos.stripeCustomerId` (ex.:
`cus_...`) salvo no Mongo — **da conta antiga**. Na conta nova esses IDs não
existem, e o checkout envia `customer: customerId` para a Stripe, o que vai
retornar erro **"No such customer"** e quebrar o pagamento para esses usuários.

Limpe os campos no MongoDB (Atlas → Browse Collections → shell/Compass):

```javascript
// Executar no mongosh apontando para o banco de produção
db.users.updateMany(
  { "planInfos.stripeCustomerId": { $exists: true, $ne: null } },
  { $set: { "planInfos.stripeCustomerId": null, "planInfos.subscriptionId": null } }
)
```

Na primeira compra na conta nova, o backend cria um customer novo automaticamente
e salva o ID — nada mais a fazer.

> Se já existiam **assinaturas ativas reais** na conta antiga, elas continuam
> sendo cobradas lá! Cancele-as no dashboard da conta antiga (ou migre os
> clientes) para não cobrar duas vezes. Se a conta antiga era só teste, ignore.

## Passo 6 — Configurar as envs na Vercel e deployar

As variáveis mudaram → é preciso atualizá-las **no painel da Vercel** (envs não
vêm do git) e **redeployar** (a Vercel só aplica env nova em build/deploy novo).

### Backend (projeto do `back/`)
Vercel → projeto do back → **Settings → Environment Variables** → ambiente
**Production**. Adicione/atualize:

```
STRIPE_SECRET_KEY      = sk_live_...   (passo 1)
STRIPE_WEBHOOK_SECRET  = whsec_...     (passo 3)
STRIPE_PRICEID_PRO     = price_...     (passo 2)
STRIPE_PRICEID_MAX     = price_...
STRIPE_PRICEID_COACH   = price_...
STRIPE_PRICEID_100     = price_...
STRIPE_PRICEID_180     = price_...
STRIPE_PRICEID_50      = price_...
```

### Frontend (projeto do `front/`)
```
VITE_STRIPE_PUBLIC_KEY = pk_live_...   (passo 1)
```
⚠️ Variáveis `VITE_` são embutidas no **build** — sem rebuild, o site continua
com a chave antiga.

### Redeploy (para os dois projetos)

**Opção A — pelo painel:** Vercel → projeto → aba **Deployments** → menu `...` do
último deploy → **Redeploy** (desmarque "Use existing Build Cache").

**Opção B — pela CLI:**
```bash
npm i -g vercel        # se ainda não tiver
cd back  && vercel --prod
cd ../front && vercel --prod
```

**Opção C — por git:** faça um commit/push na branch de produção; a Vercel builda
com as envs novas.

## Passo 7 — Testar e verificar

1. **Webhook chegando:** Dashboard Stripe → Webhooks → seu endpoint → aba
   "Tentativas de eventos". Use **"Enviar evento de teste"** — deve responder
   `200`. (Se der `400 Assinatura inválida`, o `whsec_` na Vercel está errado ou
   o redeploy não foi feito.)
2. **Compra real de ponta a ponta:** faça login no site, assine o plano mais
   barato com um cartão real, e confira:
   - Redirecionou para o checkout da Stripe e voltou para `/success`;
   - O plano ficou **ativo** no app (isso prova que `invoice.paid` chegou e foi processado);
   - O pagamento aparece em https://dashboard.stripe.com/payments.
3. Depois do teste, se quiser, **reembolse** o pagamento no dashboard
   (Pagamentos → ... → Reembolsar) e cancele a assinatura de teste.
4. **Logs do backend:** Vercel → projeto do back → Logs. Os eventos aparecem como
   `[StripeController] Evento recebido: ...`.

### Problemas comuns

| Sintoma | Causa provável | Correção |
|---|---|---|
| `400 Webhook error: No signatures found...` | `STRIPE_WEBHOOK_SECRET` errado/antigo, ou sem redeploy | Colar o `whsec_` do endpoint novo e redeployar |
| `No such customer: cus_...` no checkout | Customer da conta antiga salvo no Mongo | Passo 5 |
| `No such price: price_...` | Price ID da conta antiga (env ou coleção `Plan`) | Passos 2 e 4 |
| Pagou mas o plano não ativou | Webhook não configurado / evento `invoice.paid` não marcado / URL errada | Passo 3 (conferir URL `/webhook` do BACK e os 6 eventos) |
| Webhook responde 200 mas plano/local não ativa | Backend antigo no ar sem o helper `getInvoiceSubscriptionId` (payload 2025+ não tem `invoice.subscription`) | Deployar o backend atualizado (o código atual já lê os dois formatos) |
| Eventos falhando após atualização da Stripe | Endpoint criado com versão `.preview` | Editar o endpoint e trocar para a versão estável (`dahlia`) |
| Front abre checkout de teste | `VITE_STRIPE_PUBLIC_KEY` antiga embutida no build | Atualizar env do front e **rebuild** |

> Há mais detalhes de troubleshooting de webhook na Vercel em
> `back/VERCEL_WEBHOOK_FIX.md` e `back/WEBHOOK_TROUBLESHOOTING.md`.

---

## Checklist final

- [ ] `sk_live_` e `pk_live_` copiadas da nova conta (modo teste desligado)
- [ ] 6 produtos/preços recorrentes criados na nova conta (3 planos + 3 locais)
- [ ] Webhook criado apontando para `https://SEU-BACK.vercel.app/webhook`
- [ ] Webhook com escopo "Sua conta", tipo "Webhook endpoint" e payload "Snapshot"
- [ ] Versão da API do webhook: **`dahlia`** (estável — não usar a `.preview`)
- [ ] Backend com o ajuste de compatibilidade (`getInvoiceSubscriptionId`) deployado
- [ ] 6 eventos selecionados no webhook (lista do passo 3)
- [ ] `whsec_` copiado para `STRIPE_WEBHOOK_SECRET`
- [ ] 8 envs atualizadas na Vercel do back
- [ ] `VITE_STRIPE_PUBLIC_KEY` atualizada na Vercel do front
- [ ] `node scripts/seedPlans.js` rodado (priceIds novos na coleção `Plan`)
- [ ] `stripeCustomerId` antigos limpos no Mongo (passo 5)
- [ ] Redeploy do back **e** do front
- [ ] Evento de teste do webhook respondeu 200
- [ ] Compra real testada: plano ativou no app
