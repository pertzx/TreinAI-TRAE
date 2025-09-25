import redis from 'redis';

class RedisCache {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.maxCacheSize = parseInt(process.env.MAX_CACHE_SIZE) || 1000;
    this.defaultTTL = parseInt(process.env.CACHE_TTL) || 3600; // 1 hora em segundos
  }

  async connect() {
    try {
      // Configuração do Redis - pode ser local ou remoto
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
      };

      this.client = redis.createClient(redisConfig);

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('✅ Redis conectado com sucesso');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        console.log('✅ Redis pronto para uso');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        console.log('❌ Conexão Redis encerrada');
        this.isConnected = false;
      });

      await this.client.connect();
      return true;
    } catch (error) {
      console.error('❌ Erro ao conectar com Redis:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
      console.log('Redis desconectado');
    }
  }

  // Gerar chave única para cache
  generateCacheKey(prefix, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${prefix}:${Buffer.from(sortedParams).toString('base64')}`;
  }

  // Buscar dados do cache
  async get(key) {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const data = await this.client.get(key);
      if (data) {
        const parsed = JSON.parse(data);
        console.log(`📦 Cache HIT: ${key}`);
        return parsed;
      }
      console.log(`❌ Cache MISS: ${key}`);
      return null;
    } catch (error) {
      console.error('Erro ao buscar cache:', error);
      return null;
    }
  }

  // Salvar dados no cache
  async set(key, data, ttl = null) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const serialized = JSON.stringify(data);
      const expiration = ttl || this.defaultTTL;
      
      await this.client.setEx(key, expiration, serialized);
      console.log(`💾 Cache SET: ${key} (TTL: ${expiration}s)`);
      
      // Verificar e limpar cache se necessário
      await this.cleanupIfNeeded();
      
      return true;
    } catch (error) {
      console.error('Erro ao salvar cache:', error);
      return false;
    }
  }

  // Remover chave específica do cache
  async delete(key) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.del(key);
      console.log(`🗑️ Cache DELETE: ${key}`);
      return true;
    } catch (error) {
      console.error('Erro ao deletar cache:', error);
      return false;
    }
  }

  // Limpar cache por padrão
  async deletePattern(pattern) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        console.log(`🗑️ Cache DELETE PATTERN: ${pattern} (${keys.length} chaves)`);
      }
      return true;
    } catch (error) {
      console.error('Erro ao deletar padrão de cache:', error);
      return false;
    }
  }

  // Limpar todo o cache
  async flush() {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.flushDb();
      console.log('🗑️ Cache completamente limpo');
      return true;
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      return false;
    }
  }

  // Verificar tamanho do cache e limpar se necessário
  async cleanupIfNeeded() {
    if (!this.isConnected || !this.client) {
      return;
    }

    try {
      const info = await this.client.info('keyspace');
      const dbInfo = info.match(/db0:keys=(\d+)/);
      
      if (dbInfo && parseInt(dbInfo[1]) > this.maxCacheSize) {
        console.log(`🧹 Limpeza de cache necessária (${dbInfo[1]} > ${this.maxCacheSize})`);
        
        // Remover chaves mais antigas (estratégia LRU simples)
        const keys = await this.client.keys('*');
        const keysToDelete = keys.slice(0, Math.floor(keys.length * 0.2)); // Remove 20% das chaves
        
        if (keysToDelete.length > 0) {
          await this.client.del(keysToDelete);
          console.log(`🧹 ${keysToDelete.length} chaves antigas removidas`);
        }
      }
    } catch (error) {
      console.error('Erro na limpeza de cache:', error);
    }
  }

  // Obter estatísticas do cache
  async getStats() {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const info = await this.client.info('keyspace');
      const memory = await this.client.info('memory');
      
      return {
        connected: this.isConnected,
        keys: info.match(/db0:keys=(\d+)/) ? parseInt(info.match(/db0:keys=(\d+)/)[1]) : 0,
        memory: memory.match(/used_memory_human:(.+)/) ? memory.match(/used_memory_human:(.+)/)[1].trim() : 'N/A',
        maxCacheSize: this.maxCacheSize,
        defaultTTL: this.defaultTTL
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return null;
    }
  }

  // Verificar se está conectado
  isReady() {
    return this.isConnected && this.client;
  }
}

// Instância singleton
const redisCache = new RedisCache();

export default redisCache;