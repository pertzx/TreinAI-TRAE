import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { hasAccess } from '../../../utils/planAccess.js';
import { AnimatePresence, motion } from 'framer-motion';
import { FiChevronDown, FiChevronUp, FiUsers, FiSettings, FiRefreshCw, FiUserPlus, FiStar, FiTrendingUp, FiEye, FiMousePointer, FiWifi, FiWifiOff, FiHeart, FiActivity, FiMapPin } from 'react-icons/fi';
import { HiSparkles, HiAcademicCap } from 'react-icons/hi';
import { MdDashboard, MdPersonAdd } from 'react-icons/md';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement
} from 'chart.js'
import { Doughnut, Bar } from 'react-chartjs-2'
import api from '../../../Api';
import locationsData from '../../../data/locations.json';
import MeusTreinos from './MeusTreinos';
import HistoricoChart from '../Components/HistoricoChart';
import ChatNutriAI from '../Components/ChatNutriAi';
import AlunoNotas from '../Components/AlunoNotas';
import AlunoAnamnese from '../Components/AlunoAnamnese';
import TemplatesManager from '../Components/TemplatesManager';
import InteractionStatsChart from '../Components/InteractionStatsChart';
import { useToast } from '../../../components/Toast';
import { buildImageUrl } from '../../../utils/imageUtils';
import { getBrazilDate } from '../../../../helpers/getBrazilDate';
import CoachAccessDenied from '../../../components/CoachAccessDenied';
// ====== IMPORT DO TOUR ======
import TreinAITour, { TourRestartButton } from '../../../components/TreinAITour';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement
);

const base = {
  card: 'p-4',
  panel: 'p-3 border',
  smallBtn: 'px-3 py-1 rounded-2xl'
};
const especialidadeLabels = {
  'personal-trainner': 'Personal Trainer',
  nutricionista: 'Nutricionista',
  fisioterapeuta: 'Fisioterapeuta'
};
const getSpecialtyTheme = (especialidade = 'personal-trainner', isDark = true) => {
  const map = {
    'personal-trainner': { label: 'PT', pill: 'px-2 py-0.5 rounded bg-indigo-600 text-white', btnClass: isDark ? 'bg-indigo-600 text-white rounded-xl' : 'bg-indigo-500 text-white rounded-xl', panelBorder: isDark ? 'border-indigo-700' : 'border-indigo-200' },
    nutricionista: { label: 'Nutri', pill: 'px-2 py-0.5 rounded bg-emerald-600 text-white', btnClass: isDark ? 'bg-emerald-600 text-white rounded-xl' : 'bg-emerald-500 text-white  rounded-xl', panelBorder: isDark ? 'border-emerald-700' : 'border-emerald-200' },
    fisioterapeuta: { label: 'Fisio', pill: 'px-2 py-0.5 rounded bg-yellow-500 text-black', btnClass: isDark ? 'bg-yellow-400 text-black rounded-xl' : 'bg-yellow-500 text-black rounded-xl', panelBorder: isDark ? 'border-yellow-600' : 'border-yellow-200' }
  };
  return map[especialidade] || map['personal-trainner'];
};

// ====== PASSOS DO TOUR ======
const COACH_TOUR_STEPS = [
  {
    target: '#coach-header-stats',
    title: 'Cabeçalho do Painel',
    content: 'Aqui você vê sua identidade profissional, especialidade e status de conexão em tempo real. O ícone verde indica que o WebSocket está ativo.',
    hint: 'Mantenha sempre sua especialidade atualizada para aparecer nos filtros corretos.'
  },
  {
    target: '#coach-quick-stats',
    title: 'Estatísticas em Tempo Real',
    content: 'Acompanhe seus números principais: total de alunos ativos, taxa de engajamento, visitas ao seu perfil e cliques no link de convite.',
    hint: 'Alunos com engajamento acima de 80% têm 3x mais chances de renovar.'
  },
  {
    target: '#coach-perfil-card',
    title: 'Perfil Profissional',
    content: 'Seu cartão de visitas digital. Aqui estão sua foto, biografia, especialidade e localização. Tudo que os clientes veem na seção "Encontrar".',
    hint: 'Use uma foto profissional e biografia completa para aumentar suas conversões.'
  },
  {
    target: '#coach-link-convite',
    title: 'Link de Convite',
    content: 'Compartilhe este link com seus clientes para que eles possam se conectar diretamente ao seu perfil profissional.',
    hint: 'Copie o link ou use o botão de compartilhar nativo do celular.'
  },
  {
    target: '#coach-solicitacoes',
    title: 'Solicitações Pendentes',
    content: 'Novos clientes que enviaram solicitação de vínculo. Analise a mensagem deles e aceite ou recuse.',
    hint: 'Responda rápido — clientes esperam no máximo 24h por uma resposta.'
  },
  {
    target: '#coach-alunos-ativos',
    title: 'Meus Alunos',
    content: 'Seu centro de comando. Expanda cada aluno para ver anamnese, editar treinos, iniciar chat ou remover o vínculo.',
    hint: 'Use o chat para enviar mensagens motivacionais — isso aumenta a retenção em 40%.'
  },
  {
    target: '#coach-templates-section',
    divToggle: '#btn-templates-toggle',
    waitForVisible: 400,
    title: 'Templates de Treino',
    content: 'Crie templates de treino reutilizáveis e aplique em segundos para qualquer aluno. Organize por objetivo e nível de dificuldade.',
    hint: 'Templates bem estruturados economizam até 70% do tempo de criação de treinos.'
  },
  {
    target: '#coach-status-online',
    title: 'Status Online dos Alunos',
    content: 'Monitore quais alunos estão online agora, veja estatísticas por plano e acompanhe o engajamento em tempo real.',
    hint: 'Alunos online são mais propensos a responder mensagens e completar treinos.'
  }
];

const Coach = ({ user, tema = 'dark' }) => {
  const hasCoachAccess = hasAccess(user, 'coachPanel') && user?.planInfos?.status === 'ativo';
  if (!hasCoachAccess) {
    return <CoachAccessDenied tema={tema} />;
  }

  const navigate = useNavigate();
  const isDark = tema === 'dark';
  const { showError, showSuccess } = useToast();

  const theme = {
    bg: isDark ? 'bg-gray-900 text-white' : 'bg-white text-black',
    muted: isDark ? 'text-gray-300' : 'text-gray-600',
    input: 'w-full p-2 rounded border',
    primaryBtn: isDark ? 'bg-indigo-600 text-white px-4 py-2 rounded' : 'bg-indigo-500 text-white px-4 py-2 rounded',
    ghostBtn: isDark ? 'bg-transparent border px-3 py-1 rounded text-white' : 'bg-transparent border px-3 py-1 rounded text-black'
  };

  const [sectionExpandedMap, setSectionExpandedMap] = useState({});
  const [expandedMap, setExpandedMap] = useState({});
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  const [profissional, setProfissional] = useState(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [createForm, setCreateForm] = useState({ profissionalName: '', biografia: '', especialidade: 'personal-trainner', country: '', state: '', city: '' });
  const [createImageFile, setCreateImageFile] = useState(null);

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ profissionalName: '', biografia: '', especialidade: 'personal-trainner', country: '', state: '', city: '', lat: '', lng: '' });
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [removeImageFlag, setRemoveImageFlag] = useState(false);

  const [meusLocais, setMeusLocais] = useState([]);
  const [alunosData, setAlunosData] = useState([]);
  const [heartbeatData, setHeartbeatData] = useState(null);
  const [heartbeatLoading, setHeartbeatLoading] = useState(true);
  const [chatStates, setChatStates] = useState({});
  const [removingMap, setRemovingMap] = useState({});

  const mountedRef = useRef(false);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const getUserIdFromUser = useCallback(() => {
    return user ? (user._id || user.userId || user.id || null) : null;
  }, [user]);

  function loadCountries() {
    try {
      const arr = Array.isArray(locationsData?.countries) ? locationsData.countries : [];
      const list = arr.map(c => ({ name: c.name || 'Unknown', code: c.code || '' }))
        .sort((a, b) => String(a.name).localeCompare(String(b.name)));
      if (mountedRef.current) setCountries(list.length ? list : [{ name: 'Brazil', code: 'BR' }, { name: 'Portugal', code: 'PT' }]);
    } catch (err) {
      if (mountedRef.current) setCountries([{ name: 'Brazil', code: 'BR' }, { name: 'Portugal', code: 'PT' }]);
    }
  }
  function loadStatesForCountry(countryName) {
    if (!countryName) { setStates([]); return; }
    try {
      const byCountry = locationsData?.byCountry || {};
      const countryObj = byCountry[countryName] || byCountry[String(countryName).trim()] || null;
      if (!countryObj) {
        if ((countryName || '').toLowerCase().includes('brazil')) {
          if (mountedRef.current) setStates(['Acre', 'São Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Bahia']);
        } else { if (mountedRef.current) setStates([]); }
        return;
      }
      const arr = Array.isArray(countryObj.states) ? countryObj.states : [];
      if (mountedRef.current) setStates(arr.slice().sort((a, b) => String(a).localeCompare(String(b))));
    } catch (err) { if (mountedRef.current) setStates([]); }
  }
  function loadCitiesForState(countryName, stateName) {
    if (!countryName || !stateName) { setCities([]); return; }
    try {
      const byCountry = locationsData?.byCountry || {};
      const countryObj = byCountry[countryName] || byCountry[String(countryName).trim()] || null;
      if (!countryObj) { if (mountedRef.current) setCities([]); return; }
      const citiesByState = countryObj.citiesByState || {};
      const arr = Array.isArray(citiesByState[stateName]) ? citiesByState[stateName] : [];
      if (mountedRef.current) setCities(arr.slice().sort((a, b) => String(a).localeCompare(String(b))));
    } catch (err) { if (mountedRef.current) setCities([]); }
  }
  useEffect(() => { loadCountries(); }, []);

  const loadProfissional = useCallback(async (signal) => {
    const userId = getUserIdFromUser();
    if (!userId) {
      if (mountedRef.current) setProfissional(null);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get('/profissionais', { params: { userId }, signal });
      if (!mountedRef.current) return;
      const payload = res?.data;
      if (payload?.profissional) return setProfissional(payload.profissional);
      if (payload && typeof payload === 'object' && (payload._id || payload.profissionalId || payload.userId) && !Array.isArray(payload)) {
        return setProfissional(payload);
      }
      const list = payload?.profissionais || payload?.data?.items || payload?.data || (Array.isArray(payload) ? payload : null);
      if (Array.isArray(list) && list.length) {
        const found = list.find(p => String(p.userId) === String(userId) || String(p.profissionalId) === String(userId));
        return setProfissional(found || null);
      }
      setProfissional(null);
    } catch (err) {
      if (err.name === 'CanceledError' || err.message === 'canceled') return;
      console.error('Erro ao carregar profissional:', err);
      showError(err?.response?.data?.msg || err.message || 'Erro desconhecido');
      setProfissional(null);
    } finally { if (mountedRef.current) setLoading(false); }
  }, [getUserIdFromUser]);

  useEffect(() => {
    if (!user) return;
    const ctrl = new AbortController();
    loadProfissional(ctrl.signal);
    return () => ctrl.abort();
  }, [user, loadProfissional]);

  const handleRefresh = () => {
    const ctrl = new AbortController();
    loadProfissional(ctrl.signal);
  };

  const handleCreateImageChange = (e) => setCreateImageFile(e.target.files?.[0] || null);

  const validateCreateForm = () => {
    const userId = getUserIdFromUser();
    if (!userId) return 'Usuário não autenticado.';
    if (!createForm.profissionalName) return 'Preencha o nome do profissional.';
    if (!createForm.biografia) return 'Preencha a biografia.';
    if (!createForm.especialidade) return 'Escolha uma especialidade.';
    if (!createForm.country) return 'Escolha o país.';
    if (!createForm.state) return 'Escolha o estado.';
    if (!createForm.city) return 'Escolha a cidade.';
    return null;
  };

  const handleCreateProfissional = async (e) => {
    e?.preventDefault?.();
    const validationError = validateCreateForm();
    if (validationError) { showError(validationError); return; }

    const userId = getUserIdFromUser();
    setCreating(true);
    try {
      const form = new FormData();
      form.append('profissionalName', createForm.profissionalName);
      form.append('biografia', createForm.biografia);
      form.append('userId', userId);
      form.append('especialidade', createForm.especialidade);
      form.append('country', createForm.country);
      form.append('state', createForm.state);
      form.append('city', createForm.city);
      if (createImageFile) form.append('image', createImageFile);

      const res = await api.post('/publicar-profissional', form);
      const data = res?.data;
      if (data && (data.profissional || data.success)) {
        const created = data.profissional || data;
        setProfissional(created);
        showSuccess('Profissional criado com sucesso.');
        setEditMode(false);
        setCreateForm({ profissionalName: '', biografia: '', especialidade: 'personal-trainner', country: '', state: '', city: '' });
        setCreateImageFile(null);
      } else {
        showError(data?.msg || 'Erro ao criar profissional.');
      }
    } catch (err) {
      console.error('Erro ao criar profissional:', err);
      showError(err?.response?.data?.msg || err?.message || 'Erro desconhecido');
    } finally { if (mountedRef.current) setCreating(false); }
  };

  useEffect(() => {
    if (!profissional) {
      setEditForm({ profissionalName: '', biografia: '', especialidade: 'personal-trainner', country: '', state: '', city: '', lat: '', lng: '' });
      setEditImageFile(null); setEditImagePreview(null); setRemoveImageFlag(false);
      setStates([]); setCities([]);
      return;
    }
    setEditForm({
      profissionalName: profissional.profissionalName || '',
      biografia: profissional.biografia || '',
      especialidade: profissional.especialidade || 'personal-trainner',
      country: profissional.country || '',
      state: profissional.state || '',
      city: profissional.city || '',
      lat: profissional.location?.coordinates ? String(profissional.location.coordinates[1]) : '',
      lng: profissional.location?.coordinates ? String(profissional.location.coordinates[0]) : ''
    });
    setEditImageFile(null); setEditImagePreview(buildImageUrl(profissional.imageUrl) || null); setRemoveImageFlag(false);
    if (profissional.country) {
      loadStatesForCountry(profissional.country);
      if (profissional.state) loadCitiesForState(profissional.country, profissional.state);
    }
  }, [profissional]);

  const handleEditImageChange = (e) => {
    const f = e.target.files?.[0] || null;
    if (editImagePreview && editImagePreview.startsWith('blob:')) {
      try { URL.revokeObjectURL(editImagePreview); } catch (err) { /* ignore */ }
    }
    if (f) {
      const preview = URL.createObjectURL(f);
      setEditImageFile(f); setEditImagePreview(preview); setRemoveImageFlag(false);
    } else { setEditImageFile(null); setEditImagePreview(profissional?.imageUrl ? buildImageUrl(profissional.imageUrl) : null); }
  };

  const handleToggleEditMode = () => { setEditMode(prev => !prev); };

  const handleEditSubmit = async (e) => {
    e?.preventDefault();
    if (!profissional) return;
    setSavingEdit(true);
    try {
      const form = new FormData();
      form.append('profissionalId', profissional.profissionalId || profissional._id || profissional.userId || '');
      form.append('profissionalName', editForm.profissionalName || '');
      form.append('biografia', editForm.biografia || '');
      form.append('especialidade', editForm.especialidade || '');
      form.append('country', editForm.country || '');
      form.append('state', editForm.state || '');
      form.append('city', editForm.city || '');
      if (editForm.lat !== '') form.append('lat', String(editForm.lat));
      if (editForm.lng !== '') form.append('lng', String(editForm.lng));
      if (editImageFile) form.append('image', editImageFile);
      if (editImageFile) console.log('Enviando a imagem...')
      if (removeImageFlag) form.append('removeImage', '1');
      const res = await api.post('/editar-profissional', form);
      console.log(res)
      const data = res?.data;
      if (data && data.success) {
        const updated = data.profissional || data;
        if (updated && (updated._id || updated.profissionalId)) setProfissional(updated);
        else await loadProfissional(new AbortController().signal);
        showSuccess(data.msg || 'Atualizado com sucesso.');
        setEditMode(false);
      } else {
        throw new Error(data?.msg || 'Falha ao atualizar.');
      }
    } catch (err) {
      console.error('Erro editar profissional:', err);
      showError(err?.response?.data?.msg || err?.message || 'Erro desconhecido');
    } finally {
      setSavingEdit(false);
    }
  };

  const pegarLocais = useCallback(async (signal) => {
    if (!profissional) return;
    try {
      const res = await api.get('/locais', { params: { profissionalId: profissional.profissionalId || profissional._id || profissional.userId }, signal });
      if (mountedRef.current) setMeusLocais(res.data.locais || []);
    } catch (err) {
      if (err.name === 'CanceledError' || err.message === 'canceled') return;
      console.error('Erro ao carregar locais:', err);
      if (mountedRef.current) setMeusLocais([]);
    }
  }, [profissional]);

  const fetchAlunosDetails = useCallback(async (signal) => {
    if (!profissional) return;
    setHeartbeatLoading(true);
    try {
      const res = await api.get('/alunos-details', { params: { profissionalId: profissional.profissionalId || profissional._id || profissional.userId }, signal });
      if (mountedRef.current) {
        setAlunosData(res.data.alunos || []);
        setHeartbeatData(res.data.heartbeat || null);
      }
    } catch (err) {
      if (err.name === 'CanceledError' || err.message === 'canceled') return;
      console.error('Erro ao carregar detalhes dos alunos:', err);
      if (mountedRef.current) {
        setAlunosData([]);
        setHeartbeatData(null);
      }
    } finally {
      if (mountedRef.current) setHeartbeatLoading(false);
    }
  }, [profissional]);

  useEffect(() => {
    if (!profissional) return;
    const ctrl = new AbortController();
    pegarLocais(ctrl.signal);
    fetchAlunosDetails(ctrl.signal);
    return () => ctrl.abort();
  }, [profissional, pegarLocais, fetchAlunosDetails]);

  const loadChatForUser = useCallback(async (alunoUserId) => {
    setChatStates(prev => ({ ...prev, [alunoUserId]: { ...prev[alunoUserId], loading: true, error: null } }));
    try {
      const res = await api.get('/chat-history', { params: { profissionalId: profissional.profissionalId || profissional._id || profissional.userId, alunoUserId } });
      setChatStates(prev => ({ ...prev, [alunoUserId]: { ...prev[alunoUserId], messages: res.data.messages || [], loading: false } }));
    } catch (err) {
      console.error('Erro ao carregar chat:', err);
      setChatStates(prev => ({ ...prev, [alunoUserId]: { ...prev[alunoUserId], error: 'Erro ao carregar chat.', loading: false } }));
    }
  }, [profissional]);

  const sendMessageToUser = async (alunoUserId) => {
    const chatState = chatStates[alunoUserId];
    if (!chatState || !chatState.newMessage) return;

    setChatStates(prev => ({ ...prev, [alunoUserId]: { ...prev[alunoUserId], sending: true, error: null } }));
    try {
      const res = await api.post('/send-chat-message', {
        profissionalId: profissional.profissionalId || profissional._id || profissional.userId,
        alunoUserId,
        conteudo: chatState.newMessage
      });
      if (res.data.success) {
        setChatStates(prev => ({
          ...prev,
          [alunoUserId]: {
            ...prev[alunoUserId],
            messages: [...(prev[alunoUserId]?.messages || []), res.data.message],
            newMessage: '',
            sending: false
          }
        }));
      } else {
        throw new Error(res.data.msg || 'Falha ao enviar mensagem.');
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      setChatStates(prev => ({ ...prev, [alunoUserId]: { ...prev[alunoUserId], error: err.message || 'Falha ao enviar mensagem.', sending: false } }));
      showError('Falha ao enviar mensagem.');
    }
  };

  const handleChatInputChange = (alunoUserId, text) => {
    setChatStates(prev => ({ ...prev, [alunoUserId]: { ...(prev[alunoUserId] || {}), newMessage: text } }));
  };
  const refreshChat = (alunoUserId) => loadChatForUser(alunoUserId);

  const pending = alunosData.filter(a => !a.aceito);
  const accepted = alunosData.filter(a => a.aceito);

  const getSectionState = (userId, section) => {
    return !!(sectionExpandedMap[String(userId)] && sectionExpandedMap[String(userId)][section]);
  };

  const toggleSection = (userId, section) => {
    setSectionExpandedMap(prev => {
      const key = String(userId);
      const prevForUser = prev[key] || {};
      return {
        ...prev,
        [key]: {
          ...prevForUser,
          [section]: !prevForUser[section]
        }
      };
    });
  };

  const toggleExpanded = (userId) => {
    setExpandedMap(prev => {
      const next = { ...prev, [userId]: !prev[userId] };
      if (!prev[userId]) loadChatForUser(userId);
      return next;
    });
  };

  const handleAceitarAluno = async (alunoUserId) => {
    if (!profissional || !alunoUserId) return;
    const ok = window.confirm('Aceitar este aluno?');
    if (!ok) return;
    const prevProf = JSON.parse(JSON.stringify(profissional));
    const newProf = { ...profissional };
    newProf.alunos = (newProf.alunos || []).map(a => String(a.userId) === String(alunoUserId) ? { ...a, aceito: true, aceitoEm: new Date() } : a);
    setProfissional(newProf);
    setAlunosData(prev => prev.map(a => String(a.userId) === String(alunoUserId) ? { ...a, aceito: true, aceitoEm: new Date() } : a));
    try {
      const payload = { profissionalId: profissional.profissionalId || profissional._id || profissional.userId, alunoUserId };
      const res = await api.post('/aceitar-aluno', payload);
      if (!res?.data?.success) throw new Error(res?.data?.msg || 'Falha ao aceitar aluno');
      const returnedAluno = res.data.aluno;
      if (returnedAluno) {
        setProfissional(prev => ({ ...prev, alunos: (prev.alunos || []).map(a => String(a.userId) === String(returnedAluno.userId) ? { ...a, ...returnedAluno } : a) }));
        setAlunosData(prev => prev.map(a => String(a.userId) === String(returnedAluno.userId) ? { ...a, aceito: !!returnedAluno.aceito, aceitoEm: returnedAluno.aceitoEm || a.aceitoEm } : a));
      }
      showSuccess('Aluno aceito com sucesso.');
    } catch (err) {
      console.error('Erro aceitarAluno:', err);
      setProfissional(prevProf);
      await fetchAlunosDetails(new AbortController().signal);
      showError(err?.response?.data?.msg || err?.message || 'Erro ao aceitar aluno.');
    }
  };

  const handleRemoverAlunoClick = async (alunoUserId) => {
    if (!profissional || !alunoUserId) return;
    const ok = window.confirm('Remover este aluno da sua lista?');
    if (!ok) return;
    setRemovingMap(prev => ({ ...prev, [alunoUserId]: true }));
    const prevProf = profissional;
    const prevAlunos = alunosData;
    try {
      const newProf = { ...profissional, alunos: (profissional.alunos || []).filter(a => String(a.userId) !== String(alunoUserId)) };
      setProfissional(newProf);
      setAlunosData(prev => prev.filter(a => String(a.userId) !== String(alunoUserId)));
      const payload = { profissionalId: profissional.profissionalId || profissional._id || profissional.userId, alunoUserId };
      const res = await api.post('/remover-aluno', payload);
      if (!res?.data?.success) throw new Error(res?.data?.msg || 'Falha ao remover');
      if (Array.isArray(res.data.alunos)) {
        setProfissional(prev => ({ ...prev, alunos: res.data.alunos }));
        setAlunosData(prev => prev.filter(a => res.data.alunos.some(x => String(x.userId) === String(a.userId))));
      }
      showSuccess(res.data.msg || 'Aluno removido.');
    } catch (err) {
      console.error('Erro remover aluno:', err);
      setProfissional(prevProf);
      setAlunosData(prevAlunos);
      showError(err?.response?.data?.msg || err?.message || 'Erro ao remover aluno.');
      alert(`Falha ao remover aluno: ${err?.message || 'erro'}`);
    } finally {
      setRemovingMap(prev => { const c = { ...prev }; delete c[alunoUserId]; return c; });
    }
  };

  const modernColorSystem = {
    primary: {
      light: {
        gradient: 'from-indigo-500 via-purple-500 to-blue-500',
        bg: 'bg-indigo-50',
        text: 'text-indigo-700',
        border: 'border-indigo-200',
        ring: 'ring-indigo-500/20'
      },
      dark: {
        gradient: 'from-indigo-600 via-purple-600 to-blue-600',
        bg: 'bg-indigo-900/20',
        text: 'text-indigo-300',
        border: 'border-indigo-800',
        ring: 'ring-indigo-500/30'
      }
    },
    success: {
      light: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
      dark: { bg: 'bg-emerald-900/20', text: 'text-emerald-300', border: 'border-emerald-800' }
    },
    warning: {
      light: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
      dark: { bg: 'bg-amber-900/20', text: 'text-amber-300', border: 'border-amber-800' }
    },
    danger: {
      light: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
      dark: { bg: 'bg-red-900/20', text: 'text-red-300', border: 'border-red-800' }
    }
  };

  const currentEspecialidade = (profissional?.especialidade || editForm.especialidade || createForm.especialidade || 'personal-trainner');
  const specialty = getSpecialtyTheme(currentEspecialidade, isDark);

  const enhancedTheme = {
    ...theme,
    primary: isDark ? modernColorSystem.primary.dark : modernColorSystem.primary.light,
    success: isDark ? modernColorSystem.success.dark : modernColorSystem.success.light,
    warning: isDark ? modernColorSystem.warning.dark : modernColorSystem.warning.light,
    danger: isDark ? modernColorSystem.danger.dark : modernColorSystem.danger.light,
    primaryBtn: `px-6 py-3 rounded-lg font-semibold text-white bg-gradient-to-r ${isDark ? modernColorSystem.primary.dark.gradient : modernColorSystem.primary.light.gradient} hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-md`,
    secondaryBtn: `px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'}`,
    card: `${base.card} ${isDark ? 'bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-gray-700/50 shadow-xl' : 'bg-gradient-to-br from-white to-gray-50/50 border-gray-200/50 shadow-lg hover:shadow-xl'} transition-all duration-300`,
    panel: `${isDark ? 'bg-gray-800/50 border-gray-700/30' : 'bg-gray-50/50 border-gray-200/30'} backdrop-blur-sm`,
    subtlePanel: `${base.panel} ${isDark ? 'bg-gray-800/30 border-gray-700/20' : 'bg-white/70 border-gray-200/20'} backdrop-blur-sm`,
    input: `${theme.input} transition-all duration-200 focus:ring-2 ${isDark ? 'focus:ring-indigo-500/50 focus:border-indigo-500' : 'focus:ring-indigo-400/50 focus:border-indigo-400'} focus:border-transparent`,
    hover: isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100/50',
    active: isDark ? 'active:bg-gray-600/50' : 'active:bg-gray-200/50'
  };

  const themeWithSpec = {
    ...enhancedTheme,
    primaryBtn: specialty.btnClass || enhancedTheme.primaryBtn,
    panel: `${enhancedTheme.panel} ${specialty.panelBorder || ''}`,
    card: `${enhancedTheme.card} ${specialty.cardGradient || ''}`,
    subtlePanel: `${enhancedTheme.subtlePanel} ${specialty.panelBorder || ''}`
  };

  return (
    <section className={`${theme.bg} min-h-screen transition-colors duration-300`}>
      {/* ====== HEADER COM data-tour ====== */}
      <motion.header
        id="coach-header-stats"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden mb-8"
      >
        <div className="absolute inset-0 opacity-5">
          <div className={`absolute inset-0 ${isDark ? 'bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600' : 'bg-gradient-to-br from-indigo-400 via-purple-400 to-blue-400'}`}></div>
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%), 
                             radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 0%, transparent 50%)`
          }}></div>
        </div>

        <div className="relative z-10 p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-3 rounded-xl ${isDark ? 'bg-gradient-to-br from-indigo-600 to-purple-600' : 'bg-gradient-to-br from-indigo-500 to-purple-500'} shadow-lg`}>
                  <HiAcademicCap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                    Painel Coach
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <HiSparkles className={`w-4 h-4 ${isDark ? 'text-yellow-400' : 'text-yellow-500'}`} />
                    <span className={`text-sm font-medium ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                      Plano Professional Ativo
                    </span>
                  </div>
                </div>
              </div>

              <p className={`text-base ${theme.muted} max-w-2xl leading-relaxed`}>
                Gerencie seus clientes, acompanhe o progresso e ofereça o melhor suporte profissional com ferramentas avançadas.
              </p>

              {/* ====== QUICK STATS COM data-tour ====== */}
              <div id="coach-quick-stats" className="flex flex-wrap gap-4 mt-4">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDark ? 'bg-gray-800/50' : 'bg-gray-100/50'} backdrop-blur-sm`}>
                  <FiUsers className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                  <span className="text-sm font-medium">{alunosData.length} Alunos</span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDark ? 'bg-gray-800/50' : 'bg-gray-100/50'} backdrop-blur-sm`}>
                  <FiTrendingUp className={`w-4 h-4 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                  <span className="text-sm font-medium">{pending.length} Pendentes</span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDark ? 'bg-gray-800/50' : 'bg-gray-100/50'} backdrop-blur-sm`}>
                  <FiEye className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                  <span className="text-sm font-medium">{profissional?.estatisticas?.impressoes || 0} Visitas</span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDark ? 'bg-gray-800/50' : 'bg-gray-100/50'} backdrop-blur-sm`}>
                  <FiMousePointer className={`w-4 h-4 ${isDark ? 'text-pink-400' : 'text-pink-600'}`} />
                  <span className="text-sm font-medium">{profissional?.estatisticas?.cliques || 0} Cliques</span>
                </div>
              </div>
            </div>

            {/* Botão de reiniciar tour no header */}
            <div className="flex flex-wrap gap-3 items-center">
              <TourRestartButton 
                tourId="coach-panel" 
                label="Tour" 
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleRefresh}
                disabled={loading}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${isDark
                  ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
                  : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Atualizando...' : 'Atualizar'}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => fetchAlunosDetails(new AbortController().signal)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${isDark
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg'
                  }`}
              >
                <MdPersonAdd className="w-4 h-4" />
                Atualizar Alunos
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          {/* ====== PERFIL PROFISSIONAL COM data-tour ====== */}
          <motion.div
            id="coach-perfil-card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className={`relative overflow-hidden rounded-2xl ${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-gradient-to-br from-white to-gray-50'} border ${isDark ? 'border-gray-700' : 'border-gray-200'} shadow-xl`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
              <div className={`w-full h-full rounded-full ${isDark ? 'bg-gradient-to-br from-indigo-500 to-purple-500' : 'bg-gradient-to-br from-indigo-400 to-purple-400'}`}></div>
            </div>

            <div className="relative z-10 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-2 rounded-lg ${specialty.pill.replace('px-2 py-0.5', 'p-2')}`}>
                  <FiStar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Perfil Profissional</h3>
                  <p className={`text-sm ${theme.muted}`}>Suas informações públicas</p>
                </div>
              </div>

              <div className="flex flex-col items-center text-center mb-6">
                <div className="relative mb-4">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white shadow-lg bg-gray-200">
                    {profissional?.imageUrl ? (
                      <img src={buildImageUrl(profissional.imageUrl)} alt={profissional.profissionalName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <FiUsers className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <div className={`absolute -bottom-2 -right-2 ${specialty.pill} shadow-lg`}>
                    {specialty.label}
                  </div>
                </div>

                <h4 className="text-xl font-bold mb-1">{profissional?.profissionalName || 'Nome não definido'}</h4>
                <p className={`text-sm ${theme.muted} mb-2`}>
                  {profissional?.especialidade ? especialidadeLabels[profissional.especialidade] || profissional.especialidade : 'Especialidade não definida'}
                </p>

                {profissional?.biografia && (
                  <p className={`text-sm ${theme.muted} leading-relaxed line-clamp-3`}>
                    {profissional.biografia}
                  </p>
                )}
              </div>

              <div className="space-y-3 mb-6">
                <div className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-gray-800/50' : 'bg-gray-100/50'}`}>
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                    <FiMapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Localização</p>
                    <p className="text-sm">{profissional?.city || 'Não informado'}, {profissional?.state || 'Não informado'}, {profissional?.country || 'Não informado'}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-gray-800/50' : 'bg-gray-100/50'}`}>
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-green-600/20 text-green-400' : 'bg-green-100 text-green-600'}`}>
                    <FiActivity className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Membro desde</p>
                    <p className="text-sm">{profissional?.createdAt ? getBrazilDate(profissional.createdAt) : 'Não informado'}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleToggleEditMode}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'} shadow-sm`}
                >
                  <FiSettings className="w-5 h-5" />
                  Editar Perfil
                </motion.button>
              </div>
            </div>
          </motion.div>

          <AnimatePresence>
            {editMode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className={`mt-6 p-6 rounded-2xl ${isDark ? 'bg-gray-800/50' : 'bg-white/80'} border ${isDark ? 'border-gray-700' : 'border-gray-200'} shadow-xl`}
              >
                <h3 className="text-xl font-bold mb-4">{profissional ? 'Editar Perfil Profissional' : 'Criar Perfil Profissional'}</h3>
                <form onSubmit={profissional ? handleEditSubmit : handleCreateProfissional}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="profissionalName" className="block text-sm font-medium mb-1">Nome Completo</label>
                      <input
                        type="text"
                        id="profissionalName"
                        value={profissional ? editForm.profissionalName : createForm.profissionalName}
                        onChange={e => profissional ? setEditForm({ ...editForm, profissionalName: e.target.value }) : setCreateForm({ ...createForm, profissionalName: e.target.value })}
                        className={themeWithSpec.input}
                        placeholder="Seu nome completo"
                      />
                    </div>
                    <div>
                      <label htmlFor="biografia" className="block text-sm font-medium mb-1">Biografia</label>
                      <textarea
                        id="biografia"
                        value={profissional ? editForm.biografia : createForm.biografia}
                        onChange={e => profissional ? setEditForm({ ...editForm, biografia: e.target.value }) : setCreateForm({ ...createForm, biografia: e.target.value })}
                        className={`${themeWithSpec.input} h-24 resize-y`}
                        placeholder="Fale um pouco sobre você e sua abordagem profissional"
                      ></textarea>
                    </div>
                    <div>
                      <label htmlFor="especialidade" className="block text-sm font-medium mb-1">Especialidade</label>
                      <select
                        id="especialidade"
                        value={profissional ? editForm.especialidade : createForm.especialidade}
                        onChange={e => {
                          const val = e.target.value;
                          if (profissional) {
                            setEditForm({ ...editForm, especialidade: val });
                          } else {
                            setCreateForm({ ...createForm, especialidade: val });
                          }
                        }}
                        className={themeWithSpec.input}
                      >
                        {Object.entries(especialidadeLabels).map(([key, value]) => (
                          <option key={key} value={key}>{value}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="country" className="block text-sm font-medium mb-1">País</label>
                        <select
                          id="country"
                          value={profissional ? editForm.country : createForm.country}
                          onChange={e => {
                            const val = e.target.value;
                            if (profissional) {
                              setEditForm({ ...editForm, country: val, state: '', city: '' });
                              loadStatesForCountry(val);
                            } else {
                              setCreateForm({ ...createForm, country: val, state: '', city: '' });
                              loadStatesForCountry(val);
                            }
                          }}
                          className={themeWithSpec.input}
                        >
                          <option value="">Selecione o País</option>
                          {countries.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="state" className="block text-sm font-medium mb-1">Estado</label>
                        <select
                          id="state"
                          value={profissional ? editForm.state : createForm.state}
                          onChange={e => {
                            const val = e.target.value;
                            if (profissional) {
                              setEditForm({ ...editForm, state: val, city: '' });
                              loadCitiesForState(editForm.country, val);
                            } else {
                              setCreateForm({ ...createForm, state: val, city: '' });
                              loadCitiesForState(createForm.country, val);
                            }
                          }}
                          className={themeWithSpec.input}
                          disabled={states.length === 0}
                        >
                          <option value="">Selecione o Estado</option>
                          {states.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="city" className="block text-sm font-medium mb-1">Cidade</label>
                        <select
                          id="city"
                          value={profissional ? editForm.city : createForm.city}
                          onChange={e => profissional ? setEditForm({ ...editForm, city: e.target.value }) : setCreateForm({ ...createForm, city: e.target.value })}
                          className={themeWithSpec.input}
                          disabled={cities.length === 0}
                        >
                          <option value="">Selecione a Cidade</option>
                          {cities.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold">
                        <MdPersonAdd className="w-4 h-4" />
                        Foto de Perfil (Opcional)
                      </label>

                      <div className={`border-2 border-dashed rounded-lg p-6 transition-all duration-200 ${isDark ? 'border-gray-600 hover:border-blue-500/50' : 'border-gray-300 hover:border-blue-400/50'}`}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={profissional ? handleEditImageChange : handleCreateImageChange}
                          className="hidden"
                          id="image-upload"
                        />
                        <label htmlFor="image-upload" className="cursor-pointer block text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                              <MdPersonAdd className={`w-8 h-8 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Clique para selecionar uma imagem</p>
                              <p className={`text-xs ${theme.muted}`}>PNG, JPG até 5MB</p>
                            </div>
                          </div>
                        </label>
                      </div>

                      {/* Preview da Imagem */}
                      <div className="flex items-center gap-4">
                        {profissional ? (
                          editImagePreview ? (
                            <div className="relative">
                              <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                                <img src={editImagePreview} alt="preview" className="w-full h-full object-cover" />
                              </div>
                              <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center ${isDark ? 'bg-green-900 text-green-400' : 'bg-green-100 text-green-600'}`}>
                                <FiStar className="w-3 h-3" />
                              </div>
                            </div>
                          ) : (
                            <div className={`w-20 h-20 rounded-lg flex items-center justify-center text-xs ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                              Sem imagem
                            </div>
                          )
                        ) : (
                          createImageFile ? (
                            <div className="relative">
                              <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                                <img src={URL.createObjectURL(createImageFile)} alt="preview" className="w-full h-full object-cover" />
                              </div>
                              <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center ${isDark ? 'bg-green-900 text-green-400' : 'bg-green-100 text-green-600'}`}>
                                <FiStar className="w-3 h-3" />
                              </div>
                            </div>
                          ) : (
                            <div className={`w-20 h-20 rounded-lg flex items-center justify-center text-xs ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                              Sem imagem
                            </div>
                          )
                        )}

                        {profissional && (
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={removeImageFlag}
                              onChange={e => setRemoveImageFlag(e.target.checked)}
                              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                            />
                            <span className={isDark ? 'text-red-400' : 'text-red-600'}>
                              Remover imagem atual
                            </span>
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                      <motion.button
                        type="button"
                        onClick={() => setEditMode(false)}
                        className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'}`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Cancelar
                      </motion.button>

                      <motion.button
                        type="submit"
                        disabled={savingEdit || creating}
                        className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${savingEdit || creating
                          ? 'bg-gray-400 cursor-not-allowed'
                          : isDark
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg hover:shadow-xl'
                            : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl'
                          }`}
                        whileHover={{ scale: savingEdit || creating ? 1 : 1.02 }}
                        whileTap={{ scale: savingEdit || creating ? 1 : 0.98 }}
                      >
                        {savingEdit || creating ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            {profissional ? 'Salvando...' : 'Criando...'}
                          </div>
                        ) : (
                          profissional ? 'Salvar Alterações' : 'Criar Perfil'
                        )}
                      </motion.button>
                    </div>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ====== LINK DE CONVITE COM data-tour ====== */}
          {user && profissional && (String(user._id) === String(profissional?.userId) || String(user.userId) === String(profissional?.userId)) && (
            <motion.div
              id="coach-link-convite"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className={`mt-6 relative overflow-hidden rounded-2xl ${isDark ? 'bg-gradient-to-br from-indigo-900/20 to-purple-900/20' : 'bg-gradient-to-br from-indigo-50 to-purple-50'} border ${isDark ? 'border-indigo-800/30' : 'border-indigo-200'} shadow-lg`}
            >
              <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
                <div className={`w-full h-full rounded-full ${isDark ? 'bg-gradient-to-br from-indigo-500 to-purple-500' : 'bg-gradient-to-br from-indigo-400 to-purple-400'}`}></div>
              </div>

              <div className="relative z-10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'}`}>
                      <FiUserPlus className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Link de Convite</h3>
                      <p className={`text-sm ${theme.muted}`}>Compartilhe com seus clientes para que possam se conectar</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
                    ID: {profissional?.profissionalId || profissional?.userId}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <input
                      readOnly
                      value={`${(typeof window !== 'undefined' && window.location ? window.location.origin : '')}/dashboard/coach/u?q=${encodeURIComponent(profissional?.userId || profissional?.profissionalId || profissional?._id || '')}`}
                      className={`${themeWithSpec.input} text-sm pr-12 font-mono`}
                      onFocus={e => e.target.select()}
                    />
                    <motion.button
                      onClick={async () => {
                        const url = window.location.origin + '/dashboard/coach/u?q=' + encodeURIComponent(profissional?.userId || profissional?.profissionalId || profissional?._id || '');
                        try {
                          if (navigator.clipboard && navigator.clipboard.writeText) {
                            await navigator.clipboard.writeText(url);
                            showSuccess('Link copiado para a área de transferência!');
                          } else {
                            // Fallback: cria elemento textarea temporário
                            const textArea = document.createElement('textarea');
                            textArea.value = url;
                            textArea.style.position = 'fixed';
                            textArea.style.opacity = '0';
                            document.body.appendChild(textArea);
                            textArea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textArea);
                            showSuccess('Link copiado para a área de transferência!');
                          }
                        } catch (err) {
                          console.error('Falha ao copiar link:', err);
                          showError('Não foi possível copiar o link. Por favor, copie manualmente.');
                        }
                      }}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'} transition-colors duration-200`}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <FiRefreshCw className="w-4 h-4" />
                    </motion.button>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <motion.button
                      onClick={() => {
                        navigator.clipboard?.writeText && navigator.clipboard.writeText(window.location.origin + '/dashboard/coach/u?q=' + encodeURIComponent(profissional?.userId || profissional?.profissionalId || profissional?._id || ''));
                        showSuccess('Link copiado!');
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700' : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'} shadow-sm hover:shadow-md`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <FiRefreshCw className="w-4 h-4" />
                      Copiar Link
                    </motion.button>

                    <motion.button
                      onClick={() => navigator.share ? navigator.share({
                        title: `Convite - ${profissional?.profissionalName}`,
                        url: window.location.origin + '/dashboard/coach/u?q=' + encodeURIComponent(profissional?.userId || profissional?.profissionalId || profissional?._id || '')
                      }) : null}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-gradient-to-r ${isDark ? 'from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500' : 'from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600'} shadow-md hover:shadow-lg transition-all duration-200`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <FiUserPlus className="w-4 h-4" />
                      Compartilhar
                    </motion.button>

                    <motion.button
                      onClick={() => navigate('/dashboard/coach/u?q=' + encodeURIComponent(profissional?.userId || profissional?.profissionalId || profissional?._id || ''), '_blank')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700' : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'} shadow-sm hover:shadow-md`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <FiTrendingUp className="w-4 h-4" />
                      Visualizar
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* COL 2+3: LISTA DE ALUNOS */}
        {
          profissional && (
            <div className="lg:col-span-2 space-y-8">

              {/* PENDENTES */}
              <motion.div
                id="coach-solicitacoes"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className={`relative overflow-hidden rounded-2xl ${isDark ? 'bg-gradient-to-br from-orange-900/20 to-red-900/20' : 'bg-gradient-to-br from-orange-50 to-red-50'} border ${isDark ? 'border-orange-800/30' : 'border-orange-200'} shadow-lg`}
              >
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
                  <div className={`w-full h-full rounded-full ${isDark ? 'bg-gradient-to-br from-orange-500 to-red-500' : 'bg-gradient-to-br from-orange-400 to-red-400'}`}></div>
                </div>

                <div className="relative z-10 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isDark ? 'bg-orange-600/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                        <FiUserPlus className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">Solicitações Pendentes</h2>
                        <p className={`text-sm ${theme.muted}`}>Novos clientes aguardando aprovação</p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${isDark ? 'bg-orange-600/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                      {pending.length} {pending.length === 1 ? 'solicitação' : 'solicitações'}
                    </div>
                  </div>

                  {pending.length === 0 ? (
                    <div className={`text-center py-8 ${theme.muted}`}>
                      <FiUsers className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-lg font-medium mb-2">Nenhuma solicitação pendente</p>
                      <p className="text-sm">Compartilhe seu link de convite para receber novos clientes</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pending.map((item, index) => (
                        <motion.div
                          key={String(item.userId)}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className={`p-4 rounded-xl ${isDark ? 'bg-gray-800/50' : 'bg-white/80'} border ${isDark ? 'border-gray-700' : 'border-gray-200'} hover:shadow-md transition-all duration-200`}
                        >
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <div className={`w-8 h-8 rounded-lg ${isDark ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-100 text-blue-600'} flex items-center justify-center`}>
                                  <FiUsers className="w-4 h-4" />
                                </div>
                                <div className="font-medium text-sm font-mono">{item.userId}</div>
                              </div>

                              {item.mensagem && (
                                <div className="mb-2">
                                  <p className="text-sm font-medium mb-1">Mensagem:</p>
                                  <p className={`text-sm ${theme.muted} bg-gray-100 dark:bg-gray-800 p-2 rounded-lg`}>
                                    "{item.mensagem}"
                                  </p>
                                </div>
                              )}

                              <div className={`text-xs ${theme.muted} flex items-center gap-2`}>
                                <FiTrendingUp className="w-3 h-3" />
                                Solicitado em: {item.ultimoUpdate ? new Date(item.ultimoUpdate).toLocaleString() : '—'}
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate(`/dashboard/usuario/${item.userId}`)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                              >
                                Ver Cliente
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleAceitarAluno(item.userId)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isDark ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                              >
                                Aceitar
                              </motion.button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>

              {/* ACEITOS */}
              <motion.div
                id="coach-alunos-ativos"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className={`relative overflow-hidden rounded-2xl ${isDark ? 'bg-gradient-to-br from-green-900/20 to-blue-900/20' : 'bg-gradient-to-br from-green-50 to-blue-50'} border ${isDark ? 'border-green-800/30' : 'border-green-200'} shadow-lg`}
              >
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
                  <div className={`w-full h-full rounded-full ${isDark ? 'bg-gradient-to-br from-green-500 to-blue-500' : 'bg-gradient-to-br from-green-400 to-blue-400'}`}></div>
                </div>

                <div className="relative z-10 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isDark ? 'bg-green-600/20 text-green-400' : 'bg-green-100 text-green-600'}`}>
                        <HiAcademicCap className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">Meus Alunos</h2>
                        <p className={`text-sm ${theme.muted}`}>Clientes ativos sob sua orientação</p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${isDark ? 'bg-green-600/20 text-green-400' : 'bg-green-100 text-green-600'}`}>
                      {accepted.length} {accepted.length === 1 ? 'aluno' : 'alunos'}
                    </div>
                  </div>

                  {/* Desempenho do profissional (impressões e cliques) */}
                  {profissional?.profissionalId && (
                    <div className="mb-6">
                      <InteractionStatsChart
                        targetId={profissional.profissionalId}
                        targetModel="Profissional"
                        tema={tema}
                        title="Seu desempenho (impressões e cliques)"
                      />
                    </div>
                  )}

                  {/* Templates reutilizáveis de treino/dieta */}
                  <details id="coach-templates-section" className="mb-6">
                    <summary id="btn-templates-toggle" className={`cursor-pointer text-sm font-medium ${theme.muted} mb-2`}>
                      Meus templates de treino/dieta
                    </summary>
                    <div className="mt-2">
                      <TemplatesManager tema={tema} />
                    </div>
                  </details>

                  {/* Heartbeat Chart - Online Status dos Alunos */}
                  <motion.div
                    id="coach-status-online"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    className={`relative overflow-hidden rounded-2xl p-6 ${isDark ? 'bg-gradient-to-br from-purple-900/20 to-indigo-900/20' : 'bg-gradient-to-br from-purple-50 to-indigo-50'} border ${isDark ? 'border-purple-800/30' : 'border-purple-200'} shadow-lg`}
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
                      <div className={`w-full h-full rounded-full ${isDark ? 'bg-gradient-to-br from-purple-500 to-indigo-500' : 'bg-gradient-to-br from-purple-400 to-indigo-400'}`}></div>
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${isDark ? 'bg-purple-600/20 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                            <FiWifi className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold">Status Online dos Alunos</h3>
                            <p className={`text-sm ${theme.muted}`}>Alunos ativos nos últimos 15 segundos (heartbeat)</p>
                          </div>
                        </div>
                        {heartbeatLoading ? (
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${isDark ? 'bg-purple-600/20 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                            Carregando...
                          </div>
                        ) : (
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${isDark ? 'bg-green-600/20 text-green-400' : 'bg-green-100 text-green-600'}`}>
                            {heartbeatData?.summary?.online || 0} de {heartbeatData?.summary?.total || 0} online
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Doughnut Chart - Online/Offline */}
                        <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800/50' : 'bg-white/80'} border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                          <h4 className={`text-sm font-medium ${theme.muted} mb-3 text-center`}>Status Geral</h4>
                          <div className="h-48 flex justify-center">
                            {heartbeatData?.summary && (
                              <Doughnut
                                data={{
                                  labels: ['Online', 'Offline'],
                                  datasets: [{
                                    data: [
                                      heartbeatData.summary.online,
                                      heartbeatData.summary.total - heartbeatData.summary.online
                                    ],
                                    backgroundColor: [
                                      'rgba(16, 185, 129, 0.7)',
                                      'rgba(239, 68, 68, 0.7)'
                                    ],
                                    borderColor: [
                                      'rgba(16, 185, 129, 1)',
                                      'rgba(239, 68, 68, 1)'
                                    ],
                                    borderWidth: 2
                                  }]
                                }}
                                options={{
                                  maintainAspectRatio: false,
                                  plugins: {
                                    legend: { 
                                      position: 'bottom', 
                                      labels: { color: isDark ? '#E5E7EB' : '#374151' } 
                                    }
                                  }
                                }}
                              />
                            )}
                          </div>
                        </div>

                        {/* Bar Chart - By Plan */}
                        <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800/50' : 'bg-white/80'} border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                          <h4 className={`text-sm font-medium ${theme.muted} mb-3 text-center`}>Por Plano</h4>
                          <div className="h-48 flex justify-center">
                            {heartbeatData?.students && (
                              <Bar
                                data={{
                                  labels: Object.keys(heartbeatData.students.reduce((acc, s) => {
                                    acc[s.plan] = (acc[s.plan] || 0) + 1;
                                    return acc;
                                  }, {})),
                                  datasets: [{
                                    label: 'Alunos',
                                    data: Object.values(heartbeatData.students.reduce((acc, s) => {
                                      acc[s.plan] = (acc[s.plan] || 0) + 1;
                                      return acc;
                                    }, {})),
                                    backgroundColor: [
                                      'rgba(156, 163, 175, 0.7)',
                                      'rgba(59, 130, 246, 0.7)',
                                      'rgba(139, 92, 246, 0.7)',
                                      'rgba(16, 185, 129, 0.7)'
                                    ],
                                    borderColor: [
                                      'rgba(156, 163, 175, 1)',
                                      'rgba(59, 130, 246, 1)',
                                      'rgba(139, 92, 246, 1)',
                                      'rgba(16, 185, 129, 1)'
                                    ],
                                    borderWidth: 1
                                  }]
                                }}
                                options={{
                                  maintainAspectRatio: false,
                                  indexAxis: 'y',
                                  plugins: {
                                    legend: { display: false }
                                  },
                                  scales: {
                                    x: { grid: { color: isDark ? '#374151' : '#E5E7EB' }, ticks: { color: isDark ? '#E5E7EB' : '#374151' } },
                                    y: { grid: { color: isDark ? '#374151' : '#E5E7EB' }, ticks: { color: isDark ? '#E5E7EB' : '#374151' } }
                                  }
                                }}
                              />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Lista Responsiva de Alunos com Status Online */}
                      <div className={`overflow-x-auto rounded-xl ${isDark ? 'bg-gray-800/50' : 'bg-white/80'} border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                        <table className="w-full text-sm">
                          <thead className={`text-xs uppercase ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-700'}`}>
                            <tr>
                              <th className="px-4 py-3">Aluno</th>
                              <th className="px-4 py-3">Plano</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3">Última Atividade</th>
                              <th className="px-4 py-3">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {heartbeatData?.students?.map(student => {
                              const alunoInfo = accepted.find(a => String(a.userId) === String(student.userId));
                              const isOnline = student.isOnline;
                              const secondsAgo = student.secondsSinceActive;
                              return (
                                <tr key={student.userId} className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-100'} hover:bg-gray-50/50`}>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-lg ${isDark ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-100 text-blue-600'} flex items-center justify-center font-bold`}>
                                        {(alunoInfo?.user?.name || alunoInfo?.user?.username || student.username || 'A').charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <p className="font-medium">{alunoInfo?.user?.name || alunoInfo?.user?.username || student.username}</p>
                                        <p className="text-xs text-gray-500">{student.email}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded-full text-xs ${student.plan === 'coach' ? 'bg-green-100 text-green-800' : student.plan === 'pro' ? 'bg-blue-100 text-blue-800' : student.plan === 'max' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                                      {student.plan}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                      <FiWifi className={`w-3 h-3 ${isOnline ? 'text-green-500' : 'text-red-500'}`} />
                                      {isOnline ? 'Online' : 'Offline'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-gray-500">
                                    {secondsAgo !== null ? `${secondsAgo}s atrás` : 'N/A'}
                                  </td>
                                  <td className="px-4 py-3">
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => navigate(`/dashboard/usuario/${student.userId}`)}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                                    >
                                      Ver Perfil
                                    </motion.button>
                                  </td>
                                </tr>
                              );
                            })}
                            {(!heartbeatData?.students?.length) && (
                              <tr>
                                <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                                  Nenhum aluno vinculado
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>

                  {accepted.length === 0 ? (
                    <div className={`text-center py-8 ${theme.muted}`}>
                      <HiAcademicCap className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-lg font-medium mb-2">Nenhum aluno ativo</p>
                      <p className="text-sm">Aceite solicitações pendentes para começar a orientar seus clientes</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {accepted.map((item, index) => {
                        const chState = chatStates[item.userId] || {};
                        const expanded = !!expandedMap[item.userId];
                        const uid = String(item.userId);
                        const specialtyName = (profissional?.especialidade || 'personal-trainner').toLowerCase();

                        return (
                          <motion.div
                            key={uid}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            className={`p-5 rounded-xl ${isDark ? 'bg-gray-800/50' : 'bg-white/80'} border ${isDark ? 'border-gray-700' : 'border-gray-200'} hover:shadow-lg transition-all duration-200`}
                          >
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className={`w-10 h-10 rounded-xl ${isDark ? 'bg-gradient-to-br from-blue-600 to-purple-600' : 'bg-gradient-to-br from-blue-500 to-purple-500'} flex items-center justify-center text-white font-bold`}>
                                    {(item.user?.name || item.user?.username || 'A').charAt(0).toUpperCase()}
                                  </div>

                                  <img alt='Imagem de perfil do aluno.' className={`w-10 h-10 rounded-xl ${isDark ? 'bg-gradient-to-br from-blue-600 to-purple-600' : 'bg-gradient-to-br from-blue-500 to-purple-500'} flex items-center justify-center text-white font-bold`} src={`${buildImageUrl(item.user?.avatar)}`}></img>
                                  <div>
                                    <h3 className="font-bold text-lg">{item.user?.name || item.user?.username || 'Aluno'}</h3>
                                    <p className={`text-sm ${theme.muted}`}>ID: {uid}</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                  {item.user?.perfil?.objetivo && (
                                    <div className={`flex items-center gap-2 p-2 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-100/50'}`}>
                                      <FiStar className={`w-4 h-4 ${isDark ? 'text-yellow-400' : 'text-yellow-500'}`} />
                                      <div>
                                        <p className="text-xs font-medium">Objetivo</p>
                                        <p className="text-sm">{item.user.perfil.objetivo}</p>
                                      </div>
                                    </div>
                                  )}

                                  <div className={`flex items-center gap-2 p-2 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-100/50'}`}>
                                    <FiTrendingUp className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                                    <div>
                                      <p className="text-xs font-medium">Última atualização</p>
                                      <p className="text-sm">{item.ultimoUpdate ? new Date(item.ultimoUpdate).toLocaleDateString() : '—'}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2 items-center">
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => navigate(`/dashboard/usuario/${item.userId}`)}
                                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                                >
                                  Ver Cliente
                                </motion.button>

                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleRemoverAlunoClick(item.userId)}
                                  disabled={!!removingMap[item.userId]}
                                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isDark ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white'} disabled:opacity-50`}
                                >
                                  {removingMap[item.userId] ? 'Removendo...' : 'Remover'}
                                </motion.button>

                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => toggleExpanded(item.userId)}
                                  aria-expanded={expanded}
                                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                                >
                                  {expanded ? (
                                    <>
                                      <FiChevronUp className="w-4 h-4" /> Menos
                                    </>
                                  ) : (
                                    <>
                                      <FiChevronDown className="w-4 h-4" /> Mais
                                    </>
                                  )}
                                </motion.button>
                              </div>
                            </div>

                            {/* Conteúdo expansível global - varia por especialidade do profissional */}
                            <AnimatePresence>
                              {expanded && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.25 }}
                                  className="mt-4 space-y-4"
                                >
                                  {/* Painel interno com botões de seção — todos os tipos terão controles de expand/collapse por seção */}
                                  <div className={`${isDark ? 'bg-gray-900' : 'bg-white'} p-3 rounded-md border`}>
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                                      <div className="flex items-center gap-3">
                                        <div className={`text-sm font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{`Detalhes — ${item.user?.username || item.user?.email || 'Usuário'}`}</div>
                                        <div className="text-xs text-gray-400">Opções rápidas</div>
                                      </div>

                                      <div className="flex gap-2 flex-wrap">
                                        {/* Treinos (personal) / Reabilitação (fisioterapeuta): ambos prescrevem exercícios */}
                                        {
                                          profissional && (profissional.especialidade === 'personal-trainner' || profissional.especialidade === 'fisioterapeuta') && (
                                            <button
                                              onClick={() => toggleSection(item.userId, 'treinos')}
                                              className={`${base.smallBtn} ${theme.ghostBtn} flex items-center gap-2`}
                                              aria-expanded={getSectionState(item.userId, 'treinos')}
                                            >
                                              {getSectionState(item.userId, 'treinos') ? <FiChevronUp /> : <FiChevronDown />} {profissional.especialidade === 'fisioterapeuta' ? 'Reabilitação' : 'Treinos'}
                                            </button>
                                          )
                                        }
                                        {/* Histórico: relevante para todos (personal, nutri, fisioterapeuta) */}
                                        {
                                          profissional && (
                                            <button
                                              onClick={() => toggleSection(item.userId, 'historico')}
                                              className={`${base.smallBtn} ${theme.ghostBtn} flex items-center gap-2`}
                                              aria-expanded={getSectionState(item.userId, 'historico')}
                                            >
                                              {getSectionState(item.userId, 'historico') ? <FiChevronUp /> : <FiChevronDown />} Histórico
                                            </button>

                                          )
                                        }
                                        {/* NutriAI: relevante apenas para nutricionista */}
                                        {
                                          profissional && profissional.especialidade === 'nutricionista' && (
                                            <button
                                              onClick={() => toggleSection(item.userId, 'nutriAi')}
                                              className={`${base.smallBtn} ${theme.ghostBtn} flex items-center gap-2`}
                                              aria-expanded={getSectionState(item.userId, 'nutriAi')}
                                            >
                                              {getSectionState(item.userId, 'nutriAi') ? <FiChevronUp /> : <FiChevronDown />} NutriAI
                                            </button>

                                          )
                                        }
                                        {/* Notas privadas: relevante para todos os profissionais */}
                                        {
                                          profissional && (
                                            <button
                                              onClick={() => toggleSection(item.userId, 'notas')}
                                              className={`${base.smallBtn} ${theme.ghostBtn} flex items-center gap-2`}
                                              aria-expanded={getSectionState(item.userId, 'notas')}
                                            >
                                              {getSectionState(item.userId, 'notas') ? <FiChevronUp /> : <FiChevronDown />} Notas
                                            </button>
                                          )
                                        }
                                        {/* Anamnese: relevante para todos os profissionais */}
                                        {
                                          profissional && (
                                            <button
                                              onClick={() => toggleSection(item.userId, 'anamnese')}
                                              className={`${base.smallBtn} ${theme.ghostBtn} flex items-center gap-2`}
                                              aria-expanded={getSectionState(item.userId, 'anamnese')}
                                            >
                                              {getSectionState(item.userId, 'anamnese') ? <FiChevronUp /> : <FiChevronDown />} Anamnese
                                            </button>
                                          )
                                        }
                                        {/* Chat (1:1) */}
                                        {
                                          profissional && (
                                            <button
                                              onClick={() => toggleSection(item.userId, 'chat')}
                                              className={`${base.smallBtn} ${theme.ghostBtn} flex items-center gap-2`}
                                              aria-expanded={getSectionState(item.userId, 'chat')}
                                            >
                                              {getSectionState(item.userId, 'chat') ? <FiChevronUp /> : <FiChevronDown />} Chat
                                            </button>
                                          )
                                        }
                                      </div>
                                    </div>

                                    {/* Conteúdo por especialidade */}
                                    {(() => {
                                      switch (specialtyName) {
                                        case 'nutricionista':
                                          return (
                                            <div className="space-y-4">
                                              {/* Histórico */}
                                              {getSectionState(item.userId, 'historico') && (
                                                <div className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'} p-3 rounded-md border`}>
                                                  <div className="text-sm font-semibold mb-2">Histórico de nutrição</div>
                                                  {item.user?.historico ? <HistoricoChart historico={item.user?.historico} tema={tema} /> : <div className="text-sm text-gray-500">Sem histórico</div>}
                                                </div>
                                              )}

                                              {/* NutriAI Chat */}
                                              {getSectionState(item.userId, 'nutriAi') && (
                                                <div className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'} p-3 rounded-md border`}>
                                                  <div className="text-sm font-semibold mb-2">Chat NutriAI</div>
                                                  <ChatNutriAI user={item.user} tema={tema} profissionalId={profissional?.profissionalId || profissional?.userId} />
                                                </div>
                                              )}

                                              {/* Chat 1:1 */}
                                              {getSectionState(item.userId, 'chat') && (
                                                <div className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'} p-3 rounded-md border`}>
                                                  <div className="flex items-center justify-between mb-2">
                                                    <div className="font-medium">Chat com {item.user?.name || item.user?.username || 'Aluno'}</div>
                                                    <div className="flex items-center gap-2">
                                                      <button onClick={() => refreshChat(item.userId)} className={`${base.smallBtn} ${theme.ghostBtn}`}>Atualizar</button>
                                                      <div className={`text-xs text-gray-400`}>{chState.loading ? 'Carregando...' : (chState.error ? 'Erro no chat' : `${(chState.messages || []).length} mensagens`)}</div>
                                                    </div>
                                                  </div>

                                                  <div className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'} h-48 sm:h-56 overflow-auto border rounded p-2`}>
                                                    {(chState.messages || []).length === 0 ? (
                                                      <div className="text-xs text-gray-500">Nenhuma mensagem ainda. Envie a primeira!</div>
                                                    ) : (
                                                      (chState.messages || []).map(msg => {
                                                        const mine = String(msg.userId) === String(getUserIdFromUser());
                                                        return (
                                                          <div key={String(msg.mensagemId) + String(msg.publicadoEm)} className={`mb-2 flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                                            <div className={`${mine ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-black'} p-2 rounded-md max-w-[80%] text-sm`}>
                                                              <div className="whitespace-pre-wrap">{msg.conteudo}</div>
                                                              <div className="text-[10px] mt-1 text-gray-500">{msg.publicadoEm ? new Date(msg.publicadoEm).toLocaleString() : ''}</div>
                                                            </div>
                                                          </div>
                                                        );
                                                      })
                                                    )}
                                                  </div>

                                                  <div className="mt-2 flex flex-col sm:flex-row gap-2">
                                                    <input value={chState.newMessage || ''} onChange={e => handleChatInputChange(item.userId, e.target.value)} placeholder="Escreva uma mensagem..." className={theme.input} />
                                                    <button onClick={() => sendMessageToUser(item.userId)} disabled={chState.sending} className={`${themeWithSpec.primaryBtn} w-full sm:w-auto`}>{chState.sending ? 'Enviando...' : 'Enviar'}</button>
                                                  </div>
                                                  {chState.error && <div className="text-xs text-red-500 mt-2">{chState.error}</div>}
                                                </div>
                                              )}
                                            </div>
                                          );

                                        case 'fisioterapeuta':
                                          return (
                                            <div className="space-y-4">
                                              {/* Plano de reabilitação (exercícios prescritos pelo fisioterapeuta) */}
                                              {getSectionState(item.userId, 'treinos') && (
                                                <div className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'} p-3 rounded-md border`}>
                                                  <div className="text-sm font-semibold mb-1">{`Plano de reabilitação — ${item.user?.username || item.user?.email || 'Paciente'}`}</div>
                                                  <div className={`text-xs mb-2 ${theme.muted}`}>Prescreva exercícios terapêuticos com séries, repetições e progressão para o paciente.</div>
                                                  <MeusTreinos tema={tema} user={item.user} setUser={() => { }} profissionalId={profissional?.profissionalId} />
                                                </div>
                                              )}

                                              {/* Histórico / evolução do paciente */}
                                              {getSectionState(item.userId, 'historico') && (
                                                <div className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'} p-3 rounded-md border`}>
                                                  <div className="text-sm font-semibold mb-2">Histórico de evolução</div>
                                                  {item.user?.historico ? <HistoricoChart historico={item.user?.historico} tema={tema} /> : <div className="text-sm text-gray-500">Sem histórico</div>}
                                                </div>
                                              )}

                                              {/* Chat 1:1 */}
                                              {getSectionState(item.userId, 'chat') && (
                                                <div className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'} p-3 rounded-md border`}>
                                                  <div className="mb-2 font-semibold">Chat</div>
                                                  <div className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'} h-48 sm:h-56 overflow-auto border rounded p-2`}>
                                                    {(chState.messages || []).length === 0 ? (
                                                      <div className="text-xs text-gray-500">Nenhuma mensagem ainda. Envie a primeira!</div>
                                                    ) : (
                                                      (chState.messages || []).map(msg => {
                                                        const mine = String(msg.userId) === String(getUserIdFromUser());
                                                        return (
                                                          <div key={String(msg.mensagemId) + String(msg.publicadoEm)} className={`mb-2 flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                                            <div className={`${mine ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-black'} p-2 rounded-md max-w-[80%] text-sm`}>
                                                              <div className="whitespace-pre-wrap">{msg.conteudo}</div>
                                                              <div className="text-[10px] mt-1 text-gray-500">{msg.publicadoEm ? new Date(msg.publicadoEm).toLocaleString() : ''}</div>
                                                            </div>
                                                          </div>
                                                        );
                                                      })
                                                    )}
                                                  </div>

                                                  <div className="mt-2 flex flex-col sm:flex-row gap-2">
                                                    <input value={chState.newMessage || ''} onChange={e => handleChatInputChange(item.userId, e.target.value)} placeholder="Escreva uma mensagem..." className={theme.input} />
                                                    <button onClick={() => sendMessageToUser(item.userId)} disabled={chState.sending} className={`${themeWithSpec.primaryBtn} w-full sm:w-auto`}>{chState.sending ? 'Enviando...' : 'Enviar'}</button>
                                                  </div>
                                                  {chState.error && <div className="text-xs text-red-500 mt-2">{chState.error}</div>}
                                                </div>
                                              )}
                                            </div>
                                          );

                                        case 'personal-trainner':
                                        default:
                                          return (
                                            <div className="space-y-4">
                                              {/* Treinos */}
                                              {getSectionState(item.userId, 'treinos') && (
                                                <div className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'} p-3 rounded-md border`}>
                                                  <div className="text-sm font-semibold mb-2">{`Meus Treinos — ${item.user?.username || item.user?.email || 'Usuário'}`}</div>
                                                  <MeusTreinos tema={tema} user={item.user} setUser={() => { }} profissionalId={profissional?.profissionalId} />
                                                </div>
                                              )}

                                              {/* Histórico */}
                                              {getSectionState(item.userId, 'historico') && (
                                                <div className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'} p-3 rounded-md border`}>
                                                  <div className="text-sm font-semibold mb-2">Histórico de treinos</div>
                                                  {item.user?.historico ? <HistoricoChart historico={item.user?.historico} tema={tema} /> : <div className="text-sm text-gray-500">Sem histórico</div>}
                                                </div>
                                              )}

                                              {/* Chat */}
                                              {getSectionState(item.userId, 'chat') && (
                                                <div className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'} p-3 rounded-md border`}>
                                                  <div className="flex items-center justify-between mb-2">
                                                    <div className="font-medium">Chat com {item.user?.name || item.user?.username || 'Aluno'}</div>
                                                    <div className="flex items-center gap-2">
                                                      <button onClick={() => refreshChat(item.userId)} className={`${base.smallBtn} ${theme.ghostBtn}`}>Atualizar</button>
                                                      <div className={`text-xs text-gray-400`}>{chState.loading ? 'Carregando...' : (chState.error ? 'Erro no chat' : `${(chState.messages || []).length} mensagens`)}</div>
                                                    </div>
                                                  </div>

                                                  <div className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'} h-48 sm:h-56 overflow-auto border rounded p-2`}>
                                                    {(chState.messages || []).length === 0 ? (
                                                      <div className="text-xs text-gray-500">Nenhuma mensagem ainda. Envie a primeira!</div>
                                                    ) : (
                                                      (chState.messages || []).map(msg => {
                                                        const mine = String(msg.userId) === String(getUserIdFromUser());
                                                        return (
                                                          <div key={String(msg.mensagemId) + String(msg.publicadoEm)} className={`mb-2 flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                                            <div className={`${mine ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-black'} p-2 rounded-md max-w-[80%] text-sm`}>
                                                              <div className="whitespace-pre-wrap">{msg.conteudo}</div>
                                                              <div className="text-[10px] mt-1 text-gray-500">{msg.publicadoEm ? new Date(msg.publicadoEm).toLocaleString() : ''}</div>
                                                            </div>
                                                          </div>
                                                        );
                                                      })
                                                    )}
                                                  </div>

                                                  <div className="mt-2 flex flex-col sm:flex-row gap-2">
                                                    <input value={chState.newMessage || ''} onChange={e => handleChatInputChange(item.userId, e.target.value)} placeholder="Escreva uma mensagem..." className={theme.input} />
                                                    <button onClick={() => sendMessageToUser(item.userId)} disabled={chState.sending} className={`${themeWithSpec.primaryBtn} w-full sm:w-auto`}>{chState.sending ? 'Enviando...' : 'Enviar'}</button>
                                                  </div>
                                                  {chState.error && <div className="text-xs text-red-500 mt-2">{chState.error}</div>}
                                                </div>
                                              )}
                                            </div>
                                          );
                                      }
                                    })()}

                                    {/* Notas privadas — disponível para todas as especialidades */}
                                    {getSectionState(item.userId, 'notas') && (
                                      <div className="mt-4">
                                        <AlunoNotas alunoId={item.userId} tema={tema} />
                                      </div>
                                    )}

                                    {/* Anamnese do aluno — disponível para todas as especialidades */}
                                    {getSectionState(item.userId, 'anamnese') && (
                                      <div className="mt-4">
                                        <AlunoAnamnese alunoId={item.userId} tema={tema} />
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>


            </div>
          )
        }

      </div>

      <footer className={`mt-6 text-sm ${theme.muted} text-center`}>Dados carregados do servidor quando aplicável.</footer>

      {/* Componente do Tour */}
      <TreinAITour tourId="coach-panel" steps={COACH_TOUR_STEPS} />
    </section>
  );
};

export default Coach;
