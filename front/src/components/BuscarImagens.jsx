// components/BuscarImagens.jsx
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import api from '../Api';

const API_KEY = import.meta.env.VITE_API_GOOGLE_SEARCH_IMAGES;
const CX = import.meta.env.VITE_CX;
const TRANSLATE_URL = import.meta.env.VITE_TRANSLATE_API_URL;
const TRANSLATE_KEY = import.meta.env.VITE_TRANSLATE_API_KEY;
const PEXELS_KEY = import.meta.env.VITE_API_PEXELS_KEY;
const ALLOWED_IMAGE_DOMAINS = [
  'unsplash.com',
  'images.unsplash.com',
  'source.unsplash.com',
  'pexels.com',
  'images.pexels.com',
  'pixabay.com',
  'cdn.pixabay.com',
  'ui-avatars.com'
];

const PT_EN = {
  agachamento: 'squat',
  supino: 'bench press',
  remada: 'row',
  biceps: 'biceps curl',
  triceps: 'triceps extension',
  ombro: 'shoulder press',
  abdomen: 'abs crunch',
  abdominal: 'abs crunch',
  panturrilha: 'calf raise',
  gluteo: 'glute bridge',
  flexao: 'push up',
  barra: 'pull up',
  costas: 'back workout',
  peitoral: 'chest workout',
  pernas: 'leg workout'
};

const buildSearchQuery = (s) => {
  const base = String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const words = base.toLowerCase().split(/\s+/).filter(Boolean);
  const mapped = words.map(w => PT_EN[w] || '').filter(Boolean);
  return `${base} ${mapped.join(' ')}`.trim();
};

/**
 * BuscarImagem (com console.logs)
 */
const BuscarImagem = ({ query, className, imgType = 'svg', chatTreino = false, email, alt }) => {
  const [img, setImg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fallbackCandidates, setFallbackCandidates] = useState([]);
  const [fallbackIdx, setFallbackIdx] = useState(0);
  const [animating, setAnimating] = useState(false);

  // report states
  const [showReport, setShowReport] = useState(false);
  const [reportValue, setReportValue] = useState('');
  const [reporting, setReporting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(null);
  const [reportError, setReportError] = useState(null);

  const abortRef = useRef(null);
  const wrapperRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    // reset state on new query
    setImg(null);
    setError(null);

    const q = query ? String(query).trim() : '';
    if (!q) {
      setLoading(false);
      return;
    }

    // abort previous
    if (abortRef.current) {
      try { abortRef.current.abort(); } catch (_) { }
      abortRef.current = null;
    }
    const ctl = new AbortController();
    abortRef.current = ctl;

    setLoading(true);
    setError(null);

    const fetchExisting = async (signal) => {
      try {
        const res = await api.get('/images/find', { params: { query: q }, signal })
        if (res?.data?.success && res?.data?.found) return res.data.url
        return null
      } catch (_) {
        return null
      }
    }

    const generateNew = async (signal) => {
      try {
        setAnimating(true)
        const csrf = (document.cookie.match(new RegExp('(^| )csrfToken=([^;]+)'))?.[2]) || (document.cookie.match(new RegExp('(^| )csrf_token=([^;]+)'))?.[2]) || ''
        const res = await api.post('/images/generate', { query: q }, { signal, headers: { 'X-CSRF-Token': csrf } })
        setAnimating(false)
        if (res?.data?.success && res?.data?.url) return res.data.url
        return null
      } catch (e) {
        setAnimating(false)
        return null
      }
    }

    const fetchImageFromGoogle = async (signal) => {
      // Verificar se as chaves da API estão configuradas
      if (!API_KEY || !CX) {
        console.warn('[BuscarImagem] Google API keys not configured, skipping Google Search');
        return null;
      }

      try {
        // tentar por domínio permitido individualmente para melhorar relevância
        const qEff = await getEffectiveQuery(q, signal);
        for (const domain of ALLOWED_IMAGE_DOMAINS) {
          const params = {
            key: API_KEY,
            cx: CX,
            q: qEff,
            searchType: 'image',
            rights: 'cc_publicdomain,cc_attribute,cc_sharealike',
            num: 4,
            siteSearch: domain,
            siteSearchFilter: 'i',
          }
          if (imgType === 'gif') params.fileType = 'gif'
          const res = await axios.get('https://www.googleapis.com/customsearch/v1', {
            params,
            signal,
            validateStatus: (s) => s >= 200 && s < 500,
          });

          if (res?.status === 403) {
            console.warn('[BuscarImagem] Google API 403 — quota/key problem:', res.data);
            continue;
          } else if (res?.status === 400) {
            console.warn('[BuscarImagem] Google API 400 — bad request:', res.data);
            continue;
          }

          const items = res?.data?.items;
          if (Array.isArray(items) && items.length > 0) {
            const filtered = items.filter(it => {
              const lnk = it?.link;
              if (!lnk) return false;
              try {
                const host = new URL(lnk).hostname.toLowerCase();
                return ALLOWED_IMAGE_DOMAINS.some(d => host === d || host.endsWith(`.${d}`));
              } catch (_) {
                return false;
              }
            });
            const link = (filtered[0]?.link) || (items[0]?.link) || null;
            if (link) return link;
          }
        }
        return null;
      } catch (err) {
        // tratar cancelamento de requisição
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED' || (axios.isCancel && axios.isCancel(err))) {
          return null;
        }

        // Log mais detalhado do erro
        if (err?.response?.status === 403) {
          console.warn('[BuscarImagem] Google API quota exceeded or invalid key:', err?.response?.data);
        } else if (err?.response?.status === 400) {
          console.warn('[BuscarImagem] Google API bad request:', err?.response?.data);
        } else {
          console.warn('[BuscarImagem] Google Search error (will fallback):', err?.response?.data || err?.message || err);
        }
        return null;
      }
    };

    const fetchImageFromPexels = async (signal) => {
      if (!PEXELS_KEY) {
        console.log("!PEXELS_KEY");
        return null
      };

      try {
        const qEff = await getEffectiveQuery(q, signal);
        const res = await axios.get('https://api.pexels.com/v1/search', {
          params: { query: qEff, per_page: 12 },
          headers: { Authorization: PEXELS_KEY },
          signal,
          validateStatus: (s) => s >= 200 && s < 500,
        });
        if (res?.status >= 400) return null;
        const photos = res?.data?.photos || [];
        if (photos.length) {
          const p = photos[0];
          const link = p?.src?.large2x || p?.src?.large || p?.src?.original || p?.src?.medium || null;
          return link || null;
        }
        console.log("[BuscarImagem] Nenhuma imagem via pexels")
        return null;
      } catch (_) {
        console.log(_);
        return null;
      }
    };

    const tryLoad = async () => {
      try {
        // 1) when chatTreino try local DB first
        if (chatTreino && email) {
          try {
            const res = await api.get('/procurar-exercicio', {
              params: { exercicioName: q, email },
              signal: ctl.signal,
            });
            if (res?.data?.found && res?.data?.exercicio?.imageUrl) {
              if (!mountedRef.current) return;
              setImg(res.data.exercicio.imageUrl);
              setLoading(false);
              return;
            }
          } catch (err) {
            if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED' || (axios.isCancel && axios.isCancel(err))) {
              return;
            }
            console.warn('[BuscarImagem] local DB lookup failed (will continue to online):', err?.response?.data || err?.message || err);
          }
        }

        const existingUrl = await fetchExisting(ctl.signal)
        if (existingUrl) {
          if (!mountedRef.current) return;
          setImg(existingUrl)
          setLoading(false)
          return
        }

        const createdUrl = await generateNew(ctl.signal)
        if (createdUrl) {
          if (!mountedRef.current) return;
          setImg(createdUrl)
          setLoading(false)
          return
        }

        // 2b) outras fontes restritas a domínios permitidos (sem API key)
        // como exemplo, mantemos Unsplash com variações específicas mais adiante

        // 3) fallback com lista de candidatos por categoria
        console.log('[BuscarImagem] Google API failed, using fallback sources');

        const qLower = q.toLowerCase();
        const enLower = await getEffectiveQuery(q, ctl.signal);
        const candidates = [];

        if (qLower.includes('perfil') || qLower.includes('usuario') || qLower.includes('user')) {
          candidates.push(`https://ui-avatars.com/api/?name=${encodeURIComponent(q)}&background=random&size=400`);
        } else if (qLower.includes('exercicio') || qLower.includes('treino') || qLower.includes('fitness') || qLower.includes('gym')) {
          candidates.push(
            `https://source.unsplash.com/400x400/?fitness,exercise,${encodeURIComponent(enLower)}`,
            `https://source.unsplash.com/400x400/?workout,${encodeURIComponent(enLower)}`,
            `https://source.unsplash.com/400x400/?gym,${encodeURIComponent(enLower)}`,
            `https://source.unsplash.com/400x400/?fitness`
          );
        } else if (qLower.includes('comida') || qLower.includes('alimento') || qLower.includes('receita')) {
          candidates.push(
            `https://source.unsplash.com/400x400/?food,healthy,${encodeURIComponent(q)}`,
            `https://source.unsplash.com/400x400/?food,${encodeURIComponent(q)}`,
            `https://source.unsplash.com/400x400/?healthy`
          );
        } else {
          candidates.push(
            `https://source.unsplash.com/400x400/?${encodeURIComponent(q)}`,
            `https://source.unsplash.com/400x400/?random`
          );
        }

        // candidatos finais genéricos
        candidates.push(
          `https://source.unsplash.com/random/400x400/?fitness`,
          `https://source.unsplash.com/random/400x400/?exercise`
        );

        if (!mountedRef.current) return;
        setFallbackCandidates(candidates);
        setFallbackIdx(0);
        setImg(candidates[0]);
        setLoading(false);
      } catch (err) {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED' || (axios.isCancel && axios.isCancel(err))) {
          return;
        }
        console.error('[BuscarImagem] unexpected error in tryLoad:', err);
        if (!mountedRef.current) return;
        setError('Erro ao carregar imagem');
        setLoading(false);
      }
    };

    tryLoad();

    return () => {
      try { ctl.abort(); } catch (_) { }
      if (abortRef.current === ctl) abortRef.current = null;
    };
  }, [query, chatTreino, email, imgType]);


  // close popover on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowReport(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleImageClick = (e) => {
    e.stopPropagation();
    setReportValue(`Imagem do exercício "${query}" — contexto: ChatTreino`);
    setReportError(null);
    setReportSuccess(null);
    setShowReport((s) => !s);
  };

  const handleSendReport = async () => {
    if (!email) {
      setReportError('Usuário não identificado.');
      console.warn('[BuscarImagem] report failed: no email');
      return;
    }
    if (!reportValue || reportValue.trim().length < 3) {
      setReportError('Explique brevemente o problema (mínimo 3 caracteres).');
      console.warn('[BuscarImagem] report validation failed: too short');
      return;
    }

    setReporting(true);
    setReportError(null);
    setReportSuccess(null);

    try {
      const payload = { exercicioName: query, explanation: reportValue, email };
      const res = await api.post('/adicionar-report-exercicio', payload);
      setReportSuccess('Report enviado — obrigado!');
      setShowReport(false);
    } catch (err) {
      console.error('[BuscarImagem] erro ao enviar report:', err?.response?.data || err.message);
      setReportError(err?.response?.data?.msg || err?.response?.data?.message || 'Erro ao enviar report.');
    } finally {
      setReporting(false);
      setTimeout(() => setReportSuccess(null), 3000);
    }
  };

  // render states
  if (loading) {
    return (
      <div className={`relative ${className || ''}`}>
        <div className="w-full h-48 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
        </div>
        {animating && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-sm px-3 py-1 rounded-full bg-blue-600 text-white">Gerando imagem...</div>
          </div>
        )}
      </div>
    )
  }
  if (error) {
    return <p className={className || ''}>{error}</p>;
  }
  if (!img) {
    return <p className={className || ''}>Imagem não encontrada</p>;
  }

  return (
    <div ref={wrapperRef} className={`relative inline-block ${className || ''}`}>

      {
        img ? (
          <img
            src={img}
            alt={alt || query}
            className={`cursor-pointer ${className || ''}`}
            onClick={handleImageClick}
            onKeyDown={(e) => e.key === 'Enter' && handleImageClick(e)}
            role="button"
            tabIndex={0}
            referrerPolicy="no-referrer"
            onError={() => {
              const nextIdx = fallbackIdx + 1;
              if (fallbackCandidates[nextIdx]) {
                setFallbackIdx(nextIdx);
                setImg(fallbackCandidates[nextIdx]);
              } else {
                setImg(null);
                setError('Imagem não encontrada');
              }
            }}
          />
        ) : (
          <img
            src={'https://ui-avatars.com/api/?name=Imagem+Indisponível&background=random&size=400'}
            alt={alt || query}
            className={`cursor-pointer ${className || ''}`}
            onClick={handleImageClick}
            onKeyDown={(e) => e.key === 'Enter' && handleImageClick(e)}
            role="button"
            tabIndex={0}
          />
        )
      }

      <div className="absolute right-3 top-3 pointer-events-none">
        <div className="text-xs bg-black/60 text-white rounded-full px-2 py-1">Imagem</div>
      </div>
      <div className="absolute left-3 top-3 pointer-events-auto z-20">
        <button
          onClick={(e) => { e.stopPropagation(); handleImageClick(e); }}
          className="text-xs bg-red-600/80 hover:bg-red-700 text-white rounded-full px-2 py-1 shadow"
        >
          Reportar
        </button>
      </div>

      {showReport && (
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-4 z-50 w-[90%] max-w-[420px] bg-white text-black dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-sm font-semibold">Reportar imagem</div>
            <button onClick={() => setShowReport(false)} className="text-xs opacity-60">Fechar</button>
          </div>
          <div className="text-xs mb-2">
            <p className="mb-1">A ferramenta de busca de imagens pode falhar; relatar é essencial para manter a plataforma segura.</p>
            <p>
              Fonte: <a href={img} target="_blank" rel="noopener noreferrer" className="underline break-all">{img}</a>
            </p>
          </div>

          <input
            type='text'
            value={reportValue}
            onChange={(e) => setReportValue(e.target.value)}
            placeholder="Explique o problema (ex: imagem incorreta, conteúdo impróprio, etc.)"
            className="w-full min-h-[80px] p-2 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent text-sm outline-none"
          />

          {reportError && <div className="text-xs text-red-500 mt-2">{reportError}</div>}
          {reportSuccess && <div className="text-xs text-green-500 mt-2">{reportSuccess}</div>}

          <div className="mt-3 flex items-center justify-end gap-2">
            <button onClick={() => { setShowReport(false); setReportValue(''); }} className="px-3 py-1 rounded-md text-sm bg-gray-100 dark:bg-gray-800">Cancelar</button>
            <button
              onClick={handleSendReport}
              disabled={reporting}
              className={`px-4 py-1 rounded-md text-sm ${reporting ? 'opacity-60 pointer-events-none' : 'bg-red-600 text-white'}`}
            >
              {reporting ? 'Enviando...' : 'Reportar'}
            </button>
          </div>
        </div>
      )}

      <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400 break-all">
        Fonte: <a href={img} target="_blank" rel="noopener noreferrer" className="underline">{img}</a>
      </div>
    </div>
  );
};

const getEffectiveQuery = async (s, signal) => {
  const base = String(s || '').trim();
  if (!base) return '';
  try {
    if (TRANSLATE_URL) {
      const payload = { q: base, source: 'auto', target: 'en', format: 'text' };
      const headers = TRANSLATE_KEY ? { Authorization: `Bearer ${TRANSLATE_KEY}` } : undefined;
      const res = await axios.post(TRANSLATE_URL, payload, { signal, headers, validateStatus: (st) => st >= 200 && st < 500 });
      const translated = res?.data?.translatedText || res?.data?.data || res?.data?.translation || '';
      if (translated && typeof translated === 'string') return `${base} ${translated}`.trim();
    }
  } catch (_) {}
  return buildSearchQuery(base);
};

  export default BuscarImagem;