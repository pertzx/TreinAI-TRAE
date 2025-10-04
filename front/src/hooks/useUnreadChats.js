import { useState, useEffect, useCallback } from 'react';
import api from '../Api.js';

/**
 * Hook para detectar chats não lidos
 * @param {string} userId - ID do usuário atual
 * @returns {Object} - { hasUnreadChats, unreadCount, checkUnreadChats }
 */
export const useUnreadChats = (userId) => {
  const [hasUnreadChats, setHasUnreadChats] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const checkUnreadChats = useCallback(async () => {
    if (!userId) {
      setHasUnreadChats(false);
      setUnreadCount(0);
      return;
    }

    try {
      const res = await api.get('/pegarChats', { params: { userId } });
      const chats = Array.isArray(res.data) ? res.data : [];

      let totalUnread = 0;

      // Verificar cada chat para mensagens não lidas
      chats.forEach(chat => {
        const lastMessage = chat.lastMessage || 
          (Array.isArray(chat.mensagens) ? chat.mensagens[chat.mensagens.length - 1] : null);
        
        if (lastMessage) {
          const lastVistos = Array.isArray(lastMessage.vistos) ? lastMessage.vistos : [];
          const userHasSeen = lastVistos.some(visto => String(visto.userId) === String(userId));
          const lastUserId = lastMessage.userId ?? lastMessage.from ?? null;
          
          // Se a última mensagem não foi vista pelo usuário atual e não foi enviada por ele
          if (!userHasSeen && String(lastUserId) !== String(userId)) {
            totalUnread++;
          }
        }
      });

      setUnreadCount(totalUnread);
      setHasUnreadChats(totalUnread > 0);

    } catch (error) {
      console.error('Erro ao verificar chats não lidos:', error);
      setHasUnreadChats(false);
      setUnreadCount(0);
    }
  }, [userId]);

  // Verificar chats não lidos a cada 30 segundos
  useEffect(() => {
    if (!userId) return;

    // Verificação inicial
    checkUnreadChats();

    // Verificação periódica
    const interval = setInterval(checkUnreadChats, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [userId, checkUnreadChats]);

  return {
    hasUnreadChats,
    unreadCount,
    checkUnreadChats
  };
};