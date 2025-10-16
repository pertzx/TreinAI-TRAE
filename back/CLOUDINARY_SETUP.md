# Configuração do Cloudinary para TreinAI

## Visão Geral

O Cloudinary foi integrado ao TreinAI para resolver o problema de uploads de arquivos em ambiente serverless (Vercel). Como o Vercel possui um sistema de arquivos somente leitura, não é possível salvar arquivos diretamente no servidor. O Cloudinary oferece uma solução robusta para armazenamento de mídia na nuvem.

## Problema Resolvido

**Erro Original:**
```
ENOENT: no such file or directory, mkdir '/var/task/uploads/image-perfil'
```

**Causa:** Tentativa de criar diretórios em ambiente serverless com sistema de arquivos read-only.

**Solução:** Upload temporário para `/tmp` + upload automático para Cloudinary.

## Configuração

### 1. Criar Conta no Cloudinary

1. Acesse [cloudinary.com](https://cloudinary.com)
2. Crie uma conta gratuita
3. Acesse o Dashboard para obter as credenciais

### 2. Configurar Variáveis de Ambiente

Adicione as seguintes variáveis ao seu `.env`:

```env
# Configurações do Cloudinary
CLOUDINARY_CLOUD_NAME=seu_cloud_name_aqui
CLOUDINARY_API_KEY=sua_api_key_aqui
CLOUDINARY_API_SECRET=sua_api_secret_aqui
```

### 3. Configurar no Vercel

No painel do Vercel, adicione as variáveis de ambiente:

1. Acesse seu projeto no Vercel
2. Vá em Settings > Environment Variables
3. Adicione as três variáveis do Cloudinary

## Como Funciona

### Fluxo de Upload

1. **Desenvolvimento Local:**
   - Arquivos são salvos normalmente em `uploads/`
   - Não há upload para Cloudinary

2. **Produção (Vercel):**
   - Arquivos são salvos temporariamente em `/tmp/`
   - Middleware `autoUploadToCloudinary` faz upload para Cloudinary
   - Arquivo temporário é removido após upload bem-sucedido
   - `req.file` é atualizado com URL do Cloudinary

### Estrutura de Pastas no Cloudinary

- `treinai-perfis/` - Imagens de perfil de usuários
- `treinai-profissionais/` - Imagens de profissionais
- `treinai-anuncios/` - Mídias de anúncios
- `treinai-locais/` - Imagens de locais
- `treinai-pagamentos/` - Imagens relacionadas a pagamentos

## Arquivos Modificados

### 1. `multerConfig.js`
- Detecta ambiente serverless
- Usa `/tmp/` para armazenamento temporário
- Adiciona flags `isTemporary` e `needsCloudUpload`

### 2. `cloudinaryConfig.js` (NOVO)
- Configuração do Cloudinary
- Funções de upload e deleção
- Middleware `autoUploadToCloudinary`

### 3. `authRoutes.js`
- Adicionado middleware `autoUploadToCloudinary` em todas as rotas de upload

### 4. `package.json`
- Adicionada dependência `cloudinary: ^2.5.1`

## Uso nos Controllers

Após o upload, o arquivo estará disponível em `req.file` com as seguintes propriedades:

```javascript
// Desenvolvimento local
req.file = {
  filename: 'arquivo.jpg',
  path: 'uploads/image-perfil/arquivo.jpg',
  url: undefined, // não há URL externa
  cloudinary: undefined
}

// Produção (Vercel + Cloudinary)
req.file = {
  filename: 'arquivo.jpg',
  path: '/tmp/arquivo.jpg', // temporário
  url: 'https://res.cloudinary.com/seu-cloud/image/upload/v123/arquivo.jpg',
  cloudinary: {
    success: true,
    url: 'https://res.cloudinary.com/seu-cloud/image/upload/v123/arquivo.jpg',
    public_id: 'treinai-perfis/arquivo',
    // ... outras propriedades
  }
}
```

## Segurança

### Configurações Aplicadas

- **Secure URLs:** Sempre HTTPS
- **Auto-optimization:** Qualidade automática
- **Auto-format:** Formato otimizado automaticamente
- **Unique filenames:** Evita conflitos de nomes
- **Folder organization:** Separação por tipo de conteúdo

### Validações

- Tipos de arquivo validados pelo multer
- Tamanho máximo controlado
- Rate limiting nas rotas de upload
- Headers de segurança aplicados

## Monitoramento

### Logs Importantes

```javascript
// Upload iniciado
[Cloudinary] Iniciando upload: /tmp/arquivo.jpg

// Upload concluído
[Cloudinary] Upload concluído: treinai-perfis/arquivo

// Arquivo temporário removido
[Cloudinary] Arquivo temporário removido: /tmp/arquivo.jpg

// Erro no upload
[Cloudinary] Erro no upload: mensagem de erro
```

### Métricas no Cloudinary

- Acesse o Dashboard do Cloudinary
- Monitore uso de bandwidth
- Verifique transformações aplicadas
- Acompanhe storage utilizado

## Troubleshooting

### Erro: "Must supply api_key"

**Causa:** Variáveis de ambiente não configuradas.

**Solução:**
1. Verifique se as variáveis estão no `.env`
2. Reinicie o servidor local
3. No Vercel, verifique as Environment Variables

### Erro: "Upload failed"

**Causa:** Problemas de conectividade ou configuração.

**Solução:**
1. Verifique as credenciais do Cloudinary
2. Teste a conectividade com a API
3. Verifique logs detalhados

### Arquivos não aparecem no Cloudinary

**Causa:** Middleware não está sendo executado.

**Solução:**
1. Verifique se `autoUploadToCloudinary` está nas rotas
2. Confirme que `needsCloudUpload` está sendo definido
3. Verifique logs do servidor

## Custos

### Plano Gratuito Cloudinary

- **Storage:** 25GB
- **Bandwidth:** 25GB/mês
- **Transformações:** 25.000/mês
- **Requests:** Ilimitadas

### Otimizações de Custo

- Compressão automática ativada
- Formato otimizado automaticamente
- Qualidade automática para reduzir tamanho
- Limpeza automática de arquivos temporários

## Backup e Recuperação

### Backup Automático

O Cloudinary mantém backups automáticos dos arquivos. Para recuperação:

1. Acesse o Media Library no Dashboard
2. Use a API para listar arquivos por pasta
3. Download em lote se necessário

### Migração de Dados

Para migrar arquivos existentes:

```javascript
// Script de migração (executar localmente)
import { uploadToCloudinary } from './utils/cloudinaryConfig.js';
import fs from 'fs';
import path from 'path';

const migrateFolder = async (localFolder, cloudinaryFolder) => {
  const files = fs.readdirSync(localFolder);
  
  for (const file of files) {
    const filePath = path.join(localFolder, file);
    await uploadToCloudinary(filePath, { folder: cloudinaryFolder });
  }
};
```

## Próximos Passos

1. **Instalar dependência:** `npm install cloudinary`
2. **Configurar variáveis de ambiente**
3. **Testar uploads em desenvolvimento**
4. **Deploy para Vercel**
5. **Verificar funcionamento em produção**
6. **Monitorar uso e performance**

## Suporte

- **Documentação Cloudinary:** [cloudinary.com/documentation](https://cloudinary.com/documentation)
- **API Reference:** [cloudinary.com/documentation/node_integration](https://cloudinary.com/documentation/node_integration)
- **Status Page:** [status.cloudinary.com](https://status.cloudinary.com)