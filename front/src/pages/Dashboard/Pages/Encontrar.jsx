import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../Api'; // sua instância axios
import locationsData from '../../../data/locations.json';
import { buildImageUrl } from '../../../utils/imageUtils';

// Componente de Loading com IA - Minimalista
const AILoadingAnimation = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300">
      <div className="flex flex-col items-center">
        {/* Logo com Pulso Suave */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full animate-pulse"></div>
          <div className="relative w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <h3 className="text-xl font-bold text-white tracking-wide">TreinAI</h3>
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------- Constantes / mocks (mantive os seus) -------------------- */
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



const mockProfissionais = [
  { id: 'p1', name: 'Maria', title: 'Nutricionista Esportiva', cidade: 'São Paulo', estado: 'SP', country: 'Brazil', raw: { profissionalId: 'p1' } },
  { id: 'p2', name: 'Carlos', title: 'Personal Trainer', cidade: 'São Paulo', estado: 'SP', country: 'Brazil', raw: { profissionalId: 'p2' } },
  { id: 'p3', name: 'Ana', title: 'Nutricionista', cidade: 'Rio de Janeiro', estado: 'RJ', country: 'Brazil', raw: { profissionalId: 'p3' } },
];

const mockAcademias = [
  { id: 'g1', localName: 'SmartGym', cidade: 'São Paulo', estado: 'SP', country: 'Brazil', localType: 'academia' },
  { id: 'g2', localName: 'Academia Corpo Livre', cidade: 'Campinas', estado: 'SP', country: 'Brazil', localType: 'academia' },
  { id: 'g3', localName: 'FitZone RJ', cidade: 'Niterói', estado: 'RJ', country: 'Brazil', localType: 'academia' },
];

function themeClass(tema, lightClass, darkClass) {
  return tema === 'light' ? lightClass : darkClass;
}

/* -------------------- Componente -------------------- */
export default function Encontrar({ user, tema = 'dark' }) {
  const temaValue = tema === 'light' ? 'light' : 'dark';
  const navigate = useNavigate();

  const [tab, setTab] = useState(TABS.PROFISSIONAIS);
  const [search, setSearch] = useState('');
  
  // Estado para animação de loading inicial
  const [showInitialLoading, setShowInitialLoading] = useState(true);
  const [isPageLoaded, setIsPageLoaded] = useState(false);

  // localidades
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(user?.country || user?.perfil?.country || '');
  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState(user?.perfil?.state || user?.state || '');
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState(user?.perfil?.city || user?.city || '');

  const [especialidade, setEspecialidade] = useState('');

  // dados reais
  const [profissionais, setProfissionais] = useState(mockProfissionais);
  const [academias, setAcademias] = useState(mockAcademias); // antigo nome, agora usados como locais/academias
  const [locais, setLocais] = useState([]); // para geral (usado quando buscar por profissional ou por localType)

  // loading / error por lista
  const [loadingProf, setLoadingProf] = useState(false);
  const [loadingGinas, setLoadingGinas] = useState(false);
  const [loadingLocais, setLoadingLocais] = useState(false);
  const [error, setError] = useState(null);

  // ordenação
  const [sort, setSort] = useState('recente'); // recente, antiguidade, cliques, impressoes

  // filtro localType para aba academias
  const [localTypeFilter, setLocalTypeFilter] = useState(null);

  // paginação: estados por lista
  const [profPage, setProfPage] = useState(1);
  const [profPerPage, setProfPerPage] = useState(40);
  const [profTotal, setProfTotal] = useState(0);
  const [profTotalPages, setProfTotalPages] = useState(1);

  const [locaisPage, setLocaisPage] = useState(1);
  const [locaisPerPage, setLocaisPerPage] = useState(40);
  const [locaisTotal, setLocaisTotal] = useState(0);
  const [locaisTotalPages, setLocaisTotalPages] = useState(1);


  const prevRegionRef = useRef({
    country: selectedCountry,
    state: selectedState,
    city: selectedCity,
  });

  // Função de registro de métricas (impressão/clique)
  const registerInteraction = async (targetId, type, targetModel) => {
    try {
      if (!targetId) return;
      // Chamada fire-and-forget para não bloquear UI
      api.post('/metrics/interact', { targetId, type, targetModel }).catch(err => console.error('Erro métrica:', err));
    } catch (err) {
      console.error('Erro ao registrar interação:', err);
    }
  };

  // Registrar impressões em lote (simulado) quando a lista é carregada
  useEffect(() => {
    if (tab === TABS.PROFISSIONAIS && profissionais.length > 0 && !loadingProf) {
      const timer = setTimeout(() => {
        profissionais.forEach(p => {
          if (p.id) registerInteraction(p.id, 'impression', 'Profissional');
        });
      }, 1500); // Delay para confirmar visualização
      return () => clearTimeout(timer);
    }
  }, [profissionais, tab, loadingProf]);

  useEffect(() => {
    if (tab === TABS.ACADEMIAS && locais.length > 0 && !loadingLocais) {
      const timer = setTimeout(() => {
        locais.forEach(l => {
          if (l.id) registerInteraction(l.id, 'impression', 'Local');
        });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [locais, tab, loadingLocais]);

  // abort + debounce refs
  const abortRef = useRef({ prof: null, academias: null, locais: null });
  const debounceRef = useRef(null);
  const mountedRef = useRef(true);

  /* --------------------- Helpers de local (usa locations.json no formato informado) --------------------- */
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
    if (!countryName) {
      setStates([]); setSelectedState(''); return;
    }
    try {
      const byCountry = locationsData?.byCountry || {};
      const countryObj = byCountry[countryName] || byCountry[String(countryName).trim()] || null;
      if (!countryObj) {
        if ((countryName || '').toLowerCase().includes('brazil') || (countryName || '').toLowerCase() === 'br') {
          const br = ['Acre', 'São Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Bahia'];
          if (mountedRef.current) {
            setStates(br);
            if (!br.includes(selectedState)) setSelectedState('');
          }
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
    if (!countryName || !stateName) {
      setCities([]); setSelectedCity(''); return;
    }
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

  /* --------------------- Helpers de API (mantidos/adaptados) --------------------- */
  async function loadCountries() {
    // mantive como fallback (usa local por padrão)
    loadCountriesLocal();
  }

  async function loadStatesForCountry(countryName) {
    // delega para local
    loadStatesForCountryLocal(countryName);
  }

  async function loadCitiesForState(countryName, stateName) {
    loadCitiesForStateLocal(countryName, stateName);
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

      // Normalize different server shapes and handle a server that returns ALL items in payload.data.items
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
        // payload.data may contain the full list and pagination meta
        const itemsAll = payload.data.items || [];
        total = payload.data.total ?? itemsAll.length;
        perPage = payload.data.perPage ?? limitToUse;
        pageNum = payload.data.page ?? pageToUse;

        // if API returned ALL items in itemsAll we must slice client-side
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

      // compute pagination numbers
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
        setError('Falha ao carregar profissionais. Usando dados locais.');
        setProfissionais(mockProfissionais);
      }
    } finally {
      if (mountedRef.current) setLoadingProf(false);
    }
  };

  // fetchLocais: genérico para todos os tipos de Local (usa /locais)
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

      if (payload) console.log('fetchLocais payload:', payload);

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

      // Normaliza e extrai um campo `status` confiável (lowercase)
      const normalizedAll = (items || []).map(it => {
        return {
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
        };
      });

      // filtragem cliente por tipo, se necessário
      const wantedType = (opts.localType ?? localTypeFilter ?? '').toString().trim().toLowerCase();
      const filteredByType = wantedType ? normalizedAll.filter(x => (x.localType || '').toString().toLowerCase() === wantedType) : normalizedAll;

      // compute pagination numbers
      const finalPerPage = perPage ?? limitToUse;
      const finalTotal = typeof total === 'number' ? total : filteredByType.length;
      const finalTotalPages = Math.max(1, Math.ceil(finalTotal / finalPerPage));

      setLocaisPerPage(finalPerPage);
      setLocaisTotal(finalTotal);
      setLocaisTotalPages(finalTotalPages);
      setLocaisPage(pageNum);

      setLocais(filteredByType);
      console.log(locais, 'locais carregados:', filteredByType.length, 'de', filteredByType.length, 'após filtro de tipo');
    } catch (err) {
      if (err.name === 'CanceledError' || err.message === 'canceled') {
        // abortado — silencioso
      } else {
        console.error('Erro fetchLocais:', err);
        setError('Falha ao carregar locais. Usando dados locais.');
        setLocais(mockAcademias.map(m => ({
          id: m.id || m.localId || '',
          link: m.link,
          localName: m.localName || m.name || '—',
          localType: m.localType || 'academia',
          localDescricao: m.localDescricao || '',
          cidade: m.cidade,
          estado: m.estado,
          country: m.country,
          imageUrl: m.imageUrl || null,
          raw: m
        })));
      }

      console.log(locais, 'locais após erro:', locais.length);
    } finally {
      if (mountedRef.current) setLoadingLocais(false);
    }
  };

  const fetchAcademias = async (opts = {}) => {
    const localTypeToUse = opts.localType ?? localTypeFilter ?? 'academia';
    return fetchLocais({ ...opts, localType: localTypeToUse });
  };

  /* --------------------- Effects de disparo (debounce) --------------------- */
  useEffect(() => {
    mountedRef.current = true;
    // carrega países do arquivo local
    loadCountriesLocal();

    // se o usuário já tiver país/estado salvo, pré-carrega os estados e cidades
    if (selectedCountry) {
      loadStatesForCountryLocal(selectedCountry);
      if (selectedState) loadCitiesForStateLocal(selectedCountry, selectedState);
    }

    return () => {
      mountedRef.current = false;
      try { abortRef.current.prof?.abort(); } catch (_) { }
      try { abortRef.current.academias?.abort(); } catch (_) { }
      try { abortRef.current.locais?.abort(); } catch (_) { }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Animação inicial sempre que a página for acessada
    setShowInitialLoading(true);
    setIsPageLoaded(false);
    
    const timer = setTimeout(() => {
      setShowInitialLoading(false);
      setIsPageLoaded(true);
    }, 800); // Reduzido para 0.8s
    
    return () => clearTimeout(timer);
  }, []); // Executa apenas na montagem do componente

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // reset pages on filter/search/tab change
    setProfPage(1);
    setLocaisPage(1);

    debounceRef.current = setTimeout(() => {
      fetchProfissionais();
      if (tab === TABS.ACADEMIAS) {
        fetchLocais({ localType: localTypeFilter });
      }
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedCountry, selectedState, selectedCity, especialidade, localTypeFilter, tab]);

  useEffect(() => {
    if (!selectedCountry) {
      setStates([]); setSelectedState(''); setCities([]); setSelectedCity(''); return;
    }
    loadStatesForCountryLocal(selectedCountry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry]);

  useEffect(() => {
    if (!selectedState) { setCities([]); setSelectedCity(''); return; }
    if (!selectedCountry) return;
    loadCitiesForStateLocal(selectedCountry, selectedState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedState, selectedCountry]);

  /* --------------------- UI helpers --------------------- */
  const norm = (v) => String(v ?? '').toLowerCase().trim();

  const goToSolicitacao = (prof) => {
    const raw = prof?.raw || {};
    const key = raw.userId || raw.profissionalId || prof.id || raw._id || '';
    if (!key) {
      navigate(`/dashboard/coach/u?q=${encodeURIComponent(prof.id || '')}`);
      return;
    }
    // Registrar clique
    registerInteraction(key, 'click', 'Profissional');
    navigate(`/dashboard/coach/u?q=${encodeURIComponent(key)}`);
  };

  const Pagination = ({ page, totalPages, onPrev, onNext }) => {
    if (!totalPages || totalPages <= 1) return null;
    return (
      <div className="mt-4 flex items-center gap-2">
        <button onClick={onPrev} className="px-3 py-1 rounded bg-gray-200">Anterior</button>
        <div className="text-sm">Página {page} de {totalPages}</div>
        <button onClick={onNext} className="px-3 py-1 rounded bg-gray-200">Próximo</button>
      </div>
    );
  };

  return (
    <>
      {/* Animação de Loading Inicial */}
      <AILoadingAnimation 
        isVisible={showInitialLoading} 
        message="Procurando os melhores resultados na sua região."
      />
      
      {/* Conteúdo Principal com animação de entrada */}
      <div className={`transition-all duration-700 ${isPageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className={`p-8 max-w-7xl mx-auto ${themeClass(temaValue, 'bg-gradient-to-br from-gray-50 to-white text-gray-900', 'bg-gradient-to-br from-gray-900 to-gray-800 text-white')} rounded-3xl shadow-2xl border ${themeClass(temaValue, 'border-gray-200', 'border-gray-700')}`}>
          
          {/* Header Modernizado */}
          <header className="mb-8 text-center">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Encontrar
              </h1>
            </div>
            <p className={`text-lg ${themeClass(temaValue, 'text-gray-600', 'text-gray-300')} max-w-2xl mx-auto`}>
              Descubra profissionais qualificados e locais incríveis com o poder da nossa IA
            </p>
          </header>

          {/* Barra de Busca Modernizada */}
          <div className="mb-8">
            <div className="relative max-w-2xl mx-auto">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className={`w-5 h-5 ${themeClass(temaValue, 'text-gray-400', 'text-gray-500')}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🤖 Digite sua busca e deixe nossa IA encontrar o melhor para você..."
                className={`w-full pl-12 pr-4 py-4 rounded-2xl border-2 transition-all duration-300 focus:scale-[1.02] focus:shadow-xl ${
                  tema === 'dark' 
                    ? 'bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:bg-gray-800' 
                    : 'bg-white border-gray-200 text-gray-800 placeholder-gray-500 focus:border-blue-500 focus:bg-gray-50'
                } backdrop-blur-sm shadow-lg`}
              />
            </div>
          </div>

          {/* Tabs Modernizadas */}
          <div className="mb-8 flex justify-center">
            <div className={`inline-flex rounded-2xl p-1 ${themeClass(temaValue, 'bg-gray-100', 'bg-gray-800')} shadow-lg`}>
              <button
                onClick={() => setTab(TABS.PROFISSIONAIS)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  tab === TABS.PROFISSIONAIS 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105' 
                    : `${themeClass(temaValue, 'text-gray-600 hover:text-gray-800', 'text-gray-400 hover:text-white')} hover:bg-white/10`
                }`}
              >
                👨‍⚕️ Profissionais
              </button>
              <button
                onClick={() => setTab(TABS.ACADEMIAS)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  tab === TABS.ACADEMIAS 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105' 
                    : `${themeClass(temaValue, 'text-gray-600 hover:text-gray-800', 'text-gray-400 hover:text-white')} hover:bg-white/10`
                }`}
              >
                🏢 Locais
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 text-center">
              ⚠️ {error}
            </div>
          )}

      <main className="space-y-6">
        {/* filtros de localização */}
        <div className="flex flex-col md:flex-row gap-3 items-start mb-4">
          <div className="w-full md:w-1/3">
            <label className="text-xs text-gray-400 mb-1 block">País</label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg ${themeClass(temaValue, 'border', 'border-gray-300')}`}>
              <option className={`text-black`} value="">Todos os países</option>
              {countries.length ? countries.map(c => (
                <option className={`text-black`} key={c.name} value={c.name}>{c.name}</option>
              )) : <option className={`text-black`}>Carregando países...</option>}
            </select>
          </div>

          <div className="w-full md:w-1/3">
            <label className="text-xs text-gray-400 mb-1 block">Estado / Região</label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg ${themeClass(temaValue, 'border', 'border-gray-300')}`}>
              <option className={`text-black`} value="">Todos os estados</option>
              {states.length ? states.map(s => <option className={`text-black`} key={s} value={s}>{s}</option>) : null}
            </select>
          </div>

          <div className="w-full md:w-1/3">
            <label className="text-xs text-gray-400 mb-1 block">Cidade</label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg ${themeClass(temaValue, 'border', 'border-gray-300')}`}>
              <option className={`text-black`} value="">Todas as cidades</option>
              {cities.length ? cities.map(c => <option className={`text-black`} key={c} value={c}>{c}</option>) : null}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <div className="inline-flex w-full flex-wrap items-center gap-3 px-4 py-2 rounded-xl bg-gray-100 text-sm text-gray-700">
            <strong>Selecionado:</strong>
            <span>{selectedCountry || 'Todos os países'}</span>
            <span>›</span>
            <span>{selectedState || 'Todos os estados'}</span>
            <span>›</span>
            <span>{selectedCity || 'Todas as cidades'}</span>
          </div>
        </div>

        {/* Removido: Receitas e qualquer publicação */}

        {/* Profissionais */}
        {tab === TABS.PROFISSIONAIS && (
          <section>
            <div className="flex items-center justify-between flex-wrap mb-6 gap-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
                  Profissionais em Destaque
                </span>
                <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{profTotal || 0} encontrados</span>
              </h2>
              <div className="flex items-center gap-2">
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    fetchProfissionais({ sort: e.target.value, page: 1 });
                  }}
                  className={`px-3 py-2 rounded-xl border font-medium text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${themeClass(temaValue, 'bg-white border-gray-200 text-gray-700', 'bg-gray-800 border-gray-700 text-gray-200')}`}
                >
                  <option value="recente">Mais Recentes</option>
                  <option value="antiguidade">Mais Antigos</option>
                  <option value="cliques">Mais Populares</option>
                  <option value="impressoes">Mais Vistos</option>
                </select>

                <select 
                  value={especialidade} 
                  onChange={(e) => setEspecialidade(e.target.value)} 
                  className={`px-4 py-2.5 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-blue-500 outline-none ${themeClass(temaValue, 'bg-white border border-gray-200', 'bg-gray-800 border border-gray-700 text-white')}`}
                >
                  <option className="text-black" value="">Todas as especialidades</option>
                  <option className="text-black" value="nutricionista">🥗 Nutricionista</option>
                  <option className="text-black" value="personal-trainner">💪 Personal Trainer</option>
                  <option className="text-black" value="fisioterapeuta">🩺 Fisioterapeuta</option>
                </select>
              </div>
            </div>

            {loadingProf ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className={`h-64 rounded-2xl ${themeClass(temaValue, 'bg-gray-200', 'bg-gray-800')}`}></div>
                ))}
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {profissionais.length ? profissionais.map(p => (
                    <div 
                      key={p.id || p.name} 
                      className={`group relative overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${themeClass(temaValue, 'bg-white shadow-lg border-gray-100', 'bg-gray-800 shadow-xl border-gray-700')} border`}
                    >
                      {/* Capa / Imagem de Fundo com Overlay */}
                      <div className="h-32 bg-gradient-to-r from-blue-600 to-purple-600 relative">
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                        {p.imageUrl && (
                          <div 
                            className="absolute inset-0 bg-cover bg-center opacity-50 mix-blend-overlay"
                            style={{ backgroundImage: `url(${buildImageUrl(p.imageUrl)})` }}
                          />
                        )}
                      </div>

                      {/* Conteúdo do Card */}
                      <div className="px-6 pb-6 relative">
                        {/* Avatar */}
                        <div className="-mt-12 mb-4 flex justify-between items-end">
                          <div className="w-24 h-24 rounded-2xl border-4 border-white dark:border-gray-800 overflow-hidden shadow-lg bg-white relative z-10">
                            {p.imageUrl ? (
                              <img src={buildImageUrl(p.imageUrl)} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-2xl font-bold text-gray-400">
                                {(p.name || 'U')[0]}
                              </div>
                            )}
                          </div>
                          
                          <div className="mb-2">
                             <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                               p.title?.toLowerCase().includes('nutri') ? 'bg-green-100 text-green-700' :
                               p.title?.toLowerCase().includes('personal') ? 'bg-orange-100 text-orange-700' :
                               'bg-blue-100 text-blue-700'
                             }`}>
                               {p.title?.split(' ')[0] || 'Pro'}
                             </span>
                          </div>
                        </div>

                        {/* Informações */}
                        <div className="space-y-3">
                          <div>
                            <h3 className={`text-xl font-bold truncate ${themeClass(temaValue, 'text-gray-900', 'text-white')}`}>
                              {p.name}
                            </h3>
                            <p className={`text-sm font-medium ${themeClass(temaValue, 'text-gray-500', 'text-gray-400')}`}>
                              {p.title}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="truncate">{[p.cidade, p.estado].filter(Boolean).join(', ') || 'Localização não informada'}</span>
                          </div>

                          {p.biografia && (
                            <p className={`text-sm line-clamp-2 ${themeClass(temaValue, 'text-gray-600', 'text-gray-300')}`}>
                              {p.biografia}
                            </p>
                          )}

                          <button
                            onClick={() => goToSolicitacao(p)}
                            className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg shadow-blue-500/30 transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-2 group-hover:shadow-blue-500/50"
                          >
                            <span>Ver Perfil Completo</span>
                            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-full py-12 text-center">
                      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">🕵️</span>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-600">Nenhum profissional encontrado</h3>
                      <p className="text-gray-500 mt-2">Tente ajustar seus filtros de busca</p>
                    </div>
                  )}
                </div>

                <Pagination
                  page={profPage}
                  totalPages={profTotalPages}
                  onPrev={() => {
                    const novo = Math.max(1, profPage - 1);
                    setProfPage(novo);
                    fetchProfissionais({ page: novo });
                  }}
                  onNext={() => {
                    const novo = Math.min(profTotalPages, profPage + 1);
                    setProfPage(novo);
                    fetchProfissionais({ page: novo });
                  }}
                />
              </div>
            )}
          </section>
        )}

        {/* Academias / Locais */}
        {tab === TABS.ACADEMIAS && (
          <section>
            <div className="flex items-center justify-between flex-wrap mb-6 gap-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
                  Locais Próximos
                </span>
                <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{locaisTotal || 0} locais</span>
              </h2>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <select
                    value={sort}
                    onChange={(e) => {
                      setSort(e.target.value);
                      fetchLocais({ sort: e.target.value, page: 1 });
                    }}
                    className={`w-full mb-2 px-4 py-2.5 rounded-xl appearance-none transition-all duration-200 focus:ring-2 focus:ring-blue-500 outline-none ${themeClass(temaValue, 'bg-white border border-gray-200', 'bg-gray-800 border border-gray-700 text-white')}`}
                  >
                    <option value="recente">Mais Recentes</option>
                    <option value="antiguidade">Mais Antigos</option>
                    <option value="cliques">Mais Populares</option>
                    <option value="impressoes">Mais Vistos</option>
                  </select>

                  <select 
                    value={localTypeFilter} 
                    onChange={(e) => setLocalTypeFilter(e.target.value)} 
                    className={`w-full px-4 py-2.5 rounded-xl appearance-none transition-all duration-200 focus:ring-2 focus:ring-blue-500 outline-none ${themeClass(temaValue, 'bg-white border border-gray-200', 'bg-gray-800 border border-gray-700 text-white')}`}
                  >
                    {LOCAL_TYPES.map(t => <option key={t.value} className='text-black' value={t.value}>{t.label}</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                
                <button 
                  onClick={() => fetchLocais({ localType: localTypeFilter })} 
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors shadow-lg shadow-blue-500/20"
                >
                  Buscar
                </button>
              </div>
            </div>

            {loadingLocais ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                {[1,2,3].map(i => (
                  <div key={i} className={`h-80 rounded-2xl ${themeClass(temaValue, 'bg-gray-200', 'bg-gray-800')}`}></div>
                ))}
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(locais && locais.length) ? locais.map(l => (
                    <div
                      key={l.id || l.localName}
                      className={`group relative overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${themeClass(temaValue, 'bg-white shadow-lg border-gray-100', 'bg-gray-800 shadow-xl border-gray-700')} border h-full flex flex-col`}
                    >
                      {/* Imagem do Local */}
                      <div className="relative h-48 overflow-hidden">
                        <div className="absolute top-3 right-3 z-10">
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/90 text-gray-800 shadow-lg backdrop-blur-sm">
                            {(LOCAL_TYPES.find(t => t.value === l.localType)?.label) || l.localType}
                          </span>
                        </div>
                        
                        {l.imageUrl ? (
                          <img 
                            src={buildImageUrl(l.imageUrl)} 
                            alt={l.localName} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                          />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center ${themeClass(temaValue, 'bg-gray-100', 'bg-gray-700')}`}>
                            <span className="text-4xl">🏢</span>
                          </div>
                        )}
                        
                        {/* Gradiente Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      </div>

                      {/* Conteúdo */}
                      <div className="p-5 flex-1 flex flex-col">
                        <div className="mb-4">
                          <h3 className={`text-xl font-bold mb-1 ${themeClass(temaValue, 'text-gray-900', 'text-white')}`}>
                            {l.localName}
                          </h3>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="truncate">{[l.cidade, l.estado, l.country].filter(Boolean).join(', ') || 'Endereço não disponível'}</span>
                          </div>
                        </div>

                        {l.localDescricao && (
                          <p className={`text-sm mb-4 line-clamp-2 flex-1 ${themeClass(temaValue, 'text-gray-600', 'text-gray-300')}`}>
                            {l.localDescricao}
                          </p>
                        )}

                        <button 
                          onClick={() => {
                            if (l.id) registerInteraction(l.id, 'click', 'Local');
                            window.open(l.link, '_blank', 'noopener,noreferrer');
                          }}
                          className="w-full mt-auto py-2.5 rounded-xl border-2 border-blue-600 text-blue-600 font-semibold hover:bg-blue-600 hover:text-white transition-all duration-300 flex items-center justify-center gap-2 group/btn"
                        >
                          <span>Visitar Site / Perfil</span>
                          <svg className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-full py-12 text-center">
                      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">🏙️</span>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-600">Nenhum local encontrado</h3>
                      <p className="text-gray-500 mt-2">Tente buscar em outra região ou mude o tipo</p>
                    </div>
                  )}
                </div>

                <Pagination
                  page={locaisPage}
                  totalPages={locaisTotalPages}
                  onPrev={() => {
                    const novo = Math.max(1, locaisPage - 1);
                    setLocaisPage(novo);
                    fetchLocais({ page: novo });
                  }}
                  onNext={() => {
                    const novo = Math.min(locaisTotalPages, locaisPage + 1);
                    setLocaisPage(novo);
                    fetchLocais({ page: novo });
                  }}
                />
              </div>
            )}
          </section>
        )}
      </main>
        </div>
      </div>
    </>
  );
}

// // Componente de Loading com IA
// const AILoadingAnimation = ({ isVisible, message = "Sua IA está procurando os melhores resultados..." }) => {
//   const [dots, setDots] = useState('');
  
//   useEffect(() => {
//     if (!isVisible) return;
    
//     const interval = setInterval(() => {
//       setDots(prev => prev.length >= 3 ? '' : prev + '.');
//     }, 500);
    
//     return () => clearInterval(interval);
//   }, [isVisible]);

//   if (!isVisible) return null;

//   return (
//     <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300">
//       <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 max-w-md mx-4 border border-white/20 shadow-2xl">
//         <div className="flex flex-col items-center space-y-6">
//           {/* Animação de IA - Círculos pulsantes */}
//           <div className="relative">
//             <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 animate-pulse"></div>
//             <div className="absolute inset-0 w-16 h-16 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 animate-ping opacity-75"></div>
//             <div className="absolute inset-2 w-12 h-12 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 animate-pulse delay-150"></div>
            
//             {/* Ícone de IA no centro */}
//             <div className="absolute inset-0 flex items-center justify-center">
//               <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
//                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//               </svg>
//             </div>
//           </div>
          
//           {/* Texto animado */}
//           <div className="text-center">
//             <h3 className="text-xl font-semibold text-white mb-2">
//               🤖 TreinAI Buscando
//             </h3>
//             <p className="text-white/80 text-sm">
//               {message}{dots}
//             </p>
//           </div>
          
//           {/* Barra de progresso animada */}
//           <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
//             <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse"></div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// /* --------------------- Effects de disparo (debounce) --------------------- */
//   useEffect(() => {
//     mountedRef.current = true;
//     // carrega países do arquivo local
//     loadCountriesLocal();

//     // se o usuário já tiver país/estado salvo, pré-carrega os estados e cidades
//     if (selectedCountry) {
//       loadStatesForCountryLocal(selectedCountry);
//       if (selectedState) loadCitiesForStateLocal(selectedCountry, selectedState);
//     }

//     return () => {
//       mountedRef.current = false;
//       try { abortRef.current.prof?.abort(); } catch (_) { }
//       try { abortRef.current.academias?.abort(); } catch (_) { }
//       try { abortRef.current.locais?.abort(); } catch (_) { }
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   useEffect(() => {
//     if (debounceRef.current) clearTimeout(debounceRef.current);

//     // reset pages on filter/search/tab change
//     setProfPage(1);
//     setLocaisPage(1);

//     debounceRef.current = setTimeout(() => {
//       fetchProfissionais();
//       if (tab === TABS.ACADEMIAS) {
//         fetchLocais({ localType: localTypeFilter });
//       }
//     }, 400);

//     return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [search, selectedCountry, selectedState, selectedCity, especialidade, localTypeFilter, tab]);

//   useEffect(() => {
//     if (!selectedCountry) {
//       setStates([]); setSelectedState(''); setCities([]); setSelectedCity(''); return;
//     }
//     loadStatesForCountryLocal(selectedCountry);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [selectedCountry]);

//   useEffect(() => {
//     if (!selectedState) { setCities([]); setSelectedCity(''); return; }
//     if (!selectedCountry) return;
//     loadCitiesForStateLocal(selectedCountry, selectedState);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [selectedState, selectedCountry]);

//   /* --------------------- UI helpers --------------------- */
//   const norm = (v) => String(v ?? '').toLowerCase().trim();

//   const goToSolicitacao = (prof) => {
//     const raw = prof?.raw || {};
//     const key = raw.userId || raw.profissionalId || prof.id || raw._id || '';
//     if (!key) {
//       navigate(`/dashboard/coach/u?q=${encodeURIComponent(prof.id || '')}`);
//       return;
//     }
//     navigate(`/dashboard/coach/u?q=${encodeURIComponent(key)}`);
//   };

//   const Pagination = ({ page, totalPages, onPrev, onNext }) => {
//     if (!totalPages || totalPages <= 1) return null;
//     return (
//       <div className="mt-4 flex items-center gap-2">
//         <button onClick={onPrev} className="px-3 py-1 rounded bg-gray-200">Anterior</button>
//         <div className="text-sm">Página {page} de {totalPages}</div>
//         <button onClick={onNext} className="px-3 py-1 rounded bg-gray-200">Próximo</button>
//       </div>
//     );
//   };

//   return (
//     <div className={`p-6 max-w-6xl mx-auto ${themeClass(temaValue, 'bg-white text-gray-900', 'bg-gray-900 text-white')} rounded-md`}>
//       <header className="mb-6 w-full text-clip">
//         <h1 className="text-3xl font-extrabold">Encontrar</h1>
//         <p className="text-sm text-gray-500 w-full">Busque profissionais e locais por país, estado e cidade.</p>
//       </header>

//       <div className="mb-6 flex flex-col sm:flex-row gap-3">
//         <input
//           value={search}
//           onChange={(e) => setSearch(e.target.value)}
//           placeholder="Procure por profissional ou local..."
//           className={`flex-1 px-4 py-3 rounded-xl border shadow-sm ${tema === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}
//         />

//         <div className="flex flex-wrap gap-2">
//           <button
//             onClick={() => setTab(TABS.PROFISSIONAIS)}
//             className={`px-4 py-2 rounded-xl font-semibold ${tab === TABS.PROFISSIONAIS ? 'bg-blue-600 text-white' : themeClass(temaValue, 'bg-gray-100', 'bg-gray-800')}`}>
//             Profissionais
//           </button>
//           <button
//             onClick={() => setTab(TABS.ACADEMIAS)}
//             className={`px-4 py-2 rounded-xl font-semibold ${tab === TABS.ACADEMIAS ? 'bg-blue-600 text-white' : themeClass(temaValue, 'bg-gray-100', 'bg-gray-800')}`}>
//             Locais
//           </button>
//         </div>
//       </div>

//       {error && <div className="mb-4 text-red-600">{error}</div>}

//       <main className="space-y-6">
//         {/* filtros de localização */}
//         <div className="flex flex-col md:flex-row gap-3 items-start mb-4">
//           <div className="w-full md:w-1/3">
//             <label className="text-xs text-gray-400 mb-1 block">País</label>
//             <select
//               value={selectedCountry}
//               onChange={(e) => setSelectedCountry(e.target.value)}
//               className={`w-full px-3 py-2 rounded-lg ${themeClass(temaValue, 'border', 'border-gray-300')}`}>
//               <option className={`text-black`} value="">Todos os países</option>
//               {countries.length ? countries.map(c => (
//                 <option className={`text-black`} key={c.name} value={c.name}>{c.name}</option>
//               )) : <option className={`text-black`}>Carregando países...</option>}
//             </select>
//           </div>

//           <div className="w-full md:w-1/3">
//             <label className="text-xs text-gray-400 mb-1 block">Estado / Região</label>
//             <select
//               value={selectedState}
//               onChange={(e) => setSelectedState(e.target.value)}
//               className={`w-full px-3 py-2 rounded-lg ${themeClass(temaValue, 'border', 'border-gray-300')}`}>
//               <option className={`text-black`} value="">Todos os estados</option>
//               {states.length ? states.map(s => <option className={`text-black`} key={s} value={s}>{s}</option>) : null}
//             </select>
//           </div>

//           <div className="w-full md:w-1/3">
//             <label className="text-xs text-gray-400 mb-1 block">Cidade</label>
//             <select
//               value={selectedCity}
//               onChange={(e) => setSelectedCity(e.target.value)}
//               className={`w-full px-3 py-2 rounded-lg ${themeClass(temaValue, 'border', 'border-gray-300')}`}>
//               <option className={`text-black`} value="">Todas as cidades</option>
//               {cities.length ? cities.map(c => <option className={`text-black`} key={c} value={c}>{c}</option>) : null}
//             </select>
//           </div>
//         </div>

//         <div className="mb-4">
//           <div className="inline-flex w-full flex-wrap items-center gap-3 px-4 py-2 rounded-xl bg-gray-100 text-sm text-gray-700">
//             <strong>Selecionado:</strong>
//             <span>{selectedCountry || 'Todos os países'}</span>
//             <span>›</span>
//             <span>{selectedState || 'Todos os estados'}</span>
//             <span>›</span>
//             <span>{selectedCity || 'Todas as cidades'}</span>
//           </div>
//         </div>

//         {/* Removido: Receitas e qualquer publicação */}

//         {/* Profissionais */}
//         {tab === TABS.PROFISSIONAIS && (
//           <section>
//             <div className="flex items-center justify-between flex-wrap mb-3 gap-4">
//               <h2 className="text-xl font-bold">Profissionais</h2>
//               <div className="flex items-center gap-2">
//                 <select value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} className={`px-3 py-2 rounded-lg ${themeClass(temaValue, 'border', 'border-gray-600')}`}>
//                   <option className={`text-black`} value="">Todas as especialidades</option>
//                   <option className={`text-black`} value="nutricionista">Nutricionista</option>
//                   <option className={`text-black`} value="personal-trainner">Personal Trainer</option>
//                   <option className={`text-black`} value="fisioterapeuta">Fisioterapeuta</option>
//                 </select>
//               </div>
//             </div>

//             {loadingProf ? <div>Carregando profissionais...</div> : (
//               <div>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   {profissionais.length ? profissionais.map(p => (
//                     <div key={p.id || p.name} style={{
//                       backgroundImage: `url(${buildImageUrl(p.imageUrl)})`,
//                       backgroundPosition: 'center',
//                       backgroundSize: 'cover',
//                       backgroundRepeat: 'no-repeat'
//                     }} className={`rounded-xl ${themeClass(temaValue, 'bg-white', 'bg-gray-800')} shadow-sm border`}>
//                       <div className="p-2 rounded-xl flex bg-gradient-to-b from-black/80 to-black/0 flex-wrap items-start gap-4">
//                         <div className="w-16 h-16 rounded-full overflow-hidden border flex-shrink-0">
//                           {p.imageUrl ? (
//                   <img src={buildImageUrl(p.imageUrl)} alt={p.name} className="w-full h-full object-cover" />
//                           ) : (
//                             <div className="w-full h-full flex items-center justify-center bg-gray-200 text-black">{(p.name || '—')[0]}</div>
//                           )}
//                         </div>

//                         <div className="flex-1">
//                           <div className="font-semibold text-white">{p.name}</div>
//                           <div className="font-normal text-white">{p.biografia}</div>
//                           <div className="text-sm text-gray-200 uppercase">{p.title}</div>
//                           <div className="text-xs text-gray-100 mt-2 uppercase">{p.cidade} — {p.estado} — {p.country || '—'}</div>
//                         </div>

//                         <div className="flex flex-col gap-2 items-end">
//                           <button
//                             onClick={() => goToSolicitacao(p)}
//                             className="px-3 py-1 rounded-lg bg-blue-600 text-white text-sm"
//                           >
//                             Ver Perfil / Solicitar
//                           </button>
//                         </div>
//                       </div>
//                     </div>
//                   )) : <div className="text-sm text-gray-400">Nenhum profissional encontrado com esses filtros.</div>}
//                 </div>

//                 <Pagination
//                   page={profPage}
//                   totalPages={profTotalPages}
//                   onPrev={() => {
//                     const novo = Math.max(1, profPage - 1);
//                     setProfPage(novo);
//                     fetchProfissionais({ page: novo });
//                   }}
//                   onNext={() => {
//                     const novo = Math.min(profTotalPages, profPage + 1);
//                     setProfPage(novo);
//                     fetchProfissionais({ page: novo });
//                   }}
//                 />
//               </div>
//             )}
//           </section>
//         )}

//         {/* Academias / Locais */}
//         {tab === TABS.ACADEMIAS && (
//           <section>
//             <div className="mb-4 flex items-center flex-wrap justify-between gap-4">
//               <h2 className="text-xl font-bold">Locais</h2>

//               <div className="flex items-center flex-wrap sm:flex-nowrap gap-2">
//                 <label className="text-sm">Tipo:</label>
//                 <select value={localTypeFilter} onChange={(e) => setLocalTypeFilter(e.target.value)} className="px-3 py-2 rounded-lg w-full border">
//                   {LOCAL_TYPES.map(t => <option key={t.value} className='text-black' value={t.value}>{t.label}</option>)}
//                 </select>

//                 <button onClick={() => fetchLocais({ localType: localTypeFilter })} className="px-3 py-2 rounded-lg bg-blue-600 text-white">Buscar</button>
//               </div>
//             </div>

//             {loadingLocais ? <div>Carregando locais...</div> : (
//               <div>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   {(locais && locais.length) ? locais.map(l => (
//                     <div
//                       key={l.id || l.localName}
//                       style={{
//                         backgroundImage: `url(${buildImageUrl(l.imageUrl)})`,
//                         backgroundPosition: 'center',
//                         backgroundSize: 'cover',
//                         backgroundRepeat: 'no-repeat',
//                       }}
//                       className={`rounded-2xl shadow-sm border ring ring-blue-600 border-gray-800 text-white`}
//                     >
//                       <div className="flex flex-wrap p-4 items-start bg-gradient-to-b rounded-2xl from-black/80 to-black/0 gap-4">
//                         <div className="w-16 h-16 rounded-md overflow-hidden border flex-shrink-0 bg-gray-200">
//                           {l.imageUrl ? <img src={buildImageUrl(l.imageUrl)} alt={l.localName} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-black">LK</div>}
//                         </div>

//                         <div className="flex-1">
//                           <div className="font-semibold">{l.localName}</div>
//                           <div className="text-sm contrast-100">{(LOCAL_TYPES.find(t => t.value === l.localType)?.label) || l.localType}</div>
//                           <div className="text-xs contrast-50 mt-2">{l.cidade} — {l.estado} — {l.country || '—'}</div>
//                           {l.localDescricao ? <div className="text-xs mt-2 contrast-100">{l.localDescricao}</div> : null}
//                         </div>

//                         <div className="flex flex-col gap-2">
//                           <button className="px-3 py-1 rounded-lg bg-blue-600 text-white text-sm" onClick={() => {
//                             window.open(l.link, '_blank', 'noopener,noreferrer');
//                           }}>Saber mais..</button>
//                         </div>
//                       </div>
//                     </div>
//                   )) : <div className="text-sm text-gray-400">Nenhum local encontrado com esses filtros.</div>}
//                 </div>

//                 <Pagination
//                   page={locaisPage}
//                   totalPages={locaisTotalPages}
//                   onPrev={() => {
//                     const novo = Math.max(1, locaisPage - 1);
//                     setLocaisPage(novo);
//                     fetchLocais({ page: novo });
//                   }}
//                   onNext={() => {
//                     const novo = Math.min(locaisTotalPages, locaisPage + 1);
//                     setLocaisPage(novo);
//                     fetchLocais({ page: novo });
//                   }}
//                 />
//               </div>
//             )}
//           </section>
//         )}
//       </main>
//     </div>
//   );
// }
