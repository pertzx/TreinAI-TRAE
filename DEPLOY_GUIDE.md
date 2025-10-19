# Guia de Deploy - TreinAI Sistema de Tokens

## 🚀 Visão Geral

Este guia fornece instruções completas para deploy seguro do sistema TreinAI com as implementações de segurança mais recentes.

## 📋 Pré-requisitos

### Ambiente de Produção
- **Node.js**: v18.0.0 ou superior
- **MongoDB**: v5.0 ou superior
- **Nginx**: v1.20 ou superior (recomendado)
- **PM2**: Para gerenciamento de processos
- **SSL Certificate**: Para HTTPS obrigatório

### Ferramentas de Desenvolvimento
- **Git**: Para controle de versão
- **npm**: v8.0.0 ou superior
- **curl**: Para testes de API

## 🔧 Configuração do Ambiente

### 1. Preparação do Servidor

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2 globalmente
sudo npm install -g pm2

# Instalar MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Instalar Nginx
sudo apt install nginx -y
```

### 2. Configuração do MongoDB

```bash
# Iniciar MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Configurar usuário administrativo
mongo
> use admin
> db.createUser({
    user: "admin",
    pwd: "sua_senha_segura",
    roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase"]
  })
> exit

# Habilitar autenticação
sudo nano /etc/mongod.conf
# Adicionar:
# security:
#   authorization: enabled

sudo systemctl restart mongod
```

### 3. Configuração do Nginx

```nginx
# /etc/nginx/sites-available/treinai
server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seu-dominio.com www.seu-dominio.com;

    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Frontend
    location / {
        root /var/www/treinai/frontend;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
    }
}

# Rate limiting configuration
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
}
```

## 🏗️ Deploy do Backend

### 1. Preparação do Código

```bash
# Clonar repositório
git clone <repository-url> /opt/treinai
cd /opt/treinai

# Instalar dependências do backend
cd back
npm install --production

# Criar diretórios necessários
mkdir -p logs uploads temp
chmod 755 logs uploads temp
```

### 2. Configuração de Ambiente

```bash
# Criar arquivo de configuração
cp .env.example .env
nano .env
```

```env
# .env - Configuração de Produção
NODE_ENV=production
PORT=3000

# Database
MONGODB_URI=mongodb://admin:sua_senha@localhost:27017/treinai?authSource=admin

# JWT
JWT_SECRET=sua_chave_jwt_super_segura_com_pelo_menos_32_caracteres
JWT_EXPIRES_IN=24h

# Stripe
STRIPE_SECRET_KEY=sk_live_sua_chave_stripe
STRIPE_WEBHOOK_SECRET=whsec_sua_webhook_secret

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
TOKEN_RATE_LIMIT_MAX=5
PAYMENT_RATE_LIMIT_MAX=3

# File Upload
MAX_FILE_SIZE=5242880
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp
UPLOAD_PATH=/opt/treinai/uploads

# Logs
LOG_LEVEL=info
SECURITY_LOG_ENABLED=true
AUDIT_LOG_ENABLED=true

# CORS
FRONTEND_URL=https://seu-dominio.com
ALLOWED_ORIGINS=https://seu-dominio.com,https://www.seu-dominio.com

# Email (se aplicável)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua_senha_app
```

### 3. Configuração do PM2

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'treinai-backend',
    script: './server.js',
    cwd: '/opt/treinai/back',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/opt/treinai/logs/backend-error.log',
    out_file: '/opt/treinai/logs/backend-out.log',
    log_file: '/opt/treinai/logs/backend-combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    
    // Auto restart on file changes (disable in production)
    watch: false,
    
    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    
    // Health check
    health_check_grace_period: 10000,
    
    // Log rotation
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Environment specific
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

### 4. Inicialização do Backend

```bash
# Testar configuração
npm run test:config

# Iniciar com PM2
pm2 start ecosystem.config.js --env production

# Salvar configuração PM2
pm2 save

# Configurar auto-start
pm2 startup
# Executar o comando sugerido pelo PM2

# Verificar status
pm2 status
pm2 logs treinai-backend
```

## 🎨 Deploy do Frontend

### 1. Build de Produção

```bash
cd /opt/treinai/front

# Instalar dependências
npm install

# Configurar variáveis de ambiente
echo "VITE_API_URL=https://seu-dominio.com/api" > .env.production
echo "VITE_STRIPE_PUBLIC_KEY=pk_live_sua_chave_publica" >> .env.production

# Build para produção
npm run build

# Copiar arquivos para Nginx
sudo cp -r dist/* /var/www/treinai/frontend/
sudo chown -R www-data:www-data /var/www/treinai/frontend/
sudo chmod -R 755 /var/www/treinai/frontend/
```

### 2. Otimizações de Performance

```bash
# Comprimir arquivos estáticos
cd /var/www/treinai/frontend

# Gzip
find . -type f \( -name "*.js" -o -name "*.css" -o -name "*.html" \) -exec gzip -k {} \;

# Brotli (se disponível)
find . -type f \( -name "*.js" -o -name "*.css" -o -name "*.html" \) -exec brotli -k {} \;
```

## 🔒 Configurações de Segurança

### 1. Firewall

```bash
# Configurar UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Verificar status
sudo ufw status verbose
```

### 2. Fail2Ban

```bash
# Instalar Fail2Ban
sudo apt install fail2ban -y

# Configurar para Nginx
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
action = iptables-multiport[name=ReqLimit, port="http,https", protocol=tcp]
logpath = /var/log/nginx/error.log
findtime = 600
bantime = 7200
maxretry = 10
```

### 3. Monitoramento de Logs

```bash
# Configurar logrotate
sudo nano /etc/logrotate.d/treinai
```

```
/opt/treinai/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        pm2 reloadLogs
    endscript
}
```

## 📊 Monitoramento e Saúde

### 1. Health Checks

```bash
# Script de health check
cat > /opt/treinai/scripts/health-check.sh << 'EOF'
#!/bin/bash

# Verificar backend
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)
if [ "$BACKEND_STATUS" != "200" ]; then
    echo "Backend não está respondendo: $BACKEND_STATUS"
    pm2 restart treinai-backend
fi

# Verificar MongoDB
MONGO_STATUS=$(mongo --eval "db.adminCommand('ismaster')" --quiet)
if [ $? -ne 0 ]; then
    echo "MongoDB não está respondendo"
    sudo systemctl restart mongod
fi

# Verificar espaço em disco
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "Espaço em disco baixo: ${DISK_USAGE}%"
fi

# Verificar logs de erro
ERROR_COUNT=$(tail -n 100 /opt/treinai/logs/backend-error.log | wc -l)
if [ "$ERROR_COUNT" -gt 10 ]; then
    echo "Muitos erros detectados: $ERROR_COUNT"
fi
EOF

chmod +x /opt/treinai/scripts/health-check.sh

# Adicionar ao crontab
echo "*/5 * * * * /opt/treinai/scripts/health-check.sh >> /opt/treinai/logs/health-check.log 2>&1" | crontab -
```

### 2. Métricas e Alertas

```bash
# Script de métricas
cat > /opt/treinai/scripts/metrics.sh << 'EOF'
#!/bin/bash

# CPU e Memória
echo "=== Métricas do Sistema ===" >> /opt/treinai/logs/metrics.log
echo "Data: $(date)" >> /opt/treinai/logs/metrics.log
echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)" >> /opt/treinai/logs/metrics.log
echo "Memória: $(free | grep Mem | awk '{printf "%.2f%%", $3/$2 * 100.0}')" >> /opt/treinai/logs/metrics.log

# PM2 Status
pm2 jlist >> /opt/treinai/logs/pm2-status.log

# Conexões ativas
echo "Conexões: $(netstat -an | grep :3000 | grep ESTABLISHED | wc -l)" >> /opt/treinai/logs/metrics.log
echo "---" >> /opt/treinai/logs/metrics.log
EOF

chmod +x /opt/treinai/scripts/metrics.sh

# Executar a cada 15 minutos
echo "*/15 * * * * /opt/treinai/scripts/metrics.sh" | crontab -
```

## 🔄 Backup e Recuperação

### 1. Backup Automático

```bash
# Script de backup
cat > /opt/treinai/scripts/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/backups/treinai"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup do código
tar -czf $BACKUP_DIR/code_$DATE.tar.gz -C /opt treinai

# Backup do MongoDB
mongodump --uri="mongodb://admin:sua_senha@localhost:27017/treinai?authSource=admin" --out $BACKUP_DIR/db_$DATE

# Backup dos uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz -C /opt/treinai uploads

# Limpar backups antigos (manter últimos 7 dias)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "db_*" -mtime +7 -exec rm -rf {} \;

echo "Backup concluído: $DATE"
EOF

chmod +x /opt/treinai/scripts/backup.sh

# Backup diário às 2h da manhã
echo "0 2 * * * /opt/treinai/scripts/backup.sh >> /opt/treinai/logs/backup.log 2>&1" | crontab -
```

### 2. Procedimento de Recuperação

```bash
# Script de recuperação
cat > /opt/treinai/scripts/restore.sh << 'EOF'
#!/bin/bash

if [ -z "$1" ]; then
    echo "Uso: $0 <data_backup> (formato: YYYYMMDD_HHMMSS)"
    exit 1
fi

BACKUP_DATE=$1
BACKUP_DIR="/opt/backups/treinai"

echo "Iniciando recuperação do backup: $BACKUP_DATE"

# Parar aplicação
pm2 stop treinai-backend

# Restaurar código
if [ -f "$BACKUP_DIR/code_$BACKUP_DATE.tar.gz" ]; then
    cd /opt
    tar -xzf $BACKUP_DIR/code_$BACKUP_DATE.tar.gz
    echo "Código restaurado"
fi

# Restaurar banco de dados
if [ -d "$BACKUP_DIR/db_$BACKUP_DATE" ]; then
    mongorestore --uri="mongodb://admin:sua_senha@localhost:27017/treinai?authSource=admin" --drop $BACKUP_DIR/db_$BACKUP_DATE/treinai
    echo "Banco de dados restaurado"
fi

# Restaurar uploads
if [ -f "$BACKUP_DIR/uploads_$BACKUP_DATE.tar.gz" ]; then
    cd /opt/treinai
    tar -xzf $BACKUP_DIR/uploads_$BACKUP_DATE.tar.gz
    echo "Uploads restaurados"
fi

# Reiniciar aplicação
pm2 start treinai-backend

echo "Recuperação concluída!"
EOF

chmod +x /opt/treinai/scripts/restore.sh
```

## 🧪 Testes de Produção

### 1. Testes de Funcionalidade

```bash
# Script de testes
cat > /opt/treinai/scripts/production-tests.sh << 'EOF'
#!/bin/bash

API_URL="https://seu-dominio.com/api"

echo "=== Testes de Produção ==="

# Teste de health check
echo "1. Testando health check..."
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/health)
if [ "$HEALTH" = "200" ]; then
    echo "✅ Health check OK"
else
    echo "❌ Health check falhou: $HEALTH"
fi

# Teste de autenticação
echo "2. Testando autenticação..."
AUTH=$(curl -s -o /dev/null -w "%{http_code}" -X POST $API_URL/auth/login -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"wrongpass"}')
if [ "$AUTH" = "401" ]; then
    echo "✅ Autenticação rejeitando credenciais inválidas"
else
    echo "❌ Problema na autenticação: $AUTH"
fi

# Teste de rate limiting
echo "3. Testando rate limiting..."
for i in {1..6}; do
    RATE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/verificar-tokens/invalid)
done
if [ "$RATE" = "429" ]; then
    echo "✅ Rate limiting funcionando"
else
    echo "⚠️  Rate limiting pode não estar funcionando: $RATE"
fi

# Teste de HTTPS
echo "4. Testando HTTPS..."
HTTPS=$(curl -s -o /dev/null -w "%{http_code}" https://seu-dominio.com)
if [ "$HTTPS" = "200" ]; then
    echo "✅ HTTPS funcionando"
else
    echo "❌ Problema com HTTPS: $HTTPS"
fi

echo "=== Testes concluídos ==="
EOF

chmod +x /opt/treinai/scripts/production-tests.sh
```

### 2. Testes de Performance

```bash
# Instalar Apache Bench
sudo apt install apache2-utils -y

# Teste de carga básico
ab -n 1000 -c 10 https://seu-dominio.com/api/health

# Teste de carga na API de tokens
ab -n 100 -c 5 -H "Authorization: Bearer seu_token_jwt" https://seu-dominio.com/api/verificar-tokens/user_id
```

## 🚨 Troubleshooting

### Problemas Comuns

#### 1. Backend não inicia
```bash
# Verificar logs
pm2 logs treinai-backend

# Verificar configuração
node -c server.js

# Verificar porta
netstat -tulpn | grep :3000
```

#### 2. MongoDB não conecta
```bash
# Verificar status
sudo systemctl status mongod

# Testar conexão
mongo --host localhost --port 27017 -u admin -p

# Verificar logs
sudo tail -f /var/log/mongodb/mongod.log
```

#### 3. Nginx não serve arquivos
```bash
# Verificar configuração
sudo nginx -t

# Verificar logs
sudo tail -f /var/log/nginx/error.log

# Verificar permissões
ls -la /var/www/treinai/frontend/
```

#### 4. SSL não funciona
```bash
# Verificar certificado
openssl x509 -in /path/to/certificate.crt -text -noout

# Testar SSL
openssl s_client -connect seu-dominio.com:443

# Renovar Let's Encrypt (se aplicável)
sudo certbot renew
```

## 📈 Otimizações de Performance

### 1. Cache Redis (Opcional)

```bash
# Instalar Redis
sudo apt install redis-server -y

# Configurar Redis
sudo nano /etc/redis/redis.conf
# Descomentar: requirepass sua_senha_redis

# Reiniciar Redis
sudo systemctl restart redis-server
```

### 2. CDN para Assets Estáticos

```javascript
// Configuração no frontend para CDN
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name].[hash][extname]'
      }
    }
  },
  define: {
    __CDN_URL__: JSON.stringify('https://cdn.seu-dominio.com')
  }
}
```

## 📋 Checklist de Deploy

### Pré-Deploy
- [ ] Código testado em ambiente de staging
- [ ] Backup do ambiente atual realizado
- [ ] Certificados SSL válidos
- [ ] Variáveis de ambiente configuradas
- [ ] Dependências atualizadas e auditadas

### Deploy
- [ ] Backend deployado e funcionando
- [ ] Frontend buildado e servido
- [ ] Nginx configurado corretamente
- [ ] PM2 gerenciando processos
- [ ] MongoDB conectado e funcionando

### Pós-Deploy
- [ ] Testes de funcionalidade executados
- [ ] Testes de performance realizados
- [ ] Monitoramento ativo
- [ ] Logs sendo coletados
- [ ] Backup automático configurado
- [ ] Health checks funcionando

## 🔧 Manutenção

### Tarefas Diárias
- Verificar logs de erro
- Monitorar métricas de performance
- Verificar status dos serviços

### Tarefas Semanais
- Revisar logs de segurança
- Verificar espaço em disco
- Atualizar dependências (se necessário)

### Tarefas Mensais
- Revisar e otimizar configurações
- Analisar métricas de uso
- Planejar atualizações de segurança

---

**Versão**: 1.0  
**Data**: Janeiro 2024  
**Autor**: Sistema TreinAI  
**Status**: ✅ Pronto para Produção