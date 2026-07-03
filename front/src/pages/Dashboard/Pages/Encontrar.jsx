import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../Api'; // sua instância axios
import locationsData from '../../../data/locations.json';
import { buildImageUrl } from '../../../utils/imageUtils';
import { FiSearch, FiMapPin, FiExternalLink, FiArrowRight, FiChevronLeft, FiChevronRight, FiShare2 } from 'react-icons/fi';

/* -------------------- Constantes -------------------- */
const TABS = {
  PROFISSIONAIS: 'profissionais',
  ACADEMIAS: 'academias',
};

const LOCAL_TYPES = [
  { value: '', label: 'Todos os tipos' },
  { value: 'academia', label: 'Academia' },
  { value: 'clinica-de-fisioterapia', label: 'Clínica de Fisioterapia' },
  { value: 'consultorio-do-nutricionista', label: 'Consultório do Nutricionista' },
  { value: 'loja', label: 'Loja' },
  { value: 'outro', label: 'Outro' }
];

const ESPECIALIDADE_META = (title = '') => {
  const t = title.toLowerCase();
  if (t.includes('nutri')) return { label: 'Nutri', cls: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' };
  if (t.includes('personal') || t.includes('trainer')) return { label: 'Personal', cls: 'bg-orange-500/15 text-orange-500 border-orange-500/30' };
  if (t.includes('fisio')) return { label: 'Fisio', cls: 'bg-sky-500/15 text-sky-500 border-sky-500/30' };
  return { label: title.split(' ')[0] || 'Pro', cls: 'bg-blue-500/15 text-blue-500 border-blue-500/30' };
};

// Fallbacks só para erro de rede (não são exibidos no fluxo normal).
const mockProfissionais = [
  { id: 'p1', name: 'Maria', title: 'Nutricionista Esportiva', cidade: 'São Paulo', estado: 'SP', country: 'Brazil', raw: { profissionalId: 'p1' } },
  { id: 'p2', name: 'Carlos', title: 'Personal Trainer', cidade: 'São Paulo', estado: 'SP', country: 'Brazil', raw: { profissionalId: 'p2' } },
];
const mockAcademias = [
  { id: 'g1', localName: 'SmartGym', cidade: 'São Paulo', estado: 'SP', country: 'Brazil', localType: 'academia' },
];

/* -------------------- Tema centralizado -------------------- */
function makeTheme(tema) {
  const dark = tema !== 'light';
  return {
    dark,
    page: dark ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900',
    panel: dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200',
    subtle: dark ? 'text-gray-400' : 'text-gray-500',
    input: dark
      ? 'bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-500 focus:border-blue-500'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500',
    card: dark ? 'bg-gray-900 border-gray-800 hover:border-gray-700' : 'bg-white border-gray-200 hover:border-gray-300',
    chip: dark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600',
    tabActive: 'bg-blue-600 text-white',
    tabIdle: dark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900',
  };
}

/* -------------------- Subcomponentes -------------------- */
function ProfCard({ p, T, onVerPerfil }) {
  const meta = ESPECIALIDADE_META(p.title || '');
  const publicUrl = p?.raw?.profissionalId ? `/p/${p.raw.profissionalId}` : null;
  return (
    <div className={`rounded-2xl border ${T.card} shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col`}>
      <div className="h-20 bg-gradient-to-r from-blue-600/80 to-indigo-600/80" />
      <div className="px-5 pb-5 -mt-10 flex-1 flex flex-col">
        <div className="flex items-end justify-between">
          <div className={`w-20 h-20 rounded-2xl border-4 ${T.dark ? 'border-gray-900' : 'border-white'} overflow-hidden ${T.dark ? 'bg-gray-800' : 'bg-gray-100'} shadow`}>
            {p.imageUrl
              ? <img src={buildImageUrl(p.imageUrl)} alt={p.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-400">{(p.name || 'U')[0]}</div>}
          </div>
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${meta.cls}`}>{meta.label}</span>
        </div>

        <h3 className="mt-3 text-lg font-bold truncate">{p.name}</h3>
        <p className={`text-sm ${T.subtle} truncate`}>{p.title}</p>

        <div className={`mt-2 flex items-center gap-1.5 text-xs ${T.subtle}`}>
          <FiMapPin className="shrink-0" />
          <span className="truncate">{[p.cidade, p.estado].filter(Boolean).join(', ') || 'Localização não informada'}</span>
        </div>

        {p.biografia && <p className={`mt-2 text-sm line-clamp-2 ${T.dark ? 'text-gray-300' : 'text-gray-600'}`}>{p.biografia}</p>}

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => onVerPerfil(p)}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            Ver perfil <FiArrowRight />
          </button>
          {publicUrl && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir página pública"
              className={`px-3 py-2.5 rounded-xl border text-sm font-semibold flex items-center justify-center transition-colors ${T.dark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}
            >
              <FiShare2 />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function LocalCard({ l, T, onVisit }) {
  return (
    <div className={`rounded-2xl border ${T.card} shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col`}>
      <div className="relative h-40 overflow-hidden">
        <div className="absolute top-3 right-3 z-10">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/60 text-white backdrop-blur-sm">
            {(LOCAL_TYPES.find(t => t.value === l.localType)?.label) || l.localType}
          </span>
        </div>
        {l.imageUrl
          ? <img src={buildImageUrl(l.imageUrl)} alt={l.localName} className="w-full h-full object-cover" />
          : <div className={`w-full h-full flex items-center justify-center ${T.dark ? 'bg-gray-800' : 'bg-gray-100'}`}><span className="text-4xl">🏢</span></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-lg font-bold">{l.localName}</h3>
        <div className={`mt-1 flex items-center gap-1.5 text-xs ${T.subtle}`}>
          <FiMapPin className="shrink-0" />
          <span className="truncate">{[l.cidade, l.estado, l.country].filter(Boolean).join(', ') || 'Endereço não disponível'}</span>
        </div>
        {l.localDescricao && <p className={`mt-2 text-sm line-clamp-2 flex-1 ${T.dark ? 'text-gray-300' : 'text-gray-600'}`}>{l.localDescricao}</p>}
        <button
          onClick={() => onVisit(l)}
          className="mt-4 py-2.5 rounded-xl border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
        >
          Visitar <FiExternalLink />
        </button>
      </div>
    </div>
  );
}

function CardSkeleton({ T }) {
  return <div className={`h-72 rounded-2xl animate-pulse ${T.dark ? 'bg-gray-800' : 'bg-gray-200'}`} />;
}

/* -------------------- Componente -------------------- */
export default function Encontrar({ user, tema = 'dark' }) {
  const temaValue = tema === 'light' ? 'light' : 'dark';
  const T = makeTheme(temaValue);
  const navigate = useNavigate();

  const [tab, setTab] = useState(TABS.PROFISSIONAIS);
  const [search, setSearch] = useState('');

  // localidades
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(user?.country || user?.perfil?.country || '');
  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState(user?.perfil?.state || user?.state || '');
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState(user?.perfil?.city || user?.city || '');

  const [especialidade, setEspecialidade] = useState('');

  // dados reais (sem mock inicial — evita flash de dados falsos)
  const [profissionais, setProfissionais] = useState([]);
  const [locais, setLocais] = useState([]);

  // loading / error por lista
  const [loadingProf, setLoadingProf] = useState(true);
  const [loadingLocais, setLoadingLocais] = useState(false);
  const [error, setError] = useState(null);

  // ordenação
  const [sort, setSort] = useState('recente');

  // filtro localType para aba academias
  const [localTypeFilter, setLocalTypeFilter] = useState('');

  // paginação
  const [profPage, setProfPage] = useState(1);
  const [profPerPage, setProfPerPage] = useState(40);
  const [profTotal, setProfTotal] = useState(0);
  const [profTotalPages, setProfTotalPages] = useState(1);

  const [locaisPage, setLocaisPage] = useState(1);
  const [locaisPerPage, setLocaisPerPage] = useState(40);
  const [locaisTotal, setLocaisTotal] = useState(0);
  const [locaisTotalPages, setLocaisTotalPages] = useState(1);

  // Função de registro de métricas (impressão/clique)
  const registerInteraction = async (targetId, type, targetModel) => {
    try {
      if (!targetId) return;
      api.post('/metrics/interact', { targetId, type, targetModel }).catch(err => console.error('Erro métrica:', err));
    } catch (err) {
      console.error('Erro ao registrar interação:', err);
    }
  };

  // Registrar impressões em lote quando a lista é carregada
  useEffect(() => {
    if (tab === TABS.PROFISSIONAIS && profissionais.length > 0 && !loadingProf) {
      const timer = setTimeout(() => {
        profissionais.forEach(p => { if (p.id) registerInteraction(p.id, 'impression', 'Profissional'); });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [profissionais, tab, loadingProf]);

  useEffect(() => {
    if (tab === TABS.ACADEMIAS && locais.length > 0 && !loadingLocais) {
      const timer = setTimeout(() => {
        locais.forEach(l => { if (l.id) registerInteraction(l.id, 'impression', 'Local'); });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [locais, tab, loadingLocais]);

  // abort + debounce refs
  const abortRef = useRef({ prof: null, locais: null });
  const debounceRef = useRef(null);
  const mountedRef = useRef(true);

  /* --------------------- Helpers de local (locations.json) --------------------- */
  function loadCountriesLocal() {
    try {
      const arr = Array.isArray(locationsData?.countries) ? locationsData.countries : [];
      const list = arr.map(c => ({ name: c.name || 'Unknown', code: c.code || '' }))
        .filter(Boolean)
        .sort((a, b) => String(a.name).localeCompare(String(b.name)));
      if (!mountedRef.current) return;
      setCountries(list.length ? list : [{ name: 'Brazil', code: 'BR' }, { name: 'Portugal', code: 'PT' }]);
    } catch (err) {
      if (!mountedRef.current) return;
      setCountries([{ name: 'Brazil', code: 'BR' }, { name: 'Portugal', code: 'PT' }]);
    }
  }

  function loadStatesForCountryLocal(countryName) {
    if (!countryName) { setStates([]); setSelectedState(''); return; }
    try {
      const byCountry = locationsData?.byCountry || {};
      const countryObj = byCountry[countryName] || byCountry[String(countryName).trim()] || null;
      if (!countryObj) {
        if ((countryName || '').toLowerCase().includes('brazil') || (countryName || '').toLowerCase() === 'br') {
          const br = ['Acre', 'São Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Bahia'];
          if (mountedRef.current) { setStates(br); if (!br.includes(selectedState)) setSelectedState(''); }
        } else {
          if (mountedRef.current) { setStates([]); setSelectedState(''); }
        }
        return;
      }
      const arr = Array.isArray(countryObj.states) ? countryObj.states : [];
      const sorted = arr.slice().sort((a, b) => String(a).localeCompare(String(b)));
      if (!mountedRef.current) return;
      setStates(sorted);
      if (!sorted.includes(selectedState)) setSelectedState('');
    } catch (err) {
      if (!mountedRef.current) return;
      setStates([]); setSelectedState('');
    }
  }

  function loadCitiesForStateLocal(countryName, stateName) {
    if (!countryName || !stateName) { setCities([]); setSelectedCity(''); return; }
    try {
      const byCountry = locationsData?.byCountry || {};
      const countryObj = byCountry[countryName] || byCountry[String(countryName).trim()] || null;
      if (!countryObj) { if (!mountedRef.current) return; setCities([]); setSelectedCity(''); return; }
      const citiesByState = countryObj.citiesByState || {};
      const arr = Array.isArray(citiesByState[stateName]) ? citiesByState[stateName] : [];
      const sorted = arr.slice().sort((a, b) => String(a).localeCompare(String(b)));
      if (!mountedRef.current) return;
      setCities(sorted);
      if (!sorted.includes(selectedCity)) setSelectedCity('');
    } catch (err) {
      if (!mountedRef.current) return;
      setCities([]); setSelectedCity('');
    }
  }

  /* --------------------- Fetch dados reais (com debounce) --------------------- */
  const fetchProfissionais = async (opts = {}) => {
    try { abortRef.current.prof?.abort(); } catch (_) { }
    const controller = new AbortController();
    abortRef.current.prof = controller;

    setLoadingProf(true);
    setError(null);

    const pageToUse = opts.page ?? profPage ?? 1;
    const limitToUse = opts.limit ?? profPerPage ?? 10;

    const params = {
      q: opts.q ?? search ?? undefined,
      country: opts.country ?? (selectedCountry || undefined),
      state: opts.state ?? (selectedState || undefined),
      city: opts.city ?? (selectedCity || undefined),
      especialidade: opts.especialidade ?? (especialidade || undefined),
      page: pageToUse,
      limit: limitToUse,
      sort: opts.sort ?? sort
    };
    Object.keys(params).forEach(k => params[k] === undefined && delete params[k]);

    try {
      const res = await api.get('/profissionais', { params, signal: controller.signal });
      if (!mountedRef.current) return;
      const payload = res?.data || {};

      let items = [];
      let total = undefined;
      let perPage = undefined;
      let pageNum = pageToUse;

      if (Array.isArray(payload)) {
        items = payload;
      } else if (payload.profissionais) {
        items = payload.profissionais;
        total = payload.total ?? payload.count;
      } else if (payload.data && Array.isArray(payload.data.items)) {
        const itemsAll = payload.data.items || [];
        total = payload.data.total ?? itemsAll.length;
        perPage = payload.data.perPage ?? limitToUse;
        pageNum = payload.data.page ?? pageToUse;
        if (itemsAll.length > (perPage || limitToUse)) {
          const start = (pageToUse - 1) * (perPage || limitToUse);
          items = itemsAll.slice(start, start + (perPage || limitToUse));
        } else {
          items = itemsAll;
        }
      } else if (payload.items) {
        items = payload.items;
        total = payload.total ?? payload.count ?? items.length;
        perPage = payload.perPage ?? limitToUse;
      } else if (payload._id || payload.profissionalId) {
        items = [payload];
      } else if (payload.profissional) {
        items = [payload.profissional];
      }

      const finalPerPage = perPage ?? limitToUse;
      const finalTotal = typeof total === 'number' ? total : (Array.isArray(items) ? items.length : 0);
      const finalTotalPages = Math.max(1, Math.ceil(finalTotal / finalPerPage));

      setProfPerPage(finalPerPage);
      setProfTotal(finalTotal);
      setProfTotalPages(finalTotalPages);
      setProfPage(pageNum);

      if (!items.length) {
        setProfissionais([]);
      } else {
        const normalized = items.map(it => ({
          id: it._id || it.profissionalId || it.userId || (it.id ?? ''),
          name: it.profissionalName || it.name || it.username || '—',
          biografia: it.biografia || '',
          title: it.especialidade || it.title || '—',
          cidade: it.city || it.cidade || '',
          estado: it.state || it.estado || '',
          country: it.country || '',
          imageUrl: it.imageUrl || null,
          raw: it
        }));
        setProfissionais(normalized);
      }
    } catch (err) {
      if (err.name === 'CanceledError' || err.message === 'canceled') {
        // abortado — silencioso
      } else {
        console.error('Erro fetchProfissionais:', err);
        setError('Falha ao carregar profissionais.');
        setProfissionais(mockProfissionais);
      }
    } finally {
      if (mountedRef.current) setLoadingProf(false);
    }
  };

  const fetchLocais = async (opts = {}) => {
    try { abortRef.current.locais?.abort(); } catch (_) { }
    const controller = new AbortController();
    abortRef.current.locais = controller;

    setLoadingLocais(true);
    setError(null);

    const pageToUse = opts.page ?? locaisPage ?? 1;
    const limitToUse = opts.limit ?? locaisPerPage ?? 10;

    const params = {
      q: opts.q ?? search ?? undefined,
      country: opts.country ?? (selectedCountry || undefined),
      state: opts.state ?? (selectedState || undefined),
      city: opts.city ?? (selectedCity || undefined),
      localType: opts.localType ?? (localTypeFilter || null),
      page: pageToUse,
      limit: limitToUse,
      sort: opts.sort ?? sort
    };
    Object.keys(params).forEach(k => params[k] === undefined && delete params[k]);

    try {
      const res = await api.get('/locais', { params, signal: controller.signal });
      if (!mountedRef.current) return;
      const payload = res?.data || {};
      let items = [];
      let total = undefined;
      let perPage = undefined;
      let pageNum = pageToUse;

      if (!payload) items = [];
      else if (Array.isArray(payload)) items = payload;
      else if (payload.data && Array.isArray(payload.data.items)) {
        const itemsAll = payload.data.items || [];
        total = payload.data.total ?? itemsAll.length;
        perPage = payload.data.perPage ?? limitToUse;
        pageNum = payload.data.page ?? pageToUse;
        if (itemsAll.length > (perPage || limitToUse)) {
          const start = (pageToUse - 1) * (perPage || limitToUse);
          items = itemsAll.slice(start, start + (perPage || limitToUse));
        } else {
          items = itemsAll;
        }
      } else if (payload.items) {
        items = payload.items;
        total = payload.total ?? payload.count ?? items.length;
        perPage = payload.perPage ?? limitToUse;
      } else if (payload.locais) items = payload.locais;
      else if (payload.data) items = Array.isArray(payload.data) ? payload.data : (payload.data.items || []);
      else items = [];

      const normalizedAll = (items || []).map(it => ({
        id: it.localId || it.id || it._id || '',
        link: it.link,
        localName: it.localName || it.name || it.title || '—',
        localType: (it.localType || it.type || 'outro'),
        localDescricao: it.localDescricao || it.description || '',
        cidade: it.city || it.cidade || '',
        estado: it.state || it.estado || '',
        country: it.country || '',
        imageUrl: it.imageUrl || it.image || null,
        userId: it.userId || null,
        raw: it
      }));

      const wantedType = (opts.localType ?? localTypeFilter ?? '').toString().trim().toLowerCase();
      const filteredByType = wantedType ? normalizedAll.filter(x => (x.localType || '').toString().toLowerCase() === wantedType) : normalizedAll;

      const finalPerPage = perPage ?? limitToUse;
      const finalTotal = typeof total === 'number' ? total : filteredByType.length;
      const finalTotalPages = Math.max(1, Math.ceil(finalTotal / finalPerPage));

      setLocaisPerPage(finalPerPage);
      setLocaisTotal(finalTotal);
      setLocaisTotalPages(finalTotalPages);
      setLocaisPage(pageNum);
      setLocais(filteredByType);
    } catch (err) {
      if (err.name === 'CanceledError' || err.message === 'canceled') {
        // abortado — silencioso
      } else {
        console.error('Erro fetchLocais:', err);
        setError('Falha ao carregar locais.');
        setLocais(mockAcademias.map(m => ({
          id: m.id || '', link: m.link, localName: m.localName || '—',
          localType: m.localType || 'academia', localDescricao: '', cidade: m.cidade,
          estado: m.estado, country: m.country, imageUrl: null, raw: m
        })));
      }
    } finally {
      if (mountedRef.current) setLoadingLocais(false);
    }
  };

  /* --------------------- Effects de disparo (debounce) --------------------- */
  useEffect(() => {
    mountedRef.current = true;
    loadCountriesLocal();
    if (selectedCountry) {
      loadStatesForCountryLocal(selectedCountry);
      if (selectedState) loadCitiesForStateLocal(selectedCountry, selectedState);
    }
    return () => {
      mountedRef.current = false;
      try { abortRef.current.prof?.abort(); } catch (_) { }
      try { abortRef.current.locais?.abort(); } catch (_) { }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setProfPage(1);
    setLocaisPage(1);
    debounceRef.current = setTimeout(() => {
      fetchProfissionais();
      if (tab === TABS.ACADEMIAS) fetchLocais({ localType: localTypeFilter });
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedCountry, selectedState, selectedCity, especialidade, localTypeFilter, tab]);

  useEffect(() => {
    if (!selectedCountry) { setStates([]); setSelectedState(''); setCities([]); setSelectedCity(''); return; }
    loadStatesForCountryLocal(selectedCountry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry]);

  useEffect(() => {
    if (!selectedState) { setCities([]); setSelectedCity(''); return; }
    if (!selectedCountry) return;
    loadCitiesForStateLocal(selectedCountry, selectedState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedState, selectedCountry]);

  /* --------------------- Handlers --------------------- */
  const goToSolicitacao = (prof) => {
    const raw = prof?.raw || {};
    const key = raw.userId || raw.profissionalId || prof.id || raw._id || '';
    if (!key) { navigate(`/dashboard/coach/u?q=${encodeURIComponent(prof.id || '')}`); return; }
    registerInteraction(key, 'click', 'Profissional');
    navigate(`/dashboard/coach/u?q=${encodeURIComponent(key)}`);
  };

  const visitLocal = (l) => {
    if (l.id) registerInteraction(l.id, 'click', 'Local');
    if (l.link) window.open(l.link, '_blank', 'noopener,noreferrer');
  };

  const Pagination = ({ page, totalPages, onPrev, onNext }) => {
    if (!totalPages || totalPages <= 1) return null;
    return (
      <div className="mt-8 flex items-center justify-center gap-3">
        <button onClick={onPrev} disabled={page <= 1}
          className={`px-3 py-2 rounded-lg border text-sm flex items-center gap-1 disabled:opacity-40 ${T.dark ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'}`}>
          <FiChevronLeft /> Anterior
        </button>
        <span className={`text-sm ${T.subtle}`}>Página {page} de {totalPages}</span>
        <button onClick={onNext} disabled={page >= totalPages}
          className={`px-3 py-2 rounded-lg border text-sm flex items-center gap-1 disabled:opacity-40 ${T.dark ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'}`}>
          Próximo <FiChevronRight />
        </button>
      </div>
    );
  };

  const selectCls = `px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-blue-500/40 ${T.input}`;

  return (
    <div className={`min-h-full ${T.page}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-3xl font-bold">Encontrar</h1>
          <p className={`mt-1 ${T.subtle}`}>Descubra profissionais e locais perto de você.</p>
        </header>

        {/* Busca */}
        <div className="relative mb-5">
          <FiSearch className={`absolute left-4 top-1/2 -translate-y-1/2 ${T.subtle}`} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, especialidade ou local..."
            className={`w-full pl-11 pr-4 py-3.5 rounded-2xl border outline-none focus:ring-2 focus:ring-blue-500/40 ${T.input}`}
          />
        </div>

        {/* Tabs */}
        <div className="mb-5 flex">
          <div className={`inline-flex rounded-xl p-1 ${T.dark ? 'bg-gray-900 border border-gray-800' : 'bg-gray-100'}`}>
            {[{ k: TABS.PROFISSIONAIS, label: 'Profissionais' }, { k: TABS.ACADEMIAS, label: 'Locais' }].map(t => (
              <button key={t.k} onClick={() => setTab(t.k)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t.k ? T.tabActive : T.tabIdle}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filtros */}
        <div className={`rounded-2xl border ${T.panel} p-4 mb-6`}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`text-xs mb-1 block ${T.subtle}`}>País</label>
              <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)} className={`w-full ${selectCls}`}>
                <option value="">Todos os países</option>
                {countries.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={`text-xs mb-1 block ${T.subtle}`}>Estado / Região</label>
              <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)} className={`w-full ${selectCls}`}>
                <option value="">Todos os estados</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={`text-xs mb-1 block ${T.subtle}`}>Cidade</label>
              <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} className={`w-full ${selectCls}`}>
                <option value="">Todas as cidades</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-center text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Profissionais */}
        {tab === TABS.PROFISSIONAIS && (
          <section>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
              <h2 className="text-lg font-bold flex items-center gap-2">
                Profissionais
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${T.chip}`}>{profTotal || 0}</span>
              </h2>
              <div className="flex items-center gap-2">
                <select value={sort} onChange={(e) => { setSort(e.target.value); fetchProfissionais({ sort: e.target.value, page: 1 }); }} className={selectCls}>
                  <option value="recente">Mais recentes</option>
                  <option value="antiguidade">Mais antigos</option>
                  <option value="cliques">Mais populares</option>
                  <option value="impressoes">Mais vistos</option>
                </select>
                <select value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} className={selectCls}>
                  <option value="">Todas especialidades</option>
                  <option value="nutricionista">Nutricionista</option>
                  <option value="personal-trainner">Personal Trainer</option>
                  <option value="fisioterapeuta">Fisioterapeuta</option>
                </select>
              </div>
            </div>

            {loadingProf ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3, 4, 5, 6].map(i => <CardSkeleton key={i} T={T} />)}
              </div>
            ) : profissionais.length ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {profissionais.map(p => (
                    <ProfCard key={p.id || p.name} p={p} T={T} onVerPerfil={goToSolicitacao} />
                  ))}
                </div>
                <Pagination
                  page={profPage} totalPages={profTotalPages}
                  onPrev={() => { const n = Math.max(1, profPage - 1); setProfPage(n); fetchProfissionais({ page: n }); }}
                  onNext={() => { const n = Math.min(profTotalPages, profPage + 1); setProfPage(n); fetchProfissionais({ page: n }); }}
                />
              </>
            ) : (
              <div className={`py-16 text-center ${T.subtle}`}>
                <div className="text-4xl mb-3">🔍</div>
                <p className="font-semibold">Nenhum profissional encontrado</p>
                <p className="text-sm mt-1">Tente ajustar os filtros de busca.</p>
              </div>
            )}
          </section>
        )}

        {/* Locais */}
        {tab === TABS.ACADEMIAS && (
          <section>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
              <h2 className="text-lg font-bold flex items-center gap-2">
                Locais
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${T.chip}`}>{locaisTotal || 0}</span>
              </h2>
              <div className="flex items-center gap-2">
                <select value={sort} onChange={(e) => { setSort(e.target.value); fetchLocais({ sort: e.target.value, page: 1 }); }} className={selectCls}>
                  <option value="recente">Mais recentes</option>
                  <option value="antiguidade">Mais antigos</option>
                  <option value="cliques">Mais populares</option>
                  <option value="impressoes">Mais vistos</option>
                </select>
                <select value={localTypeFilter} onChange={(e) => setLocalTypeFilter(e.target.value)} className={selectCls}>
                  {LOCAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>

            {loadingLocais ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3].map(i => <CardSkeleton key={i} T={T} />)}
              </div>
            ) : (locais && locais.length) ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {locais.map(l => <LocalCard key={l.id || l.localName} l={l} T={T} onVisit={visitLocal} />)}
                </div>
                <Pagination
                  page={locaisPage} totalPages={locaisTotalPages}
                  onPrev={() => { const n = Math.max(1, locaisPage - 1); setLocaisPage(n); fetchLocais({ page: n }); }}
                  onNext={() => { const n = Math.min(locaisTotalPages, locaisPage + 1); setLocaisPage(n); fetchLocais({ page: n }); }}
                />
              </>
            ) : (
              <div className={`py-16 text-center ${T.subtle}`}>
                <div className="text-4xl mb-3">🏙️</div>
                <p className="font-semibold">Nenhum local encontrado</p>
                <p className="text-sm mt-1">Tente outra região ou tipo.</p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
