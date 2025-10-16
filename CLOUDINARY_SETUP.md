# Configuração do Cloudinary para Produção

Este documento descreve como configurar o Cloudinary para gerenciar uploads de imagens e vídeos em produção.

## Pré-requisitos

1. Conta no Cloudinary (gratuita disponível)
2. Variáveis de ambiente configuradas no Vercel

## Configuração

### 1. Criar conta no Cloudinary

1. Acesse [cloudinary.com](https://cloudinary.com)
2. Crie uma conta gratuita
3. Acesse o Dashboard para obter suas credenciais

### 2. Configurar variáveis de ambiente

No painel do Vercel, adicione as seguintes variáveis de ambiente:

```
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret
```

### 3. Funcionalidades implementadas

- **Upload automático**: Em produção (Vercel), todos os uploads são enviados automaticamente para o Cloudinary
- **Otimização**: Imagens são automaticamente otimizadas (qualidade 80%, formato auto)
- **Suporte a vídeos**: Uploads de vídeos também são suportados
- **Limpeza**: Arquivos antigos são removidos automaticamente do Cloudinary quando substituídos
- **Fallback**: Em desenvolvimento, os arquivos continuam sendo salvos localmente

### 4. Tipos de arquivo suportados

#### Imagens
- Formatos: JPEG, PNG, WebP, GIF
- Tamanho máximo: 5MB
- Otimização automática aplicada

#### Vídeos
- Formatos: MP4, WebM, MOV
- Tamanho máximo: 50MB
- Compressão automática aplicada

### 5. Estrutura de pastas no Cloudinary

Os arquivos são organizados automaticamente em pastas:
- `image-perfil/`: Fotos de perfil dos usuários
- `image-profissional/`: Imagens dos profissionais
- `image-local/`: Imagens dos locais
- `midias-anuncio/`: Mídias dos anúncios

### 6. Segurança

- URLs são assinadas automaticamente
- Transformações são aplicadas no servidor
- Arquivos antigos são removidos para evitar acúmulo
- Validação de tipos de arquivo no backend

## Desenvolvimento Local

Em desenvolvimento, os arquivos continuam sendo salvos na pasta `uploads/` local. Para testar com Cloudinary em desenvolvimento, defina a variável:

```
NODE_ENV=production
```

## Monitoramento

Acesse o Dashboard do Cloudinary para:
- Monitorar uso de armazenamento
- Visualizar estatísticas de transformações
- Gerenciar arquivos manualmente se necessário

## Troubleshooting

### Erro de credenciais
Verifique se as variáveis de ambiente estão corretas no Vercel.

### Upload falha
Verifique os logs do Vercel para detalhes do erro.

### Arquivos não aparecem
Verifique se o NODE_ENV está definido como "production" no Vercel.