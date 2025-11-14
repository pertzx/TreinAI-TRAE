// components/BuscarImagens.jsx
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import api from '../Api';

const API_KEY = import.meta.env.VITE_API_GOOGLE_SEARCH_IMAGES;
const CX = import.meta.env.VITE_CX;
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

/**
 * BuscarImagem (com console.logs)
 */
const BuscarImagem = ({ query, className, imgType = 'svg', chatTreino = false, email, alt }) => {
  const [img, setImg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

    if (!query || String(query).trim() === '') {
      setLoading(false);
      return;
    }

    // abort previous
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const ctl = new AbortController();
    abortRef.current = ctl;
    setLoading(true);
    setError(null);

    const fetchImageFromGoogle = async (signal) => {
      // Verificar se as chaves da API estão configuradas
      if (!API_KEY || !CX) {
        console.warn('[BuscarImagem] Google API keys not configured, skipping Google Search');
        return null;
      }
      
      try {
        // tentar por domínio permitido individualmente para melhorar relevância
        for (const domain of ALLOWED_IMAGE_DOMAINS) {
          const res = await axios.get('https://www.googleapis.com/customsearch/v1', {
            params: {
              key: API_KEY,
              cx: CX,
              q: query,
              searchType: 'image',
              fileType: imgType,
              rights: 'cc_publicdomain,cc_attribute,cc_sharealike',
              num: 3,
              siteSearch: domain,
              siteSearchFilter: 'i',
            },
            signal,
          });

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
            const link = filtered.find(it => it?.link)?.link || null;
            if (link) return link;
          }
        }
        return null;
      } catch (err) {
        if (axios.isCancel(err)) {
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

    const tryLoad = async () => {
      try {
        // 1) when chatTreino try local DB first
        if (chatTreino && email) {
          try {
            const res = await api.get('/procurar-exercicio', {
              params: { exercicioName: query, email },
              signal: ctl.signal,
            });
            if (res?.data?.found && res?.data?.exercicio?.imageUrl) {
              if (!mountedRef.current) return;
              setImg(res.data.exercicio.imageUrl);
              setLoading(false);
              return;
            }
          } catch (err) {
            if (err.name === 'CanceledError' || err.message === 'canceled') {
              return;
            }
            console.warn('[BuscarImagem] local DB lookup failed (will continue to online):', err?.response?.data || err?.message || err);
          }
        }

        // 2) try Google
        const googleUrl = await fetchImageFromGoogle(ctl.signal);
        if (googleUrl) {
          if (!mountedRef.current) return;
          setImg(googleUrl);
          // try save to server (best-effort)
          if (chatTreino && email) {
            api.post('/adicionar-exercicio', { exercicioName: query, imageUrl: googleUrl, email })
          }
          setLoading(false);
          return;
        }

        // 3) fallback to multiple sources
        console.log('[BuscarImagem] Google API failed, using fallback sources');
        
        // Try different fallback sources based on query type
        let fallbackUrl = null;
        
        // For profile/user related images
        if (query.toLowerCase().includes('perfil') || query.toLowerCase().includes('usuario') || query.toLowerCase().includes('user')) {
          fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(query)}&background=random&size=400`;
        }
        // For exercise/fitness related images
        else if (query.toLowerCase().includes('exercicio') || query.toLowerCase().includes('treino') || query.toLowerCase().includes('fitness')) {
          // tente uma sequência de consultas para aumentar chance de resultado
          const candidates = [
            `https://source.unsplash.com/400x400/?fitness,exercise,${encodeURIComponent(query)}`,
            `https://source.unsplash.com/400x400/?workout,${encodeURIComponent(query)}`,
            `https://source.unsplash.com/400x400/?gym,${encodeURIComponent(query)}`,
            `https://source.unsplash.com/400x400/?fitness`
          ];
          fallbackUrl = candidates[0];
          // opcional: poderíamos testar carregamento, mas aqui adotamos o primeiro candidato
        }
        // For food/nutrition related images
        else if (query.toLowerCase().includes('comida') || query.toLowerCase().includes('alimento') || query.toLowerCase().includes('receita')) {
          fallbackUrl = `https://source.unsplash.com/400x400/?food,healthy,${encodeURIComponent(query)}`;
        }
        // Generic fallback
        else {
          fallbackUrl = `https://source.unsplash.com/400x400/?${encodeURIComponent(query)}`;
        }
        
        if (!mountedRef.current) return;
        setImg(fallbackUrl);
        setLoading(false);
      } catch (err) {
        if (err.name === 'CanceledError' || err.message === 'canceled') {
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
      ctl.abort();
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
    return <p className={className || ''}>Carregando imagem...</p>;
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
        img.length !== 0 || img !== null ? (
          <img
            src={img}
            alt={alt || query}
            className={`cursor-pointer ${className || ''}`}
            onClick={handleImageClick}
            onKeyDown={(e) => e.key === 'Enter' && handleImageClick(e)}
            role="button"
            tabIndex={0}
          />
        ) : (
          <img
            src={'https://source.unsplash.com/800x600/?placeholder'}
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

export default BuscarImagem;
