# Configuração da Google Maps API Key

## Como obter a API Key do Google Maps

### 1. Acesse o Google Cloud Console
- Vá para: https://console.cloud.google.com/
- Faça login com sua conta Google

### 2. Crie ou selecione um projeto
- Se não tiver um projeto, clique em "Criar Projeto"
- Dê um nome ao projeto (ex: "TreinAI-Maps")
- Selecione o projeto criado

### 3. Ative a API do Google Maps
- No menu lateral, vá em "APIs e Serviços" > "Biblioteca"
- Procure por "Maps Embed API"
- Clique na API e depois em "Ativar"

### 4. Crie as credenciais
- Vá em "APIs e Serviços" > "Credenciais"
- Clique em "Criar Credenciais" > "Chave de API"
- Sua API Key será gerada

### 5. Configure as restrições (IMPORTANTE para segurança)
- Clique na API Key criada para editá-la
- Em "Restrições de aplicativo", selecione "Referenciadores HTTP (sites)"
- Adicione seus domínios:
  - `localhost:5173/*` (desenvolvimento)
  - `localhost:4173/*` (preview)
  - `seu-dominio.com/*` (produção)
- Em "Restrições de API", selecione "Restringir chave"
- Escolha "Maps Embed API"
- Clique em "Salvar"

### 6. Configure no projeto
1. Copie a API Key gerada
2. Abra o arquivo `front/.env`
3. Substitua `YOUR_GOOGLE_MAPS_API_KEY_HERE` pela sua API Key:
   ```
   VITE_GOOGLE_MAPS_API_KEY=sua_api_key_aqui
   ```
4. Reinicie o servidor de desenvolvimento:
   ```bash
   cd front
   npm run dev
   ```

## Custos e Limites

### Plano Gratuito
- **$200 em créditos gratuitos por mês**
- Maps Embed API: **Gratuita** (sem limite de requisições)
- Ideal para a maioria dos projetos pequenos e médios

### Monitoramento
- Acesse "APIs e Serviços" > "Cotas" para monitorar o uso
- Configure alertas de cobrança se necessário

## Segurança

### ✅ Boas Práticas Implementadas
- API Key configurada como variável de ambiente
- Restrições de domínio configuradas
- Uso da Maps Embed API (gratuita)

### ⚠️ Importante
- **NUNCA** commite a API Key no código
- **SEMPRE** use restrições de domínio
- **MONITORE** o uso regularmente

## Troubleshooting

### Erro: "This API project is not authorized to use this API"
- Verifique se a Maps Embed API está ativada no projeto
- Confirme se está usando o projeto correto

### Erro: "The provided API key is invalid"
- Verifique se a API Key foi copiada corretamente
- Confirme se as restrições de domínio incluem seu localhost

### Mapas não carregam
- Abra o DevTools (F12) e verifique erros no console
- Confirme se a variável de ambiente está sendo carregada
- Teste com `console.log(import.meta.env.VITE_GOOGLE_MAPS_API_KEY)`

## Configuração para Produção

### Vercel
1. Vá nas configurações do projeto no Vercel
2. Adicione a variável de ambiente:
   - Name: `VITE_GOOGLE_MAPS_API_KEY`
   - Value: sua_api_key_aqui
3. Redeploy o projeto

### Netlify
1. Vá em Site Settings > Environment Variables
2. Adicione a variável:
   - Key: `VITE_GOOGLE_MAPS_API_KEY`
   - Value: sua_api_key_aqui
3. Redeploy o projeto

## Links Úteis
- [Google Cloud Console](https://console.cloud.google.com/)
- [Documentação Maps Embed API](https://developers.google.com/maps/documentation/embed)
- [Preços Google Maps](https://cloud.google.com/maps-platform/pricing)