# Configuração de Segurança CORS

## Visão Geral

Este documento descreve a implementação de segurança CORS (Cross-Origin Resource Sharing) no backend da aplicação TreinAI.

## Configuração de Ambiente

### Desenvolvimento
- **Comportamento**: Permite QUALQUER origem
- **Logs**: Registra todas as tentativas com nível INFO
- **Segurança**: Relaxada para facilitar desenvolvimento

### Produção
- **Comportamento**: Apenas origens específicas são permitidas
- **Logs**: Registra tentativas com detalhes de segurança
- **Segurança**: Restritiva com validação rigorosa

## Variáveis de Ambiente

```env
# URL principal do frontend
FRONTEND_URL=https://meudominio.com

# Lista de domínios adicionais permitidos (separados por vírgula)
ALLOWED_ORIGINS=https://www.meudominio.com,https://app.meudominio.com,https://admin.meudominio.com
```

## Funcionalidades de Segurança

### 1. Validação de Domínios
- Normalização automática de URLs
- Validação de protocolo (apenas HTTP/HTTPS)
- Remoção de espaços em branco
- Filtragem de domínios inválidos

### 2. Sistema de Logs
- Timestamp detalhado
- Informações de User-Agent
- Endereço IP da requisição
- Status da tentativa (PERMITIDO/REJEITADO)
- Integração preparada para sistemas de monitoramento

### 3. Configurações CORS
```javascript
{
    credentials: true,                    // Permite cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-CSRF-Token'
    ],
    exposedHeaders: ['X-CSRF-Token'],
    maxAge: 86400,                       // Cache preflight por 24 horas
    optionsSuccessStatus: 200            // Suporte a navegadores legados
}
```

## Monitoramento e Alertas

### Logs de Segurança
- **Permitidos**: `✅ [timestamp] CORS PERMITIDO: origem | IP: endereço`
- **Rejeitados**: `❌ [timestamp] CORS REJEITADO: origem | IP: endereço | UA: user-agent`

### Integração com Sistemas de Monitoramento
O código está preparado para integração com:
- Sentry
- LogRocket
- DataDog
- Outros sistemas de APM

## Configuração para Produção

### 1. Definir Domínios Permitidos
```bash
# No arquivo .env de produção
FRONTEND_URL=https://treinai.com
ALLOWED_ORIGINS=https://www.treinai.com,https://app.treinai.com
```

### 2. Verificar Logs
```bash
# Monitorar logs em tempo real
tail -f logs/app.log | grep CORS

# Filtrar apenas tentativas rejeitadas
tail -f logs/app.log | grep "CORS REJEITADO"
```

### 3. Alertas Recomendados
- Múltiplas tentativas rejeitadas do mesmo IP
- Tentativas de origens suspeitas
- Picos de requisições CORS rejeitadas

## Troubleshooting

### Problema: Frontend não consegue acessar API
1. Verificar se `FRONTEND_URL` está correto
2. Confirmar se o domínio está em `ALLOWED_ORIGINS`
3. Verificar logs para tentativas rejeitadas

### Problema: Erro "Não permitido pelo CORS"
1. Verificar se a origem está na whitelist
2. Confirmar se o protocolo (HTTP/HTTPS) está correto
3. Verificar se não há espaços extras nas variáveis de ambiente

### Problema: Cookies não funcionam
1. Verificar se `credentials: true` está configurado
2. Confirmar se o frontend está enviando `withCredentials: true`
3. Verificar se os domínios são exatamente iguais (incluindo subdomínios)

## Boas Práticas

1. **Nunca usar wildcard (*) em produção**
2. **Sempre especificar domínios exatos**
3. **Monitorar logs regularmente**
4. **Manter lista de domínios atualizada**
5. **Usar HTTPS sempre que possível**
6. **Implementar rate limiting para tentativas rejeitadas**

## Exemplo de Configuração Completa

```env
# Produção
NODE_ENV=production
FRONTEND_URL=https://treinai.com
ALLOWED_ORIGINS=https://www.treinai.com,https://app.treinai.com,https://admin.treinai.com

# Desenvolvimento
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:5173
```