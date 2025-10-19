# SendEmail Utility - Documentação

## Visão Geral

O módulo `sendEmail.js` fornece uma solução robusta e segura para envio de emails no projeto TreinAI. Implementa validação rigorosa, tratamento de erros, logging detalhado e medidas de segurança contra vulnerabilidades comuns.

## Características Principais

- ✅ **Validação robusta** de emails e mensagens
- 🔒 **Segurança avançada** com prevenção XSS e sanitização
- 📊 **Logging detalhado** para monitoramento e debug
- ⚡ **Performance otimizada** com timeouts configuráveis
- 🛡️ **Tratamento de erros** estruturado e informativo
- 📧 **Suporte a HTML** e anexos
- 🚫 **Bloqueio de emails temporários**

## Configuração

### Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env`:

```env
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-app-password-do-gmail
```

**⚠️ Importante:** Para Gmail, use uma App Password, não sua senha normal.

### Dependências Necessárias

```bash
npm install nodemailer
```

## Uso Básico

### Importação

```javascript
import { sendEmail, sendNotificationEmail, testEmailConfiguration } from './utils/sendEmail.js';
```

### Exemplo Simples

```javascript
const result = await sendEmail(
  'usuario@exemplo.com',
  'Olá! Esta é uma mensagem de teste do TreinAI.'
);

if (result.success) {
  console.log('Email enviado com sucesso!', result.messageId);
} else {
  console.error('Erro no envio:', result.error.message);
}
```

### Exemplo com Opções Avançadas

```javascript
const result = await sendEmail(
  'usuario@exemplo.com',
  'Mensagem importante sobre sua conta.',
  {
    subject: 'Atualização de Conta - TreinAI',
    from: 'suporte@treinai.com',
    html: `
      <h2>Atualização Importante</h2>
      <p>Sua conta foi atualizada com sucesso!</p>
      <p><strong>Data:</strong> ${new Date().toLocaleDateString()}</p>
    `,
    attachments: [
      {
        filename: 'relatorio.pdf',
        path: './uploads/relatorio.pdf'
      }
    ]
  }
);
```

### Email de Notificação do Sistema

```javascript
const result = await sendNotificationEmail(
  'admin@treinai.com',
  'Novo Usuário Registrado',
  'Um novo usuário se registrou na plataforma TreinAI.'
);
```

### Teste de Configuração

```javascript
const testResult = await testEmailConfiguration();

if (testResult.success) {
  console.log('Configuração de email válida!');
} else {
  console.error('Erro na configuração:', testResult.error);
}
```

## Estrutura de Resposta

### Sucesso

```javascript
{
  success: true,
  messageId: '<unique-message-id@gmail.com>',
  response: '250 2.0.0 OK',
  envelope: {
    from: 'remetente@gmail.com',
    to: ['destinatario@exemplo.com']
  },
  duration: 1250,
  timestamp: '2024-01-15T10:30:00.000Z'
}
```

### Erro

```javascript
{
  success: false,
  error: {
    message: 'Formato de email inválido',
    code: 'VALIDATION_ERROR',
    field: 'email',
    timestamp: '2024-01-15T10:30:00.000Z',
    duration: 50
  }
}
```

## Códigos de Erro

| Código | Descrição | Campo |
|--------|-----------|-------|
| `VALIDATION_ERROR` | Erro de validação de entrada | `email` ou `message` |
| `CONFIG_ERROR` | Erro na configuração do transporter | - |
| `SMTP_CONNECTION_ERROR` | Erro na conexão SMTP | - |
| `UNKNOWN_ERROR` | Erro não categorizado | - |

## Validações Implementadas

### Email
- ✅ Formato válido (RFC 5322)
- ✅ Comprimento máximo (254 caracteres)
- ✅ Sanitização (trim, lowercase)
- ✅ Prevenção XSS (caracteres perigosos)
- ✅ Bloqueio de domínios temporários
- ✅ Verificação de tipo (string)

### Mensagem
- ✅ Comprimento máximo (10.000 caracteres)
- ✅ Sanitização HTML (escape de caracteres)
- ✅ Verificação de tipo (string)
- ✅ Prevenção de mensagens vazias

## Segurança

### Medidas Implementadas

1. **Prevenção XSS**: Escape de caracteres HTML perigosos
2. **Validação rigorosa**: Múltiplas camadas de validação
3. **TLS seguro**: Versão mínima TLSv1.2
4. **Timeouts**: Prevenção de ataques de negação de serviço
5. **Logging seguro**: Mascaramento de dados sensíveis
6. **Domínios temporários**: Bloqueio de emails descartáveis

### Configurações de Segurança SMTP

```javascript
{
  tls: {
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2'
  },
  connectionTimeout: 60000,
  greetingTimeout: 30000,
  socketTimeout: 60000
}
```

## Exemplos de Integração

### Controller de Contato

```javascript
// controllers/contactController.js
import { sendEmail } from '../utils/sendEmail.js';

export const sendContactMessage = async (req, res) => {
  try {
    const { email, message, subject } = req.body;
    
    const result = await sendEmail(email, message, {
      subject: subject || 'Mensagem de Contato - TreinAI',
      from: 'contato@treinai.com'
    });
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Email enviado com sucesso!',
        messageId: result.messageId
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error.message
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};
```

### Middleware de Notificação

```javascript
// middleware/emailNotification.js
import { sendNotificationEmail } from '../utils/sendEmail.js';

export const notifyAdminNewUser = async (userData) => {
  const message = `
    Novo usuário registrado:
    - Nome: ${userData.name}
    - Email: ${userData.email}
    - Data: ${new Date().toLocaleString()}
  `;
  
  await sendNotificationEmail(
    process.env.ADMIN_EMAIL,
    'Novo Usuário Registrado',
    message
  );
};
```

## Monitoramento e Logs

### Logs de Sucesso
```
[sendEmail] Iniciando envio de email para: use***
[sendEmail] Conexão SMTP verificada com sucesso
[sendEmail] Enviando email...
[sendEmail] Email enviado com sucesso em 1250ms. MessageId: <id@gmail.com>
```

### Logs de Erro
```
[sendEmail] Erro de validação de email: Formato de email inválido
[sendEmail] Erro no envio de email após 50ms: { message: '...', code: 'VALIDATION_ERROR' }
```

## Troubleshooting

### Problemas Comuns

1. **"Configurações de email não encontradas"**
   - Verifique se `EMAIL_USER` e `EMAIL_PASS` estão no `.env`

2. **"Erro na conexão SMTP"**
   - Verifique se a App Password do Gmail está correta
   - Confirme se a autenticação de 2 fatores está ativada

3. **"Email contém caracteres não permitidos"**
   - O email contém caracteres potencialmente perigosos
   - Verifique se não há tentativas de XSS

4. **"Emails temporários não são permitidos"**
   - O domínio está na lista de emails descartáveis
   - Use um email permanente

### Debug

Para debug detalhado, monitore os logs do console que incluem:
- Tempo de execução
- IDs de mensagem
- Códigos de erro específicos
- Stack traces (em desenvolvimento)

## Performance

### Métricas Típicas
- **Validação**: ~5-10ms
- **Conexão SMTP**: ~200-500ms
- **Envio**: ~800-1500ms
- **Total**: ~1000-2000ms

### Otimizações
- Reutilização de conexões SMTP
- Timeouts configuráveis
- Validação eficiente
- Logging assíncrono

## Contribuição

Para contribuir com melhorias:

1. Mantenha a compatibilidade com a API existente
2. Adicione testes para novas funcionalidades
3. Documente mudanças significativas
4. Siga os padrões de segurança estabelecidos

## Changelog

### v1.0.0 (2024-01-15)
- ✅ Implementação inicial
- ✅ Validação robusta de emails e mensagens
- ✅ Tratamento de erros estruturado
- ✅ Logging detalhado
- ✅ Medidas de segurança XSS
- ✅ Suporte a HTML e anexos
- ✅ Função de teste de configuração