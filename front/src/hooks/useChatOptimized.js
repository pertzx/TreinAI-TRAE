import { useState, useCallback, useRef, useEffect } from 'react';
import { authCookies } from '../utils/cookieUtils.js';
// import { apiRequest } from '../utils/apiUtils.js';
import webSocketManager from '../utils/websocketUtils.js';
import api from '../Api.js'

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
    const now = Date.now();
    const timeSinceLastCall = now - lastPollingTimeRef.current;
    
    if (timeSinceLastCall < minInterval) {
      // Se muito recente, agendar para depois
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
      
      pollingTimeoutRef.current = setTimeout(() => {
        lastPollingTimeRef.current = Date.now();
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
        const lastVistos = Array.isArray(last?.vistos) ? last.vistos.map(String) : [];
        const lastUserId = last?.userId ?? last?.from ?? null;
        const hasUnread = !!last && !lastVistos.includes(String(userId)) && String(lastUserId) !== String(userId);
        return { ...c, hasUnread };
      });

      // Comparar com cache para evitar re-renders desnecessários
      const chatsChanged = !lastChatsRef.current || 
        JSON.stringify(lastChatsRef.current.map(c => ({ id: c.ChatId || c._id, lastMsg: c.lastMessage?.mensagemId || c.lastMessage?._id, unread: c.hasUnread }))) !== 
        JSON.stringify(annotated.map(c => ({ id: c.ChatId || c._id, lastMsg: c.lastMessage?.mensagemId || c.lastMessage?._id, unread: c.hasUnread })));

      if (chatsChanged) {
        lastChatsRef.current = annotated;
        setChats(annotated);
      }

    } catch (err) {
      console.error('fetchChats error:', err);
      setError('Erro ao carregar conversas.');
    } finally {
      setLoadingChats(false);
    }
  }, [userId]);

  // Função para buscar mensagens (otimizada)
  const fetchMessages = useCallback(async (chatId) => {
    if (!chatId || !userId) return;
    
    try {
      setLoadingMessages(true);
      setError(null);

      const res = await api.post('/pegarChat', {}, { params: { ChatId: chatId } });
      const chatData = res?.data?.chat || res?.data;
      const msgsRaw = Array.isArray(chatData?.mensagens) ? chatData.mensagens : (chatData?.messages || []);
      
      // Normalizar mensagens
      const normalized = msgsRaw.map(m => ({
        mensagemId: m.mensagemId ?? m._id ?? String(m.id ?? ''),
        userId: String(m.userId ?? m.from ?? ''),
        conteudo: m.conteudo ?? m.text ?? m.mensagem ?? '',
        publicadoEm: m.publicadoEm ?? m.createdAt ?? m.publicadoEm ?? null,
        vistos: Array.isArray(m.vistos) ? m.vistos.map(String) : []
      }));

      // Comparar com cache
      const messagesChanged = !lastMessagesRef.current || 
        JSON.stringify(lastMessagesRef.current.map(m => ({ id: m.mensagemId, content: m.conteudo, time: m.publicadoEm }))) !== 
        JSON.stringify(normalized.map(m => ({ id: m.mensagemId, content: m.conteudo, time: m.publicadoEm })));

      if (messagesChanged) {
        lastMessagesRef.current = normalized;
        setMessages(normalized);

        // Marcar mensagens como vistas (apenas as não vistas)
        const unseen = normalized.filter(m => 
          String(m.userId) !== String(userId) && 
          !(Array.isArray(m.vistos) && m.vistos.map(String).includes(String(userId)))
        );

        if (unseen.length > 0) {
          const mensagemIds = unseen.map(m => m.mensagemId);
          try {
            await api.post('/marcar-mensagens-vistas', { ChatId: chatId, mensagemIds, userId });
            
            // Atualizar localmente
            setMessages(prev => prev.map(m => 
              mensagemIds.includes(m.mensagemId) 
                ? { ...m, vistos: Array.from(new Set([...(m.vistos || []).map(String), String(userId)])) }
                : m
            ));
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

    const chatWsUrl = `ws://${import.meta.env.VITE_API_URL?.replace('http://', '') || 'localhost:4000'}/ws`;
    
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

    const messageWsUrl = `ws://${import.meta.env.VITE_API_URL?.replace('http://', '') || 'localhost:4000'}/ws`;
    
    const messageWsOptions = {
      onOpen: (ws) => {
        // Entrar no chat específico
        webSocketManager.send(messageWsUrl, {
          type: 'join_chat',
          chatId: selectedChatId
        });
      },
      onMessage: (data) => {
        if (data.type === 'new_message' && data.chatId === selectedChatId) {
          // Adicionar nova mensagem ao estado local
          setMessages(prev => [...prev, data.message]);
          
          // Atualizar chats para refletir última mensagem
          fetchChats();
        } else if (data.type === 'message_update' && data.chatId === selectedChatId) {
          // Atualizar mensagem existente
          setMessages(prev => 
            prev.map(msg => 
              msg._id === data.message._id ? data.message : msg
            )
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
      // Criar mensagem temporária para exibição imediata
      const tempMessage = {
        mensagemId: `temp-${Date.now()}`,
        userId: String(userId),
        conteudo: content.trim(),
        publicadoEm: new Date().toISOString(),
        vistos: [{ userId: String(userId), vistoEm: new Date().toISOString() }],
        isTemporary: true
      };

      // Adicionar mensagem temporária imediatamente
      setMessages(prev => [...prev, tempMessage]);

      // Enviar via API REST
      const response = await api.post('/enviar-mensagem', { 
        ChatId: chatId, 
        userId, 
        conteudo: content.trim() 
      });

      // Remover mensagem temporária e adicionar a real
      if (response.data) {
        const realMessage = {
          mensagemId: response.data.mensagemId || response.data._id,
          userId: String(userId),
          conteudo: content.trim(),
          publicadoEm: response.data.publicadoEm || new Date().toISOString(),
          vistos: response.data.vistos || [{ userId: String(userId), vistoEm: new Date().toISOString() }]
        };

        setMessages(prev => {
          // Remove a mensagem temporária e adiciona a real
          const filtered = prev.filter(m => m.mensagemId !== tempMessage.mensagemId);
          return [...filtered, realMessage];
        });
      }

      // Atualizar lista de chats
      setTimeout(() => {
        fetchChats();
      }, 100);

      return true;
    } catch (err) {
      console.error('sendMessage error:', err);
      
      // Remover mensagem temporária em caso de erro
      setMessages(prev => prev.filter(m => m.mensagemId !== `temp-${Date.now()}`));
      
      setError('Erro ao enviar mensagem.');
      return false;
    }
  }, [userId, fetchChats]);

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

  return {
    chats,
    messages,
    loadingChats,
    loadingMessages,
    error,
    sendMessage,
    fetchChats,
    fetchMessages,
    connectionState: {
      chat: webSocketManager.getConnectionState(`ws://${import.meta.env.VITE_API_URL?.replace('http://', '') || 'localhost:4000'}/ws`),
      message: webSocketManager.getConnectionState(`ws://${import.meta.env.VITE_API_URL?.replace('http://', '') || 'localhost:4000'}/ws`)
    },
    isConnected: webSocketManager.isConnected(`ws://${import.meta.env.VITE_API_URL?.replace('http://', '') || 'localhost:4000'}/ws`),
      isPolling: !webSocketManager.isConnected(`ws://${import.meta.env.VITE_API_URL?.replace('http://', '') || 'localhost:4000'}/ws`)
  };
};

export default useChatOptimized;