import React, { useState, useEffect } from 'react';
import { FiX, FiShield, FiCheck, FiInfo, FiMinus, FiMaximize2, FiChevronUp, FiChevronDown } from 'react-icons/fi';

const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      // Delay para animação suave
      setTimeout(() => {
        setShowBanner(true);
        setIsVisible(true);
      }, 1000);
    }
  }, []);

  const acceptEssential = () => {
    const consentData = {
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
      version: '2.0'
    };
    localStorage.setItem('cookieConsent', JSON.stringify(consentData));
    closeBanner();
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const closeBanner = () => {
    setIsVisible(false);
    setTimeout(() => {
      setShowBanner(false);
    }, 300);
  };

  if (!showBanner) return null;

  return (
    <div 
      className={`fixed bottom-0 m-6 left-0 right-0 z-50 transition-all duration-500 ease-in-out transform ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
    >
      <div className={`bg-blue-600/50 rounded-2xl backdrop-blur-sm border-t border-blue-700/50 shadow-2xl transition-all duration-300 ${
        isMinimized ? 'pb-2' : 'pb-6'
      }`}>
        <div className="max-w-7xl mx-auto">
          
          {/* Header com botão minimizar/maximizar */}
          <div className="flex items-center justify-between px-6 pt-4 pb-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <FiShield className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white">
                Cookies Essenciais
              </h3>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMinimize}
                className="p-2 text-blue-300 hover:text-white hover:bg-blue-800/50 rounded-lg transition-all duration-200"
                title={isMinimized ? "Expandir" : "Minimizar"}
              >
                {isMinimized ? <FiChevronUp className="w-5 h-5" /> : <FiChevronDown className="w-5 h-5" />}
              </button>
              
              <button
                onClick={closeBanner}
                className="p-2 text-blue-300 hover:text-white hover:bg-red-600/50 rounded-lg transition-all duration-200"
                title="Fechar"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Conteúdo expansível */}
          <div className={`overflow-hidden transition-all duration-300 ${
            isMinimized ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'
          }`}>
            <div className="px-6 pb-4">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                
                {/* Conteúdo Principal */}
                <div className="flex-1 space-y-3">
                  <p className="text-blue-100 leading-relaxed max-w-2xl">
                    <strong>Informação sobre Cookies:</strong> Este site utiliza exclusivamente cookies essenciais 
                    para autenticação, segurança e funcionamento básico da plataforma TreinAI. Não utilizamos 
                    cookies de marketing ou analytics. Estes cookies são indispensáveis para o funcionamento 
                    do sistema e não requerem seu consentimento.
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-blue-200">
                    <span className="flex items-center gap-1">
                      <FiCheck className="w-4 h-4 text-green-400" />
                      Apenas essenciais
                    </span>
                    <span className="flex items-center gap-1">
                      <FiCheck className="w-4 h-4 text-green-400" />
                      Sem rastreamento
                    </span>
                    <span className="flex items-center gap-1">
                      <FiCheck className="w-4 h-4 text-green-400" />
                      LGPD compliant
                    </span>
                  </div>

                  {/* Detalhes dos Cookies Essenciais */}
                  <div className="bg-blue-800/30 rounded-lg p-4 mt-4 border border-blue-600/30">
                    <h4 className="text-sm font-semibold text-blue-300 mb-2 flex items-center gap-2">
                      <FiInfo className="w-4 h-4" />
                      O que fazem nossos cookies essenciais:
                    </h4>
                    <ul className="text-xs text-blue-200 space-y-1">
                      <li>• <strong>Autenticação:</strong> Mantém você logado com segurança</li>
                      <li>• <strong>Sessão:</strong> Preserva suas configurações durante a navegação</li>
                      <li>• <strong>Segurança:</strong> Protege contra ataques maliciosos (CSRF)</li>
                      <li>• <strong>Funcionalidade:</strong> Garante o funcionamento correto da plataforma</li>
                    </ul>
                  </div>
                </div>

                {/* Botão de Ação */}
                <div className="flex flex-col gap-3 min-w-fit">
                  <button
                    onClick={acceptEssential}
                    className="px-8 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    <FiCheck className="w-4 h-4" />
                    Entendi
                  </button>
                  
                  <p className="text-xs text-blue-300 text-center max-w-48">
                    Ao continuar navegando, você concorda com o uso de cookies essenciais
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Versão minimizada - linha compacta */}
          {isMinimized && (
            <div className="px-6 pb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-200">
                  🍪 Utilizamos apenas cookies essenciais para funcionamento básico
                </p>
                <button
                  onClick={acceptEssential}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center gap-1"
                >
                  <FiCheck className="w-3 h-3" />
                  OK
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;