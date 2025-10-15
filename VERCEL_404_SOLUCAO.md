# Solução para Erro 404 NOT_FOUND no Vercel

## Problema Identificado
O erro "The page could not be found - NOT_FOUND" indica que o Vercel não consegue rotear as requisições corretamente para a aplicação Node.js.

## Causas Possíveis

### 1. Configuração do vercel.json
- Falta de especificação da versão da API
- Configuração de rotas inadequada
- Variáveis de ambiente não configuradas

### 2. Estrutura de Export
- Problema com export ES6 modules
- Função não sendo exportada corretamente

### 3. Timeout de Função
- Função serverless excedendo tempo limite padrão

## Soluções Implementadas

### 1. Atualização do vercel.json
```json
{
  "version": 2,
  "builds": [
    {
      "src": "./index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "./index.js"
    }
  ],
  "env": {
    "BLOB_READ_WRITE_TOKEN": "@blob_read_write_token",
    "NODE_ENV": "production",
    "VERCEL": "true"
  },
  "functions": {
    "./index.js": {
      "maxDuration": 30
    }
  }
}
```

### 2. Rota de Health Check
Adicionada rota `/api/health` para verificar se o servidor está funcionando:
```javascript
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    serverless: !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
  });
});
```

## Como Testar

### 1. Teste Local
```bash
cd back
npm start
curl http://localhost:4000/
curl http://localhost:4000/api/health
```

### 2. Teste no Vercel
```bash
# Após deploy
curl https://seu-projeto.vercel.app/
curl https://seu-projeto.vercel.app/api/health
```

### 3. Verificar Logs
```bash
vercel logs --follow
```

## Checklist de Verificação

### No Painel do Vercel:
- [ ] Variáveis de ambiente configuradas
- [ ] Build bem-sucedido
- [ ] Função não excedendo timeout
- [ ] Domínio configurado corretamente

### Variáveis Obrigatórias:
- [ ] `NODE_ENV=production`
- [ ] `VERCEL=true`
- [ ] `FRONTEND_URL=https://sua-url-frontend.vercel.app`
- [ ] `MONGO_URI=sua-connection-string-mongodb`
- [ ] `SECRET_JWT=sua-chave-jwt`
- [ ] Outras variáveis do .env

### Testes:
- [ ] Rota raiz (`/`) responde
- [ ] Health check (`/api/health`) responde
- [ ] APIs específicas funcionam
- [ ] CORS configurado corretamente

## Comandos de Debug

### 1. Verificar Status do Deploy
```bash
vercel ls
vercel inspect seu-projeto.vercel.app
```

### 2. Verificar Logs em Tempo Real
```bash
vercel logs --follow
```

### 3. Testar Endpoints
```bash
# Health check
curl -v https://seu-projeto.vercel.app/api/health

# Rota principal
curl -v https://seu-projeto.vercel.app/

# Com headers CORS
curl -H "Origin: https://seu-frontend.vercel.app" \
     -v https://seu-projeto.vercel.app/api/health
```

## Próximos Passos

1. **Deploy e Teste**: Fazer deploy das alterações e testar
2. **Configurar Variáveis**: Adicionar todas as variáveis de ambiente no Vercel
3. **Verificar Logs**: Monitorar logs para identificar outros problemas
4. **Testar APIs**: Verificar se todas as rotas estão funcionando

## Possíveis Problemas Adicionais

### 1. Timeout de Cold Start
- Aumentar `maxDuration` se necessário
- Otimizar imports e inicialização

### 2. Dependências Faltando
- Verificar se todas as dependências estão no package.json
- Verificar se não há imports de arquivos locais quebrados

### 3. Variáveis de Ambiente
- Verificar se todas as variáveis necessárias estão configuradas
- Verificar se os valores estão corretos (URLs, tokens, etc.)

## Monitoramento

### Logs a Observar:
- `✅ Servidor configurado para ambiente serverless`
- `✅ MongoDB conectado com sucesso`
- `🔒 CORS [PROD]: Verificando origem`
- Erros de timeout ou crash

### Métricas:
- Tempo de resposta das funções
- Taxa de erro 404
- Uso de memória e CPU