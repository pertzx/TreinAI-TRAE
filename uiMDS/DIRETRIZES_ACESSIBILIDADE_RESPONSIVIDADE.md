# Diretrizes de Acessibilidade e Responsividade - TreinAI

## 📋 Análise do Estado Atual

### ✅ Pontos Positivos Identificados
- **Acessibilidade Básica**: Uso de `aria-label`, `aria-expanded`, `alt` text em imagens
- **Focus Management**: Implementação de `focus:ring-2`, `focus:outline-none`
- **Responsividade Tailwind**: Uso extensivo de breakpoints (`sm:`, `md:`, `lg:`, `xl:`)
- **Componentes Adaptativos**: Grid responsivo e flex layouts
- **Temas Consistentes**: Suporte a tema claro/escuro

### ⚠️ Problemas Críticos Identificados
- **Acessibilidade Limitada**: Falta de `role`, `aria-describedby`, navegação por teclado
- **Contraste Insuficiente**: Cores podem não atender WCAG 2.1
- **Screen Readers**: Suporte limitado para leitores de tela
- **Navegação por Teclado**: Inconsistente em componentes complexos
- **Responsividade Mobile**: Alguns componentes não otimizados para mobile

## 🎯 Diretrizes de Acessibilidade (WCAG 2.1 AA)

### 1. Estrutura Semântica

```jsx
// ❌ Estrutura inadequada
<div onClick={handleClick}>Botão</div>

// ✅ Estrutura semântica correta
<button 
  type="button"
  aria-label="Iniciar treino"
  onClick={handleClick}
>
  Iniciar treino
</button>

// ✅ Landmarks semânticos
<main role="main" aria-label="Conteúdo principal">
  <section aria-labelledby="dashboard-title">
    <h1 id="dashboard-title">Dashboard</h1>
  </section>
</main>
```

### 2. Navegação por Teclado

```jsx
// Hook para navegação por teclado
const useKeyboardNavigation = (items, onSelect) => {
  const [focusedIndex, setFocusedIndex] = useState(0);
  
  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => (prev + 1) % items.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev - 1 + items.length) % items.length);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelect(items[focusedIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        setFocusedIndex(-1);
        break;
    }
  }, [items, focusedIndex, onSelect]);
  
  return { focusedIndex, handleKeyDown };
};

// Componente de lista acessível
const AccessibleList = ({ items, onSelect }) => {
  const { focusedIndex, handleKeyDown } = useKeyboardNavigation(items, onSelect);
  
  return (
    <ul 
      role="listbox"
      aria-label="Lista de treinos"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {items.map((item, index) => (
        <li
          key={item.id}
          role="option"
          aria-selected={index === focusedIndex}
          tabIndex={index === focusedIndex ? 0 : -1}
          className={`p-3 cursor-pointer ${
            index === focusedIndex ? 'bg-blue-100 ring-2 ring-blue-500' : ''
          }`}
          onClick={() => onSelect(item)}
        >
          {item.name}
        </li>
      ))}
    </ul>
  );
};
```

### 3. Estados e Feedback

```jsx
// Componente de loading acessível
const AccessibleLoading = ({ message = "Carregando..." }) => (
  <div 
    role="status" 
    aria-live="polite"
    aria-label={message}
    className="flex items-center justify-center p-4"
  >
    <div 
      className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
      aria-hidden="true"
    />
    <span className="sr-only">{message}</span>
  </div>
);

// Notificações acessíveis
const AccessibleToast = ({ type, message, onClose }) => (
  <div
    role="alert"
    aria-live="assertive"
    className={`p-4 rounded-lg shadow-lg ${
      type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
    }`}
  >
    <div className="flex items-center justify-between">
      <span>{message}</span>
      <button
        type="button"
        aria-label="Fechar notificação"
        onClick={onClose}
        className="ml-4 text-current hover:opacity-75"
      >
        ×
      </button>
    </div>
  </div>
);
```

### 4. Formulários Acessíveis

```jsx
// Componente de input acessível
const AccessibleInput = ({ 
  id, 
  label, 
  error, 
  required = false, 
  description,
  ...props 
}) => {
  const errorId = error ? `${id}-error` : undefined;
  const descId = description ? `${id}-desc` : undefined;
  
  return (
    <div className="space-y-2">
      <label 
        htmlFor={id}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && <span aria-label="obrigatório" className="text-red-500 ml-1">*</span>}
      </label>
      
      {description && (
        <p id={descId} className="text-sm text-gray-600">
          {description}
        </p>
      )}
      
      <input
        id={id}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={[descId, errorId].filter(Boolean).join(' ') || undefined}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
        {...props}
      />
      
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};
```

### 5. Modais e Overlays Acessíveis

```jsx
// Hook para gerenciar foco em modais
const useFocusTrap = (isOpen) => {
  const containerRef = useRef(null);
  const previousFocusRef = useRef(null);
  
  useEffect(() => {
    if (!isOpen) return;
    
    // Salvar foco anterior
    previousFocusRef.current = document.activeElement;
    
    // Focar no modal
    const container = containerRef.current;
    if (container) {
      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }
    
    // Cleanup: restaurar foco
    return () => {
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen]);
  
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      // Fechar modal
    }
    
    if (e.key === 'Tab') {
      const container = containerRef.current;
      if (!container) return;
      
      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  }, []);
  
  return { containerRef, handleKeyDown };
};

// Modal acessível
const AccessibleModal = ({ isOpen, onClose, title, children }) => {
  const { containerRef, handleKeyDown } = useFocusTrap(isOpen);
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div
        ref={containerRef}
        onKeyDown={handleKeyDown}
        className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
      >
        <h2 id="modal-title" className="text-xl font-semibold mb-4">
          {title}
        </h2>
        
        {children}
        
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Fechar modal"
        >
          ×
        </button>
      </div>
    </div>
  );
};
```

## 📱 Diretrizes de Responsividade

### 1. Sistema de Breakpoints Consistente

```css
/* Breakpoints padrão do Tailwind */
/* sm: 640px */
/* md: 768px */
/* lg: 1024px */
/* xl: 1280px */
/* 2xl: 1536px */

/* Breakpoints customizados para TreinAI */
@media (max-width: 480px) { /* mobile-xs */ }
@media (min-width: 481px) and (max-width: 767px) { /* mobile */ }
@media (min-width: 768px) and (max-width: 1023px) { /* tablet */ }
@media (min-width: 1024px) { /* desktop */ }
```

### 2. Componentes Responsivos

```jsx
// Hook para detecção de dispositivo
const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);
  
  return matches;
};

// Componente de grid responsivo
const ResponsiveGrid = ({ children, className = "" }) => {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  
  const gridCols = isMobile ? 1 : isTablet ? 2 : 3;
  
  return (
    <div 
      className={`grid gap-4 ${className}`}
      style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
    >
      {children}
    </div>
  );
};

// Card responsivo
const ResponsiveCard = ({ title, content, actions }) => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden">
    {/* Header */}
    <div className="p-4 sm:p-6 border-b border-gray-200">
      <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
        {title}
      </h3>
    </div>
    
    {/* Content */}
    <div className="p-4 sm:p-6">
      <div className="text-sm sm:text-base text-gray-700">
        {content}
      </div>
    </div>
    
    {/* Actions */}
    {actions && (
      <div className="px-4 py-3 sm:px-6 sm:py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
          {actions}
        </div>
      </div>
    )}
  </div>
);
```

### 3. Navegação Mobile-First

```jsx
// Componente de navegação responsiva
const ResponsiveNavigation = ({ items, currentPath }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 767px)');
  
  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Logo className="h-8 w-auto" />
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-gray-50"
              aria-expanded={mobileMenuOpen}
              aria-label="Menu principal"
            >
              {mobileMenuOpen ? <XIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};
```

### 4. Tipografia Responsiva

```jsx
// Sistema de tipografia responsiva
const TypographyScale = {
  h1: "text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold",
  h2: "text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-semibold",
  h3: "text-lg sm:text-xl lg:text-2xl xl:text-3xl font-semibold",
  h4: "text-base sm:text-lg lg:text-xl xl:text-2xl font-medium",
  body: "text-sm sm:text-base lg:text-lg",
  caption: "text-xs sm:text-sm lg:text-base",
  small: "text-xs sm:text-sm"
};

// Componente de texto responsivo
const ResponsiveText = ({ variant = 'body', children, className = "" }) => (
  <div className={`${TypographyScale[variant]} ${className}`}>
    {children}
  </div>
);
```

### 5. Imagens e Mídia Responsivas

```jsx
// Componente de imagem responsiva
const ResponsiveImage = ({ 
  src, 
  alt, 
  aspectRatio = "16/9",
  sizes = "100vw",
  className = ""
}) => (
  <div 
    className={`relative overflow-hidden rounded-lg ${className}`}
    style={{ aspectRatio }}
  >
    <img
      src={src}
      alt={alt}
      sizes={sizes}
      className="absolute inset-0 w-full h-full object-cover"
      loading="lazy"
    />
  </div>
);

// Container de vídeo responsivo
const ResponsiveVideo = ({ src, poster, className = "" }) => (
  <div className={`relative aspect-video overflow-hidden rounded-lg ${className}`}>
    <video
      src={src}
      poster={poster}
      controls
      className="absolute inset-0 w-full h-full object-cover"
      preload="metadata"
    >
      Seu navegador não suporta vídeos HTML5.
    </video>
  </div>
);
```

## 🎨 Padrões de Design Acessível

### 1. Contraste de Cores (WCAG AA)

```jsx
// Paleta de cores acessível
const AccessibleColors = {
  // Contraste mínimo 4.5:1 para texto normal
  primary: {
    50: '#eff6ff',   // Backgrounds claros
    100: '#dbeafe',  // Hover states
    500: '#3b82f6',  // Primary actions
    600: '#2563eb',  // Primary hover
    700: '#1d4ed8',  // Primary active
    900: '#1e3a8a'   // High contrast text
  },
  
  // Estados de feedback
  success: {
    light: '#dcfce7', // bg-green-100
    DEFAULT: '#16a34a', // text-green-600
    dark: '#15803d'   // text-green-700
  },
  
  error: {
    light: '#fef2f2', // bg-red-50
    DEFAULT: '#dc2626', // text-red-600
    dark: '#b91c1c'   // text-red-700
  },
  
  warning: {
    light: '#fffbeb', // bg-amber-50
    DEFAULT: '#d97706', // text-amber-600
    dark: '#b45309'   // text-amber-700
  }
};

// Verificador de contraste
const checkContrast = (foreground, background) => {
  // Implementação simplificada
  // Em produção, usar biblioteca como 'color-contrast-checker'
  const ratio = calculateContrastRatio(foreground, background);
  return {
    aa: ratio >= 4.5,
    aaa: ratio >= 7,
    ratio
  };
};
```

### 2. Estados de Foco Visíveis

```css
/* Estados de foco consistentes */
.focus-ring {
  @apply focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2;
}

.focus-ring-inset {
  @apply focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset;
}

.focus-ring-dark {
  @apply focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-800;
}

/* Aplicar em todos os elementos interativos */
button, a, input, select, textarea, [tabindex] {
  @apply focus-ring;
}
```

### 3. Animações Respeitosas

```jsx
// Hook para preferências de movimento
const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  
  return prefersReducedMotion;
};

// Componente com animação condicional
const AnimatedCard = ({ children, className = "" }) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  
  return (
    <div 
      className={`
        ${className}
        ${prefersReducedMotion 
          ? 'transition-none' 
          : 'transition-all duration-300 hover:scale-105'
        }
      `}
    >
      {children}
    </div>
  );
};
```

## 🔧 Implementação Prática

### 1. Auditoria de Acessibilidade

```bash
# Instalar ferramentas de auditoria
npm install --save-dev @axe-core/react eslint-plugin-jsx-a11y

# Configurar ESLint para acessibilidade
# .eslintrc.js
{
  "extends": ["plugin:jsx-a11y/recommended"],
  "plugins": ["jsx-a11y"]
}
```

### 2. Testes de Acessibilidade

```jsx
// Teste com React Testing Library
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('Dashboard deve ser acessível', async () => {
  const { container } = render(<Dashboard />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});

test('Navegação por teclado deve funcionar', () => {
  render(<Navigation />);
  const firstLink = screen.getByRole('link', { name: /home/i });
  
  firstLink.focus();
  expect(firstLink).toHaveFocus();
  
  fireEvent.keyDown(firstLink, { key: 'Tab' });
  const secondLink = screen.getByRole('link', { name: /planos/i });
  expect(secondLink).toHaveFocus();
});
```

### 3. Checklist de Implementação

#### Acessibilidade
- [ ] Todos os elementos interativos são acessíveis por teclado
- [ ] Imagens possuem alt text descritivo
- [ ] Formulários têm labels associados
- [ ] Estados de foco são visíveis
- [ ] Contraste de cores atende WCAG AA
- [ ] Estrutura semântica com landmarks
- [ ] Screen readers são suportados
- [ ] Animações respeitam preferências do usuário

#### Responsividade
- [ ] Layout funciona em todos os breakpoints
- [ ] Texto é legível em dispositivos móveis
- [ ] Botões têm tamanho mínimo de 44px
- [ ] Navegação mobile é intuitiva
- [ ] Imagens são otimizadas para diferentes telas
- [ ] Performance é mantida em dispositivos móveis

## 📊 Métricas de Sucesso

### KPIs de Acessibilidade
- **Pontuação Lighthouse**: ≥ 95
- **Violações axe-core**: 0
- **Cobertura de testes a11y**: ≥ 80%
- **Tempo de navegação por teclado**: < 30s para tarefas principais

### KPIs de Responsividade
- **Core Web Vitals**: Todos verdes
- **Taxa de abandono mobile**: < 40%
- **Tempo de carregamento mobile**: < 3s
- **Usabilidade mobile**: Score ≥ 90

## 🚀 Roadmap de Implementação

### Fase 1 (Semana 1-2): Fundação
- Implementar sistema de cores acessível
- Adicionar estados de foco consistentes
- Configurar ferramentas de auditoria

### Fase 2 (Semana 3-4): Componentes Core
- Refatorar componentes de navegação
- Implementar formulários acessíveis
- Otimizar responsividade mobile

### Fase 3 (Semana 5-6): Funcionalidades Avançadas
- Adicionar navegação por teclado
- Implementar modais acessíveis
- Otimizar performance mobile

### Fase 4 (Semana 7-8): Testes e Refinamento
- Testes com usuários reais
- Auditoria completa de acessibilidade
- Otimizações finais

---

*Este documento serve como guia abrangente para implementar acessibilidade e responsividade de classe mundial no TreinAI, garantindo uma experiência inclusiva e otimizada para todos os usuários.*