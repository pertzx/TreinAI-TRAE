import { useCallback, useEffect, useState } from 'react';

/**
 * Hook para gerenciar localStorage com conformidade LGPD
 * Só permite usar localStorage se o usuário tiver dado consentimento
 */

const CONSENT_KEY = 'lgpd_cookie_consent';

export const useLgpdStorage = () => {
  const [hasConsent, setHasConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkConsent();
    
    // Escutar mudanças no consentimento
    const handleConsentUpdate = (e) => {
      setHasConsent(true);
    };
    
    window.addEventListener('lgpdConsentUpdated', handleConsentUpdate);
    return () => window.removeEventListener('lgpdConsentUpdated', handleConsentUpdate);
  }, []);

  const checkConsent = () => {
    try {
      const consent = localStorage.getItem(CONSENT_KEY);
      if (consent) {
        const parsed = JSON.parse(consent);
        // Verifica se tem pelo menos essenciais aceitos
        setHasConsent(parsed.essential === true);
      } else {
        setHasConsent(false);
      }
    } catch (e) {
      console.error('Erro ao verificar consentimento LGPD:', e);
      setHasConsent(false);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Salva dados no localStorage apenas se houver consentimento
   */
  const setItem = useCallback((key, value) => {
    if (!hasConsent) {
      console.warn(`[LGPD] Tentativa de usar localStorage sem consentimento: ${key}`);
      return false;
    }
    
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`[LGPD] Erro ao salvar no localStorage: ${key}`, e);
      return false;
    }
  }, [hasConsent]);

  /**
   * Recupera dados do localStorage apenas se houver consentimento
   */
  const getItem = useCallback((key, defaultValue = null) => {
    if (!hasConsent) {
      console.warn(`[LGPD] Tentativa de usar localStorage sem consentimento: ${key}`);
      return defaultValue;
    }
    
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error(`[LGPD] Erro ao recuperar do localStorage: ${key}`, e);
      return defaultValue;
    }
  }, [hasConsent]);

  /**
   * Remove dados do localStorage apenas se houver consentimento
   */
  const removeItem = useCallback((key) => {
    if (!hasConsent) {
      console.warn(`[LGPD] Tentativa de usar localStorage sem consentimento: ${key}`);
      return false;
    }
    
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error(`[LGPD] Erro ao remover do localStorage: ${key}`, e);
      return false;
    }
  }, [hasConsent]);

  return {
    hasConsent,
    isLoading,
    setItem,
    getItem,
    removeItem
  };
};

export default useLgpdStorage;
