// Utilitário de sanitização para prevenir XSS
// Implementação básica sem DOMPurify como fallback

/**
 * Sanitiza HTML removendo scripts e elementos perigosos
 * @param {string} html - HTML a ser sanitizado
 * @returns {string} HTML sanitizado
 */
export const sanitizeHTML = (html) => {
  if (!html || typeof html !== 'string') return '';
  
  // Remove scripts, iframes e outros elementos perigosos
  const dangerousElements = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    /<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi,
    /<input\b[^>]*>/gi,
    /<textarea\b[^<]*(?:(?!<\/textarea>)<[^<]*)*<\/textarea>/gi,
    /<select\b[^<]*(?:(?!<\/select>)<[^<]*)*<\/select>/gi
  ];
  
  let sanitized = html;
  dangerousElements.forEach(regex => {
    sanitized = sanitized.replace(regex, '');
  });
  
  // Remove atributos perigosos
  const dangerousAttributes = [
    /\son\w+\s*=\s*["'][^"']*["']/gi, // onclick, onload, etc.
    /\sjavascript\s*:/gi,
    /\svbscript\s*:/gi,
    /\sdata\s*:/gi
  ];
  
  dangerousAttributes.forEach(regex => {
    sanitized = sanitized.replace(regex, '');
  });
  
  return sanitized;
};

/**
 * Cria uma nova janela com conteúdo sanitizado para impressão
 * @param {string} content - Conteúdo HTML a ser impresso
 * @param {string} title - Título da janela
 */
export const safePrintWindow = (content, title = 'Impressão') => {
  const sanitizedContent = sanitizeHTML(content);
  
  // Cria nova janela
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  
  if (!printWindow) {
    alert('Bloqueador de pop-up detectado. Permita pop-ups para imprimir.');
    return;
  }
  
  // Escreve conteúdo sanitizado usando innerHTML em vez de document.write
  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body></body>
    </html>
  `);
  printWindow.document.close();
  
  // Adiciona conteúdo sanitizado ao body
  printWindow.document.body.innerHTML = sanitizedContent;
  
  // Aguarda carregamento e imprime
  printWindow.onload = () => {
    printWindow.print();
  };
  
  return printWindow;
};

/**
 * Escapa caracteres HTML para prevenir XSS
 * @param {string} text - Texto a ser escapado
 * @returns {string} Texto escapado
 */
export const escapeHTML = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * Remove tags HTML mantendo apenas o texto
 * @param {string} html - HTML a ser limpo
 * @returns {string} Apenas texto
 */
export const stripHTML = (html) => {
  if (!html || typeof html !== 'string') return '';
  
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};