import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiChevronRight, FiChevronLeft, FiRotateCcw } from 'react-icons/fi';

/**
 * TreinAITour v3.1 — Product Tour com divToggle INTELIGENTE e melhorias de responsividade
 * 
 * NOVO: SmartToggle — detecta se a div já está aberta antes de clicar.
 * Se clicar e a div FECHAR (diminuir de tamanho), detecta e clica de novo.
 * Se já estiver aberta, não clica — evita fechar por engano.
 * 
 * NOVO: Bloqueio de scroll do body enquanto o tour está ativo.
 * NOVO: Melhorias de responsividade para o tooltip.
 * 
 * Props do step:
 *   target: string (querySelector) — elemento a destacar
 *   divToggle: string (querySelector) — BOTÃO que abre/fecha a div
 *   waitForVisible: number — ms para aguardar animação (padrão: 400)
 *   title, content, hint, preferredPosition
 */

const STORAGE_PREFIX = 'treinai-tour-';

const TreinAITour = ({
  tourId = 'default',
  steps = [],
  zIndex = 9999,
  overlayColor = 'rgba(0, 0, 0, 0.75)',
  highlightPadding = 8,
  onComplete = () => {},
  onSkip = () => {},
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipPos, setTooltipPos] = useState('bottom');
  const [isAnimating, setIsAnimating] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [toggleStatus, setToggleStatus] = useState(''); // feedback visual
  const tooltipRef = useRef(null);
  const containerRef = useRef(null);
  const toggleTimeoutRef = useRef(null);

  const storageKey = `${STORAGE_PREFIX}${tourId}`;

  // Verifica se o usuário já viu o tour
  useEffect(() => {
    const hasSeen = localStorage.getItem(storageKey);
    if (!hasSeen && steps.length > 0) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        setCurrentStep(0);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [storageKey, steps.length]);

  // Bloqueia o scroll do body quando o tour está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = ''; // Garante que o scroll seja reativado ao desmontar
    };
  }, [isOpen]);

  const getTargetElement = useCallback(() => {
    const step = steps[currentStep];
    if (!step) return null;
    let target = null;
    if (step.target) {
      target = document.querySelector(step.target);
    } else if (step.dataTour) {
      target = document.querySelector(`[data-tour="${step.dataTour}"]`);
    }
    return target;
  }, [currentStep, steps]);

  /**
   * SMART TOGGLE v3
   * 1. Mede o tamanho ANTES do clique
   * 2. Clica no botão
   * 3. Espera a animação
   * 4. Mede o tamanho DEPOIS do clique
   * 5. Se DIMINUIU (fechou), clica de NOVO para reabrir
   * 6. Se AUMENTOU (abriu), sucesso
   * 7. Se NÃO MUDOU, verifica se target está visível
   */
  const smartToggle = useCallback(async () => {
    const step = steps[currentStep];
    if (!step?.divToggle) return { success: true, reason: 'no-toggle-needed' };

    const toggleBtn = document.querySelector(step.divToggle);
    if (!toggleBtn) {
      console.warn(`[TreinAITour] Botão de toggle não encontrado: ${step.divToggle}`);
      return { success: true, reason: 'toggle-button-not-found' };
    }

    const target = getTargetElement();

    // Se target já está visível, não precisa fazer nada
    if (target && target.offsetParent !== null) {
      return { success: true, reason: 'already-visible' };
    }

    setIsToggling(true);
    setToggleStatus('Verificando estado da seção...');

    // PASSO 1: Mede dimensões ANTES do clique
    const parent = toggleBtn.closest('[data-tour-section]') || toggleBtn.parentElement;
    const beforeRect = parent ? parent.getBoundingClientRect() : { height: 0 };
    const beforeTargetVisible = target ? target.offsetParent !== null : false;

    // PASSO 2: Clica no botão
    setToggleStatus('Abrindo seção...');
    toggleBtn.click();

    // PASSO 3: Aguarda animação
    const waitTime = step.waitForVisible || 400;
    await new Promise(resolve => {
      toggleTimeoutRef.current = setTimeout(resolve, waitTime);
    });

    // PASSO 4: Mede dimensões DEPOIS do clique
    const afterRect = parent ? parent.getBoundingClientRect() : { height: 0 };
    const afterTargetVisible = target ? target.offsetParent !== null : false;

    // PASSO 5: Análise inteligente
    const heightDelta = afterRect.height - beforeRect.height;
    const targetBecameVisible = !beforeTargetVisible && afterTargetVisible;
    const targetStillHidden = !afterTargetVisible;
    const sectionShrunk = heightDelta < -10; // diminuiu mais que 10px = provavelmente fechou

    // Se a seção encolheu OU o target ainda está invisível → precisa clicar de novo
    if (sectionShrunk || targetStillHidden) {
      setToggleStatus('Seção fechou — reabrindo...');

      // PASSO 6: Segundo clique para reabrir
      toggleBtn.click();

      await new Promise(resolve => {
        toggleTimeoutRef.current = setTimeout(resolve, waitTime);
      });

      // Verifica novamente
      const finalTarget = document.querySelector(step.target);
      const finalVisible = finalTarget ? finalTarget.offsetParent !== null : false;

      if (!finalVisible) {
        setToggleStatus('Não foi possível abrir a seção automaticamente');
        setIsToggling(false);
        return { success: false, reason: 'toggle-failed-after-retry' };
      }

      setToggleStatus('Seção aberta com sucesso!');
      setIsToggling(false);
      return { success: true, reason: 'opened-on-retry' };
    }

    // Se o target ficou visível → sucesso
    if (targetBecameVisible) {
      setToggleStatus('Seção aberta com sucesso!');
      setIsToggling(false);
      return { success: true, reason: 'opened-on-first-try' };
    }

    // Se não mudou nada, mas target está visível → já estava aberto
    setIsToggling(false);
    return { success: true, reason: 'already-open' };
  }, [currentStep, steps, getTargetElement]);

  const calculatePosition = useCallback((target, tooltip) => {
    if (!target || !tooltip) return 'bottom';
    const targetRect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const step = steps[currentStep];

    const positions = ['bottom', 'top', 'right', 'left'];
    const fits = {
      bottom: (targetRect.bottom + tooltipRect.height + 20 <= viewportHeight) && 
              (targetRect.left + tooltipRect.width / 2 <= viewportWidth) &&
              (targetRect.left - tooltipRect.width / 2 >= 0),
      top: (targetRect.top - tooltipRect.height - 20 >= 0) &&
           (targetRect.left + tooltipRect.width / 2 <= viewportWidth) &&
           (targetRect.left - tooltipRect.width / 2 >= 0),
      right: (targetRect.right + tooltipRect.width + 20 <= viewportWidth) &&
             (targetRect.top + tooltipRect.height / 2 <= viewportHeight) &&
             (targetRect.top - tooltipRect.height / 2 >= 0),
      left: (targetRect.left - tooltipRect.width - 20 >= 0) &&
            (targetRect.top + tooltipRect.height / 2 <= viewportHeight) &&
            (targetRect.top - tooltipRect.height / 2 >= 0),
    };

    if (step?.preferredPosition && fits[step.preferredPosition]) {
      return step.preferredPosition;
    }
    return positions.find(p => fits[p]) || 'bottom';
  }, [currentStep, steps]);

  // Atualiza posição do spotlight e tooltip
  useEffect(() => {
    if (!isOpen) return;

    const run = async () => {
      // Primeiro: smart toggle (abre se necessário)
      const toggleResult = await smartToggle();

      if (!toggleResult.success) {
        // Se não conseguiu abrir, pula para o próximo passo
        if (currentStep < steps.length - 1) {
          setCurrentStep(prev => prev + 1);
        }
        return;
      }

      const target = getTargetElement();
      if (!target) {
        if (currentStep < steps.length - 1) {
          setCurrentStep(prev => prev + 1);
        }
        return;
      }

      const rect = target.getBoundingClientRect();
      setTargetRect({
        top: rect.top - highlightPadding,
        left: rect.left - highlightPadding,
        width: rect.width + highlightPadding * 2,
        height: rect.height + highlightPadding * 2,
      });

      // Scroll para o elemento alvo, garantindo que esteja visível
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

      const checkTooltip = () => {
        if (tooltipRef.current) {
          const pos = calculatePosition(target, tooltipRef.current);
          setTooltipPos(pos);
        }
      };
      const timer = setTimeout(checkTooltip, 100);
      return () => clearTimeout(timer);
    };

    run();
  }, [isOpen, currentStep, getTargetElement, calculatePosition, highlightPadding, steps.length, smartToggle]);

  const handleNext = () => {
    setIsAnimating(true);
    setTimeout(() => {
      if (currentStep < steps.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        handleComplete();
      }
      setIsAnimating(false);
    }, 200);
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev - 1);
        setIsAnimating(false);
      }, 200);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(storageKey, 'skipped');
    setIsOpen(false);
    onSkip();
  };

  const handleComplete = () => {
    localStorage.setItem(storageKey, 'completed');
    setIsOpen(false);
    onComplete();
  };

  const handleRestart = () => {
    localStorage.removeItem(storageKey);
    setCurrentStep(0);
    setIsOpen(true);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen || isToggling) return;
      if (e.key === 'Escape') handleSkip();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, isToggling, handleNext, handlePrev, handleSkip]);

  useEffect(() => {
    if (!isOpen) return;
    const handleResize = () => {
      const target = getTargetElement();
      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetRect({
          top: rect.top - highlightPadding,
          left: rect.left - highlightPadding,
          width: rect.width + highlightPadding * 2,
          height: rect.height + highlightPadding * 2,
        });
        // Recalcular a posição do tooltip ao redimensionar
        if (tooltipRef.current) {
          const pos = calculatePosition(target, tooltipRef.current);
          setTooltipPos(pos);
        }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, currentStep, getTargetElement, highlightPadding, calculatePosition]);

  useEffect(() => {
    return () => {
      if (toggleTimeoutRef.current) clearTimeout(toggleTimeoutRef.current);
    };
  }, []);

  if (!isOpen || !targetRect) return null;
  const step = steps[currentStep];
  if (!step) return null;

  const getTooltipStyles = () => {
    const base = {
      position: 'fixed',
      zIndex: zIndex + 10,
      maxWidth: 'min(90vw, 360px)', // Responsivo: 90% da largura da viewport, máximo 360px
      width: 'max-content',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      opacity: isAnimating || isToggling ? 0 : 1,
      transform: isAnimating || isToggling ? 'scale(0.95)' : 'scale(1)',
      pointerEvents: isToggling ? 'none' : 'auto',
    };
    const spacing = 16;
    const centerX = targetRect.left + targetRect.width / 2;
    const centerY = targetRect.top + targetRect.height / 2;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top, left, right, bottom;

    switch (tooltipPos) {
      case 'top':
        bottom = `${vh - targetRect.top + spacing}px`;
        left = `${Math.min(Math.max(centerX - (tooltipRef.current?.offsetWidth || 360) / 2, 16), vw - (tooltipRef.current?.offsetWidth || 360) - 16)}px`;
        break;
      case 'bottom':
        top = `${targetRect.top + targetRect.height + spacing}px`;
        left = `${Math.min(Math.max(centerX - (tooltipRef.current?.offsetWidth || 360) / 2, 16), vw - (tooltipRef.current?.offsetWidth || 360) - 16)}px`;
        break;
      case 'left':
        top = `${Math.min(Math.max(centerY - (tooltipRef.current?.offsetHeight || 100) / 2, 16), vh - (tooltipRef.current?.offsetHeight || 100) - 16)}px`;
        right = `${vw - targetRect.left + spacing}px`;
        break;
      case 'right':
        top = `${Math.min(Math.max(centerY - (tooltipRef.current?.offsetHeight || 100) / 2, 16), vh - (tooltipRef.current?.offsetHeight || 100) - 16)}px`;
        left = `${targetRect.left + targetRect.width + spacing}px`;
        break;
      default:
        top = `${targetRect.top + targetRect.height + spacing}px`;
        left = `${Math.min(Math.max(centerX - (tooltipRef.current?.offsetWidth || 360) / 2, 16), vw - (tooltipRef.current?.offsetWidth || 360) - 16)}px`;
        break;
    }

    return { ...base, top, left, right, bottom };
  };

  const overlayPath = `M 0 0 L ${window.innerWidth} 0 L ${window.innerWidth} ${window.innerHeight} L 0 ${window.innerHeight} Z M ${targetRect.left} ${targetRect.top} L ${targetRect.left + targetRect.width} ${targetRect.top} L ${targetRect.left + targetRect.width} ${targetRect.top + targetRect.height} L ${targetRect.left} ${targetRect.top + targetRect.height} Z`;
  const tooltipStyles = getTooltipStyles();

  return createPortal(
    <div ref={containerRef} style={{ position: 'fixed', inset: 0, zIndex }}>
      <svg style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: zIndex + 1, pointerEvents: 'auto' }}>
        <path d={overlayPath} fill={overlayColor} fillRule="evenodd" style={{ transition: 'd 0.3s ease' }} />
        <rect x={targetRect.left} y={targetRect.top} width={targetRect.width} height={targetRect.height} rx={8} fill="none" stroke="#10b981" strokeWidth={3} style={{ filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.5))', animation: 'treinai-pulse 2s ease-in-out infinite' }} />
      </svg>

      <div ref={tooltipRef} style={tooltipStyles} className="treinai-tour-tooltip">
        <div style={{ background: '#1f2937', borderRadius: 16, padding: '20px 24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1)', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: '#10b981', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, letterSpacing: '0.05em' }}>
                {currentStep + 1} / {steps.length}
              </span>
              {step.title && <span style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb' }}>{step.title}</span>}
            </div>
            <button onClick={handleSkip} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'} aria-label="Fechar tour">
              <FiX size={18} />
            </button>
          </div>

          {isToggling ? (
            <div style={{ padding: '20px 0', textAlign: 'center' }}>
              <div style={{ width: 32, height: 32, border: '3px solid #374151', borderTopColor: '#10b981', borderRadius: '50%', animation: 'treinai-spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>{toggleStatus}</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 20 }}>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#d1d5db' }}>{step.content}</p>
                {step.hint && <p style={{ margin: '12px 0 0', fontSize: 12, color: '#6ee7b7', fontStyle: 'italic', lineHeight: 1.5 }}>💡 {step.hint}</p>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {steps.map((_, idx) => (
                    <div key={idx} style={{ width: 8, height: 8, borderRadius: '50%', background: idx === currentStep ? '#10b981' : idx < currentStep ? '#059669' : '#374151', transition: 'all 0.3s', cursor: idx < currentStep ? 'pointer' : 'default' }} onClick={() => idx < currentStep && setCurrentStep(idx)} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {currentStep > 0 && (
                    <button onClick={handlePrev} style={{ background: 'transparent', border: '1px solid #4b5563', color: '#d1d5db', padding: '6px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FiChevronLeft size={14} /> Voltar
                    </button>
                  )}
                  <button onClick={handleNext} style={{ background: '#10b981', border: 'none', color: '#fff', padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}>
                    {currentStep === steps.length - 1 ? 'Concluir' : 'Próximo'}
                    <FiChevronRight size={14} />
                  </button>
                </div>
              </div>
            </>
          )}

          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <button onClick={handleSkip} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}>Pular tour</button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes treinai-pulse { 0%, 100% { stroke-opacity: 1; } 50% { stroke-opacity: 0.6; } }
        @keyframes treinai-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>,
    document.body
  );
};

export const TourRestartButton = ({ tourId, label = 'Reiniciar Tour', icon = true }) => {
  const handleRestart = () => {
    localStorage.removeItem(`${STORAGE_PREFIX}${tourId}`);
    window.location.reload();
  };
  return (
    <button onClick={handleRestart} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#1f2937', color: '#10b981', border: '1px solid #374151', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>
      {icon && <FiRotateCcw size={14} />}{label}
    </button>
  );
};

export default TreinAITour;
