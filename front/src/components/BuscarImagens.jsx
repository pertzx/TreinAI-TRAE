// components/BuscarImagens.jsx
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import api from '../Api';

const API_KEY = import.meta.env.VITE_API_GOOGLE_SEARCH_IMAGES;
const CX = import.meta.env.VITE_CX;

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
        const res = await axios.get('https://www.googleapis.com/customsearch/v1', {
          params: {
            key: API_KEY,
            cx: CX,
            q: query,
            searchType: 'image',
            fileType: imgType,
            imgType: 'clipart',
            rights: 'cc_publicdomain,cc_attribute,cc_sharealike',
            num: 5,
          },
          signal,
        });

        const items = res?.data?.items;
        if (Array.isArray(items) && items.length > 0) {
          const link = items.find(it => it?.link)?.link || items[0].link;
          return link || null;
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
          fallbackUrl = `https://source.unsplash.com/400x400/?fitness,exercise,${encodeURIComponent(query)}`;
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
      setReportError(err?.response?.data?.msg || 'Erro ao enviar report.');
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

      {showReport && (
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-4 z-50 w-[90%] max-w-[420px] bg-white text-black dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-sm font-semibold">Reportar imagem</div>
            <button onClick={() => setShowReport(false)} className="text-xs opacity-60">Fechar</button>
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
    </div>
  );
};

export default BuscarImagem;
