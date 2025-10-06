import React, { useEffect, useRef, useState } from 'react';
import api from '../../../Api.js';
import { buildImageUrl } from '../../../utils/imageUtils.js'

const AdTreinAI = ({ logWhenHidden = false, threshold = 0.1, anuncioData, user, tema = 'light' }) => {
  const elRef = useRef(null);
  const lastStateRef = useRef(null);
  const [visto, setVisto] = useState(false);
  const [anuncio, setAnuncio] = useState(anuncioData || null);
  const [loading, setLoading] = useState(!anuncioData);
  const [error, setError] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);

  // Classes base para temas
  const themeClasses = {
    light: {
      container: 'bg-white border-gray-200 text-gray-900',
      containerSecondary: 'bg-gray-50 border-gray-200 text-gray-600',
      text: 'text-gray-900',
      textSecondary: 'text-gray-600',
      textMuted: 'text-gray-500',
      accent: 'text-blue-600 bg-blue-600',
      success: 'text-green-600 bg-green-50',
      helpButton: 'bg-gray-100 text-gray-500 hover:bg-blue-600 hover:text-white',
      tooltip: 'bg-gray-900 text-white',
      loading: 'border-gray-200 border-t-blue-600',
    },
    dark: {
      container: 'bg-gray-800 border-gray-600 text-white',
      containerSecondary: 'bg-gray-700 border-gray-600 text-gray-300',
      text: 'text-white',
      textSecondary: 'text-gray-300',
      textMuted: 'text-gray-400',
      accent: 'text-blue-400 bg-blue-400',
      success: 'text-green-400 bg-green-900/20',
      helpButton: 'bg-gray-600 text-gray-400 hover:bg-blue-500 hover:text-white',
      tooltip: 'bg-white text-gray-900',
      loading: 'border-gray-600 border-t-blue-400',
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

        const response = await api.get('/anuncios', {
          params: { quantidade: 1 }
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
  }, [anuncioData]);

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
      await api.post('/marcar-impressao', { userId: user?._id, anuncioId: anuncio._id });
    } catch (error) {
      console.error('Erro ao marcar impressão:', error);
    }
  }

  const handleClick = async () => {
    if (anuncio) {
      // Lógica para quando o anúncio for clicado
      console.log('Anúncio clicado:', anuncio.titulo);
      try {
        await api.post('/marcar-clique', { userId: user?._id, anuncioId: anuncio._id });
      } catch (error) {
        console.error('Erro ao marcar clique:', error);
      }

      // Se houver link, abrir em nova aba
      if (anuncio.link) {
        window.open(anuncio.link, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const handleHelpClick = (e) => {
    e.stopPropagation();
    window.open('/dashboard/anuncios', '_blank', 'noopener,noreferrer');
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
        <HelpButton />
        
        <div className="mb-3">
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
            mb-3 rounded border overflow-hidden
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
                className="w-full aspect-ratio-[4/3] h-auto max-h-44 object-cover block"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            )}
          </div>
        )}

        <div className={`
          text-xs font-medium text-center px-2 py-1 rounded-xl inline-block
          ${classes.success}
        `}>
          Anúncio Patrocinado 📢
        </div>
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
