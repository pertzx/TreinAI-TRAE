// MeusTreinos.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import api from '../../../Api';
import { getBrazilDate } from '../../../../helpers/getBrazilDate.js';
import { useToast } from '../../../components/Toast.jsx';
import { createToastHelper } from '../../../utils/toastHelper.js';
import axios from 'axios';
import BuscarImagem from '../../../components/BuscarImagens.jsx';
import TokenUsageBar from '../../../components/TokenUsageBar.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  GripVertical, 
  Dumbbell, 
  Wand2, 
  X,
  Save,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

const MeusTreinos = ({ user, setUser, profissionalId, tema = 'dark' }) => {
  const isDark = tema === 'dark';
  const toastFunctions = useToast();
  const showToast = createToastHelper(toastFunctions);

  const [meusTreinos, setMeusTreinos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rebuke, setRebuke] = useState(false);
  const [loadingIA, setLoadingIA] = useState({});
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [nextOrder, setNextOrder] = useState(1);

  // Inline inputs state
  const [newTreinoVisible, setNewTreinoVisible] = useState(false);
  const [newTreinoName, setNewTreinoName] = useState('');
  const newTreinoRef = useRef(null);

  const [addExVisibleMap, setAddExVisibleMap] = useState({});
  const [addExNameMap, setAddExNameMap] = useState({});
  const addExRefs = useRef({});

  // Autosave debounce
  const saveTimeoutRef = useRef(null);
  const lastSavedRef = useRef(getBrazilDate());
  const mountedRef = useRef(true);

  // Toast
  const { showWarning, showTokenUsage } = useToast();

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (rebuke) {
      showWarning('Somente usuarios PRO, MAX ou COACH podem editar os seus treinos.');
      const t = setTimeout(() => setRebuke(false), 2000);
      return () => clearTimeout(t);
    }
  }, [rebuke, showWarning]);

  // helper: normaliza e popula estados a partir do user (ou lista de treinos)
  const syncMeusTreinosFromUser = useCallback((userObj) => {
    try {
      const initialRaw = (userObj && Array.isArray(userObj.meusTreinos)) ? userObj.meusTreinos : [];
      let initial = [...initialRaw]
        .sort((a, b) => {
          const ao = typeof a.ordem !== 'undefined' ? Number(a.ordem) : Infinity;
          const bo = typeof b.ordem !== 'undefined' ? Number(b.ordem) : Infinity;
          return ao - bo;
        })
        .map((item, index) => ({
          ...item,
          ordem: typeof item.ordem !== 'undefined' ? Number(item.ordem) : index + 1,
          exercicios: Array.isArray(item.exercicios) ? item.exercicios : [],
        }));

      setMeusTreinos(initial);

      // Preservar expansão se já existir, senão fechar
      setExpanded(prev => {
        const next = { ...prev };
        initial.forEach(t => {
          if (next[t.treinoId] === undefined) next[t.treinoId] = false;
        });
        return next;
      });
    } catch (err) {
      console.warn('syncMeusTreinosFromUser erro:', err);
      setMeusTreinos([]);
    }
  }, []);

  // Ref para controlar se já tentamos buscar/criar treinos para este usuario
  const hasFetchedRef = useRef(false);

  // Carregar treinos iniciais
  useEffect(() => {
    // Se não tiver user email, reseta e para
    if (!user?.email) {
      setMeusTreinos([]);
      setLoading(false);
      return;
    }

    // Se já temos treinos no contexto, apenas sincronizamos e finalizamos loading
    if (Array.isArray(user.meusTreinos) && user.meusTreinos.length > 0) {
      syncMeusTreinosFromUser(user);
      setLoading(false);
      return;
    }

    // Se chegamos aqui, o user existe mas não tem treinos carregados no contexto.
    // Não vamos mais chamar a API automaticamente para evitar loops.
    // Apenas definimos loading false para mostrar o estado vazio (com botão de gerar).
    setMeusTreinos([]);
    setLoading(false);

  }, [user?.email, user?.meusTreinos, profissionalId, syncMeusTreinosFromUser]);

  const handleGerarPlanoCompleto = async () => {
    // Permite gerar plano inicial mesmo se for free (backend controla limites)
    // if (!canEditSync()) { setRebuke(true); return; } 
    
    setLoading(true);
    try {
      const resp = await axios.post(`${import.meta.env.VITE_API_URL}/criar-meusTreinos`, { 
        email: user.email, 
        profissionalId 
      });
      
      if (resp?.data?.total_tokens) showTokenUsage(resp.data.total_tokens);

      if (resp?.data?.user && typeof setUser === 'function') {
        setUser(resp.data.user);
        syncMeusTreinosFromUser(resp.data.user);
        showToast('Plano de treino gerado com sucesso! 🚀', 'success');
      } else if (Array.isArray(resp?.data?.meusTreinos)) {
        const newTreinos = resp.data.meusTreinos;
        syncMeusTreinosFromUser({ meusTreinos: newTreinos });
        
        // Atualizar contexto global manualmente para evitar desync
        if (typeof setUser === 'function' && user) {
          setUser({ ...user, meusTreinos: newTreinos });
        }
        showToast('Plano de treino gerado com sucesso! 🚀', 'success');
      } else {
        // Se backend retornou msg de erro ou nada
        if (resp?.data?.msg) showToast(resp.data.msg, 'info');
      }
    } catch (err) {
      console.error('Erro ao gerar plano completo:', err);
      showToast(err?.response?.data?.msg || 'Erro ao gerar plano de treino.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // calcula nextOrder
  useEffect(() => {
    if (!user) { setNextOrder(1); return; }
    const historico = Array.isArray(user.historico) ? user.historico : [];
    if (historico.length === 0) { setNextOrder(1); return; }
    const ultimo = historico[historico.length - 1];
    const found = meusTreinos.find(t => t.treinoId === ultimo.treinoId);
    let computed = 1;
    if (found && typeof found.ordem === 'number') computed = found.ordem + 1;
    else computed = 1;
    setNextOrder(computed);
  }, [user, meusTreinos]);

  /* ------------------ helpers para salvar localmente (debounced) ------------------ */
  const saveChangesLocal = (updatedList) => {
    setMeusTreinos(updatedList);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      // Opcional: Implementar salvamento automático silencioso no backend se desejado
      // Por enquanto, confiamos nas chamadas explícitas de API nas ações
      lastSavedRef.current = getBrazilDate();
    }, 1000);
  };

  const updateOrderAndSave = async (newList) => {
    if (!canEditSync()) { setRebuke(true); return; }
    const updated = newList.map((t, idx) => ({ ...t, ordem: idx + 1 }));
    saveChangesLocal(updated);
    try {
      const res = await api.put('/atualizar-meusTreinos', { email: user.email, updated, profissionalId });
      if (res?.data?.user && typeof setUser === 'function') {
        setUser(res.data.user); // Atualiza contexto global silenciosamente
      }
    } catch (err) {
      console.warn('Erro ao salvar ordem no backend:', err);
      showToast('Erro ao salvar ordem dos treinos', 'error');
    }
  };

  /* ------------------ Ações CRUD sem reload ------------------ */
  const generateTreinoIA = async (nome) => {
    if (!canEditSync()) { setRebuke(true); return; }
    if (!nome || !nome.trim()) return;
    
    const key = 'novoTreino';
    setLoadingIA(prev => ({ ...prev, [key]: true }));
    const payload = { email: user.email, nome, profissionalId };

    try {
      const res = await api.post('/gerar-treino-ia', payload);
      if (res?.data?.tokensUsed) showTokenUsage(res.data.tokensUsed);
      if (res?.data?.msg) showToast(res.data.msg, res.data.success ? 'success' : 'info');
      
      if (res?.data?.user && typeof setUser === 'function') {
        setUser(res.data.user);
        syncMeusTreinosFromUser(res.data.user);
      } else if (Array.isArray(res?.data?.meusTreinos)) {
        syncMeusTreinosFromUser({ meusTreinos: res.data.meusTreinos });
      } else if (res?.data?.treino) {
        // Backend retornou o treino criado com ID real
        const newTreino = res.data.treino;
        const updated = [...meusTreinos, newTreino];
        syncMeusTreinosFromUser({ meusTreinos: updated });

        // Atualiza contexto global
        if (typeof setUser === 'function' && user) {
          setUser({ ...user, meusTreinos: updated });
        }
      } else {
        // Fallback local se a API não retornar a lista atualizada
        const newTreino = {
          treinoId: `local-${Date.now()}`,
          treinoName: nome,
          descricao: 'Treino gerado (atualize para sincronizar)',
          ordem: meusTreinos.length + 1,
          exercicios: []
        };
        saveChangesLocal([...meusTreinos, newTreino]);
      }
    } catch (err) {
      console.error('Erro ao gerar treino:', err);
      showToast(err?.response?.data?.msg || 'Erro ao criar treino', 'error');
    } finally {
      setLoadingIA(prev => ({ ...prev, [key]: false }));
    }
  };

  const generateExerciseIA = async (treinoId, nomeEx) => {
    if (!canEditSync()) { setRebuke(true); return; }
    if (!nomeEx || !nomeEx.trim()) return;
    
    setLoadingIA(prev => ({ ...prev, [treinoId]: true }));
    const payload = { email: user.email, treinoId, nome: nomeEx, profissionalId };

    try {
      const res = await api.post('/gerar-exercicio-ia', payload);
      if (res?.data?.tokensUsed) showTokenUsage(res.data.tokensUsed);
      if (res?.data?.msg) showToast(res.data.msg, res.data.success ? 'success' : 'info');

      if (res?.data?.user && typeof setUser === 'function') {
        setUser(res.data.user);
        syncMeusTreinosFromUser(res.data.user);
      } else if (res?.data?.treinoAtual || res?.data?.treinoAtualizado) {
        const updatedTreino = res.data.treinoAtual || res.data.treinoAtualizado;
        // Atualiza apenas o treino específico
        const updated = meusTreinos.map(t => t.treinoId === treinoId ? updatedTreino : t);
        saveChangesLocal(updated);
        
        // Atualiza contexto global
        if (typeof setUser === 'function' && user) {
          setUser({ ...user, meusTreinos: updated });
        }
      } else {
        // Fallback local
        const novoEx = { 
          exercicioId: `local-ex-${Date.now()}`, 
          nome: nomeEx, 
          ordem: (meusTreinos.find(t => t.treinoId === treinoId)?.exercicios.length || 0) + 1 
        };
        const updated = meusTreinos.map(t => 
          t.treinoId === treinoId ? { ...t, exercicios: [...(t.exercicios || []), novoEx] } : t
        );
        saveChangesLocal(updated);
      }
    } catch (err) {
      console.error('Erro ao gerar exercício:', err);
      showToast(err?.response?.data?.msg || 'Erro ao criar exercício', 'error');
    } finally {
      setLoadingIA(prev => ({ ...prev, [treinoId]: false }));
    }
  };

  const deletarExercicio = async (exId, treinoId) => {
    if (!canEditSync()) { setRebuke(true); return; }
    
    // Otimistic update
    const previousTreinos = [...meusTreinos];
    const updated = meusTreinos.map(t => {
      if (t.treinoId !== treinoId) return t;
      return { ...t, exercicios: (t.exercicios || []).filter(ex => ex.exercicioId !== exId) };
    });
    setMeusTreinos(updated); // Atualiza UI imediatamente

    try {
      let url = `/excluir-exercicio?email=${encodeURIComponent(user.email)}&exercicioId=${encodeURIComponent(exId)}&treinoId=${encodeURIComponent(treinoId)}`;
      if (profissionalId) url += `&profissionalId=${encodeURIComponent(profissionalId)}`;
      
      const res = await api.delete(url);
      if (res?.data?.msg) showToast(res.data.msg, 'success');
      
      if (res?.data?.user && typeof setUser === 'function') {
        setUser(res.data.user); // Sincroniza estado global
      } else if (typeof setUser === 'function' && user) {
        // Se o backend não retornar o user, atualizamos manualmente com o estado otimista
        setUser({ ...user, meusTreinos: updated });
      }
    } catch (err) {
      console.error('Erro ao excluir exercício:', err);
      showToast('Falha ao excluir exercício. Revertendo...', 'error');
      setMeusTreinos(previousTreinos); // Reverte em caso de erro
    }
  };

  const deletarTreino = async (treinoId) => {
    if (!canEditSync()) { setRebuke(true); return; }
    if (!confirm('Tem certeza que deseja excluir este treino permanentemente?')) return;

    // Optimistic update
    const previousTreinos = [...meusTreinos];
    const updated = meusTreinos.filter(t => t.treinoId !== treinoId).map((t, idx) => ({ ...t, ordem: idx + 1 }));
    setMeusTreinos(updated);

    try {
      let url = `/excluir-treino?email=${encodeURIComponent(user.email)}&treinoId=${encodeURIComponent(treinoId)}`;
      if (profissionalId) url += `&profissionalId=${encodeURIComponent(profissionalId)}`;
      
      const res = await api.delete(url);
      if (res?.data?.msg) showToast(res.data.msg, 'success');
      
      if (res?.data?.user && typeof setUser === 'function') {
        setUser(res.data.user);
      } else if (typeof setUser === 'function' && user) {
        setUser({ ...user, meusTreinos: updated });
      }
    } catch (err) {
      console.error('Erro ao excluir treino:', err);
      showToast('Falha ao excluir treino. Revertendo...', 'error');
      setMeusTreinos(previousTreinos);
    }
  };

  const canEditSync = () => {
    if (profissionalId) return true;
    return user?.planInfos?.planType !== 'free' && user?.planInfos?.status === 'ativo';
  };

  /* ------------------ Drag Handlers ------------------ */
  const handleDragStart = (e, treinoId) => {
    setDraggingId(treinoId);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', treinoId); } catch {}
  };
  const handleDragOver = (e, targetId) => { e.preventDefault(); if (dragOverId !== targetId) setDragOverId(targetId); };
  const handleDragLeave = () => setDragOverId(null);
  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (!canEditSync()) { setDraggingId(null); setDragOverId(null); setRebuke(true); return; }
    const draggedId = e.dataTransfer.getData('text/plain') || draggingId;
    if (!draggedId || draggedId === targetId) { setDraggingId(null); setDragOverId(null); return; }
    
    const fromIndex = meusTreinos.findIndex(t => t.treinoId === draggedId);
    const toIndex = meusTreinos.findIndex(t => t.treinoId === targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    
    const arr = [...meusTreinos];
    const [moved] = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, moved);
    
    updateOrderAndSave(arr);
    setDraggingId(null); setDragOverId(null);
  };

  const moveItem = (treinoId, direction) => {
    const idx = meusTreinos.findIndex(t => t.treinoId === treinoId);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === meusTreinos.length - 1) return;

    const arr = [...meusTreinos];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [arr[swapIdx], arr[idx]] = [arr[idx], arr[swapIdx]];
    updateOrderAndSave(arr);
  };

  const toggleExpand = (treinoId) => {
    setExpanded(prev => ({ ...prev, [treinoId]: !prev[treinoId] }));
  };

  const handleToggleAddTreino = async () => {
    if (!canEditSync()) { setRebuke(true); return; }
    if (!newTreinoVisible) { 
      setNewTreinoVisible(true); 
      setTimeout(() => newTreinoRef.current?.focus?.(), 100); 
      return; 
    }
    if (newTreinoName && newTreinoName.trim()) {
      await generateTreinoIA(newTreinoName);
      setNewTreinoName('');
      setNewTreinoVisible(false);
    } else {
      setNewTreinoVisible(false);
    }
  };

  const handleToggleAddExercise = (treinoId) => {
    if (!canEditSync()) { setRebuke(true); return; }
    const visible = !!addExVisibleMap[treinoId];
    if (!visible) {
      setAddExVisibleMap(prev => ({ ...prev, [treinoId]: true }));
      setTimeout(() => addExRefs.current[treinoId]?.focus?.(), 100);
      return;
    }
    const name = (addExNameMap[treinoId] || '').trim();
    if (!name) {
      setAddExVisibleMap(prev => ({ ...prev, [treinoId]: false }));
      setAddExNameMap(prev => ({ ...prev, [treinoId]: '' }));
      return;
    }
    generateExerciseIA(treinoId, name);
    setAddExVisibleMap(prev => ({ ...prev, [treinoId]: false }));
    setAddExNameMap(prev => ({ ...prev, [treinoId]: '' }));
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
        <Dumbbell className="absolute inset-0 m-auto text-blue-500/50 animate-pulse" size={24} />
      </div>
      <span className="text-gray-400 font-medium animate-pulse">Carregando treinos...</span>
    </div>
  );

  return (
    <div className="space-y-8 mt-6 p-2 sm:p-4 relative max-w-[1920px] mx-auto">
      
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-700/50 pb-6">
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Dumbbell className="text-blue-500" /> Meus Treinos
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Gerencie sua rotina de exercícios com ajuda da IA
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <TokenUsageBar user={user} className="w-full sm:w-48" />
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {newTreinoVisible ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <input 
                ref={newTreinoRef} 
                value={newTreinoName} 
                onChange={(e) => setNewTreinoName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleToggleAddTreino()}
                placeholder="Nome do treino (ex: Peito e Tríceps)..." 
                className={`flex-1 px-4 py-2 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-black'}`} 
              />
              <button onClick={handleToggleAddTreino} className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl transition-colors" disabled={loadingIA['novoTreino']}>
                {loadingIA['novoTreino'] ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={20} />}
              </button>
              <button onClick={() => { setNewTreinoVisible(false); setNewTreinoName(''); }} className={`p-2.5 rounded-xl border transition-colors ${isDark ? 'border-gray-700 hover:bg-gray-800 text-gray-400' : 'border-gray-200 hover:bg-gray-100 text-gray-600'}`}>
                <X size={20} />
              </button>
            </motion.div>
          ) : (
            <button 
              onClick={handleToggleAddTreino} 
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all"
            >
              <Plus size={20} /> Novo Treino
            </button>
          )}
        </div>
      </div>
      </div>

      {/* Grid de Treinos */}
      {meusTreinos.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 animate-fade-in">
          <div className={`p-6 rounded-full ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
            <Wand2 size={48} className="text-blue-500" />
          </div>
          <div className="max-w-md space-y-2">
            <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Nenhum treino encontrado
            </h3>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Você ainda não possui um plano de treino. Deixe nossa IA criar um plano completo e personalizado para seu objetivo!
            </p>
          </div>
          <button
            onClick={handleGerarPlanoCompleto}
            className="group flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <Wand2 size={20} className="group-hover:rotate-12 transition-transform" />
            Gerar Plano Completo com IA
          </button>
          
           <button 
              onClick={() => setNewTreinoVisible(true)}
              className={`mt-2 text-sm font-medium hover:underline flex items-center gap-2 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Ou criar manualmente <Plus size={14} />
            </button>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {meusTreinos.map((treino) => {
              const isDragging = draggingId === treino.treinoId;
              const isDragOver = dragOverId === treino.treinoId;
              const isExpanded = !!expanded[treino.treinoId];
              const isNextSlot = treino.ordem === nextOrder;
              const addVisible = !!addExVisibleMap[treino.treinoId];
              const addName = addExNameMap[treino.treinoId] || '';

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  key={treino.treinoId}
                  draggable
                  onDragStart={(e) => handleDragStart(e, treino.treinoId)}
                  onDragOver={(e) => handleDragOver(e, treino.treinoId)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, treino.treinoId)}
                  className={`
                    group relative flex flex-col
                    border rounded-3xl overflow-hidden transition-all duration-300
                    ${isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}
                    ${isDragging ? 'opacity-50 scale-95 border-dashed border-blue-500' : ''}
                    ${isDragOver ? 'ring-2 ring-blue-500 scale-[1.02] bg-blue-500/5' : ''}
                    ${isNextSlot ? 'ring-1 ring-green-500/50' : ''}
                    hover:shadow-xl hover:border-blue-500/30
                  `}
                >
                  {/* Drag Handle & Header */}
                  <div className={`p-5 flex flex-col gap-4 ${isDark ? 'bg-gray-800/40' : 'bg-gray-50/80'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`cursor-grab active:cursor-grabbing p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'hover:bg-gray-700 text-gray-500' : 'hover:bg-gray-200 text-gray-400'}`}>
                          <GripVertical size={18} />
                        </div>
                        <div className="min-w-0">
                          <h2 className={`text-lg font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {treino.treinoName}
                          </h2>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'}`}>
                              #{treino.ordem}
                            </span>
                            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                              {(treino.exercicios || []).length} exercícios
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button onClick={() => moveItem(treino.treinoId, 'up')} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}>
                          <ArrowUp size={16} />
                        </button>
                        <button onClick={() => moveItem(treino.treinoId, 'down')} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}>
                          <ArrowDown size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-700/30">
                       <button
                          onClick={() => toggleExpand(treino.treinoId)}
                          className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${isExpanded ? 'bg-blue-500/10 text-blue-400' : (isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500')}`}
                        >
                          {isExpanded ? 'Recolher' : 'Detalhes'}
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>

                        <button
                          onClick={() => deletarTreino(treino.treinoId)}
                          className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}
                          title="Excluir treino"
                        >
                          <Trash2 size={16} />
                        </button>
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 flex flex-col">
                    {/* Collapsed View Preview */}
                    {!isExpanded && (
                      <div className="p-5 flex-1 cursor-pointer hover:bg-gray-800/30 transition-colors" onClick={() => toggleExpand(treino.treinoId)}>
                        {treino.exercicios && treino.exercicios.length > 0 ? (
                          <div className="space-y-2">
                            {treino.exercicios.slice(0, 3).map((ex, i) => (
                              <div key={i} className={`text-sm flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                <span className="truncate">{ex.nome}</span>
                              </div>
                            ))}
                            {treino.exercicios.length > 3 && (
                              <div className="text-xs text-blue-500 font-medium pl-3.5">
                                +{treino.exercicios.length - 3} outros...
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2 min-h-[100px]">
                            <Dumbbell size={24} className="opacity-20" />
                            <span className="text-sm opacity-50">Sem exercícios</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Expanded View */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-black/5"
                        >
                          <div className="p-4 space-y-3">
                            {/* List of Exercises */}
                            <div className="space-y-3">
                              {(treino.exercicios || []).map((ex) => (
                                <motion.div
                                  layout
                                  key={ex.exercicioId}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className={`
                                    relative overflow-hidden rounded-xl border flex flex-col sm:flex-row
                                    ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}
                                  `}
                                >
                                  {/* Image / GIF Area */}
                                  <div className="sm:w-24 h-24 sm:h-auto relative shrink-0 bg-gray-900">
                                    <BuscarImagem
                                      chatTreino={true}
                                      email={user?.email}
                                      query={ex.nome}
                                      className="w-full h-full object-cover opacity-80"
                                      alt={ex.nome}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent sm:hidden" />
                                    <span className="absolute bottom-1 right-1 bg-black/50 text-[10px] text-white px-1.5 rounded backdrop-blur-sm">GIF</span>
                                  </div>

                                  {/* Exercise Details */}
                                  <div className="p-3 flex-1 min-w-0 flex flex-col justify-between gap-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <h4 className={`font-medium text-sm sm:text-base leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {ex.nome}
                                      </h4>
                                      <button 
                                        onClick={() => deletarExercicio(ex.exercicioId, treino.treinoId)}
                                        className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                      {ex.series && (
                                        <span className={`px-2 py-0.5 rounded-md ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                                          {ex.series} séries
                                        </span>
                                      )}
                                      {ex.repeticoes && (
                                        <span className={`px-2 py-0.5 rounded-md ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                                          {ex.repeticoes} reps
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>

                            {/* Add Exercise Input */}
                            <div className={`mt-4 rounded-xl p-1 ${isDark ? 'bg-gray-800/50' : 'bg-gray-100/50'}`}>
                              {addVisible ? (
                                <motion.div 
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className="flex flex-col sm:flex-row gap-2 p-2"
                                >
                                  <input
                                    ref={(el) => { addExRefs.current[treino.treinoId] = el; }}
                                    value={addName}
                                    onChange={(e) => setAddExNameMap(prev => ({ ...prev, [treino.treinoId]: e.target.value }))}
                                    onKeyDown={(e) => e.key === 'Enter' && handleToggleAddExercise(treino.treinoId)}
                                    placeholder="Ex: Supino Reto..."
                                    className={`flex-1 px-3 py-2 rounded-lg text-sm border outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`}
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleToggleAddExercise(treino.treinoId)}
                                      disabled={loadingIA[treino.treinoId]}
                                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 min-w-[100px]"
                                    >
                                      {loadingIA[treino.treinoId] ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Wand2 size={14} /> Gerar</>}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setAddExVisibleMap(prev => ({ ...prev, [treino.treinoId]: false }));
                                        setAddExNameMap(prev => ({ ...prev, [treino.treinoId]: '' }));
                                      }}
                                      className={`px-3 py-2 rounded-lg text-sm font-medium border ${isDark ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-300 hover:bg-gray-200 text-gray-600'}`}
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </motion.div>
                              ) : (
                                <button
                                  onClick={() => setAddExVisibleMap(prev => ({ ...prev, [treino.treinoId]: true }))}
                                  className={`w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${isDark ? 'text-gray-400 hover:bg-gray-800 hover:text-white' : 'text-gray-500 hover:bg-white hover:shadow-sm hover:text-blue-600'}`}
                                >
                                  <Plus size={16} /> Adicionar Exercício
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default MeusTreinos;
