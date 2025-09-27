import { useEffect, useRef } from 'react';
import Logo from '../../../components/Logo';

const AdBanner = ({ className = '', showPlaceholder = true }) => {
  const adRef = useRef(false);

  useEffect(() => {
    if (adRef.current) return; // evita rodar novamente
    adRef.current = true;

    try {
      // Carrega o script do AdSense se ainda não estiver carregado
      if (!window.adsbygoogle) {
        const script = document.createElement('script');
        script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4653666389038251";
        script.async = true;
        script.crossOrigin = "anonymous";
        document.body.appendChild(script);
      }

      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error("Erro ao carregar AdSense", e);
    }
  }, []);

  return (
    <div
      className={`w-full gap-2 aspect-[4/1] adsbygoogle block ${showPlaceholder ? 'bg-black text-white flex items-center justify-center' : ''} ${className}`}
    >
      TREINAI <Logo scale={0.6} />
    </div>
  );
};

export default AdBanner;
