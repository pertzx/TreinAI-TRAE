// ChatNutriAI.jsx
import React, { useEffect, useRef, useState } from 'react';
import { FiSend, FiTrash2, FiUser, FiCpu, FiClock, FiCheckCircle } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../Api.js'; // ajuste se necessário

export default function ChatNutriAI({ user, tema = 'dark', profissionalId = null }) {
  const isDark = tema === 'dark';

  const theme = {
    container: isDark 
      ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100' 
      : 'bg-gradient-to-br from-white via-gray-50 to-white text-gray-900',
    panel: isDark 
      ? 'bg-gradient-to-r from-gray-800/80 to-gray-700/80 border-emerald-400/30 shadow-xl shadow-emerald-500/20 backdrop-blur-sm' 
      : 'bg-gradient-to-r from-white/90 to-gray-50/90 border-emerald-400/40 shadow-2xl shadow-emerald-500/30 backdrop-blur-sm',
    chatArea: isDark 
      ? 'bg-gradient-to-b from-gray-900/50 to-gray-800/50 border border-gray-700/50' 
      : 'bg-gradient-to-b from-white/80 to-gray-50/80 border border-gray-200/50',
    input: isDark 
      ? 'bg-gray-800/80 text-gray-100 border-gray-600/50 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20' 
      : 'bg-white/90 text-gray-900 border-gray-300/50 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20',
    primaryBtn: 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105',
    secondaryBtn: isDark 
      ? 'bg-gray-700/80 hover:bg-gray-600/80 text-gray-200 border border-gray-600/50' 
      : 'bg-gray-100/80 hover:bg-gray-200/80 text-gray-700 border border-gray-300/50',
    userMessage: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg',
    aiMessage: isDark 
      ? 'bg-gradient-to-r from-gray-700/80 to-gray-600/80 text-gray-100 border border-gray-600/30' 
      : 'bg-gradient-to-r from-gray-100/80 to-white/80 text-gray-900 border border-gray-200/50',
    notifyBg: isDark ? 'bg-emerald-700/90 text-white' : 'bg-emerald-50/90 text-emerald-900',
    errorBg: isDark ? 'bg-red-700/90 text-white' : 'bg-red-50/90 text-red-900'
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

  // helper: show notification (auto hide)
  const showNotify = (text, type = 'info', timeout = 4000) => {
    setNotify({ text, type });
    setTimeout(() => setNotify(null), timeout);
  };

  // scroll to bottom on new message if at bottom
  useEffect(() => {
    c += 1
    if (c <= 0) return

    const el = containerRef.current;
    if (!el) return;
    // if user is near bottom, scroll; else don't interrupt
    const threshold = 120;
    const scrollBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
    if (scrollBottom <= threshold) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

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
      if (data.msg) {
        console.log(data)
        showNotify(data.msg, data.success === false ? 'error' : 'info');
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
        setMessages(prev => [...prev, { id: `ai-${Date.now()}`, from: 'nutri', text: textResp, createdAt: new Date() }]);
      } else {
        // fallback: if API returned a textual reply (msg) show it, else generic success/fail
        if (typeof data.success !== 'undefined') {
          if (data.success) {
            const successText = data.msg || '✨ Resposta da NutriAI recebida.';
            setMessages(prev => [...prev, { id: `ai-${Date.now()}`, from: 'nutri', text: successText, createdAt: new Date() }]);
          } else {
            const failText = data.msg || '❌ A NutriAI não conseguiu gerar uma resposta válida.';
            setMessages(prev => [...prev, { id: `ai-${Date.now()}`, from: 'nutri', text: failText, createdAt: new Date() }]);
          }
        } else {
          // no structured response, attempt to show raw message if present
          if (data?.raw) {
            setMessages(prev => [...prev, { id: `ai-${Date.now()}`, from: 'nutri', text: String(data.raw).slice(0, 1000), createdAt: new Date() }]);
          } else {
            // fallback: generic success message
            setMessages(prev => [...prev, { id: `ai-${Date.now()}`, from: 'nutri', text: '✨ Resposta da NutriAI recebida.', createdAt: new Date() }]);
          }
        }
      }

      return data;
    } catch (err) {
      console.error('conversar-nutri error', err);
      const msg = err?.response?.data?.msg || 'Erro ao comunicar com servidor.';
      showNotify(msg, 'error');
      setMessages(prev => [...prev, { id: `ai-${Date.now()}`, from: 'nutri', text: `❌ Erro: ${msg}`, createdAt: new Date() }]);
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
      showNotify('🔐 Faça login para usar a NutriAI.', 'error');
      return;
    }
    // check plan
    if (!allowedToUse()) {
      showNotify('💎 NutriAI disponível apenas para planos MAX ou COACH. Atualize seu plano para usar.', 'error');
      return;
    }

    // optimistic add user message
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, from: 'user', text: texto, createdAt: new Date() }]);
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

  // if user changes and has nutriInfos we sync local copy
  useEffect(() => {
    if (user && user.nutriInfos) setNutriInfos(user.nutriInfos);
  }, [user]);

  return (
    <div className={`w-full max-w-5xl mx-auto p-4 sm:p-6 rounded-3xl shadow-2xl ${theme.container} backdrop-blur-sm`}>
      {/* Header do Chat */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`mb-6 p-4 sm:p-6 rounded-2xl border ${theme.panel}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
              <FiCpu className="text-white text-xl" />
            </div>
            <div>
              <div className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">NutriAI</div>
              <div className="text-xs text-gray-400">Seu nutricionista virtual inteligente</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <FiUser className="text-emerald-400" />
            <span className="truncate">{user ? (user.email || user.username || '') : 'Usuário não autenticado'}</span>
          </div>
        </div>

        {/* Chat Area */}
        <div ref={containerRef} className={`max-h-[40vh] sm:max-h-[45vh] overflow-auto p-4 mb-4 rounded-xl ${theme.chatArea} backdrop-blur-sm`}>
          <AnimatePresence>
            {messages.map((m) => (
              <motion.div 
                key={m.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className={`mb-4 max-w-[85%] sm:max-w-[80%] ${m.from === 'user' ? 'ml-auto' : ''}`}
              >
                <div className="flex items-start gap-3 mb-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md ${m.from === 'user' ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-gradient-to-r from-emerald-400 to-teal-500'}`}>
                    {m.from === 'user' ? <FiUser className="text-white text-sm" /> : <FiCpu className="text-white text-sm" />}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {m.from === 'user' ? 'Você' : 'NutriAI'}
                  </div>
                </div>
                <div className={`p-3 sm:p-4 rounded-2xl ml-11 shadow-lg ${m.from === 'user' ? theme.userMessage : theme.aiMessage}`}>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</div>
                  <div className="text-[10px] opacity-70 mt-2 flex items-center gap-1">
                    <FiClock className="text-[8px]" />
                    {new Date(m.createdAt).toLocaleString('pt-BR')}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* Typing Indicator */}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-4 max-w-[80%]"
              >
                <div className="flex items-start gap-3 mb-1">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 flex items-center justify-center shadow-md">
                    <FiCpu className="text-white text-sm" />
                  </div>
                  <div className="text-xs text-gray-400 mt-1">NutriAI está digitando...</div>
                </div>
                <div className={`p-3 rounded-2xl ml-11 ${theme.aiMessage}`}>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div className="flex flex-col sm:flex-row w-full gap-3">
          <div className="flex-1 relative">
            <input
              type='text'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={user ? (allowedToUse() ? '💬 Escreva sua pergunta para a NutriAI...' : '💎 NutriAI disponível apenas para planos MAX/COACH') : '🔐 Faça login para conversar'}
              className={`w-full p-3 sm:p-4 rounded-xl border text-sm sm:text-base transition-all duration-300 ${theme.input}`}
              disabled={!user || !allowedToUse()}
            />
          </div>
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSend}
              disabled={!user || !allowedToUse() || loading || !input.trim()}
              className={`px-4 sm:px-6 py-3 sm:py-4 rounded-xl text-sm font-medium flex items-center gap-2 ${theme.primaryBtn} ${(!user || !allowedToUse() || loading || !input.trim()) ? 'opacity-60 cursor-not-allowed' : ''} min-h-[48px]`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <FiSend />
                  Enviar
                </>
              )}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (!user) { showNotify('🔐 Faça login para usar.', 'error'); return; }
                if (!allowedToUse()) { showNotify('💎 Disponível apenas para planos MAX/COACH.', 'error'); return; }
                setInput('');
              }}
              className={`px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${theme.secondaryBtn} min-h-[48px] transition-all duration-300`}
            >
              <FiTrash2 />
              Limpar
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Plano Nutricional */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`p-4 sm:p-6 rounded-2xl border ${theme.panel}`}
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

      {/* Notification */}
      <AnimatePresence>
        {notify && (
          <motion.div
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            className={`fixed right-4 sm:right-6 bottom-6 sm:bottom-8 z-50 px-4 sm:px-6 py-3 sm:py-4 rounded-xl shadow-2xl max-w-[90%] sm:max-w-md ${notify.type === 'error' ? theme.errorBg : theme.notifyBg} backdrop-blur-sm`}
            role="status"
          >
            <div className="text-sm font-medium">{notify.text}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
