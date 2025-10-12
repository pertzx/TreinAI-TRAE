import React, { useEffect, useRef, useState } from 'react';
import { FiSend, FiUser, FiCpu, FiClock, FiCheckCircle, FiMessageCircle } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../Api.js';
import { getBrazilDate } from '../../../../helpers/getBrazilDate.js';
import { useToast } from '../../../components/Toast.jsx';

export default function ChatNutriAI({ user, tema = 'dark', profissionalId = null }) {
  const isDark = tema === 'dark';

  const theme = {
    container: isDark
      ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100'
      : 'bg-gradient-to-br from-white via-slate-50 to-white text-slate-900',
    panel: isDark
      ? 'bg-gradient-to-br from-slate-800/90 to-slate-700/90 border-emerald-500/20 shadow-2xl shadow-emerald-500/10 backdrop-blur-xl'
      : 'bg-gradient-to-br from-white/95 to-slate-50/95 border-emerald-400/30 shadow-2xl shadow-emerald-500/20 backdrop-blur-xl',
    chatArea: isDark
      ? 'bg-gradient-to-b from-slate-900/80 to-slate-800/80 border border-slate-700/30'
      : 'bg-gradient-to-b from-white/90 to-slate-50/90 border border-slate-200/40',
    input: isDark
      ? 'bg-slate-800/90 text-slate-100 border-slate-600/40 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/30 placeholder-slate-400'
      : 'bg-white/95 text-slate-900 border-slate-300/40 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/30 placeholder-slate-500',
    primaryBtn: 'bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700 text-white shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105 active:scale-95',
    secondaryBtn: isDark
      ? 'bg-slate-700/80 hover:bg-slate-600/80 text-slate-200 border border-slate-600/40'
      : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-700 border border-slate-300/40',
    userMessage: 'bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 text-white shadow-xl border border-blue-400/30',
    aiMessage: isDark
      ? 'bg-gradient-to-br from-slate-700/90 to-slate-600/90 text-slate-100 border border-slate-600/20 shadow-lg'
      : 'bg-gradient-to-br from-slate-100/90 to-white/90 text-slate-900 border border-slate-200/40 shadow-lg',
    notifyBg: isDark ? 'bg-emerald-800/95 text-white border border-emerald-600/30' : 'bg-emerald-50/95 text-emerald-900 border border-emerald-200/50',
    errorBg: isDark ? 'bg-red-800/95 text-white border border-red-600/30' : 'bg-red-50/95 text-red-900 border border-red-200/50'
  };

  const [messages, setMessages] = useState(() => [
    { id: 'w-1', from: 'nutri', text: '🌟 Olá! Eu sou sua NutriAI — pergunte sobre seu plano nutricional ou peça alterações. Estou aqui para te ajudar! 💚', createdAt: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  let c = -2
  const [nutriInfos, setNutriInfos] = useState(user && user.nutriInfos ? user.nutriInfos : null);
  const [notify, setNotify] = useState(null); // { text, type: 'info'|'error' }
  const bottomRef = useRef(null);
  const containerRef = useRef(null);

  const { showError, showSuccess } = useToast()

  // Auto-scroll para a última mensagem
  useEffect(() => {
    if (containerRef.current) {
      const scrollToBottom = () => {
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      };

      // Scroll imediato para novas mensagens
      scrollToBottom();

      // Scroll adicional após um pequeno delay para garantir que o conteúdo foi renderizado
      const timeoutId = setTimeout(scrollToBottom, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [messages, isTyping]);

  const allowedToUse = () => {
    const plan = user?.planInfos?.planType;
    return profissionalId !== null ? true : (plan === 'max' || plan === 'coach');
  };

  const sendToServer = async (text) => {
    setLoading(true);
    setIsTyping(true);

    try {
      const body = { email: user.email, conteudo: text };
      if (profissionalId) body.profissionalId = profissionalId;

      const res = await api.post('/conversar-nutri', body);
      const data = res?.data || {};

      // show server msg if present
      if (data.success) {
        console.log(data)
        showSuccess(data.msg);
      } else {
        showError(data.msg);
      }

      // If backend returned nutriInfos, update local view
      if (data.nutriInfos && Array.isArray(data.nutriInfos.planoNutricional)) {
        setNutriInfos({
          userId: data.nutriInfos.userId || String(user._id),
          planoNutricional: data.nutriInfos.planoNutricional || [],
          restricoes: data.nutriInfos.restricoes || []
        });

        // also append an AI message that a plan foi criada/atualizada (use data.msg when available)
        const textResp = data.msg || '✅ Plano nutricional atualizado com sucesso!';
        setMessages(prev => [...prev, { id: `ai-${getBrazilDate()}`, from: 'nutri', text: textResp, createdAt: new Date() }]);
      } else {
        // fallback: if API returned a textual reply (msg) show it, else generic success/fail
        if (typeof data.success !== 'undefined') {
          if (data.success) {
            const successText = data.msg || '✨ Resposta da NutriAI recebida.';
            setMessages(prev => [...prev, { id: `ai-${getBrazilDate()}`, from: 'nutri', text: successText, createdAt: new Date() }]);
          } else {
            const failText = data.msg || '❌ A NutriAI não conseguiu gerar uma resposta válida.';
            setMessages(prev => [...prev, { id: `ai-${getBrazilDate()}`, from: 'nutri', text: failText, createdAt: new Date() }]);
          }
        } else {
          // no structured response, attempt to show raw message if present
          if (data?.raw) {
            setMessages(prev => [...prev, { id: `ai-${getBrazilDate()}`, from: 'nutri', text: String(data.raw).slice(0, 1000), createdAt: new Date() }]);
          } else {
            // fallback: generic success message
            setMessages(prev => [...prev, { id: `ai-${getBrazilDate()}`, from: 'nutri', text: '✨ Resposta da NutriAI recebida.', createdAt: new Date() }]);
          }
        }
      }

      return data;
    } catch (err) {
      console.error('conversar-nutri error', err);
      const msg = err?.response?.data?.msg || 'Erro ao comunicar com servidor.';
      showError(msg);
      setMessages(prev => [...prev, { id: `ai-${getBrazilDate()}`, from: 'nutri', text: `❌ Erro: ${msg}`, createdAt: new Date() }]);
      return null;
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  const handleSend = async () => {
    const texto = (input || '').trim();
    if (!texto) return;

    if (!user) {
      showError('🔐 Faça login para usar a NutriAI.');
      return;
    }
    // check plan
    if (!allowedToUse()) {

      setLoading(true)
      setTimeout(() => {
        setLoading(false)
        showError('💎 NutriAI disponível apenas para planos MAX ou COACH. Atualize seu plano para usar.', 'error');
      }, 3000)
      return;
    }

    // optimistic add user message
    setMessages(prev => [...prev, { id: `u-${getBrazilDate()}`, from: 'user', text: texto, createdAt: new Date() }]);
    setInput('');

    // call server
    await sendToServer(texto);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // render plano nutricional card
  const renderPlano = () => {
    const plano = nutriInfos?.planoNutricional;
    if (!Array.isArray(plano) || plano.length === 0) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8"
        >
          <FiClock className="mx-auto text-4xl text-gray-400 mb-3" />
          <div className="text-sm text-gray-400">Nenhum plano nutricional ainda.</div>
          <div className="text-xs text-gray-500 mt-1">Converse com a NutriAI para criar seu plano personalizado!</div>
        </motion.div>
      );
    }
    return (
      <div className="space-y-4">
        {plano.map((it, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`p-4 rounded-xl ${isDark ? 'bg-gradient-to-r from-gray-800/60 to-gray-700/60 border-gray-600/30' : 'bg-gradient-to-r from-white/80 to-gray-50/80 border-gray-200/50'} border shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <FiClock className="text-emerald-500" />
                <div className="text-sm font-semibold text-emerald-600">{it.horaDoDia || 'Horário não especificado'}</div>
              </div>
              <div className="text-xs text-gray-400">#{idx + 1}</div>
            </div>
            <div className="text-sm leading-relaxed whitespace-pre-wrap pl-6">{it.conteudo}</div>
          </motion.div>
        ))}
      </div>
    );
  };

  const formatDate = (date) => {
    if (!date) return '';

    const now = new Date(getBrazilDate());
    const messageDate = new Date(date);
    const diffInMinutes = Math.floor((now - messageDate) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    // Se foi há menos de 1 minuto
    if (diffInMinutes < 1) {
      return 'Agora';
    }

    // Se foi há menos de 60 minutos
    if (diffInMinutes < 60) {
      return `${diffInMinutes}min atrás`;
    }

    // Se foi há menos de 24 horas
    if (diffInHours < 24) {
      return `${diffInHours}h atrás`;
    }

    // Se foi ontem
    if (diffInDays === 1) {
      return `Ontem às ${messageDate.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      })}`;
    }

    // Se foi há menos de 7 dias
    if (diffInDays < 7) {
      const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      return `${weekdays[messageDate.getDay()]} às ${messageDate.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      })}`;
    }

    // Para datas mais antigas
    return messageDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // if user changes and has nutriInfos we sync local copy
  useEffect(() => {
    if (user && user.nutriInfos) setNutriInfos(user.nutriInfos);
  }, [user]);

  return (
    <div className={`w-full max-w-6xl mx-auto p-3 sm:p-4 lg:p-6 ${theme.container} backdrop-blur-sm`}>
      <motion.div className={`w-full max-w-5xl mx-auto p-3 sm:p-4 lg:p-6 ${theme.panel} rounded-2xl sm:rounded-3xl border-2 backdrop-blur-xl shadow-2xl`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-emerald-400/20 gap-3 sm:gap-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl sm:rounded-2xl shadow-lg">
              <FiMessageCircle className="text-white text-lg sm:text-xl" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                NutriAI
              </h2>
              <p className="text-xs sm:text-sm opacity-70">Seu assistente nutricional inteligente</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50"></div>
            <span className="text-xs sm:text-sm font-medium opacity-80">Online</span>
          </div>
        </div>

        {/* Chat Area */}
        <div
          ref={containerRef}
          className={`${theme.chatArea} rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6 overflow-y-auto`}
          style={{ height: '300px', minHeight: '250px', maxHeight: '500px' }}
        >
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 15
                }}
                className={`mb-3 sm:mb-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl max-w-[90%] sm:max-w-[85%] ${message.from === 'user'
                  ? `ml-auto ${theme.userMessage}`
                  : `mr-auto ${theme.aiMessage}`
                  } hover:scale-[1.02] hover:shadow-xl transition-all duration-300`}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.from === 'user'
                    ? 'bg-white/20 text-white'
                    : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                    {message.from === 'user' ? <FiUser className="text-xs sm:text-sm" /> : <FiMessageCircle className="text-xs sm:text-sm" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-medium mb-1 opacity-80">
                      {message.from === 'user' ? 'Você' : 'NutriAI'}
                    </div>
                    <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {message.text}
                    </div>
                    <div className="text-xs opacity-60 mt-1 sm:mt-2">
                      {formatDate(message.createdAt)}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing Indicator */}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.9 }}
                transition={{
                  duration: 0.5,
                  type: "spring",
                  stiffness: 120,
                  damping: 20
                }}
                className={`mb-3 sm:mb-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl max-w-[90%] sm:max-w-[85%] mr-auto ${theme.aiMessage} backdrop-blur-sm border-l-4 border-emerald-400`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-emerald-500/20 text-emerald-400">
                    <FiMessageCircle className="text-xs sm:text-sm animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs sm:text-sm font-medium mb-1 sm:mb-2 opacity-80">NutriAI está digitando...</div>
                    <div className="flex items-center gap-1">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                        className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-400 rounded-full"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                        className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-400 rounded-full"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
                        className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-400 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div className="space-y-3 sm:space-y-4">
          <div className="relative">
            <motion.textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={user ? (allowedToUse() ? '💬 Escreva sua pergunta para a NutriAI...' : '💎 NutriAI disponível apenas para planos MAX/COACH') : '🔐 Faça login para conversar'}
              className={`w-full p-3 sm:p-4 pr-12 sm:pr-16 ${theme.input} rounded-xl sm:rounded-2xl border-2 border-emerald-400/30 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 resize-none transition-all duration-300 text-sm sm:text-base`}
              rows={2}
              maxLength={500}
              // disabled={!user || !allowedToUse() || isTyping}
              whileFocus={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />
            <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 text-xs opacity-60">
              {input.length}/500
            </div>
          </div>

          <motion.button
            onClick={handleSend}
            // disabled={!user || !allowedToUse() || loading || !input.trim()}
            className={`w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 ${theme.primaryBtn} rounded-xl sm:rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            {loading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full"
                />
                <span className="hidden sm:inline">Enviando...</span>
                <span className="sm:hidden">...</span>
              </>
            ) : (
              <>
                <FiSend className="text-sm sm:text-base" />
                <span>Enviar</span>
              </>
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Plano Nutricional */}
      <motion.div
        initial={{ opacity: 0, y: 20, }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`p-4 mt-3 sm:p-6 rounded-2xl border ${theme.panel}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-400 to-red-500 flex items-center justify-center shadow-lg">
              <FiCheckCircle className="text-white" />
            </div>
            <div>
              <div className="text-lg font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">Plano Nutricional</div>
              <div className="text-xs text-gray-400">Seu plano personalizado</div>
            </div>
          </div>
          <div className="text-xs text-gray-400 flex items-center gap-1">
            <FiClock />
            Atualizado: {nutriInfos?.atualizadoEm ? new Date(nutriInfos.atualizadoEm).toLocaleString('pt-BR') : '—'}
          </div>
        </div>

        {/* Restrições */}
        {nutriInfos?.restricoes && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-start flex-col gap-3 border-2 rounded-xl border-red-400/30 shadow-lg shadow-red-500/20 p-4 mb-6 bg-gradient-to-r from-red-50/10 to-orange-50/10"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                <span className="text-white text-xs">⚠️</span>
              </div>
              <h3 className="font-semibold text-sm sm:text-base text-red-600">Restrições Alimentares</h3>
            </div>
            <p className="font-light italic text-sm pl-8 leading-relaxed">{nutriInfos.restricoes}</p>
          </motion.div>
        )}

        {renderPlano()}
      </motion.div>
    </div >
  );
}
