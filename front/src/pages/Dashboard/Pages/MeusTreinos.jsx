// MeusTreinos.jsx (com toasts temáticos)
import React, { useEffect, useRef, useState, useCallback } from 'react';
import api from '../../../Api';
import { FiChevronDown, FiChevronUp, FiPlus } from 'react-icons/fi';
import { getBrazilDate } from '../../../../helpers/getBrazilDate.js';
import { useToast } from '../../../components/Toast.jsx';
import { createToastHelper } from '../../../utils/toastHelper.js';
import axios from 'axios';
import BuscarImagem from '../../../components/BuscarImagens.jsx';

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
  const { showError, showWarning } = useToast();

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    showWarning('Somente usuarios PRO, MAX ou COACH podem editar os seus treinos.');

    setLoading(true)

    setTimeout(() => {
      setLoading(false);
    }, 1 * 1000);
  }, [rebuke]);

  useEffect(() => {
    if (rebuke) {
      const t = setTimeout(() => setRebuke(false), 2000);
      return () => clearTimeout(t);
    }
  }, [rebuke]);

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

      const expMap = {};
      initial.forEach(t => { expMap[t.treinoId] = false; });
      setExpanded(expMap);

      const vis = {};
      const names = {};
      initial.forEach(t => { vis[t.treinoId] = false; names[t.treinoId] = ''; });
      setAddExVisibleMap(vis);
      setAddExNameMap(names);
    } catch (err) {
      console.warn('syncMeusTreinosFromUser erro:', err);
      setMeusTreinos([]);
      setExpanded({});
      setAddExVisibleMap({});
      setAddExNameMap({});
    }
  }, []);

  // Carregar treinos iniciais a partir do user (ou criar no backend)
  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      try {
        if (!user) {
          setMeusTreinos([]);
          setLoading(false);
          return;
        }

        if (user.meusTreinos.length === 0) {
          showToast(
            '✨ Seus treinos estão sendo criados. Por favor, aguarde alguns instantes ou atualize a página caso ainda não apareçam.',
            'success'
          );

          setTimeout(() => {
            showToast(
              '😅 Pode demorar. Aguarde o término ou recarregue a página.',
              'info'
            );
          }, 2 * 1000);

        } else {
          showToast('🔎 Buscando suas informações de treinos...', 'info');
        }

        if (!Array.isArray(user.meusTreinos) || user.meusTreinos.length === 0) {
          // tenta criar treinos iniciais no backend
          try {
            const resp = await axios.post(`${import.meta.env.VITE_API_URL}/criar-meusTreinos`, { email: user.email, profissionalId });

            showToast(
              '😅 Pode demorar. Aguarde o término ou recarregue a página.',
              'info'
            );

            // se backend retornar user atualizado, sincroniza
            if (resp?.data?.user && typeof setUser === 'function') {
              setUser(resp.data.user);
              syncMeusTreinosFromUser(resp.data.user);
            } else if (Array.isArray(resp?.data?.meusTreinos)) {
              // sincroniza apenas os treinos retornados
              syncMeusTreinosFromUser({ meusTreinos: resp.data.meusTreinos });
            } else {
              // fallback: usa user.meusTreinos (vazio)
              syncMeusTreinosFromUser(user);
            }
          } catch (err) {
            console.warn('Falha ao criar meusTreinos no backend (fallback local):', err);
            showToast(err?.response?.data?.msg || err?.message || 'Erro ao criar treinos', 'error');
            syncMeusTreinosFromUser(user);
          }
        } else {
          syncMeusTreinosFromUser(user);
        }
      } catch (err) {
        console.error('Erro ao carregar treinos:', err);
        setMeusTreinos([]);
        showToast('Erro ao carregar treinos', 'error');
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    carregar();
  }, [user, setUser, syncMeusTreinosFromUser, profissionalId]);

  // calcula nextOrder a partir do histórico
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
      const payload = { email: user.email, meusTreinos: updatedList };
      console.log('UPDATE (onChange) payload ->', payload);
      lastSavedRef.current = getBrazilDate();

      // Se quiser reabilitar o envio automático, pode descomentar.
      /*
      try {
        const res = await api.post('/atualizar-meusTreinos', payload);
        if (res?.data?.msg) showToast(res.data.msg, res.data.success ? 'success' : 'info');
        if (res?.data?.user && typeof setUser === 'function') setUser(res.data.user);
      } catch (err) {
        console.error('Erro ao atualizar meusTreinos:', err);
        showToast(err?.response?.data?.msg || err?.message || 'Erro ao salvar', 'error');
      }
      */
    }, 1000);
  };

  // aplica novas ordens e salva (usa PUT endpoint se desejar)
  const updateOrderAndSave = async (newList) => {
    if (!canEditSync()) { setRebuke(true); return; }
    const updated = newList.map((t, idx) => ({ ...t, ordem: idx + 1 }));
    saveChangesLocal(updated);
    // sincronizar com o backend imediatamente
    try {
      const res = await api.put('/atualizar-meusTreinos', { email: user.email, updated, profissionalId });
      if (res?.data?.msg) showToast(res.data.msg, res.data.success ? 'success' : 'info');
      if (res?.data?.user && typeof setUser === 'function') {
        setUser(res.data.user);
        syncMeusTreinosFromUser(res.data.user);
      } else {
        console.warn('PUT /atualizar-meusTreinos retornou sem user atualizado.');
      }
    } catch (err) {
      console.warn('Erro no PUT /atualizar-meusTreinos (mantendo estado local):', err);
      showToast(err?.response?.data?.msg || err?.message || 'Falha ao salvar ordem', 'error');
    }
  };

  /* ------------------ IA: gerar treino e exercício (sem reload) ------------------ */
  const generateTreinoIA = async (nome) => {
    if (!canEditSync()) { setRebuke(true); return; }
    if (!nome || !nome.trim()) return;
    const key = 'novoTreino';
    setLoadingIA(prev => ({ ...prev, [key]: true }));
    const payload = { email: user.email, nome, profissionalId };
    console.log('GENERATE TREINO (IA) payload ->', payload);

    try {
      const res = await api.post('/gerar-treino-ia', payload);
      if (res?.data?.msg) showToast(res.data.msg, res.data.success ? 'success' : 'info');
      if (res?.data?.user && typeof setUser === 'function') {
        setUser(res.data.user);
        syncMeusTreinosFromUser(res.data.user);
      } else if (Array.isArray(res?.data?.meusTreinos)) {
        syncMeusTreinosFromUser({ meusTreinos: res.data.meusTreinos });
      } else {
        // fallback local
        const newTreino = {
          treinoId: `local-${getBrazilDate()}`,
          treinoName: nome,
          descricao: '',
          ordem: meusTreinos.length + 1,
          exercicios: []
        };
        const updated = [...meusTreinos, newTreino];
        saveChangesLocal(updated);
        console.warn('gerar-treino-ia: backend não retornou user/meusTreinos. Atualizado localmente.');
      }
    } catch (err) {
      console.error('Erro ao gerar treino via IA:', err);
      showToast(err?.response?.data?.msg || err?.message || 'Erro IA treinos', 'error');
    } finally {
      window.location.reload()
      setLoadingIA(prev => ({ ...prev, [key]: false }));
    }
  };

  const generateExerciseIA = async (treinoId, nomeEx) => {
    if (!canEditSync()) { setRebuke(true); return; }
    if (!nomeEx || !nomeEx.trim()) return;
    setLoadingIA(prev => ({ ...prev, [treinoId]: true }));
    const payload = { email: user.email, treinoId, nome: nomeEx, profissionalId };
    console.log('GENERATE EXERCISE (IA) payload ->', payload);

    try {
      const res = await api.post('/gerar-exercicio-ia', payload);
      if (res?.data?.msg) showToast(res.data.msg, res.data.success ? 'success' : 'info');
      if (res?.data?.user && typeof setUser === 'function') {
        setUser(res.data.user);
        syncMeusTreinosFromUser(res.data.user);
      } else if (res?.data?.treinoAtual) {
        const updated = meusTreinos.map(t => t.treinoId === treinoId ? res.data.treinoAtual : t);
        saveChangesLocal(updated);
      } else {
        const novoEx = { exercicioId: `local-ex-${getBrazilDate()}`, nome: nomeEx, ordem: (meusTreinos.find(t => t.treinoId === treinoId)?.exercicios.length || 0) + 1 };
        const updated = meusTreinos.map(t => t.treinoId === treinoId ? { ...t, exercicios: [...t.exercicios, novoEx] } : t);
        saveChangesLocal(updated);
        console.warn('gerar-exercicio-ia: backend não retornou treinoAtual. Atualizado localmente.');
      }
    } catch (err) {
      console.error('Erro ao gerar exercício via IA:', err);
      showToast(err?.response?.data?.msg || err?.message || 'Erro IA exercício', 'error');
    } finally {
      window.location.reload()
      setLoadingIA(prev => ({ ...prev, [treinoId]: false }));
    }
  };

  /* ------------------ Drag and reorder handlers ------------------ */
  const handleDragStart = (e, treinoId) => {
    setDraggingId(treinoId);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', treinoId);
    } catch {
      // Fallback para navegadores que não suportam setData
    }
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

  const moveUp = (treinoId) => {
    const idx = meusTreinos.findIndex(t => t.treinoId === treinoId);
    if (idx <= 0) return;
    const arr = [...meusTreinos];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    updateOrderAndSave(arr);
  };
  const moveDown = (treinoId) => {
    const idx = meusTreinos.findIndex(t => t.treinoId === treinoId);
    if (idx === -1 || idx >= meusTreinos.length - 1) return;
    const arr = [...meusTreinos];
    [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
    updateOrderAndSave(arr);
  };

  const toggleExpand = (treinoId) => {
    setExpanded(prev => ({ ...prev, [treinoId]: !prev[treinoId] }));
  };

  /* ------------------ adicionar / remover itens sem reload ------------------ */
  const handleToggleAddTreino = async () => {
    if (!canEditSync()) { setRebuke(true); return; }
    if (!newTreinoVisible) { setNewTreinoVisible(true); setTimeout(() => newTreinoRef.current?.focus?.(), 50); return; }
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
      setTimeout(() => addExRefs.current[treinoId]?.focus?.(), 50);
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

  const deletarExercicio = async (exId, treinoId) => {
    if (!canEditSync()) { setRebuke(true); return; }
    if (!exId || !treinoId) return;
    try {
      const res = await api.delete(`/excluir-exercicio?email=${encodeURIComponent(user.email)}&exercicioId=${encodeURIComponent(exId)}&treinoId=${encodeURIComponent(treinoId)}&profissionalId=${profissionalId}`);
      if (res?.data?.msg) showToast(res.data.msg, res.data.success ? 'success' : 'info');
      if (res?.data?.user && typeof setUser === 'function') {
        setUser(res.data.user);
        syncMeusTreinosFromUser(res.data.user);
        return;
      }
      const updated = meusTreinos.map(t => {
        if (t.treinoId !== treinoId) return t;
        return { ...t, exercicios: (t.exercicios || []).filter(ex => ex.exercicioId !== exId) };
      });
      saveChangesLocal(updated);
    } catch (err) {
      console.error('Erro ao excluir exercício:', err);
      showToast(err?.response?.data?.msg || err?.message || 'Erro ao excluir exercício', 'error');
    } finally {
      window.location.reload();
    }
  };

  const deletarTreino = async (treinoId) => {
    if (!canEditSync()) { setRebuke(true); return; }
    if (!treinoId) return;
    if (!confirm('Tem certeza que deseja excluir este treino?')) return;
    try {
      const res = await api.delete(`/excluir-treino?email=${encodeURIComponent(user.email)}&treinoId=${encodeURIComponent(treinoId)}&profissionalId=${profissionalId}`);
      if (res?.data?.msg) showToast(res.data.msg, res.data.success ? 'success' : 'info');
      if (res?.data?.user && typeof setUser === 'function') {
        setUser(res.data.user);
        syncMeusTreinosFromUser(res.data.user);
        return;
      }
      const updated = meusTreinos.filter(t => t.treinoId !== treinoId).map((t, idx) => ({ ...t, ordem: idx + 1 }));
      saveChangesLocal(updated);
    } catch (err) {
      console.error('Erro ao excluir treino:', err);
      showToast(err?.response?.data?.msg || err?.message || 'Erro ao excluir treino', 'error');
    } finally {
      window.location.reload()
    }
  };

  // canEditSync: synchronous wrapper (used in handlers that expect sync)
  const canEditSync = () => {
    // permissões simples: se passou profissionalId, assume true (servidor fará validação)
    if (profissionalId) return true;
    return user?.planInfos?.planType !== 'free' && user?.planInfos?.status === 'ativo';
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="relative w-24 h-24">
        {/* IA-inspired orbit rings */}
        <div className="absolute inset-0 rounded-full border-2 border-blue-400/20 animate-[spin_4s_linear_infinite]" />
        <div className="absolute inset-2 rounded-full border-2 border-purple-400/30 animate-[spin_3s_linear_infinite_reverse]" />
        <div className="absolute inset-4 rounded-full border-2 border-indigo-400/40 animate-[spin_2s_linear_infinite]" />
        {/* Central glowing dot */}
        <div className="absolute inset-0 m-auto w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full shadow-[0_0_12px_#6366f1] animate-pulse" />
      </div>
      <span className="ml-4 text-lg font-medium text-gray-400">Gerando treinos com IA...</span>
    </div>
  );

  return (
    <div className="space-y-6 mt-6 p-3 relative">
      {/* {rebuke && (
        <div className={`p-4 border-4 rounded-2xl text-xl font-normal ${isDark ? 'bg-red-800 border-red-900 text-white' : 'bg-red-50 border-red-200 text-red-700'}`}>
          Somente usuarios com o plano <b>PRO, MAX ou COACH</b> podem editar os treinos!
        </div>
      )} */}

      {/* Novo treino */}
      <div className="flex items-center justify-end gap-3">
        {newTreinoVisible ? (
          <div className="flex items-center gap-2">
            <input ref={newTreinoRef} value={newTreinoName} onChange={(e) => setNewTreinoName(e.target.value)} placeholder="Nome do treino..." className={`px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`} />
            <button onClick={handleToggleAddTreino} className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg" disabled={loadingIA['novoTreino']}>
              {loadingIA['novoTreino'] ? 'Criando...' : <><FiPlus /> Criar</>}
            </button>
            <button onClick={() => { setNewTreinoVisible(false); setNewTreinoName(''); }} className={`px-3 py-2 rounded-lg border ${isDark ? 'border-gray-700 text-white hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'}`} title="Cancelar">Cancelar</button>
          </div>
        ) : (
          <button onClick={handleToggleAddTreino} className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg" title="Adicionar novo treino (clique para mostrar input)">
            <FiPlus /> Novo Treino
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {meusTreinos.map((treino) => {
          const isDragging = draggingId === treino.treinoId;
          const isDragOver = dragOverId === treino.treinoId;
          const isExpanded = !!expanded[treino.treinoId];
          const isNextSlot = treino.ordem === nextOrder;
          const addVisible = !!addExVisibleMap[treino.treinoId];
          const addName = addExNameMap[treino.treinoId] || '';

          return (
            <div
              key={treino.treinoId}
              draggable
              onDragStart={(e) => handleDragStart(e, treino.treinoId)}
              onDragOver={(e) => handleDragOver(e, treino.treinoId)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, treino.treinoId)}
              tabIndex={0}
              aria-grabbed={isDragging}
              className={`border w-full h-fit p-4 sm:p-6 rounded-2xl shadow-md transition-all duration-300 ${isDark ? 'bg-gray-800 text-white' : 'bg-gray-50 text-black'} ${isDragging ? 'opacity-70 border-dashed' : ''} ${isDragOver ? 'ring-2 ring-blue-300' : ''} ${isNextSlot ? 'border-2 border-green-500 ring-2 ring-green-200' : ''}`}
              style={{ touchAction: 'manipulation' }}
            >
              <div className="mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold truncate break-words">{treino.treinoName}</h2>
                    <p className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>ordem: {treino.ordem}</p>
                    <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                      {(treino.exercicios || []).length} exercícios
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isNextSlot && (
                      <div className="bg-green-100 text-green-800 px-2 sm:px-3 py-1 rounded-full text-xs font-semibold">
                        Próximo treino
                      </div>
                    )}
                    <button
                      onClick={() => toggleExpand(treino.treinoId)}
                      aria-expanded={isExpanded}
                      className="p-2 rounded-md hover:bg-gray-100 transition"
                      title={isExpanded ? 'Mostrar menos' : 'Mostrar mais'}
                    >
                      {isExpanded ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap justify-between items-center gap-2 sm:gap-3">
                  <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
                    <span className="select-none">Arraste</span>
                    <svg className="w-5 h-5 opacity-60" viewBox="0 0 24 24" fill="none">
                      <path d="M7 10l5-5 5 5M7 14l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => moveUp(treino.treinoId)}
                      title="Mover para cima"
                      className={`px-2 sm:px-3 py-1 text-sm rounded-lg border ${isDark ? 'border-gray-700 text-white hover:bg-gray-800' : 'border-gray-300 text-gray-800 hover:bg-gray-100'}`}
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveDown(treino.treinoId)}
                      title="Mover para baixo"
                      className={`px-2 sm:px-3 py-1 text-sm rounded-lg border ${isDark ? 'border-gray-700 text-white hover:bg-gray-800' : 'border-gray-300 text-gray-800 hover:bg-gray-100'}`}
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => deletarTreino(treino.treinoId)}
                      title="Excluir treino"
                      className={`px-2 sm:px-3 py-1 text-sm rounded-lg border ${isDark ? 'border-red-700 text-red-300 hover:bg-red-900/20' : 'border-red-300 text-red-600 hover:bg-red-100'}`}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>

              {treino.descricao && <p className={`${isDark ? 'text-gray-200' : 'text-gray-700'} mb-4`}>{treino.descricao}</p>}

              {!isExpanded ? (
                <div className={`${isDark ? 'bg-gray-700' : 'bg-white'} p-3 sm:p-4 rounded-xl border`}>
                  <div className="mb-2">
                    <p className="font-medium text-sm sm:text-base">{(treino.exercicios || []).length} exercícios</p>
                    <p className="text-xs sm:text-sm text-gray-400">Clique para ver detalhes.</p>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400">
                    <span className="block">{treino.exercicios?.[0]?.nome}</span>
                    <span className="block text-xs">
                      {treino.exercicios && treino.exercicios.length > 1 ? `+${treino.exercicios.length - 1} outros` : ''}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:gap-4">
                  {(treino.exercicios || []).map((ex) => (
                    <div
                      key={ex.exercicioId}
                      className={`rounded-2xl overflow-hidden border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white shadow-md'} transition-shadow hover:shadow-lg`}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2">
                        <div className="relative group">
                          <BuscarImagem
                            imgType={'gif'}
                            chatTreino={true}
                            email={user?.email}
                            query={ex.nome}
                            className="w-full h-[280px] md:h-[360px] object-cover"
                            alt={`Imagem do exercício ${ex.nome}`}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
                          <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 flex items-center justify-between pointer-events-none">
                            <div>
                              <p className="text-white font-semibold text-sm sm:text-base truncate">{ex.nome}</p>
                              {ex.musculo && (
                                <span className="mt-1 inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-white/20 text-white backdrop-blur-sm">
                                  {ex.musculo}
                                </span>
                              )}
                            </div>
                            <span className="hidden md:inline-flex px-2 py-1 text-[10px] rounded bg-white/10 text-white border border-white/20">GIF</span>
                          </div>
                        </div>
                        <div className="p-3 sm:p-4 flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-blue-900/40 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>Ordem {ex.ordem}</span>
                            {ex.series != null && (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-green-900/40 text-green-200' : 'bg-green-100 text-green-800'}`}>{ex.series} séries</span>
                            )}
                            {ex.repeticoes != null && (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-purple-900/40 text-purple-200' : 'bg-purple-100 text-purple-800'}`}>{ex.repeticoes} reps</span>
                            )}
                            {ex.pse != null && (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-orange-900/40 text-orange-200' : 'bg-orange-100 text-orange-800'}`}>pse {ex.pse}/10</span>
                            )}
                          </div>
                          {ex.instrucoes && (
                            <div className={`${isDark ? 'text-gray-200' : 'text-gray-700'} text-xs sm:text-sm`}>{ex.instrucoes}</div>
                          )}
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => deletarExercicio(ex.exercicioId, treino.treinoId)}
                              className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-lg border ${isDark ? 'border-gray-700 text-white hover:bg-gray-800' : 'border-gray-300 text-gray-800 hover:bg-gray-100'}`}
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Adicionar exercício */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
                    {addVisible ? (
                      <>
                        <input
                          ref={(el) => { addExRefs.current[treino.treinoId] = el; }}
                          value={addName}
                          onChange={(e) => setAddExNameMap(prev => ({ ...prev, [treino.treinoId]: e.target.value }))}
                          placeholder="Nome do exercício..."
                          className={`px-3 py-2 text-sm rounded-lg border flex-1 sm:flex-none ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleAddExercise(treino.treinoId)}
                            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-sm rounded-lg flex-1 sm:flex-none justify-center"
                            disabled={loadingIA[treino.treinoId]}
                          >
                            {loadingIA[treino.treinoId] ? 'Criando...' : 'Criar (IA)'}
                          </button>
                          <button
                            onClick={() => {
                              setAddExVisibleMap(prev => ({ ...prev, [treino.treinoId]: false }));
                              setAddExNameMap(prev => ({ ...prev, [treino.treinoId]: '' }));
                            }}
                            className={`px-3 py-2 text-sm rounded-lg border ${isDark ? 'border-gray-700 text-white hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'}`}
                          >
                            Cancelar
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={() => setAddExVisibleMap(prev => ({ ...prev, [treino.treinoId]: true }))}
                        className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 text-sm rounded-lg w-full sm:w-auto justify-center"
                      >
                        <FiPlus size={16} />
                        Adicionar Exercício
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  );
};

export default MeusTreinos;
