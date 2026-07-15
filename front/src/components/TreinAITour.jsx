import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiChevronRight, FiChevronLeft, FiRotateCcw } from 'react-icons/fi';

/**
 * TreinAITour v4.3 — Product Tour com divToggle INTELIGENTE, responsividade aprimorada e sincronização de posição robusta
 * 
 * NOVO: Bloqueio de scroll do body enquanto o tour está ativo.
 * NOVO: Sincronização contínua da posição do destaque e tooltip via requestAnimationFrame.
 * NOVO: Interface mobile otimizada (bottom-sheet) para melhor usabilidade em dispositivos pequenos.
 * NOVO: Melhorias de responsividade para o tooltip em geral.
 * NOVO: UI mobile mais compacta e elegante.
 * NOVO: Correção de visibilidade do tooltip para elementos no final da página (desktop).
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
  const [tooltipPos, setTooltipPos] = useState('bottom');
  const [isAnimating, setIsAnimating] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [toggleStatus, setToggleStatus] = useState(''); // feedback visual
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);

  const tooltipRef = useRef(null);
  const containerRef = useRef(null);
  const toggleTimeoutRef = useRef(null);
  const animationFrameRef = useRef(null);

  const storageKey = `${STORAGE_PREFIX}${tourId}`;

  // Verifica se o usuário já viu o tour e lida com responsividade inicial
  useEffect(() => {
    const hasSeen = localStorage.getItem(storageKey);
    if (!hasSeen && steps.length > 0) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        setCurrentStep(0);
      }, 800);
      return () => clearTimeout(timer);
    }

    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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

  const updatePosition = useCallback(async () => {
    if (!isOpen) return;

    const target = getTargetElement();
    if (!target) {
      // Se o target sumiu, tenta ir para o próximo passo
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

    // Scroll para o elemento alvo, garantindo que esteja visível
    // Apenas scrolla se o elemento não estiver completamente visível
    const isPartiallyVisible = rect.top < 0 || rect.bottom > window.innerHeight || rect.left < 0 || rect.right > window.innerWidth;
    if (isPartiallyVisible) {
      const tooltipHeight = tooltipRef.current?.offsetHeight || (isMobile ? 150 : 100); // Estimar altura do tooltip
      let scrollOffset = 0;

      if (isMobile) {
        // No mobile, o tooltip é bottom-sheet, então precisamos garantir que o target esteja acima dele.
        // A parte inferior do target deve estar acima da parte superior do tooltip.
        const targetBottom = rect.bottom + window.scrollY;
        const viewportBottom = window.innerHeight + window.scrollY;
        const tooltipTop = viewportBottom - tooltipHeight; // Posição superior do tooltip bottom-sheet

        if (targetBottom > tooltipTop) {
          scrollOffset = targetBottom - tooltipTop + 20; // 20px de margem
        }
      } else {
        // No desktop, se o tooltip for posicionado abaixo e for cortado, scrolla para cima.
        // Ou se for posicionado acima e for cortado, scrolla para baixo.
        const tooltipRect = tooltipRef.current?.getBoundingClientRect();
        if (tooltipRect) {
          if (tooltipPos === 'bottom' && (rect.bottom + tooltipRect.height + 20 > window.innerHeight)) {
            scrollOffset = (rect.bottom + tooltipRect.height + 20) - window.innerHeight;
          } else if (tooltipPos === 'top' && (rect.top - tooltipRect.height - 20 < 0)) {
            scrollOffset = (rect.top - tooltipRect.height - 20);
          }
        }
      }

      window.scrollTo({
        top: window.scrollY + rect.top - window.innerHeight / 2 + rect.height / 2 + scrollOffset,
        behavior: 'smooth'
      });
    }

    if (tooltipRef.current) {
      const pos = calculatePosition(target, tooltipRef.current);
      setTooltipPos(pos);
    }

    animationFrameRef.current = requestAnimationFrame(updatePosition);
  }, [isOpen, currentStep, steps.length, highlightPadding, getTargetElement, isMobile, tooltipPos]);

  const calculatePosition = useCallback((target, tooltip) => {
    if (!target || !tooltip) return 'bottom';
    const targetRect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const step = steps[currentStep];

    // Força bottom-sheet em mobile
    if (isMobile) return 'bottom-sheet';

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

    // Tenta encontrar uma posição que caiba, priorizando a preferida do step
    if (step?.preferredPosition && fits[step.preferredPosition]) {
      return step.preferredPosition;
    }
    
    // Se a posição preferida não couber, tenta outras na ordem
    for (const pos of positions) {
      if (fits[pos]) return pos;
    }

    // Se nenhuma posição couber completamente, tenta a que tem mais espaço
    // Ou fallback para bottom, mas com scroll ajustado
    return 'bottom';
  }, [currentStep, steps, isMobile]);

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

      // Scroll inicial para o elemento alvo
      const tooltipHeight = tooltipRef.current?.offsetHeight || (isMobile ? 150 : 100); // Estimar altura do tooltip
      let scrollOffset = 0;

      if (isMobile) {
        const targetBottom = target.getBoundingClientRect().bottom + window.scrollY;
        const viewportBottom = window.innerHeight + window.scrollY;
        const tooltipTop = viewportBottom - tooltipHeight; 

        if (targetBottom > tooltipTop) {
          scrollOffset = targetBottom - tooltipTop + 20; 
        }
      } else {
        const tooltipRect = tooltipRef.current?.getBoundingClientRect();
        if (tooltipRect) {
          if (tooltipPos === 'bottom' && (target.getBoundingClientRect().bottom + tooltipRect.height + 20 > window.innerHeight)) {
            scrollOffset = (target.getBoundingClientRect().bottom + tooltipRect.height + 20) - window.innerHeight;
          } else if (tooltipPos === 'top' && (target.getBoundingClientRect().top - tooltipRect.height - 20 < 0)) {
            scrollOffset = (target.getBoundingClientRect().top - tooltipRect.height - 20);
          }
        }
      }

      window.scrollTo({
        top: window.scrollY + target.getBoundingClientRect().top - window.innerHeight / 2 + target.getBoundingClientRect().height / 2 + scrollOffset,
        behavior: 'smooth'
      });

      // Pequeno delay para garantir que o scroll terminou antes de calcular a posição
      setTimeout(() => {
        setIsAnimating(false);
        updatePosition(); // Inicia o loop de atualização contínua
      }, 300); // Ajuste este valor se o scroll for muito lento
    };

    initStep();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (toggleTimeoutRef.current) clearTimeout(toggleTimeoutRef.current);
    };
  }, [isOpen, currentStep, steps.length, smartToggle, getTargetElement, updatePosition, isMobile, tooltipPos]);

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

  const getTooltipStyles = () => {
    const base = {
      position: 'fixed',
      zIndex: zIndex + 10,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      opacity: isAnimating || isToggling ? 0 : 1,
      transform: isAnimating || isToggling ? 'scale(0.95)' : 'scale(1)',
      pointerEvents: isToggling ? 'none' : 'auto',
      boxSizing: 'border-box',
    };
    const spacing = 16;
    const centerX = targetRect.left + targetRect.width / 2;
    const centerY = targetRect.top + targetRect.height / 2;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top, left, right, bottom, width, maxWidth;

    if (isMobile) {
      // Bottom-sheet style for mobile
      top = 'auto';
      bottom = '0';
      left = '0';
      right = '0';
      width = '100%';
      maxWidth = '100%';
      // Ajustes para UI mais compacta no mobile
      return { ...base, top, bottom, left, right, width, maxWidth, borderRadius: '16px 16px 0 0', padding: '12px 16px', maxHeight: '40vh', overflowY: 'auto' };
    } else {
      // Desktop positioning
      maxWidth = 360;
      width = 'max-content';

      const tooltipWidth = tooltipRef.current?.offsetWidth || maxWidth;
      const tooltipHeight = tooltipRef.current?.offsetHeight || 100; // Estimativa

      switch (tooltipPos) {
        case 'top':
          bottom = `${vh - targetRect.top + spacing}px`;
          left = `${Math.min(Math.max(centerX - tooltipWidth / 2, spacing), vw - tooltipWidth - spacing)}px`;
          break;
        case 'bottom':
          top = `${targetRect.top + targetRect.height + spacing}px`;
          left = `${Math.min(Math.max(centerX - tooltipWidth / 2, spacing), vw - tooltipWidth - spacing)}px`;
          break;
        case 'left':
          top = `${Math.min(Math.max(centerY - tooltipHeight / 2, spacing), vh - tooltipHeight - spacing)}px`;
          right = `${vw - targetRect.left + spacing}px`;
          break;
        case 'right':
          top = `${Math.min(Math.max(centerY - tooltipHeight / 2, spacing), vh - tooltipHeight - spacing)}px`;
          left = `${targetRect.left + targetRect.width + spacing}px`;
          break;
        default:
          // Fallback to bottom
          top = `${targetRect.top + targetRect.height + spacing}px`;
          left = `${Math.min(Math.max(centerX - tooltipWidth / 2, spacing), vw - tooltipWidth - spacing)}px`;
          break;
      }
      return { ...base, top, left, right, bottom, width, maxWidth };
    }
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
        <div style={{ background: '#1f2937', borderRadius: isMobile ? '16px 16px 0 0' : 16, padding: isMobile ? '12px 16px' : '20px 24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1)', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isMobile ? 8 : 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: '#10b981', color: '#fff', fontSize: isMobile ? 10 : 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999, letterSpacing: '0.05em' }}>
                {currentStep + 1} / {steps.length}
              </span>
              {step.title && <span style={{ fontSize: isMobile ? 12 : 13, fontWeight: 600, color: '#e5e7eb' }}>{step.title}</span>}
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
              <div style={{ marginBottom: isMobile ? 12 : 20 }}>
                <p style={{ margin: 0, fontSize: isMobile ? 13 : 14, lineHeight: 1.6, color: '#d1d5db' }}>{step.content}</p>
                {step.hint && <p style={{ margin: '8px 0 0', fontSize: isMobile ? 10 : 12, color: '#6ee7b7', fontStyle: 'italic', lineHeight: 1.5 }}>💡 {step.hint}</p>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: isMobile ? 'column-reverse' : 'row', gap: isMobile ? 8 : 0 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {steps.map((_, idx) => (
                    <div key={idx} style={{ width: 8, height: 8, borderRadius: '50%', background: idx === currentStep ? '#10b981' : idx < currentStep ? '#059669' : '#374151', transition: 'all 0.3s', cursor: idx < currentStep ? 'pointer' : 'default' }} onClick={() => idx < currentStep && setCurrentStep(idx)} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
                  {currentStep > 0 && (
                    <button onClick={handlePrev} style={{ background: 'transparent', border: '1px solid #4b5563', color: '#d1d5db', padding: isMobile ? '8px 12px' : '6px 12px', borderRadius: 8, fontSize: isMobile ? 12 : 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, flexGrow: isMobile ? 1 : 0, justifyContent: 'center' }}>
                      <FiChevronLeft size={isMobile ? 14 : 14} /> Voltar
                    </button>
                  )}
                  <button onClick={handleNext} style={{ background: '#10b981', border: 'none', color: '#fff', padding: isMobile ? '8px 12px' : '6px 16px', borderRadius: 8, fontSize: isMobile ? 12 : 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)', flexGrow: isMobile ? 1 : 0, justifyContent: 'center' }}>
                    {currentStep === steps.length - 1 ? 'Concluir' : 'Próximo'}
                    <FiChevronRight size={isMobile ? 14 : 14} />
                  </button>
                </div>
              </div>
            </>
          )}

          <div style={{ marginTop: isMobile ? 8 : 12, textAlign: 'center' }}>
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
