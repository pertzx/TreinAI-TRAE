import { useState, useCallback, useRef, useEffect } from 'react';
import { authCookies } from '../utils/cookieUtils.js';
// import { apiRequest } from '../utils/apiUtils.js';
import webSocketManager from '../utils/websocketUtils.js';
import api from '../Api.js'
import { getBrazilDate } from '../../helpers/getBrazilDate.js';

/**
 * Hook otimizado para chat que usa WebSocket com fallback inteligente para polling
 * Reduz drasticamente o número de requisições à API
 * 
 * @param {Object} user - Objeto do usuário
 * @param {string} selectedChatId - ID do chat selecionado
 */
const useChatOptimized = (user, selectedChatId) => {
  const userId = user?.userId || user?._id || user?.id || null;
  const username = user?.username || user?.name || 'Você';

  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState(null);
  const [usersData, setUsersData] = useState({}); // Cache de dados dos usuários

  // Refs para controle de estado
  const lastChatsRef = useRef(null);
  const lastMessagesRef = useRef(null);
  const pollingTimeoutRef = useRef(null);
  const lastPollingTimeRef = useRef(0);

  // Configurações de throttling/debounce
  const MIN_POLLING_INTERVAL = 5000; // 5 segundos mínimo entre polls
  const CHAT_POLLING_INTERVAL = 15000; // 15 segundos para chats (menos frequente)
  const MESSAGE_POLLING_INTERVAL = 8000; // 8 segundos para mensagens

  // Função de throttling para evitar muitas requisições
  const throttledApiCall = useCallback((apiCall, minInterval = MIN_POLLING_INTERVAL) => {
    const now = getBrazilDate();
    const timeSinceLastCall = now - lastPollingTimeRef.current;
    
    if (timeSinceLastCall < minInterval) {
      // Se muito recente, agendar para depois
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
      
      pollingTimeoutRef.current = setTimeout(() => {
        lastPollingTimeRef.current = getBrazilDate();
        apiCall();
      }, minInterval - timeSinceLastCall);
      
      return;
    }
    
    lastPollingTimeRef.current = now;
    apiCall();
  }, []);

  // Função para buscar chats (otimizada)
  const fetchChats = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoadingChats(true);
      setError(null);
      
      const res = await api.get('/pegarChats', { params: { userId } });
      const raw = Array.isArray(res.data) ? res.data : [];

      // Anotar hasUnread baseado em lastMessage.vistos
      const annotated = raw.map(c => {
        const last = c.lastMessage || (Array.isArray(c.mensagens) ? c.mensagens[c.mensagens.length - 1] : null);
        // Verificar se o usuário atual já viu a última mensagem
        const lastVistos = Array.isArray(last?.vistos) ? last.vistos : [];
        const userHasSeen = lastVistos.some(visto => String(visto.userId) === String(userId));
        const lastUserId = last?.userId ?? last?.from ?? null;
        const hasUnread = !!last && !userHasSeen && String(lastUserId) !== String(userId);
        return { ...c, hasUnread };
      });

      // Comparar com cache para evitar re-renders desnecessários
      const chatsChanged = !lastChatsRef.current || 
        JSON.stringify(lastChatsRef.current.map(c => ({ id: c.ChatId || c._id, lastMsg: c.lastMessage?.mensagemId || c.lastMessage?._id, unread: c.hasUnread }))) !== 
        JSON.stringify(annotated.map(c => ({ id: c.ChatId || c._id, lastMsg: c.lastMessage?.mensagemId || c.lastMessage?._id, unread: c.hasUnread })));

      if (chatsChanged) {
        lastChatsRef.current = annotated;
        setChats(annotated);
        
        // Buscar dados de usuários para chats individuais
        fetchUsersDataForIndividualChats(annotated);
      }

    } catch (err) {
      console.error('fetchChats error:', err);
      setError('Erro ao carregar conversas.');
    } finally {
      setLoadingChats(false);
    }
  }, [userId]);

  // Função para buscar dados de usuários em chats individuais
  const fetchUsersDataForIndividualChats = useCallback(async (chatsArray) => {
    console.log('DEBUG fetchUsersDataForIndividualChats:', { chatsArray, userId });
    
    if (!chatsArray || chatsArray.length === 0) return;

    try {
      // Filtrar chats individuais e extrair userIds dos outros membros
      const individualChats = chatsArray.filter(chat => chat.isIndividualChat && chat.pairId);
      console.log('DEBUG individualChats:', individualChats);
      
      const otherUserIds = [];

      individualChats.forEach(chat => {
        if (Array.isArray(chat.userIds)) {
          const otherUserId = chat.userIds.find(id => String(id) !== String(userId));
          if (otherUserId && !otherUserIds.includes(otherUserId)) {
            otherUserIds.push(otherUserId);
          }
        }
      });

      console.log('DEBUG otherUserIds:', otherUserIds);

      if (otherUserIds.length === 0) return;

      // Buscar dados dos usuários que ainda não estão no cache
      const uncachedUserIds = otherUserIds.filter(id => !usersData[id]);
      console.log('DEBUG uncachedUserIds:', uncachedUserIds);
      
      if (uncachedUserIds.length > 0) {
        console.log('DEBUG fazendo requisição para:', `/users/basic-no-auth?userIds=${uncachedUserIds.join(',')}`);
        
        const res = await api.get('/users/basic-no-auth', { 
          params: { userIds: uncachedUserIds.join(',') } 
        });
        
        console.log('DEBUG resposta da API:', res.data);
        
        if (res.data && Array.isArray(res.data)) {
          const newUsersData = {};
          res.data.forEach(user => {
            const key = user.userId || user._id;
            newUsersData[key] = user;
          });
          
          console.log('DEBUG newUsersData:', newUsersData);
          setUsersData(prev => ({ ...prev, ...newUsersData }));
        }
      }
    } catch (error) {
      console.error('Erro ao buscar dados de usuários:', error);
    }
  }, [userId, usersData]);

  // Função para buscar mensagens (otimizada)
  const fetchMessages = useCallback(async (chatId) => {
    if (!chatId || !userId) return;
    
    try {
      setLoadingMessages(true);
      setError(null);

      const res = await api.post('/pegarChat', {}, { params: { ChatId: chatId } });
      console.log(res);
      const chatData = res?.data?.chat || res?.data;
      const msgsRaw = Array.isArray(chatData?.mensagens) ? chatData.mensagens : (chatData?.messages || []);

      // Usar mensagens sem normalização
      const messages = msgsRaw;

      // Comparar com cache
      const messagesChanged = !lastMessagesRef.current || 
        JSON.stringify(lastMessagesRef.current.map(m => ({ id: m.mensagemId || m._id || m.id, content: m.conteudo || m.text || m.mensagem, time: m.publicadoEm || m.createdAt || m.publicadoEm }))) !== 
        JSON.stringify(messages.map(m => ({ id: m.mensagemId || m._id || m.id, content: m.conteudo || m.text || m.mensagem, time: m.publicadoEm || m.createdAt || m.publicadoEm })));

      if (messagesChanged) {
        lastMessagesRef.current = messages;
        setMessages(messages);

        // Marcar mensagens como vistas (apenas as não vistas)
        const unseen = messages.filter(m => {
          const msgUserId = String(m.userId ?? m.from ?? '');
          const vistos = Array.isArray(m.vistos) ? m.vistos : [];
          return msgUserId !== String(userId) && !vistos.some(v => String(v.userId || v) === String(userId));
        });

        if (unseen.length > 0) {
          const mensagemIds = unseen.map(m => m.mensagemId || m._id || m.id);
          try {
            await api.post('/marcar-mensagens-vistas', { ChatId: chatId, mensagemIds, userId });
            
            // Atualizar localmente apenas se ainda não estiver marcado
            setMessages(prev => prev.map(m => {
              const vistos = Array.isArray(m.vistos) ? m.vistos : [];
              const isUnseen = (m.mensagemId || m._id || m.id) && mensagemIds.includes(m.mensagemId || m._id || m.id);
              if (isUnseen && !vistos.some(v => String(v.userId || v) === String(userId))) {
                return { ...m, vistos: [...vistos, { userId: String(userId), vistoEm: new Date().toISOString() }] };
              }
              return m;
            }));
          } catch (err) {
            console.warn('Falha ao marcar mensagens vistas:', err);
          }
        }
      }

    } catch (err) {
      console.error('fetchMessages error:', err);
      setError('Erro ao carregar mensagens.');
    } finally {
      setLoadingMessages(false);
    }
  }, [userId]);

  // Polling fallback otimizado para chats
  const chatPollingFallback = useCallback(() => {
    throttledApiCall(() => fetchChats(), CHAT_POLLING_INTERVAL);
  }, [fetchChats, throttledApiCall]);

  // Polling fallback otimizado para mensagens
  const messagePollingFallback = useCallback(() => {
    if (selectedChatId) {
      throttledApiCall(() => fetchMessages(selectedChatId), MESSAGE_POLLING_INTERVAL);
    }
  }, [selectedChatId, fetchMessages, throttledApiCall]);

  // WebSocket para chats
  useEffect(() => {
    if (!userId) return;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const chatWsUrl = `${apiUrl.replace('https://', 'wss://').replace('http://', 'ws://')}/ws`;
    
    const chatWsOptions = {
      onMessage: (data) => {
        if (data.type === 'chat_update') {
          // Atualizar chats em tempo real
          fetchChats();
        }
      },
      onError: (error) => {
        console.warn('Erro WebSocket chat:', error);
        // Fallback para polling
        chatPollingFallback();
      }
    };

    webSocketManager.connect(chatWsUrl, chatWsOptions);

    return () => {
      webSocketManager.disconnect(chatWsUrl);
    };
  }, [userId, fetchChats, chatPollingFallback]);

  // WebSocket para mensagens do chat selecionado
  useEffect(() => {
    if (!userId || !selectedChatId) return;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const messageWsUrl = `${apiUrl.replace('https://', 'wss://').replace('http://', 'ws://')}/ws`;
    
    const messageWsOptions = {
      onOpen: (ws) => {
        // Entrar no chat específico
        webSocketManager.send(messageWsUrl, {
          type: 'join_chat',
          chatId: selectedChatId
        });
      },
      onMessage: (data) => {
        console.log('📨 WebSocket recebeu:', data);
        
        if (data.type === 'new_message' && data.chatId === selectedChatId) {
          console.log('🆕 Nova mensagem via WebSocket:', data.message);
          console.log('🔍 Dados completos da mensagem:', {
            messageId: data.message.mensagemId,
            messageUserId: data.message.userId,
            messageUserIdType: typeof data.message.userId,
            currentUserId: userId,
            currentUserIdType: typeof userId,
            content: data.message.conteudo
          });
          
          // Verificar se é uma mensagem que acabamos de enviar
          const isOurMessage = String(data.message.userId) === String(userId);
          console.log('🤔 É nossa mensagem?', isOurMessage, {
            messageUserId: data.message.userId,
            currentUserId: userId,
            comparison: `"${String(data.message.userId)}" === "${String(userId)}"`
          });
          
          // Adicionar apenas mensagens de outros usuários via WebSocket
          // Nossas mensagens são atualizadas via fetch após envio
          if (!isOurMessage) {
            console.log('➕ Adicionando mensagem de outro usuário via WebSocket');
            setMessages(prev => [...prev, data.message]);
          } else {
            console.log('🚫 Ignorando nossa mensagem - será atualizada via fetch');
          }
          
          // Atualizar chats para refletir última mensagem
          fetchChats();
        } else if (data.type === 'message_update' && data.chatId === selectedChatId) {
          // Atualizar mensagem existente
          setMessages(prev => 
            prev.map(msg => 
              msg._id === data.message._id ? data.message : msg
            )
          );
        } else if (data.type === 'messages_seen' && data.chatId === selectedChatId) {
          // Atualizar status de visto das mensagens
          setMessages(prev => 
            prev.map(msg => {
              if (data.mensagemIds.includes(msg.mensagemId || msg._id)) {
                const existingVistos = Array.isArray(msg.vistos) ? msg.vistos : [];
                const newVistos = [...existingVistos];
                
                // Adicionar userId se não estiver presente
                if (!newVistos.some(visto => String(visto.userId || visto) === String(data.userId))) {
                  newVistos.push({
                    userId: data.userId,
                    vistoEm: data.vistoEm
                  });
                }
                
                return { ...msg, vistos: newVistos };
              }
              return msg;
            })
          );
        }
      },
      onError: (error) => {
        console.warn('Erro WebSocket mensagens:', error);
        // Fallback para polling
        messagePollingFallback();
      },
      onClose: () => {
        // Sair do chat ao desconectar
        if (webSocketManager.isConnected(messageWsUrl)) {
          webSocketManager.send(messageWsUrl, {
            type: 'leave_chat',
            chatId: selectedChatId
          });
        }
      }
    };

    webSocketManager.connect(messageWsUrl, messageWsOptions);

    return () => {
      // Sair do chat antes de desconectar
      if (webSocketManager.isConnected(messageWsUrl)) {
        webSocketManager.send(messageWsUrl, {
          type: 'leave_chat',
          chatId: selectedChatId
        });
      }
      webSocketManager.disconnect(messageWsUrl);
    };
  }, [userId, selectedChatId, fetchChats, messagePollingFallback]);

  // Função para enviar mensagem
  const sendMessage = useCallback(async (chatId, content) => {
    if (!chatId || !content.trim() || !userId) return false;

    try {
      console.log('📤 Enviando mensagem via API REST');
      
      // Enviar via API REST
      const response = await api.post('/enviar-mensagem', { 
        ChatId: chatId, 
        userId, 
        conteudo: content.trim() 
      });

      console.log('✅ Mensagem enviada com sucesso:', response.data);

      // Fazer fetch das mensagens para atualizar a lista
      console.log('🔄 Fazendo fetch das mensagens após envio');
      await fetchMessages(chatId);

      // Atualizar lista de chats
      setTimeout(() => {
        fetchChats();
      }, 100);

      return true;
    } catch (err) {
      console.error('sendMessage error:', err);
      setError('Erro ao enviar mensagem.');
      return false;
    }
  }, [userId, fetchChats, fetchMessages]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, []);

  // Carregar chats inicialmente
  useEffect(() => {
    if (userId) {
      fetchChats();
    }
  }, [userId, fetchChats]);

  // Carregar mensagens quando chat selecionado muda
  useEffect(() => {
    if (selectedChatId) {
      fetchMessages(selectedChatId);
    } else {
      setMessages([]);
      lastMessagesRef.current = null;
    }
  }, [selectedChatId, fetchMessages]);

  // Função para gerar URL do WebSocket
  const getWebSocketUrl = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    return `${apiUrl.replace('https://', 'wss://').replace('http://', 'ws://')}/ws`;
  };

  return {
    chats,
    messages,
    loadingChats,
    loadingMessages,
    error,
    usersData, // Dados dos usuários para chats individuais
    sendMessage,
    fetchChats,
    fetchMessages,
    connectionState: {
      chat: webSocketManager.getConnectionState(getWebSocketUrl()),
      message: webSocketManager.getConnectionState(getWebSocketUrl())
    },
    isConnected: webSocketManager.isConnected(getWebSocketUrl()),
      isPolling: !webSocketManager.isConnected(getWebSocketUrl())
  };
};

export default useChatOptimized;