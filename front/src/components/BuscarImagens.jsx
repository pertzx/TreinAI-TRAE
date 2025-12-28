// components/BuscarImagens.jsx
import { useEffect, useState, useRef } from 'react';
import api from '../Api';

/**
 * BuscarImagem (com console.logs)
 */
const BuscarImagem = ({ query, className, imgType = 'svg', chatTreino = false, email, alt }) => {
  const [img, setImg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
        console.log('[BuscarImagem] find start', { q });
        const res = await api.get('/images/find', { params: { query: q }, signal })
        if (res?.data?.success && res?.data?.found) {
          console.log('[BuscarImagem] find hit', { url: res.data.url, publicId: res.data.publicId });
          return res.data.url
        }
        console.log('[BuscarImagem] find miss');
        return null
      } catch (_) {
        console.log('[BuscarImagem] find error', _?.response?.data || _?.message || _);
        return null
      }
    }

    const generateNew = async (signal) => {
      try {
        setAnimating(true)
        const csrfRes = await api.get('/csrf-token', { signal });
        const csrf = csrfRes?.data?.csrfToken || '';
        if (csrf) {
          try { document.cookie = `csrfToken=${csrf}; path=/`; } catch (_) {}
          try { document.cookie = `csrf_token=${csrf}; path=/`; } catch (_) {}
        }
        console.log('[BuscarImagem] generate start', { q, csrf: Boolean(csrf) });
        const res = await api.post('/images/generate', { query: q }, { signal, headers: { 'X-CSRF-Token': csrf } })
        setAnimating(false)
        if (res?.data?.success && res?.data?.url) {
          console.log('[BuscarImagem] generate success', { url: res.data.url, publicId: res.data.publicId });
          return res.data.url
        }
        console.log('[BuscarImagem] generate failed', res?.data);
        return null
      } catch (e) {
        setAnimating(false)
        console.log('[BuscarImagem] generate error', e?.response?.data || e?.message || e);
        return null
      }
    }

    

    const tryLoad = async () => {
      try {
        console.log('[BuscarImagem] tryLoad start');
        // 1) when chatTreino try local DB first
        if (chatTreino && email) {
          try {
            const res = await api.get('/procurar-exercicio', {
              params: { exercicioName: q, email },
              signal: ctl.signal,
            });
            if (res?.data?.found && res?.data?.exercicio?.imageUrl) {
              if (!mountedRef.current) return;
              console.log('[BuscarImagem] local DB hit', { url: res.data.exercicio.imageUrl });
              setImg(res.data.exercicio.imageUrl);
              setLoading(false);
              return;
            }
          } catch (err) {
            if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
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

        if (!mountedRef.current) return;
        console.log('[BuscarImagem] no image available after own API');
        setImg(null);
        setLoading(false);
      } catch (err) {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
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

  const isDataUrl = typeof img === 'string' && img.startsWith('data:');

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
              console.log('[BuscarImagem] image tag onError');
              setImg(null);
              setError('Imagem não encontrada');
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
              Fonte: {isDataUrl ? (
                <span>Gerada por IA</span>
              ) : (
                <a href={img} target="_blank" rel="noopener noreferrer" className="underline break-all">{img}</a>
              )}
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
        Fonte: {isDataUrl ? (
          <span>Gerada por IA</span>
        ) : (
          <a href={img} target="_blank" rel="noopener noreferrer" className="underline">{img}</a>
        )}
      </div>
    </div>
  );
};
  export default BuscarImagem;
