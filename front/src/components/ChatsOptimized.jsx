import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';
import useChatOptimized from '../hooks/useChatOptimized';
import { useToast } from './Toast';
import UserAvatar from './UserAvatar';
import useSpeechToText from '../hooks/useSpeechToText';

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
  const userId = user?.userId || user?._id || user?.id || null;
  const username = user?.username || user?.name || 'Você';

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
    isPolling
  } = useChatOptimized(user, selectedChat?.ChatId || selectedChat?._id);

  // Atualizar input com transcript
  useEffect(() => {
    if (transcript) {
      setNewMessage(transcript);
    }
  }, [transcript]);

  // Funções utilitárias
  const getChatId = (chat) => chat?.ChatId || chat?._id || null;

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
    if (!selectedChat || !newMessage.trim()) return;

    const chatId = getChatId(selectedChat);
    const success = await sendMessage(chatId, newMessage);

    if (success) {
      setNewMessage('');
      // Reset transcript após enviar
      resetTranscript();
      showSuccess('Mensagem enviada!');
    } else {
      showError('Erro ao enviar mensagem');
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
    <div className={`flex rounded-lg overflow-hidden ${bgClass} ${textClass}`}>
      {/* Sidebar de Chats */}
      <div className={`w-full sm:w-80 md:w-96 border-r ${borderClass} flex flex-col ${selectedChat ? 'hidden sm:flex' : 'flex'}`}>
        {/* Header */}
        <div className={`p-3 sm:p-4 border-b ${borderClass}`}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Conversas</h2>
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
                      {chat.isIndividualChat && (() => {
                        const otherUserId = chat.userIds?.find(id => String(id) !== String(userId));
                        return otherUserId && usersData[otherUserId] ? (
                          <UserAvatar
                            user={usersData[otherUserId]}
                            size="medium"
                            className="flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex-shrink-0"></div>
                        );
                      })()}
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
                  <p className="text-xs sm:text-sm text-gray-500">
                    {connectionState.message === 'connected' ? 'Online' :
                      connectionState.message === 'polling' ? 'Sincronizando...' : 'Offline'}
                  </p>
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
                          <p className="text-sm">{message.conteudo}</p>
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
                        </div>
                      </div>
                    </div>
                  );
                })
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
                    onChange={(e) => setNewMessage(e.target.value)}
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
                      className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full transition-colors ${
                        isListening 
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
                  disabled={!newMessage.trim()}
                  className="px-4 sm:px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base min-h-[44px]"
                >
                  Enviar
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