import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';
import useChatOptimized from '../hooks/useChatOptimized';
import { useToast } from './Toast';
import UserAvatar from './UserAvatar';
import useSpeechToText from '../hooks/useSpeechToText';
import api from '../Api'

/**
 * ChatsOptimized.jsx
 * Versão otimizada do componente de chat que usa WebSocket com fallback inteligente
 * Reduz drasticamente o número de requisições à API
 * 
 * Props:
 *  - user: objeto do usuário (espera user._id | user.userId | user.id e user.username)
 *  - tema: 'dark' | 'light'
 */

const ChatsOptimized = ({ user, tema }) => {
  const { showError, showSuccess } = useToast();
  const userId = user?._id || user?.userId || user?.id || null;
  const username = user?.username || user?.name || 'Você';

  // Estado para controlar o input de adicionar chat
  const [showAddChatInput, setShowAddChatInput] = useState(false);
  const [newChatUserId, setNewChatUserId] = useState('');

  // Função para iniciar chat por userId
  const iniciarChatPorUserId = async (targetUserId) => {
    try {
      const trimmed = targetUserId.trim();
      const isValidObjectId = /^[a-fA-F0-9]{24}$/.test(trimmed);
      if (!isValidObjectId) {
        showError('ID inválido. Use um ObjectId (24 caracteres hex).');
        return;
      }

      const payload = {
        userId: userId,
        targetUserId: trimmed
      }
      const response = await api.post('/iniciar-chat-por-userid', payload)

      const data = response?.data || {};
      if (data?.chat) {
        showSuccess(data.message || 'Chat iniciado com sucesso!');
        await fetchChats();
        setSelectedChat(data.chat);
        return;
      }

      showError(data.error || data.msg || 'Erro ao iniciar chat');
    } catch (error) {
      console.error('Erro ao iniciar chat:', error);
      showError('Erro ao conectar com o servidor');
    }
  };

  // Função para lidar com o envio do formulário de adicionar chat
  const handleAddChatSubmit = (e) => {
    e.preventDefault();
    if (newChatUserId.trim()) {
      iniciarChatPorUserId(newChatUserId.trim());
    }
  };

  // Speech-to-text hook
  const {
    isListening,
    transcript,
    speechError,
    isSupported,
    toggleListening,
    resetTranscript
  } = useSpeechToText();

  // Debug log para verificar se o hook está funcionando
  console.log('Speech-to-text debug:', { isSupported, isListening, transcript, speechError });

  // Pegar cId tanto como route param quanto query param
  const params = useParams();
  const location = useLocation();
  const routeCid = params?.cId || null;
  const queryCid = (() => {
    try {
      const sp = new URLSearchParams(location.search);
      return sp.get('cId') || null;
    } catch (e) {
      return null;
    }
  })();
  const initialCid = routeCid || queryCid || null;

  const [selectedChat, setSelectedChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [editingMessage, setEditingMessage] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, type: null, payload: null });
  const [replyingTo, setReplyingTo] = useState(null);
  const [showChatSettings, setShowChatSettings] = useState(false);
  const [chatSettings, setChatSettings] = useState({
    notificacoes: true,
    arquivado: false,
    fixado: false
  });

  // Refs para controle de scroll e estado
  const messagesContainerRef = useRef(null);
  const bottomRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const pendingCidRef = useRef(initialCid);

  // Hook otimizado para chat
  const {
    chats,
    messages,
    loadingChats,
    loadingMessages,
    error,
    usersData, // Dados dos usuários para chats individuais
    sendMessage,
    fetchChats,
    fetchMessages,
    connectionState,
    isConnected,
    isPolling,
    typingUsers,
    handleTyping
  } = useChatOptimized(user, selectedChat?.ChatId || selectedChat?._id);

  // Atualizar input com transcript
  useEffect(() => {
    if (transcript) {
      setNewMessage(transcript);
      if (selectedChat) {
        handleTyping(getChatId(selectedChat));
      }
    }
  }, [transcript, selectedChat, handleTyping]);

  // Funções utilitárias
  const getChatId = (chat) => chat?.ChatId || chat?._id || null;

  // Handler para mudança no input de mensagem
  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);
    
    if (selectedChat) {
      handleTyping(getChatId(selectedChat));
    }
  };

  // Scroll detection
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;

    const onScroll = () => {
      const threshold = 80;
      const scrollBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
      isAtBottomRef.current = scrollBottom <= threshold;
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Auto-scroll para o final quando novas mensagens chegam
  useEffect(() => {
    if (isAtBottomRef.current && messages.length > 0) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages]);

  // Selecionar chat inicial baseado na URL
  useEffect(() => {
    if (!pendingCidRef.current || !chats.length) return;
    const found = chats.find(c => getChatId(c) === String(pendingCidRef.current));
    if (found) {
      setSelectedChat(found);
      pendingCidRef.current = null;
    }
  }, [chats]);

  // Atualizar selectedChat quando chats mudam
  useEffect(() => {
    if (selectedChat && chats.length > 0) {
      const updated = chats.find(c => getChatId(c) === getChatId(selectedChat));
      if (updated && updated !== selectedChat) {
        setSelectedChat(updated);
      } else if (!updated) {
        setSelectedChat(null);
      }
    }
  }, [chats, selectedChat]);

  // Mostrar erros via toast
  useEffect(() => {
    if (error) {
      showError(error);
    }
  }, [error, showError]);

  // Handlers
  const handleSendMessage = async () => {
    if (!selectedChat || !newMessage.trim() || isSending) return;

    const chatId = getChatId(selectedChat);
    setIsSending(true);
    const success = await sendMessage(chatId, newMessage);
    setIsSending(false);

    if (success) {
      setNewMessage('');
      // Reset transcript após enviar
      resetTranscript();
      showSuccess('Mensagem enviada!');
    } else {
      showError('Erro ao enviar mensagem');
    }
  };

  const requestDeleteMessage = (message) => {
    setConfirmDelete({ open: true, type: 'message', payload: { message } });
  };

  const requestDeleteChat = (chat) => {
    setConfirmDelete({ open: true, type: 'chat', payload: { chat } });
  };

  const confirmDeleteAction = async () => {
    const type = confirmDelete.type;
    const payload = confirmDelete.payload;

    setConfirmDelete({ open: false, type: null, payload: null });

    if (!type || !payload) return;

    if (type === 'message') {
      const chatId = getChatId(selectedChat);
      const mensagemId = payload.message?.mensagemId || payload.message?._id || null;
      if (!chatId || !mensagemId) return;
      try {
        await api.post('/deletar-mensagem', { userId }, { params: { ChatId: chatId, mensagemId } });
        showSuccess('Mensagem deletada');
      } catch (error) {
        console.error('Erro ao deletar mensagem:', error);
        showError('Erro ao deletar mensagem');
      }
      return;
    }

    if (type === 'chat') {
      const chatId = getChatId(payload.chat);
      if (!chatId) return;

      try {
        await api.post('/deletar-chat', { userId }, { params: { ChatId: chatId } });
        showSuccess('Conversa deletada');
        setSelectedChat(null);
        fetchChats();
      } catch (error) {
        console.error('Erro ao deletar conversa:', error);
        showError('Erro ao deletar conversa');
      }
    }
  };

  const exportChatJson = async () => {
    const chatId = getChatId(selectedChat);
    if (!chatId) return;
    try {
      const res = await api.get('/exportar-historico-chat', { params: { ChatId: chatId } });
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-${chatId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess('Exportação gerada');
    } catch (error) {
      console.error('Erro ao exportar conversa:', error);
      showError('Erro ao exportar conversa');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleChatSelect = (chat) => {
    setSelectedChat(chat);
    setEditingMessage(null);
    setReplyingTo(null);
    setShowChatSettings(false);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      return new Date(timestamp).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    try {
      return new Date(timestamp).toLocaleDateString('pt-BR');
    } catch {
      return '';
    }
  };

  const getOtherUserName = (chat) => {
    try {
      const members = chat?.membros || [];
      const otherMember = members.find(m => String(m.userId) !== String(userId));
      return otherMember?.username || otherMember?.name || 'Usuário';
    } catch {
      return 'Usuário';
    }
  };

  // Tema
  const isDark = tema === 'dark';
  const bgClass = isDark ? 'bg-gray-900' : 'bg-white';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const borderClass = isDark ? 'border-gray-700' : 'border-gray-200';
  const hoverClass = isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50';

  return (
    <div className={`flex rounded-lg overflow-hidden ${bgClass} ${textClass} relative`}>
      {confirmDelete.open && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={`w-full max-w-sm rounded-xl border ${borderClass} ${isDark ? 'bg-gray-900' : 'bg-white'} p-4`}>
            <div className="text-sm font-semibold">
              {confirmDelete.type === 'chat' ? 'Deletar conversa?' : 'Deletar mensagem?'}
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Essa ação não pode ser desfeita.
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete({ open: false, type: null, payload: null })}
                className={`px-3 py-2 rounded-lg text-sm ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}`}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteAction}
                className="px-3 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-700 text-white"
              >
                Deletar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Sidebar de Chats */}
      <div className={`w-full sm:w-80 md:w-96 border-r ${borderClass} flex flex-col ${selectedChat ? 'hidden sm:flex' : 'flex'}`}>
        {/* Header */}
        <div className={`p-3 sm:p-4 border-b ${borderClass}`}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Conversas</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddChatInput(!showAddChatInput)}
                className={`p-2 rounded-lg ${hoverClass}`}
                title="Iniciar chat por ID do usuário"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
              <button
                onClick={fetchChats}
                disabled={loadingChats}
                className={`p-2 rounded-lg ${hoverClass} ${loadingChats ? 'opacity-50' : ''}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Input para adicionar chat */}
          {showAddChatInput && (
            <form onSubmit={handleAddChatSubmit} className="mt-3">
              <div className="grid grid-cols-5 gap-y-1 mb-2 items-center gap-x-2">
                <input
                  type="text"
                  value={newChatUserId}
                  onChange={(e) => setNewChatUserId(e.target.value)}
                  placeholder="Digite o ID do usuário..."
                  className={`col-span-5 px-3 py-2 rounded-lg border text-sm ${
                    tema === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                  } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  autoFocus
                />
                <div className="grid grid-cols-3 col-span-5 gap-2 sm:gap-1">
                  <button
                    type="submit"
                    disabled={!newChatUserId.trim()}
                    className={`col-span-2 px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                      !newChatUserId.trim()
                        ? tema === 'dark' 
                          ? 'ring-2 ring-gray-700 cursor-not-allowed'
                          : 'ring-2 ring-gray-600 cursor-not-allowed'
                        : tema === 'dark'
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    Iniciar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddChatInput(false);
                      setNewChatUserId('');
                    }}
                    className={`col-span-1 px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                      tema === 'dark'
                        ? 'bg-gray-600 hover:bg-gray-700 text-white'
                        : 'bg-gray-500 hover:bg-gray-600 text-white'
                    }`}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Status de conexão */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1 text-xs">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : isPolling ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
              <span className="text-gray-500">
                {isConnected ? 'Online' : isPolling ? 'Polling' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Lista de chats */}
        <div className="flex-1 overflow-y-auto">
          {loadingChats && chats.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              Carregando conversas...
            </div>
          ) : chats.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              Nenhuma conversa encontrada
            </div>
          ) : (
            chats.map((chat) => {
              const chatId = getChatId(chat);
              const isSelected = selectedChat && getChatId(selectedChat) === chatId;
              const otherUserName = getOtherUserName(chat);
              const lastMessage = chat.lastMessage;
              const hasUnread = chat.hasUnread;

              return (
                <div
                  key={chatId}
                  onClick={() => handleChatSelect(chat)}
                  className={`p-3 sm:p-4 cursor-pointer border-b ${borderClass} ${hoverClass} ${isSelected ? (isDark ? 'bg-gray-800' : 'bg-blue-50') : ''
                    } ${hasUnread ? (isDark ? 'bg-blue-900/30 border-l-4 border-l-blue-500' : 'bg-blue-50/70 border-l-4 border-l-blue-500') : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {/* Avatar do usuário na lista de chats */}
                      <div className="relative flex-shrink-0">
                        {chat.isIndividualChat && (() => {
                          const otherUserId = chat.userIds?.find(id => String(id) !== String(userId));
                          const otherUser = otherUserId && usersData[otherUserId];
                          const isOnline = otherUser?.isOnline || chat.membros?.find(m => String(m.userId) === String(otherUserId))?.isOnline;
                          
                          return (
                            <>
                              {otherUser ? (
                                <UserAvatar
                                  user={otherUser}
                                  size="medium"
                                  className="flex-shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-gray-300 rounded-full flex-shrink-0 flex items-center justify-center text-gray-600 font-bold">
                                  {otherUserName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              {/* Indicador Online */}
                              <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 ${isDark ? 'border-gray-800' : 'border-white'} ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                            </>
                          );
                        })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className={`font-medium truncate text-sm sm:text-base ${hasUnread ? 'font-bold text-blue-600 dark:text-blue-400' : ''
                            }`}>
                            {otherUserName}
                          </h3>
                          {hasUnread && (
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 animate-pulse"></div>
                              <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full font-medium">
                                Nova
                              </span>
                            </div>
                          )}
                        </div>
                        {lastMessage && (
                          <p className={`text-xs sm:text-sm truncate mt-1 ${hasUnread
                            ? 'font-medium text-gray-800 dark:text-gray-200'
                            : 'text-gray-500'
                            }`}>
                            {lastMessage.conteudo || lastMessage.text || ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      {lastMessage && (
                        <div className="text-xs text-gray-400 flex-shrink-0">
                          {formatTime(lastMessage.publicadoEm || lastMessage.createdAt)}
                        </div>
                      )}
                      {hasUnread && (
                        <div className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0 animate-bounce"></div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Área de Mensagens */}
      <div className={`flex-1 max-h-full flex flex-col ${selectedChat ? 'flex' : 'hidden sm:flex'}`}>
        {selectedChat ? (
          <>
            {/* Header do Chat */}
            <div className={`p-3 sm:p-4 border-b ${borderClass} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                {/* Botão voltar para mobile */}
                <button
                  onClick={() => setSelectedChat(null)}
                  className="sm:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                {/* Avatar do usuário no cabeçalho */}
                {selectedChat?.isIndividualChat && (() => {
                  const otherUserId = selectedChat.userIds?.find(id => String(id) !== String(userId));
                  return otherUserId && usersData[otherUserId] ? (
                    <UserAvatar
                      user={usersData[otherUserId]}
                      size="medium"
                    />
                  ) : null;
                })()}
                <div>
                  <h3 className="font-semibold text-sm sm:text-base">{getOtherUserName(selectedChat)}</h3>
                  <div className="flex items-center gap-1.5">
                    {(() => {
                      const otherUserId = selectedChat.userIds?.find(id => String(id) !== String(userId));
                      const otherUser = otherUserId && usersData[otherUserId];
                      const isOnline = otherUser?.isOnline || selectedChat.membros?.find(m => String(m.userId) === String(otherUserId))?.isOnline;
                      const lastActive = otherUser?.lastActive || selectedChat.membros?.find(m => String(m.userId) === String(otherUserId))?.lastActive;

                      if (isOnline) {
                        return (
                          <>
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-xs text-green-500 font-medium">Online</span>
                          </>
                        );
                      } else if (lastActive) {
                        const date = new Date(lastActive);
                        const today = new Date();
                        const isToday = date.toDateString() === today.toDateString();
                        const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        const dateStr = date.toLocaleDateString('pt-BR');
                        
                        return (
                          <span className="text-xs text-gray-500">
                            Visto por último {isToday ? `hoje às ${timeStr}` : `em ${dateStr} às ${timeStr}`}
                          </span>
                        );
                      }
                      
                      return (
                        <span className="text-xs text-gray-500">
                          {connectionState.message === 'connected' ? 'Conectado' : 'Offline'}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowChatSettings(!showChatSettings)}
                className={`p-2 rounded-lg ${hoverClass}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>

            {showChatSettings && (
              <div className={`border-b ${borderClass} p-3 sm:p-4`}>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={exportChatJson}
                    className={`px-3 py-2 rounded-lg text-sm ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}`}
                  >
                    Exportar JSON
                  </button>
                  <button
                    onClick={() => requestDeleteChat(selectedChat)}
                    className="px-3 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-700 text-white"
                  >
                    Deletar conversa
                  </button>
                </div>
              </div>
            )}

            {/* Mensagens */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4"
            >
              {loadingMessages && messages.length === 0 ? (
                <div className="text-center text-gray-500 text-sm">
                  Carregando mensagens...
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500 text-sm">
                  Nenhuma mensagem ainda. Seja o primeiro a enviar!
                </div>
              ) : (
                messages.map((message, index) => {
                  const isOwn = String(message.userId) === String(userId);
                  console.log(message)
                  const showDate = index === 0 ||
                    formatDate(message.publicadoEm) !== formatDate(messages[index - 1]?.publicadoEm);

                  // Verificar se a mensagem foi vista pelo usuário atual
                  let isMessageSeen = null
                  isMessageSeen = message && message.vistos && message.vistos.find(visto =>
                    String(visto.userId) === String(userId)
                  );

                  console.log(isMessageSeen)
                  const isUnseenMessage = !isOwn && !isMessageSeen;

                  return (
                    <div key={message.mensagemId || index}>
                      {showDate && (
                        <div className="text-center text-xs text-gray-400 my-4">
                          {formatDate(message.publicadoEm)}
                        </div>
                      )}
                      <div className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        {/* Avatar para mensagens de outros usuários em chats individuais */}
                        {!isOwn && selectedChat?.isIndividualChat && (
                          <UserAvatar
                            user={usersData[message.userId]}
                            size="small"
                            className="mb-1"
                          />
                        )}
                        {/* Avatar para mensagens do usuário atual */}
                        {isOwn && selectedChat?.isIndividualChat && (
                          <UserAvatar
                            user={{ username: username, avatar: user?.avatar }}
                            size="small"
                            className="mb-1 order-2"
                          />
                        )}
                        <div className={`max-w-[85%] sm:max-w-xs lg:max-w-md px-3 sm:px-4 py-2 rounded-lg relative ${isOwn
                          ? 'bg-blue-500 text-white'
                          : isUnseenMessage
                            ? (isDark ? 'bg-yellow-800/50 text-white border-2 border-yellow-500/50' : 'bg-yellow-100 text-gray-900 border-2 border-yellow-400/50')
                            : (isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-900')
                          }`}>
                          {isUnseenMessage && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                          )}
                          {editingMessage === (message.mensagemId || message._id) ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                                placeholder="Edite sua mensagem..."
                                autoFocus
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={async () => {
                                    const chatId = getChatId(selectedChat);
                                    const mensagemId = message.mensagemId || message._id;
                                    const novoConteudo = editContent;
                                    if (!chatId || !mensagemId || !novoConteudo?.trim()) return;
                                    try {
                                      await api.post('/editar-mensagem', { userId, novoConteudo: novoConteudo.trim() }, { params: { ChatId: chatId, mensagemId } });
                                      setEditingMessage(null);
                                      setEditContent('');
                                      showSuccess('Mensagem editada');
                                    } catch (error) {
                                      console.error('Erro ao editar mensagem:', error);
                                      showError('Erro ao editar mensagem');
                                    }
                                  }}
                                  className="px-3 py-2 rounded-lg text-xs bg-green-600 hover:bg-green-700 text-white"
                                >
                                  Salvar
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingMessage(null);
                                    setEditContent('');
                                  }}
                                  className={`px-3 py-2 rounded-lg text-xs ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}`}
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap break-words">{message.conteudo}</p>
                          )}
                          <div className={`text-xs mt-1 gap-2 flex items-center justify-between ${isOwn ? 'text-blue-100' : isUnseenMessage ? 'text-yellow-700 dark:text-yellow-300' : 'text-gray-500'
                            }`}>
                            <span>{formatTime(message.publicadoEm)}</span>
                            {isOwn && (
                              <div className="flex items-center gap-1">
                                {message.vistos && message.vistos.length > 1 ? (
                                  <>
                                    <span className="text-green-300">✓✓</span>
                                    {/* <span className="text-xs">({message.vistos.length})</span> */}
                                  </>
                                ) : (
                                  <span className="text-gray-300">✓</span>
                                )}
                              </div>
                            )}
                          </div>
                          {message.editado && editingMessage !== (message.mensagemId || message._id) && (
                            <div className={`mt-1 text-[11px] ${isOwn ? 'text-blue-100/90' : isUnseenMessage ? 'text-yellow-700 dark:text-yellow-200' : 'text-gray-500'}`}>
                              Editado
                            </div>
                          )}
                          {isOwn && editingMessage !== (message.mensagemId || message._id) && (
                            <div className="mt-2 flex gap-2 justify-end">
                              <button
                                onClick={() => {
                                  setEditingMessage(message.mensagemId || message._id);
                                  setEditContent(message.conteudo || '');
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs ${isDark ? 'bg-white/10 hover:bg-white/15 text-white' : 'bg-black/5 hover:bg-black/10 text-gray-900'}`}
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => requestDeleteMessage(message)}
                                className="px-3 py-1.5 rounded-lg text-xs bg-red-600 hover:bg-red-700 text-white"
                              >
                                Excluir
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              
              {/* Indicador de Digitando */}
              {selectedChat && typingUsers[getChatId(selectedChat)]?.length > 0 && (
                <div className="flex items-center gap-2 mb-4 animate-fade-in">
                  <div className={`px-4 py-2 rounded-2xl ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'} flex items-center gap-2`}>
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"></div>
                    </div>
                    <span className="text-xs font-medium">
                      {typingUsers[getChatId(selectedChat)].join(', ')} está digitando...
                    </span>
                  </div>
                </div>
              )}
              
              <div ref={bottomRef} />
            </div>

            {/* Input de Mensagem */}
            <div className={`p-3 sm:p-4 border-t ${borderClass}`}>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite sua mensagem..."
                    className={`w-full px-3 sm:px-4 py-2 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base ${isDark
                      ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                  />
                  {/* Botão de microfone */}
                  {isSupported && (
                    <button
                      onClick={toggleListening}
                      className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full transition-colors ${isListening
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
                        }`}
                      title={isListening ? 'Parar gravação' : 'Iniciar gravação de voz'}
                    >
                      {!isListening ? <FaMicrophoneSlash className="text-sm" /> : <FaMicrophone className="text-sm" />}
                    </button>
                  )}
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className="px-4 sm:px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base min-h-[44px] flex items-center justify-center"
                >
                  {isSending ? 'Enviando…' : 'Enviar'}
                </button>
              </div>

              {/* Indicador de erro de speech */}
              {speechError && (
                <div className="mt-2 p-2 bg-red-100 text-red-700 text-xs rounded-lg">
                  {speechError}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 p-4">
            <div className="text-center">
              <svg className="w-12 sm:w-16 h-12 sm:h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm sm:text-base">Selecione uma conversa para começar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatsOptimized;
