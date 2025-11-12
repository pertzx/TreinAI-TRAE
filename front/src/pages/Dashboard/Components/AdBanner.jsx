import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../../Api';
import { buildImageUrl } from '../../../utils/imageUtils';
import Logo from '../../../components/Logo';

const AdBanner = ({ tema = 'light', displayTime = 10000, user }) => {
  const [anuncios, setAnuncios] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Estados para controle de impressões únicas
  const [impressoesRegistradas, setImpressoesRegistradas] = useState(new Set());
  const [impressoesProcessando, setImpressoesProcessando] = useState(new Set());

  // Referências
  const timerRef = useRef(null);
  const impressaoTimeoutRef = useRef(null);
  const videoRef = useRef(null);

  // Classes de tema
  const themeClasses = {
    light: {
      container: 'bg-gradient-to-br from-white via-white to-gray-50/10 border-gray-200/60 text-gray-900 shadow-lg shadow-gray-100/40',
      text: 'text-gray-900',
      textSecondary: 'text-gray-600',
      textMuted: 'text-gray-500',
      loading: 'border-gray-200 border-t-blue-500',
      error: 'bg-red-50 text-red-700 border-red-200',
      overlay: 'bg-black/20',
    },
    dark: {
      container: 'bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900/20 border-gray-700/60 text-white shadow-lg shadow-black/20',
      text: 'text-white',
      textSecondary: 'text-gray-300',
      textMuted: 'text-gray-400',
      loading: 'border-gray-600 border-t-blue-400',
      error: 'bg-red-900/20 text-red-300 border-red-700/50',
      overlay: 'bg-black/40',
    }
  };

  // Função para gerar chave única de impressão
  const gerarChaveImpressao = useCallback((anuncio) => {
    const userId = localStorage.getItem('userId') || 'anonymous';
    return `${userId}_${anuncio._id}`;
  }, []);

  // Função para verificar se impressão já foi registrada
  const jaFoiRegistrada = useCallback((anuncio) => {
    const chave = gerarChaveImpressao(anuncio);
    return impressoesRegistradas.has(chave);
  }, [impressoesRegistradas, gerarChaveImpressao]);

  // Função para verificar se impressão está sendo processada
  const estaProcessando = useCallback((anuncio) => {
    const chave = gerarChaveImpressao(anuncio);
    return impressoesProcessando.has(chave);
  }, [impressoesProcessando, gerarChaveImpressao]);

  // Função para buscar anúncios
  const fetchAnuncios = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post('/anuncios', {
        country: user?.perfil?.country,
        state: user?.perfil?.state,
        city: user?.perfil?.city
      });
      console.log(response.data)

      // A resposta vem com estrutura { anuncios: [...], success: true, ... }
      const anunciosData = response.data?.anuncios;

      if (anunciosData && Array.isArray(anunciosData) && anunciosData.length > 0) {
        setAnuncios(anunciosData);
        setCurrentIndex(0);
        console.log(`[AdBanner] ${anunciosData.length} anúncios carregados com sucesso`);
      } else {
        setAnuncios([]);
        console.log('[AdBanner] Nenhum anúncio disponível');
      }
    } catch (err) {
      console.error('Erro ao buscar anúncios:', err);
      setError('Erro ao carregar anúncios');
      setAnuncios([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Função para avançar para o próximo anúncio
  const nextAd = useCallback(() => {
    if (anuncios.length === 0) return;

    setIsTransitioning(true);

    setTimeout(() => {
      const nextIndex = (currentIndex + 1) % anuncios.length;

      // Se completou um ciclo, busca novos anúncios
      if (nextIndex === 0) {
        fetchAnuncios();
      } else {
        setCurrentIndex(nextIndex);
      }

      setIsTransitioning(false);
    }, 300); // Duração da transição
  }, [currentIndex, anuncios.length, fetchAnuncios]);

  // Função para configurar timer baseado no tipo de mídia
  const setupTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (anuncios.length === 0) return;

    const currentAd = anuncios[currentIndex];
    if (!currentAd) return;

    // Para vídeos, aguarda o fim da reprodução
    if (currentAd.anuncioTipo === 'video' && videoRef.current) {
      const video = videoRef.current;

      const handleVideoEnd = () => {
        nextAd();
      };

      video.addEventListener('ended', handleVideoEnd);

      // Cleanup function
      return () => {
        video.removeEventListener('ended', handleVideoEnd);
      };
    } else {
      // Para imagens, usa o tempo configurado
      const timeToShow = Math.max(displayTime, 10000); // Mínimo 10 segundos

      timerRef.current = setTimeout(() => {
        nextAd();
      }, timeToShow);
    }
  }, [anuncios, currentIndex, displayTime, nextAd]);

  const classes = themeClasses[tema] || themeClasses.light;

  // Função para marcar impressão com controle único
  const markImpression = useCallback(async (anuncio) => {
    if (!anuncio?.ticketImpressao) {
      return;
    }

    // Verifica se já foi registrada
    if (jaFoiRegistrada(anuncio)) {
      return;
    }

    // Verifica se está sendo processada
    if (estaProcessando(anuncio)) {
      return;
    }

    const chave = gerarChaveImpressao(anuncio);

    try {
      // Marca como processando
      setImpressoesProcessando(prev => new Set([...prev, chave]));

      // Implementa debounce para evitar disparos múltiplos
      if (impressaoTimeoutRef.current) {
        clearTimeout(impressaoTimeoutRef.current);
      }

      impressaoTimeoutRef.current = setTimeout(async () => {
        try {
          await api.post('/marcar-impressao', {
            ticketImpressao: anuncio.ticketImpressao,
            userId: user?._id || localStorage.getItem('userId'),
            anuncioId: anuncio._id
          });

          // Marca como registrada
          setImpressoesRegistradas(prev => new Set([...prev, chave]));

        } catch (err) {
          console.error('Erro ao marcar impressão:', err);
        } finally {
          // Remove do processamento
          setImpressoesProcessando(prev => {
            const newSet = new Set(prev);
            newSet.delete(chave);
            return newSet;
          });
        }
      }, 500); // Debounce de 500ms

    } catch (err) {
      console.error('Erro no controle de impressão:', err);

      // Remove do processamento em caso de erro
      setImpressoesProcessando(prev => {
        const newSet = new Set(prev);
        newSet.delete(chave);
        return newSet;
      });
    }
  }, [jaFoiRegistrada, estaProcessando, gerarChaveImpressao, user]);

  // Função para marcar clique
  const handleAdClick = useCallback(async (anuncio) => {
    if (!anuncio?.ticketClique) return;

    try {
      await api.post('/marcar-clique', {
        ticketClique: anuncio.ticketClique,
        userId: user?._id || localStorage.getItem('userId'),
        anuncioId: anuncio._id
      });

      // Abre o link se existir
      if (anuncio.link) {
        window.open(anuncio.link, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      console.error('Erro ao marcar clique:', err);
    }
  }, [user]);

  // Effect para buscar anúncios iniciais
  useEffect(() => {
    fetchAnuncios();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (impressaoTimeoutRef.current) {
        clearTimeout(impressaoTimeoutRef.current);
      }
    };
  }, [fetchAnuncios]);

  // Effect para configurar timer quando anúncio muda
  useEffect(() => {
    if (anuncios.length > 0 && !loading) {
      const cleanup = setupTimer();

      // Marca impressão do anúncio atual
      const currentAd = anuncios[currentIndex];
      if (currentAd) {
        // Aguarda um pouco antes de marcar impressão para garantir que o anúncio foi realmente exibido
        setTimeout(() => {
          markImpression(currentAd);
        }, 1000); // 1 segundo de delay para garantir visualização
      }

      return cleanup;
    }
  }, [currentIndex, anuncios, loading, setupTimer, markImpression]);

  // Renderização de loading
  if (loading) {
    return (
      <div className={`
        w-full h-32 rounded-lg border shadow-sm
        flex items-center justify-center
        ${classes.container}
      `}>
        <div className="flex items-center gap-3">
          <div className={`
            w-6 h-6 border-2 border-solid rounded-full animate-spin
            ${classes.loading}
          `} />
          <span className={`text-sm ${classes.textSecondary}`}>
            Carregando anúncios...
          </span>
        </div>
      </div>
    );
  }

  // Renderização de erro
  if (error) {
    return (
      <div className={`
        w-full h-32 rounded-lg border shadow-sm
        flex items-center justify-center
        ${classes.error}
      `}>
        <div className="text-center">
          <p className="text-sm font-medium">{error}</p>
          <button
            onClick={fetchAnuncios}
            className="mt-2 text-xs underline hover:no-underline"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // Renderização quando não há anúncios
  if (anuncios.length === 0) {
    return (
      <div className={`
        w-full h-32 rounded-lg border shadow-sm
        flex items-center justify-center
        ${classes.container}
      `}>
        <div className="flex items-center gap-3">
          <Logo className="w-8 h-8" />
          <span className={`text-sm md:text-lg font-semibold ${classes.text}`}>
            TreinAI ADS - <a href="/dashboard/anuncios" className='text-blue-300 border-b-2 border-blue-300'>Anuncie o seu negocio.</a>
          </span>
        </div>
      </div>
    );
  }

  const currentAd = anuncios[currentIndex];

  return (
    <div className={`
      w-full min-h-32 max-h-96 rounded-lg border shadow-sm overflow-hidden relative
      transition-all duration-300 cursor-pointer relative
      sm:min-h-40 sm:max-h-80 md:min-h-48 md:max-h-96 lg:min-h-56 lg:max-h-[28rem]
      ${classes.container}
      ${isTransitioning ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}
    `}
      onClick={() => handleAdClick(currentAd)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleAdClick(currentAd)}
      aria-label={`Anúncio: ${currentAd?.titulo || 'Sem título'}`}
    >
      {/* Conteúdo do anúncio */}
      <div className={`w-full h-full flex items-center justify-center ${tema === 'dark' ? 'bg-gray-500' : 'bg-gray-100'}`}>
        {currentAd?.anuncioTipo === 'video' && currentAd?.midiaUrl ? (
          <video
            ref={videoRef}
            src={buildImageUrl(currentAd.midiaUrl, 'video')}
            className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg"
            style={{
              aspectRatio: 'auto',
              minHeight: '128px',
              maxHeight: 'calc(100vh - 200px)'
            }}
            autoPlay
            muted
            playsInline
            onError={(e) => {
              console.error('Erro ao carregar vídeo:', e);
              e.target.style.display = 'none';
            }}
          />
        ) : currentAd?.anuncioTipo === 'imagem' && currentAd?.midiaUrl ? (
          <img
            src={buildImageUrl(currentAd.midiaUrl)}
            alt={currentAd.titulo || 'Anúncio'}
            className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg"
            style={{
              aspectRatio: 'auto',
              minHeight: '128px',
              maxHeight: 'calc(100vh - 200px)'
            }}
            onError={(e) => {
              console.error('Erro ao carregar imagem:', e);
              e.target.style.display = 'none';
            }}
          />
        ) : (
          // Fallback para anúncios sem mídia
          <div className="w-full h-32 sm:h-40 md:h-48 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
            <div className="text-center p-4 max-w-sm">
              <h3 className={`text-base sm:text-lg font-semibold ${classes.text} mb-2`}>
                {currentAd?.titulo || 'Anúncio'}
              </h3>
              {currentAd?.descricao && (
                <p className={`text-sm ${classes.textSecondary} line-clamp-3 sm:line-clamp-2`}>
                  {currentAd.descricao}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Indicador de progresso */}
        {anuncios.length > 1 && (
          <div className="absolute top-2 right-2 flex gap-1">
            {anuncios.map((_, index) => (
              <div
                key={index}
                className={`
                  w-2 h-2 rounded-full transition-all duration-300
                  ${index === currentIndex
                    ? 'bg-white shadow-lg'
                    : 'bg-white/40'
                  }
                `}
              />
            ))}
          </div>
        )}

        {/* Badge de anúncio */}
        <div className="absolute top-2 left-2">
          <span className="text-xs bg-black/60 text-white rounded-full px-2 py-1 backdrop-blur-sm">
            Anúncio {jaFoiRegistrada(currentAd) ? '✓' : '○'}
          </span>
        </div>
      </div>

      {/* Overlay com informações - apenas quando há mídia */}
      {(currentAd?.midiaUrl) && (
        <div className={`
            absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent
            flex items-end p-3 sm:p-4 pointer-events-none rounded-lg
          `}>
          <div className="text-white max-w-full">
            {currentAd?.titulo && (
              <h3 className="text-sm sm:text-base font-semibold mb-1 drop-shadow-lg line-clamp-1">
                {currentAd.titulo}
              </h3>
            )}
            {currentAd?.descricao && (
              <p className="text-xs sm:text-sm opacity-90 line-clamp-2 drop-shadow">
                {currentAd.descricao}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdBanner;
