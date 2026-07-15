import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiChevronRight, FiChevronLeft, FiRotateCcw } from 'react-icons/fi';

/**
 * TreinAITour v6.0 — Product Tour com painel integrado à área destacada
 * 
 * NOVO: Painel de controle ancorado visualmente dentro da div destacada.
 * NOVO: Acabamento glassmorphism transparente para preservar a leitura do conteúdo ao fundo.
 * NOVO: Dimensões, posição e organização dos controles adaptativas ao alvo e à viewport.
 * NOVO: Fallback seguro para alvos muito pequenos, sem cortar ações ou textos.
 * NOVO: Scroll livre e acompanhamento contínuo do alvo via requestAnimationFrame.
 * 
 * Props do step:
 *   target: string (querySelector) — elemento a destacar
 *   divToggle: string (querySelector) — BOTÃO que abre/fecha a div
 *   waitForVisible: number — ms para aguardar animação (padrão: 400)
 *   title, content, hint, preferredPosition
 */

const STORAGE_PREFIX = 'treinai-tour-';
const MOBILE_BREAKPOINT = 768; // px

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
  const [isAnimating, setIsAnimating] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [toggleStatus, setToggleStatus] = useState(''); // feedback visual
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);

  const tooltipRef = useRef(null);
  const containerRef = useRef(null);
  const toggleTimeoutRef = useRef(null);
  const animationFrameRef = useRef(null);

  const storageKey = `${STORAGE_PREFIX}${tourId}`;

  // Abre o tour na primeira visita.
  useEffect(() => {
    const hasSeen = localStorage.getItem(storageKey);
    if (hasSeen || steps.length === 0) return undefined;

    const timer = setTimeout(() => {
      setIsOpen(true);
      setCurrentStep(0);
    }, 800);

    return () => clearTimeout(timer);
  }, [storageKey, steps.length]);

  // Mantém a interface responsiva mesmo quando o tour já foi visualizado anteriormente.
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // REMOVIDO: Bloqueio de scroll do body. O scroll agora é livre.
  useEffect(() => {
    // Apenas garante que o overflow esteja normal ao desmontar
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

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

  const updatePosition = useCallback(() => {
    if (!isOpen) return;

    const target = getTargetElement();
    if (!target) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        handleComplete();
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

    animationFrameRef.current = requestAnimationFrame(updatePosition);
  }, [isOpen, currentStep, steps.length, highlightPadding, getTargetElement]);

  // Efeito principal para gerenciar o tour
  useEffect(() => {
    if (!isOpen) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const initStep = async () => {
      setIsAnimating(true);
      const toggleResult = await smartToggle();

      if (!toggleResult.success) {
        if (currentStep < steps.length - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          handleComplete();
        }
        setIsAnimating(false);
        return;
      }

      const target = getTargetElement();
      if (!target) {
        if (currentStep < steps.length - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          handleComplete();
        }
        setIsAnimating(false);
        return;
      }

      // Revela a div-alvo e reserva espaço visual para o painel que ficará dentro dela.
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });

      // Aguarda o scroll estabilizar antes de iniciar o acompanhamento contínuo.
      setTimeout(() => {
        setIsAnimating(false);
        updatePosition();
      }, 260);
    };

    initStep();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (toggleTimeoutRef.current) clearTimeout(toggleTimeoutRef.current);
    };
  }, [isOpen, currentStep, steps.length, smartToggle, getTargetElement, updatePosition]);

  const handleNext = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
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
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
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
  }, [isOpen, isToggling, handleNext, handlePrev, handleSkip]);

  if (!isOpen || !targetRect) return null;
  const step = steps[currentStep];
  if (!step) return null;
  const isCompactPanel = isMobile || targetRect.width < 460;

  const getTooltipStyles = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const viewportInset = isMobile ? 8 : 12;
    const targetInset = Math.max(6, Math.min(isMobile ? 10 : 12, targetRect.width * 0.03));
    const availableTargetWidth = Math.max(0, targetRect.width - targetInset * 2);
    const viewportWidth = Math.max(0, vw - viewportInset * 2);
    const preferredMaxWidth = isMobile ? 440 : 420;

    // O mínimo de 220 px mantém os controles utilizáveis quando o alvo é muito estreito.
    const width = Math.min(
      preferredMaxWidth,
      viewportWidth,
      Math.max(220, availableTargetWidth),
    );

    const measuredHeight = tooltipRef.current?.offsetHeight || (isMobile ? 220 : 230);
    const availableTargetHeight = Math.max(120, targetRect.height - targetInset * 2);
    const maxHeight = Math.min(vh - viewportInset * 2, availableTargetHeight);
    const visibleHeight = Math.min(measuredHeight, maxHeight);
    const centeredLeft = targetRect.left + (targetRect.width - width) / 2;
    const desiredTop = targetRect.top + targetRect.height - targetInset - visibleHeight;
    const left = Math.min(Math.max(centeredLeft, viewportInset), vw - width - viewportInset);
    const top = Math.min(Math.max(desiredTop, viewportInset), vh - visibleHeight - viewportInset);

    return {
      position: 'fixed',
      top,
      left,
      width,
      maxWidth: 'calc(100vw - 16px)',
      maxHeight,
      overflowY: 'auto',
      overscrollBehavior: 'contain',
      zIndex: zIndex + 10,
      opacity: isAnimating || isToggling ? 0 : 1,
      transform: isAnimating || isToggling ? 'translateY(6px) scale(0.97)' : 'translateY(0) scale(1)',
      transformOrigin: 'center bottom',
      transition: 'opacity 180ms cubic-bezier(0.23, 1, 0.32, 1), transform 180ms cubic-bezier(0.23, 1, 0.32, 1)',
      pointerEvents: isToggling ? 'none' : 'auto',
      boxSizing: 'border-box',
      borderRadius: isMobile ? 14 : 16,
      scrollbarWidth: 'thin',
      scrollbarColor: 'rgba(110, 231, 183, 0.55) transparent',
    };
  };

  const overlayPath = `M 0 0 L ${window.innerWidth} 0 L ${window.innerWidth} ${window.innerHeight} L 0 ${window.innerHeight} Z M ${targetRect.left} ${targetRect.top} L ${targetRect.left + targetRect.width} ${targetRect.top} L ${targetRect.left + targetRect.width} ${targetRect.top + targetRect.height} L ${targetRect.left} ${targetRect.top + targetRect.height} Z`;
  const tooltipStyles = getTooltipStyles();

  return createPortal(
    <div ref={containerRef} style={{ position: 'fixed', inset: 0, zIndex, pointerEvents: 'none' }}>
      <svg style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: zIndex + 1, pointerEvents: 'none' }}> {/* pointerEvents: 'none' para permitir interação com o fundo */}
        <path d={overlayPath} fill={overlayColor} fillRule="evenodd" style={{ transition: 'd 0.3s ease' }} />
        <rect x={targetRect.left} y={targetRect.top} width={targetRect.width} height={targetRect.height} rx={8} fill="none" stroke="#10b981" strokeWidth={3} style={{ filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.5))', animation: 'treinai-pulse 2s ease-in-out infinite' }} />
      </svg>

      <div ref={tooltipRef} style={tooltipStyles} className="treinai-tour-tooltip" role="dialog" aria-modal="false" aria-label={`Etapa ${currentStep + 1} de ${steps.length}: ${step.title || 'Tour guiado'}`}>
        <div style={{ background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.80), rgba(17, 24, 39, 0.66))', WebkitBackdropFilter: 'blur(18px) saturate(145%)', backdropFilter: 'blur(18px) saturate(145%)', border: '1px solid rgba(255, 255, 255, 0.18)', borderRadius: isMobile ? 14 : 16, padding: isCompactPanel ? '12px 14px' : '18px 20px', boxShadow: '0 18px 44px rgba(2, 6, 23, 0.35), inset 0 1px 0 rgba(255,255,255,0.10)', color: '#fff', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', isolation: 'isolate' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: isCompactPanel ? 8 : 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', minWidth: 0, gap: 8 }}>
              <span style={{ background: '#10b981', color: '#fff', fontSize: isMobile ? 10 : 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999, letterSpacing: '0.05em' }}>
                {currentStep + 1} / {steps.length}
              </span>
              {step.title && <span style={{ minWidth: 0, fontSize: isCompactPanel ? 12 : 13, fontWeight: 650, color: '#f3f4f6', overflowWrap: 'anywhere' }}>{step.title}</span>}
            </div>
            <button onClick={handleSkip} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'} aria-label="Fechar tour">
              <FiX size={isMobile ? 16 : 18} />
            </button>
          </div>

          {isToggling ? (
            <div style={{ padding: isMobile ? '10px 0' : '20px 0', textAlign: 'center' }}>
              <div style={{ width: 32, height: 32, border: '3px solid #374151', borderTopColor: '#10b981', borderRadius: '50%', animation: 'treinai-spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              <p style={{ margin: 0, fontSize: isMobile ? 12 : 13, color: '#9ca3af' }}>{toggleStatus}</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: isCompactPanel ? 12 : 18 }}>
                <p style={{ margin: 0, fontSize: isCompactPanel ? 12 : 14, lineHeight: 1.55, color: '#e5e7eb', overflowWrap: 'anywhere' }}>{step.content}</p>
                {step.hint && <p style={{ margin: '8px 0 0', fontSize: isCompactPanel ? 10 : 12, color: '#a7f3d0', fontStyle: 'italic', lineHeight: 1.45, overflowWrap: 'anywhere' }}><strong>Dica:</strong> {step.hint}</p>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: isCompactPanel ? 'column-reverse' : 'row', gap: isCompactPanel ? 10 : 12 }}>
                <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 5, maxWidth: '100%' }}>
                  {steps.map((_, idx) => (
                    <div key={idx} style={{ width: 8, height: 8, borderRadius: '50%', background: idx === currentStep ? '#10b981' : idx < currentStep ? '#059669' : '#374151', transition: 'all 0.3s', cursor: idx < currentStep ? 'pointer' : 'default' }} onClick={() => idx < currentStep && setCurrentStep(idx)} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: isCompactPanel ? '100%' : 'auto', justifyContent: isCompactPanel ? 'stretch' : 'flex-end' }}>
                  {currentStep > 0 && (
                    <button onClick={handlePrev} style={{ minHeight: 34, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.20)', color: '#f3f4f6', padding: isCompactPanel ? '8px 12px' : '7px 12px', borderRadius: 9, fontSize: isCompactPanel ? 12 : 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, flex: isCompactPanel ? '1 1 0' : '0 0 auto', justifyContent: 'center', transition: 'transform 160ms cubic-bezier(0.23, 1, 0.32, 1), background 160ms ease-out' }}>
                      <FiChevronLeft size={isMobile ? 14 : 14} /> Voltar
                    </button>
                  )}
                  <button onClick={handleNext} style={{ minHeight: 34, background: 'linear-gradient(135deg, #10b981, #059669)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff', padding: isCompactPanel ? '8px 12px' : '7px 16px', borderRadius: 9, fontSize: isCompactPanel ? 12 : 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 6px 16px rgba(5, 150, 105, 0.30)', flex: isCompactPanel ? '1 1 0' : '0 0 auto', justifyContent: 'center', transition: 'transform 160ms cubic-bezier(0.23, 1, 0.32, 1), filter 160ms ease-out' }}>
                    {currentStep === steps.length - 1 ? 'Concluir' : 'Próximo'}
                    <FiChevronRight size={isMobile ? 14 : 14} />
                  </button>
                </div>
              </div>
            </>
          )}

          <div style={{ marginTop: isCompactPanel ? 8 : 12, textAlign: 'center' }}>
            <button onClick={handleSkip} style={{ background: 'none', border: 'none', color: '#cbd5e1', fontSize: 11, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>Pular tour</button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes treinai-pulse { 0%, 100% { stroke-opacity: 1; } 50% { stroke-opacity: 0.6; } }
        @keyframes treinai-spin { to { transform: rotate(360deg); } }
        .treinai-tour-tooltip button:active { transform: scale(0.97); }
        .treinai-tour-tooltip button:focus-visible { outline: 2px solid #6ee7b7; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) {
          .treinai-tour-tooltip { transition: none !important; }
          .treinai-tour-tooltip * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
        }
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
