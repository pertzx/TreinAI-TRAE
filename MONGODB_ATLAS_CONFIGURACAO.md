# Configuração MongoDB Atlas para Vercel Serverless

## Problema Identificado

O erro `Could not connect to any servers in your MongoDB Atlas cluster` ocorre porque o Vercel usa **IPs dinâmicos** em ambiente serverless, e o MongoDB Atlas requer que todos os IPs sejam autorizados na lista de acesso (IP Whitelist).

## Solução Recomendada

### 1. Configurar IP Whitelist no MongoDB Atlas

**IMPORTANTE**: Para ambiente serverless Vercel, é necessário autorizar **todos os IPs** (0.0.0.0/0) devido aos IPs dinâmicos.

#### Passos no MongoDB Atlas:

1. Acesse seu projeto no [MongoDB Atlas](https://cloud.mongodb.com)
2. Vá para **Network Access** no menu lateral
3. Clique em **Add IP Address**
4. Selecione **Allow Access from Anywhere** (0.0.0.0/0)
5. Adicione um comentário: "Vercel Serverless - IPs Dinâmicos"
6. Clique em **Confirm**

### 2. Segurança Adicional

Mesmo com 0.0.0.0/0, a segurança é mantida através de:

- **Autenticação**: Username/password obrigatórios
- **Autorização**: Permissões específicas por usuário
- **Criptografia**: Conexões TLS/SSL
- **Auditoria**: Logs de acesso no Atlas

### 3. Configurações de Conexão Otimizadas

As seguintes configurações foram implementadas no código para ambiente serverless:

```javascript
const mongooseOptions = {
  serverSelectionTimeoutMS: 5000,    // Timeout de 5 segundos
  socketTimeoutMS: 45000,            // Socket timeout de 45 segundos
  bufferCommands: false,             // Desabilita buffering
  bufferMaxEntries: 0,               // Não armazena comandos em buffer
};
```

## Alternativas (Não Recomendadas para Vercel)

### 1. IPs Fixos (Enterprise)
- Disponível apenas no plano Enterprise do Vercel
- Custo elevado para a maioria dos projetos

### 2. Proxy com IP Fixo
- Adicionar camada de proxy com IP estático
- Complexidade adicional desnecessária

### 3. VPN/VPC
- Não aplicável para funções serverless

## Verificação da Configuração

### 1. Verificar Variáveis de Ambiente

Certifique-se de que as seguintes variáveis estão configuradas no Vercel:

```
DB_USER=seu_usuario_mongodb
DB_PASSWORD=sua_senha_mongodb
DB_NAME=nome_do_banco
```

### 2. Testar Conexão Local

```bash
# No diretório back/
npm start
```

### 3. Verificar Logs do Vercel

Após deploy, verificar logs para confirmar conexão:
```
✅ Banco de dados conectado com sucesso!
🔧 Conexão MongoDB estabelecida em ambiente Vercel serverless
```

## Comandos para Deploy

```bash
# 1. Configurar variáveis de ambiente no Vercel
vercel env add DB_USER
vercel env add DB_PASSWORD  
vercel env add DB_NAME

# 2. Deploy
vercel --prod
```

## Troubleshooting

### Erro Persiste Após Configuração

1. **Verificar credenciais**: Username/password corretos
2. **Verificar nome do banco**: DB_NAME corresponde ao banco real
3. **Aguardar propagação**: IP whitelist pode levar alguns minutos
4. **Verificar cluster**: Cluster ativo e acessível

### Logs Úteis

```javascript
// Debug adicional se necessário
console.log('MongoDB URI:', MONGO_URI.replace(/\/\/.*@/, '//***:***@'));
console.log('Ambiente Vercel:', !!process.env.VERCEL);
```

## Referências

- [MongoDB Atlas + Vercel Integration](https://www.mongodb.com/docs/atlas/reference/partner-integrations/vercel/)
- [Vercel Dynamic IPs](https://vercel.com/guides/can-i-get-a-fixed-ip-address)
- [MongoDB Atlas IP Whitelist](https://www.mongodb.com/docs/atlas/security-whitelist/)