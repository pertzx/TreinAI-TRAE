import { authCookies } from './cookieUtils.js';

/**
 * Utilitário para gerenciar conexões WebSocket com autenticação
 */
class WebSocketManager {
  constructor() {
    this.connections = new Map(); // url -> WebSocket instance
    this.reconnectAttempts = new Map(); // url -> number of attempts
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000;
  }

  /**
   * Cria uma conexão WebSocket autenticada
   * @param {string} baseUrl - URL base do WebSocket (ex: ws://localhost:4000/ws)
   * @param {Object} options - Opções de configuração
   * @returns {WebSocket|null} - Instância do WebSocket ou null se falhar
   */
  connect(baseUrl, options = {}) {
    const token = authCookies.getToken();
    console.log('🔍 WebSocket: Tentando obter token...');
    console.log('🍪 Token obtido:', token);
    
    if (!token) {
      console.warn('❌ Token não encontrado para conexão WebSocket');
      console.log('🔍 Todos os cookies disponíveis:', document.cookie);
      return null;
    }

    // Adicionar token como query parameter
    const url = `${baseUrl}?token=${encodeURIComponent(token)}`;
    console.log('🔗 URL do WebSocket:', url);
    
    try {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        console.log('✅ WebSocket conectado:', baseUrl);
        this.reconnectAttempts.set(baseUrl, 0);
        options.onOpen?.(ws);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          options.onMessage?.(data, ws);
        } catch (error) {
          console.warn('Erro ao parsear mensagem WebSocket:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('❌ WebSocket desconectado:', baseUrl, event.code, event.reason);
        this.connections.delete(baseUrl);
        
        // Tentar reconectar se não foi fechamento intencional
        if (event.code !== 1000 && this.shouldReconnect(baseUrl)) {
          setTimeout(() => {
            this.reconnect(baseUrl, options);
          }, this.reconnectInterval);
        }
        
        options.onClose?.(event, ws);
      };

      ws.onerror = (error) => {
        console.error('❌ Erro WebSocket:', baseUrl, error);
        options.onError?.(error, ws);
      };

      this.connections.set(baseUrl, ws);
      return ws;

    } catch (error) {
      console.error('Erro ao criar conexão WebSocket:', error);
      return null;
    }
  }

  /**
   * Verifica se deve tentar reconectar
   * @param {string} baseUrl - URL base
   * @returns {boolean}
   */
  shouldReconnect(baseUrl) {
    const attempts = this.reconnectAttempts.get(baseUrl) || 0;
    return attempts < this.maxReconnectAttempts;
  }

  /**
   * Tenta reconectar WebSocket
   * @param {string} baseUrl - URL base
   * @param {Object} options - Opções de configuração
   */
  reconnect(baseUrl, options) {
    const attempts = this.reconnectAttempts.get(baseUrl) || 0;
    
    if (attempts >= this.maxReconnectAttempts) {
      console.warn('Máximo de tentativas de reconexão atingido para:', baseUrl);
      return;
    }

    console.log(`🔄 Tentando reconectar WebSocket (${attempts + 1}/${this.maxReconnectAttempts}):`, baseUrl);
    this.reconnectAttempts.set(baseUrl, attempts + 1);
    this.connect(baseUrl, options);
  }

  /**
   * Envia mensagem via WebSocket
   * @param {string} baseUrl - URL base
   * @param {Object} message - Mensagem a ser enviada
   * @returns {boolean} - true se enviado com sucesso
   */
  send(baseUrl, message) {
    const ws = this.connections.get(baseUrl);
    
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket não está conectado:', baseUrl);
      return false;
    }

    try {
      ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Erro ao enviar mensagem WebSocket:', error);
      return false;
    }
  }

  /**
   * Fecha conexão WebSocket
   * @param {string} baseUrl - URL base
   */
  disconnect(baseUrl) {
    const ws = this.connections.get(baseUrl);
    
    if (ws) {
      ws.close(1000, 'Desconexão intencional');
      this.connections.delete(baseUrl);
      this.reconnectAttempts.delete(baseUrl);
    }
  }

  /**
   * Fecha todas as conexões
   */
  disconnectAll() {
    this.connections.forEach((ws, baseUrl) => {
      ws.close(1000, 'Desconexão intencional');
    });
    
    this.connections.clear();
    this.reconnectAttempts.clear();
  }

  /**
   * Verifica se WebSocket está conectado
   * @param {string} baseUrl - URL base
   * @returns {boolean}
   */
  isConnected(baseUrl) {
    const ws = this.connections.get(baseUrl);
    return ws && ws.readyState === WebSocket.OPEN;
  }

  /**
   * Obtém o estado da conexão WebSocket
   * @param {string} baseUrl - URL base
   * @returns {string}
   */
  getConnectionState(baseUrl) {
    const ws = this.connections.get(baseUrl);
    if (!ws) return 'disconnected';
    
    switch (ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'disconnected';
      default: return 'unknown';
    }
  }

  /**
   * Obtém estatísticas das conexões
   * @returns {Object}
   */
  getStats() {
    const stats = {
      totalConnections: this.connections.size,
      connections: []
    };

    this.connections.forEach((ws, baseUrl) => {
      stats.connections.push({
        url: baseUrl,
        state: this.getReadyStateText(ws.readyState),
        reconnectAttempts: this.reconnectAttempts.get(baseUrl) || 0
      });
    });

    return stats;
  }

  /**
   * Converte readyState para texto legível
   * @param {number} readyState
   * @returns {string}
   */
  getReadyStateText(readyState) {
    switch (readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'OPEN';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }
}

// Instância singleton
const webSocketManager = new WebSocketManager();

export default webSocketManager;