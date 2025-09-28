import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';

/**
 * Servidor WebSocket para comunicação em tempo real do chat
 * Gerencia conexões de usuários e broadcasting de mensagens
 */
class ChatWebSocketServer {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // userId -> Set of WebSocket connections
    this.chatRooms = new Map(); // chatId -> Set of userIds
  }

  /**
   * Inicializa o servidor WebSocket
   * @param {Object} server - Servidor HTTP do Express
   */
  initialize(server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    this.wss.on('connection', (ws, request) => {
      this.handleConnection(ws, request);
    });

    console.log('🚀 WebSocket Server inicializado');
  }

  /**
   * Manipula nova conexão WebSocket
   * @param {WebSocket} ws - Conexão WebSocket
   * @param {Object} request - Request HTTP
   */
  handleConnection(ws, request) {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const token = url.searchParams.get('token');
    const userId = this.authenticateUser(token);

    if (!userId) {
      ws.close(1008, 'Token inválido');
      return;
    }

    // Adicionar cliente à lista de conexões
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId).add(ws);

    ws.userId = userId;
    ws.isAlive = true;

    console.log(`👤 Usuário ${userId} conectado via WebSocket`);

    // Configurar handlers
    ws.on('message', (data) => this.handleMessage(ws, data));
    ws.on('close', () => this.handleDisconnection(ws));
    ws.on('error', (error) => this.handleError(ws, error));
    ws.on('pong', () => { ws.isAlive = true; });

    // Enviar confirmação de conexão
    this.sendToUser(userId, {
      type: 'connection_established',
      userId: userId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Autentica usuário via JWT token
   * @param {string} token - JWT token
   * @returns {string|null} - userId ou null se inválido
   */
  authenticateUser(token) {
    if (!token) return null;

    try {
      const decoded = jwt.verify(token, process.env.SECRET_JWT);
      return String(decoded.userId || decoded.id || decoded._id);
    } catch (error) {
      console.warn('Token WebSocket inválido:', error.message);
      return null;
    }
  }

  /**
   * Manipula mensagens recebidas via WebSocket
   * @param {WebSocket} ws - Conexão WebSocket
   * @param {Buffer} data - Dados recebidos
   */
  handleMessage(ws, data) {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'join_chat':
          this.handleJoinChat(ws, message);
          break;
        case 'leave_chat':
          this.handleLeaveChat(ws, message);
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          break;
        default:
          console.warn('Tipo de mensagem WebSocket desconhecido:', message.type);
      }
    } catch (error) {
      console.error('Erro ao processar mensagem WebSocket:', error);
    }
  }



  /**
   * Manipula entrada em chat
   * @param {WebSocket} ws - Conexão WebSocket
   * @param {Object} message - Mensagem com chatId
   */
  handleJoinChat(ws, message) {
    const { chatId } = message;
    if (!chatId) return;

    const userId = ws.userId;
    
    // Adicionar usuário ao chat room
    if (!this.chatRooms.has(chatId)) {
      this.chatRooms.set(chatId, new Set());
    }
    this.chatRooms.get(chatId).add(userId);

    // Adicionar chatId à conexão
    if (!ws.chatRooms) ws.chatRooms = new Set();
    ws.chatRooms.add(chatId);

    console.log(`👤 Usuário ${userId} entrou no chat ${chatId}`);
  }

  /**
   * Manipula saída de chat
   * @param {WebSocket} ws - Conexão WebSocket
   * @param {Object} message - Mensagem com chatId
   */
  handleLeaveChat(ws, message) {
    const { chatId } = message;
    if (!chatId) return;

    const userId = ws.userId;
    
    // Remover usuário do chat room
    if (this.chatRooms.has(chatId)) {
      this.chatRooms.get(chatId).delete(userId);
      if (this.chatRooms.get(chatId).size === 0) {
        this.chatRooms.delete(chatId);
      }
    }

    // Remover chatId da conexão
    if (ws.chatRooms) {
      ws.chatRooms.delete(chatId);
    }

    console.log(`👤 Usuário ${userId} saiu do chat ${chatId}`);
  }

  /**
   * Manipula desconexão de cliente
   * @param {WebSocket} ws - Conexão WebSocket
   */
  handleDisconnection(ws) {
    const userId = ws.userId;
    if (!userId) return;

    // Remover conexão da lista de clientes
    if (this.clients.has(userId)) {
      this.clients.get(userId).delete(ws);
      if (this.clients.get(userId).size === 0) {
        this.clients.delete(userId);
      }
    }

    // Remover usuário de todos os chat rooms
    if (ws.chatRooms) {
      ws.chatRooms.forEach(chatId => {
        if (this.chatRooms.has(chatId)) {
          this.chatRooms.get(chatId).delete(userId);
          if (this.chatRooms.get(chatId).size === 0) {
            this.chatRooms.delete(chatId);
          }
        }
      });
    }

    console.log(`👤 Usuário ${userId} desconectado do WebSocket`);
  }

  /**
   * Manipula erros de conexão
   * @param {WebSocket} ws - Conexão WebSocket
   * @param {Error} error - Erro ocorrido
   */
  handleError(ws, error) {
    console.error('Erro WebSocket:', error);
  }

  /**
   * Envia mensagem para um usuário específico
   * @param {string} userId - ID do usuário
   * @param {Object} message - Mensagem a ser enviada
   */
  sendToUser(userId, message) {
    const userConnections = this.clients.get(String(userId));
    if (!userConnections) return;

    const messageStr = JSON.stringify(message);
    userConnections.forEach(ws => {
      if (ws.readyState === ws.OPEN) {
        ws.send(messageStr);
      }
    });
  }

  /**
   * Envia mensagem para todos os usuários de um chat
   * @param {string} chatId - ID do chat
   * @param {Object} message - Mensagem a ser enviada
   * @param {string} excludeUserId - ID do usuário a ser excluído (opcional)
   */
  broadcastToChat(chatId, message, excludeUserId = null) {
    const chatUsers = this.chatRooms.get(String(chatId));
    if (!chatUsers) return;

    const messageStr = JSON.stringify(message);
    chatUsers.forEach(userId => {
      if (excludeUserId && String(userId) === String(excludeUserId)) return;
      
      const userConnections = this.clients.get(userId);
      if (userConnections) {
        userConnections.forEach(ws => {
          if (ws.readyState === ws.OPEN) {
            ws.send(messageStr);
          }
        });
      }
    });
  }

  /**
   * Notifica sobre nova mensagem no chat
   * @param {string} chatId - ID do chat
   * @param {Object} message - Dados da mensagem
   * @param {string} senderUserId - ID do usuário que enviou
   */
  notifyNewMessage(chatId, message, senderUserId) {
    this.broadcastToChat(chatId, {
      type: 'new_message',
      chatId: chatId,
      message: message,
      timestamp: new Date().toISOString()
    }, senderUserId);
  }

  /**
   * Notifica sobre atualização de chat
   * @param {string} userId - ID do usuário
   * @param {Object} chatData - Dados do chat atualizado
   */
  notifyChatUpdate(userId, chatData) {
    this.sendToUser(userId, {
      type: 'chat_update',
      chat: chatData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Inicia heartbeat para manter conexões vivas
   */
  startHeartbeat() {
    setInterval(() => {
      this.wss.clients.forEach(ws => {
        if (!ws.isAlive) {
          ws.terminate();
          return;
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 segundos
  }

  /**
   * Obtém estatísticas do servidor
   * @returns {Object} - Estatísticas
   */
  getStats() {
    return {
      totalConnections: this.wss ? this.wss.clients.size : 0,
      totalUsers: this.clients.size,
      totalChatRooms: this.chatRooms.size,
      userConnections: Array.from(this.clients.entries()).map(([userId, connections]) => ({
        userId,
        connections: connections.size
      }))
    };
  }
}

// Instância singleton

const chatWebSocketServer = new ChatWebSocketServer();

export default chatWebSocketServer;