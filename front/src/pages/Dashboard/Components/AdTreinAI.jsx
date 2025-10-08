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

  // Classes base para temas com melhorias visuais modernas
  const themeClasses = {
    light: {
      container: 'bg-gradient-to-br from-white via-white to-gray-50/30 border border-gray-200/60 text-gray-900 shadow-xl shadow-gray-100/40 backdrop-blur-sm',
      containerSecondary: 'bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100/40 border border-gray-200/60 text-gray-600 shadow-lg shadow-gray-100/30',
      text: 'text-gray-900 font-medium',
      textSecondary: 'text-gray-600',
      textMuted: 'text-gray-500',
      accent: 'text-blue-600 bg-blue-600',
      success: 'text-emerald-700 bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-50 border border-emerald-200/60 shadow-sm',
      helpButton: 'bg-white/90 backdrop-blur-sm text-gray-600 hover:bg-gradient-to-r hover:from-blue-500 hover:to-blue-600 hover:text-white border border-gray-200/60 shadow-md hover:shadow-lg transition-all duration-300',
      tooltip: 'bg-gray-900/95 backdrop-blur-md text-white border border-gray-700/50 shadow-xl',
      loading: 'border-gray-200/50 border-t-blue-500',
      mediaContainer: 'bg-gradient-to-br from-gray-50/50 to-gray-100/30 border border-gray-200/40',
      hoverOverlay: 'bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5',
      badge: 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-200/50',
    },
    dark: {
      container: 'bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900/60 border border-gray-600/40 text-white shadow-xl shadow-black/30 backdrop-blur-sm',
      containerSecondary: 'bg-gradient-to-br from-gray-700 via-gray-700 to-gray-800/60 border border-gray-600/40 text-gray-300 shadow-lg shadow-black/20',
      text: 'text-white font-medium',
      textSecondary: 'text-gray-300',
      textMuted: 'text-gray-400',
      accent: 'text-blue-400 bg-blue-400',
      success: 'text-emerald-400 bg-gradient-to-r from-emerald-900/40 via-green-900/40 to-emerald-900/40 border border-emerald-700/40 shadow-sm',
      helpButton: 'bg-gray-700/90 backdrop-blur-sm text-gray-400 hover:bg-gradient-to-r hover:from-blue-500 hover:to-blue-600 hover:text-white border border-gray-600/60 shadow-md hover:shadow-lg transition-all duration-300',
      tooltip: 'bg-white/95 backdrop-blur-md text-gray-900 border border-gray-200/50 shadow-xl',
      loading: 'border-gray-600/50 border-t-blue-400',
      mediaContainer: 'bg-gradient-to-br from-gray-700/50 to-gray-800/30 border border-gray-600/30',
      hoverOverlay: 'bg-gradient-to-br from-blue-400/5 via-transparent to-purple-400/5',
      badge: 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg shadow-emerald-900/30',
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

        const response = await api.post('/anuncios', {
          quantidade: 1,
        });

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

  // Componente do botão de ajuda melhorado
  const HelpButton = () => (
    <div className="absolute top-3 right-3 z-20">
      <button
        onClick={handleHelpClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`
          w-8 h-8 rounded-full cursor-pointer 
          flex items-center justify-center text-sm font-bold
          transition-all duration-300 ease-out transform
          hover:scale-110 hover:rotate-12 active:scale-95
          ${classes.helpButton}
        `}
        aria-label="Como anunciar aqui"
        title="Quer anunciar aqui? Clique para acessar a página de anúncios"
      >
        <span className="text-lg">?</span>
      </button>

      {/* Tooltip melhorado */}
      {showTooltip && (
        <div className={`
          absolute top-10 right-0 px-3 py-2 rounded-lg text-sm font-medium
          whitespace-nowrap z-50 max-w-xs
          animate-in fade-in slide-in-from-top-2 duration-300
          ${classes.tooltip}
        `}>
          <div className="flex items-center gap-2">
            <span className="text-lg">💡</span>
            <span>Quer anunciar? Acesse /dashboard/anuncios</span>
          </div>
          <div className={`
            absolute -top-1 right-3 w-2 h-2 transform rotate-45
            ${classes.tooltip}
          `} />
        </div>
      )}
    </div>
  );

  // Renderização durante loading melhorada
  if (loading) {
    return (
      <div
        id="display"
        ref={elRef}
        className={`
          relative p-6 text-center rounded-2xl border-2
          transition-all duration-500 ease-out
          ${classes.container}
        `}
      >
        <HelpButton />
        <div className={`
          flex items-center justify-center gap-3 text-base font-medium
          ${classes.textSecondary}
        `}>
          <div className={`
            w-6 h-6 border-3 rounded-full animate-spin
            ${classes.loading}
          `} />
          <span className="animate-pulse">Carregando anúncio...</span>
        </div>
      </div>
    );
  }

  // Renderização quando há anúncio disponível - MELHORADA
  if (anuncio) {
    return (
      <div
        id="display"
        ref={elRef}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          relative cursor-pointer max-w-[600px] p-6 rounded-2xl border-2 overflow-hidden
          transition-all duration-500 ease-out transform
          hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98]
          ${classes.container}
          ${isHovered ? 'shadow-2xl' : ''}
        `}
      >
        {/* Overlay de hover */}
        {isHovered && (
          <div className={`
            absolute inset-0 opacity-50 transition-opacity duration-300
            ${classes.hoverOverlay}
          `} />
        )}

        {/* Badge melhorado */}
        <div className={`
          inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-full mb-4
          shadow-lg transform transition-all duration-300
          ${classes.badge}
          ${isHovered ? 'scale-105' : ''}
        `}>
          <span className="text-lg">📢</span>
          <span>Anúncio Patrocinado</span>
        </div>

        <HelpButton />

        {/* Conteúdo do anúncio melhorado */}
        <div className="mb-5 relative z-10">
          <h4 className={`
            m-0 mb-3 text-xl font-bold leading-tight
            transition-colors duration-300
            ${classes.text}
          `}>
            {anuncio.titulo || 'Anúncio TreinAI'}
          </h4>
          {anuncio.descricao && (
            <p className={`
              m-0 text-base leading-relaxed
              transition-colors duration-300
              ${classes.textSecondary}
            `}>
              {anuncio.descricao}
            </p>
          )}
        </div>

        {/* Renderização de mídia melhorada */}
        {anuncio.midiaUrl && (
          <div className={`
            rounded-xl border-2 overflow-hidden relative
            transition-all duration-300 transform
            ${classes.mediaContainer}
            ${isHovered ? 'scale-[1.02] shadow-lg' : ''}
          `}>
            {anuncio.anuncioTipo === 'video' ? (
              <video
                src={buildImageUrl(anuncio.midiaUrl)}
                controls
                className="w-full h-auto max-h-64 block transition-transform duration-300"
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
                className="w-full aspect-[4/3] object-cover block transition-transform duration-500 hover:scale-105"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            )}
            
            {/* Overlay de interação */}
            <div className={`
              absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent
              opacity-0 transition-opacity duration-300
              ${isHovered ? 'opacity-100' : ''}
            `} />
          </div>
        )}

        {/* Indicador de clique */}
        <div className={`
          absolute bottom-4 right-4 flex items-center gap-2 text-sm font-bold
          transition-all duration-300 transform
          text-blue-600
          ${ tema === 'light' ? 'bg-black/80' : 'bg-white/80' } p-2 rounded-full
          ${isHovered ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0'}
        `}>
          <span>Clique para saber mais</span>
          <span className="text-lg">→</span>
        </div>
      </div>
    );
  }

  // Renderização quando não há anúncios disponíveis - MELHORADA
  return (
    <div
      id="display"
      ref={elRef}
      className={`
        relative p-8 text-center rounded-2xl border-2 border-dashed
        transition-all duration-500 ease-out hover:scale-[1.01]
        ${classes.containerSecondary}
      `}
    >
      <HelpButton />

      <div className="mb-4 text-4xl opacity-70 animate-bounce">
        📢
      </div>

      <div className={`
        text-base leading-relaxed mb-4 space-y-2
        ${classes.textSecondary}
      `}>
        <div className={`text-lg font-bold ${classes.text}`}>
          Espaço para anúncios
        </div>
        <div className="text-sm opacity-80">
          Clique no "?" para saber como anunciar
        </div>
      </div>

      {/* Call to action melhorado */}
      <div className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
        transition-all duration-300 hover:scale-105
        ${classes.success}
      `}>
        <span>✨</span>
        <span>Anuncie aqui</span>
      </div>
    </div>
  );
};

export default AdTreinAI;