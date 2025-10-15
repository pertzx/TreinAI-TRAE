# Instruções para Configuração CORS em Produção

## Problema Identificado
O CORS está rejeitando sua URL em produção porque a configuração atual depende das variáveis de ambiente `FRONTEND_URL` e `ALLOWED_ORIGINS`.

## Configuração Atual no .env
```
FRONTEND_URL=http://192.168.3.147:5173
ALLOWED_ORIGINS=
```

## Como Resolver

### 1. Para Ambiente Local de Desenvolvimento
- Certifique-se que `NODE_ENV` não está definido como `'production'`
- Ou defina `NODE_ENV=development` no seu .env local

### 2. Para Ambiente de Produção (Vercel)

#### Opção A: Configurar FRONTEND_URL
No painel do Vercel, adicione a variável de ambiente:
```
FRONTEND_URL=https://sua-url-de-producao.vercel.app
```

#### Opção B: Configurar ALLOWED_ORIGINS
No painel do Vercel, adicione múltiplas URLs separadas por vírgula:
```
ALLOWED_ORIGINS=https://sua-url-1.vercel.app,https://sua-url-2.com,https://www.sua-url-2.com
```

#### Opção C: Ambas as configurações
```
FRONTEND_URL=https://sua-url-principal.vercel.app
ALLOWED_ORIGINS=https://url-adicional-1.com,https://url-adicional-2.com
```

## Como Verificar os Logs

### 1. Logs do Vercel
```bash
vercel logs --follow
```

### 2. O que procurar nos logs
- `🔒 CORS [PROD]: Verificando origem: SUA_URL`
- `🔒 CORS [PROD]: Origens permitidas: [array_de_urls]`
- `❌ CORS [PROD]: Origem rejeitada: SUA_URL`
- `💡 CORS [PROD]: Para permitir esta origem, adicione 'SUA_URL' na variável FRONTEND_URL ou ALLOWED_ORIGINS`

## Melhorias Implementadas

1. **Logs mais informativos**: Agora mostra exatamente qual URL adicionar
2. **Lógica melhorada**: Melhor tratamento de casos edge
3. **Debug facilitado**: Logs claros para identificar o problema

## Comandos para Testar

### Teste local
```bash
curl -H "Origin: http://192.168.3.147:5173" http://localhost:4000/
```

### Teste em produção
```bash
curl -H "Origin: https://sua-url.vercel.app" https://seu-backend.vercel.app/
```

## Checklist de Verificação

- [ ] Variável `FRONTEND_URL` configurada no Vercel
- [ ] Variável `ALLOWED_ORIGINS` configurada (se necessário)
- [ ] URL exata (com https:// e sem barra final)
- [ ] Logs verificados no Vercel
- [ ] Teste realizado com a URL real

## Exemplo de Configuração Completa no Vercel

```
NODE_ENV=production
FRONTEND_URL=https://treinai-frontend.vercel.app
ALLOWED_ORIGINS=https://www.treinai.com,https://app.treinai.com
```