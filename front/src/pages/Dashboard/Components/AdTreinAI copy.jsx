import React, { useEffect, useRef, useState } from 'react';
import api from '../../../Api.js';
import { buildImageUrl } from '../../../utils/imageUtils.js'

const AdTreinAI = ({ logWhenHidden = false, threshold = 0.1, anuncioData, user = {}, tema = 'light' }) => {
  const elRef = useRef(null);
  const lastStateRef = useRef(null);
  const [visto, setVisto] = useState(false);
  const [anuncio, setAnuncio] = useState(anuncioData || null);
  const [loading, setLoading] = useState(!anuncioData);
  const [error, setError] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Classes base para temas com melhorias visuais
  const themeClasses = {
    light: {
      container: 'bg-gradient-to-br from-white to-gray-50/50 border-gray-200/60 text-gray-900 shadow-lg shadow-gray-100/50',
      containerSecondary: 'bg-gradient-to-br from-gray-50 to-gray-100/50 border-gray-200/60 text-gray-600 shadow-md shadow-gray-100/30',
      text: 'text-gray-900',
      textSecondary: 'text-gray-600',
      textMuted: 'text-gray-500',
      accent: 'text-blue-600 bg-blue-600',
      success: 'text-emerald-700 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200/50',
      helpButton: 'bg-white/80 backdrop-blur-sm text-gray-600 hover:bg-blue-500 hover:text-white border border-gray-200/50 shadow-sm',
      tooltip: 'bg-gray-900/95 backdrop-blur-sm text-white border border-gray-700/50',
      loading: 'border-gray-200/50 border-t-blue-500',
      mediaContainer: 'bg-gray-50/50 border-gray-200/40',
      hoverOverlay: 'bg-blue-500/5',
    },
    dark: {
      container: 'bg-gradient-to-br from-gray-800 to-gray-900/50 border-gray-600/40 text-white shadow-lg shadow-black/20',
      containerSecondary: 'bg-gradient-to-br from-gray-700 to-gray-800/50 border-gray-600/40 text-gray-300 shadow-md shadow-black/10',
      text: 'text-white',
      textSecondary: 'text-gray-300',
      textMuted: 'text-gray-400',
      accent: 'text-blue-400 bg-blue-400',
      success: 'text-emerald-400 bg-gradient-to-r from-emerald-900/30 to-green-900/30 border border-emerald-700/30',
      helpButton: 'bg-gray-700/80 backdrop-blur-sm text-gray-400 hover:bg-blue-500 hover:text-white border border-gray-600/50 shadow-sm',
      tooltip: 'bg-white/95 backdrop-blur-sm text-gray-900 border border-gray-200/50',
      loading: 'border-gray-600/50 border-t-blue-400',
      mediaContainer: 'bg-gray-700/50 border-gray-600/30',
      hoverOverlay: 'bg-blue-400/5',
    }
  };

  const classes = themeClasses[tema] || themeClasses.light;

  // Buscar anúncios da API apenas se não foi passado anuncioData
  useEffect(() => {
    if (anuncioData) {
      setAnuncio(anuncioData);
      setLoading(false);
      return;
    }

    const fetchAnuncio = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.post('/anuncios?quantidade=1', {});

        // Validar resposta da API
        if (response.data && response.data.success && response.data.anuncios && response.data.anuncios.length > 0) {
          setAnuncio(response.data.anuncios[0]);
        } else {
          setAnuncio(null);
        }
      } catch (err) {
        console.error('Erro ao buscar anúncios:', err);
        setError(err);
        setAnuncio(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAnuncio();
  }, []);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry.isIntersecting && entry.intersectionRatio > 0;
        if (lastStateRef.current === isVisible) return;
        lastStateRef.current = isVisible;

        if (!logWhenHidden && isVisible) {
          if (!visto) setVisto(true);
        } else if (logWhenHidden && !isVisible) {
          if (!visto) setVisto(true);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [logWhenHidden, threshold, visto]);

  useEffect(() => {
    if (visto && anuncio) {
      // Lógica para quando o anúncio for visto
      console.log('Anúncio visualizado:', anuncio.titulo);
      handlerVisto();
    }
  }, [visto, anuncio]);

  const handlerVisto = async () => {
    try {
      await api.post('/marcar-impressao', { userId: user?._id, anuncioId: anuncio._id, ticketImpressao: anuncio.ticketImpressao });
    } catch (error) { }
  }

  const handleClick = async () => {
    if (anuncio) {
      // Lógica para quando o anúncio for clicado
      console.log('Anúncio clicado:', anuncio.titulo);
      try {
        await api.post('/marcar-clique', { userId: user?._id, anuncioId: anuncio._id, ticketClique: anuncio.ticketClique });
      } catch (error) { }

      // Se houver link, abrir em nova aba
      if (anuncio.link) {
        window.open(anuncio.link, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const handleHelpClick = (e) => {
    e.stopPropagation();
    window.location.href = '/dashboard/anuncios';
  };

  // Componente do botão de ajuda
  const HelpButton = () => (
    <div className="absolute top-2 right-2 z-10">
      <button
        onClick={handleHelpClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`
          w-6 h-6 rounded-full border-0 cursor-pointer 
          flex items-center justify-center text-xs font-semibold
          transition-all duration-200 ease-in-out transform
          shadow-sm hover:scale-105
          ${classes.helpButton}
        `}
        aria-label="Como anunciar aqui"
        title="Quer anunciar aqui? Clique para acessar a página de anúncios"
      >
        ?
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className={`
          absolute top-7 right-0 px-2 py-1 rounded text-xs
          whitespace-nowrap shadow-lg z-50
          animate-in fade-in duration-200
          ${classes.tooltip}
        `}>
          Quer anunciar? Acesse /dashboard/anuncios
          <div className={`
            absolute -top-1 right-2 w-2 h-2 transform rotate-45
            ${classes.tooltip}
          `} />
        </div>
      )}
    </div>
  );

  // Renderização durante loading
  if (loading) {
    return (
      <div
        id="display"
        ref={elRef}
        className={`
          relative p-4 text-center rounded-lg border shadow-sm
          ${classes.container}
        `}
      >
        <HelpButton />
        <div className={`
          flex items-center justify-center gap-2 text-sm
          ${classes.textSecondary}
        `}>
          <div className={`
            w-4 h-4 border-2 rounded-full animate-spin
            ${classes.loading}
          `} />
          Carregando...
        </div>
      </div>
    );
  }

  // Renderização quando há anúncio disponível
  if (anuncio) {
    return (
      <div
        id="display"
        ref={elRef}
        onClick={handleClick}
        className={`
          relative cursor-pointer p-4 rounded-lg border shadow-sm
          transition-all duration-200 ease-in-out transform
          hover:-translate-y-0.5 hover:shadow-md
          ${classes.container}
        `}
      >
        <div className={`
          text-xs font-medium text-center px-2 mb-3 py-1 rounded-xl inline-block
          ${classes.success}
        `}>
          Anúncio Patrocinado 📢
        </div>

        <HelpButton />

        <div className="mb-3 px-2">
          <h4 className={`
            m-0 mb-1 text-base font-semibold
            ${classes.text}
          `}>
            {anuncio.titulo || 'Anúncio TreinAI'}
          </h4>
          {anuncio.descricao && (
            <p className={`
              m-0 text-sm
              ${classes.textSecondary}
            `}>
              {anuncio.descricao}
            </p>
          )}
        </div>

        {/* Renderização de mídia baseada no tipo */}
        {anuncio.midiaUrl && (
          <div className={`
             rounded border overflow-hidden
            ${tema === 'dark' ? 'border-gray-600' : 'border-gray-200'}
          `}>
            {anuncio.anuncioTipo === 'video' ? (
              <video
                src={buildImageUrl(anuncio.midiaUrl)}
                controls
                className="w-full h-auto max-h-48 block"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
                preload="metadata"
              >
                Seu navegador não suporta o elemento de vídeo.
              </video>
            ) : (
              <img
                src={buildImageUrl(anuncio.midiaUrl || anuncio.imagem)}
                alt={anuncio.titulo || 'Anúncio'}
                className="w-full aspect-ratio-[6/8] object-cover block"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            )}
          </div>
        )}

      </div>
    );
  }

  // Renderização quando não há anúncios disponíveis
  return (
    <div
      id="display"
      ref={elRef}
      className={`
        relative p-5 text-center rounded-lg border-dashed border
        ${classes.containerSecondary}
      `}
    >
      <HelpButton />

      <div className="mb-3 text-2xl opacity-70">
        📢
      </div>

      <div className={`
        text-sm leading-relaxed mb-3
        ${classes.textSecondary}
      `}>
        <strong className={classes.text}>Espaço para anúncios</strong>
        <br />
        <span className="text-xs">
          Clique no "?" para saber como anunciar
        </span>
      </div>
    </div>
  );
};



export default AdTreinAI;
