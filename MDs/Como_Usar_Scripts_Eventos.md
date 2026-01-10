# Guia de Uso: Scripts e Eventos Globais (Admin)

Este documento explica como utilizar a nova funcionalidade de **Eventos Globais** na Dashboard Administrativa do TreinAI.

## 1. O que é essa funcionalidade?
A ferramenta de Eventos Globais permite que administradores injetem códigos **HTML, CSS e JavaScript** diretamente na Dashboard de todos os usuários (ou segmentados por data). 

**Casos de uso comuns:**
- 🚨 **Banners de Aviso:** Manutenções, promoções relâmpago, avisos de feriado.
- 💬 **Widgets Temporários:** Chats de suporte específicos, pesquisas de satisfação.
- 🎉 **Efeitos Visuais:** Confete, neve, temas comemorativos.
- 📊 **Scripts de Análise:** Tracking temporário de eventos.

## 2. Como criar um evento
1. Acesse o painel **Admin** > aba **Eventos Globais**.
2. Clique no botão **"+ Novo Evento"**.
3. Preencha os campos:
    - **Título**: Nome interno para identificar o evento (ex: "Promoção Natal 2024").
    - **Ativo**: Se marcado, o script será enviado para os usuários imediatamente (respeitando as datas).
    - **Datas (Opcional)**:
        - *Início*: O evento só aparece após essa data.
        - *Fim*: O evento some automaticamente após essa data.
    - **Código**: A área onde você digita o HTML/JS.

## 3. O Editor de Código (Monaco)
Utilizamos o **Monaco Editor** (o mesmo motor do VS Code) para oferecer uma experiência profissional:
- **Syntax Highlighting**: Cores diferentes para tags, atributos e JS.
- **Autocompletar**: Sugestões inteligentes enquanto digita.
- **Auto-fechamento**: Tags e parênteses fecham sozinhos.
- **Tema**: Ajusta-se automaticamente ao tema Claro/Escuro da sua Dashboard.

## 4. Como Testar (Preview e Execução)
Antes de ativar um evento para todos os usuários, é crucial testá-lo.

1. Escreva seu código.
2. Clique em **Ver Preview**. Uma área aparecerá abaixo do editor.
3. O HTML estático (divs, textos, imagens) aparecerá imediatamente.
4. **Para rodar Scripts (JS):**
    - Clique no botão verde **"Atualizar/Rodar"** (ícone Play).
    - Isso executará os scripts (`alert`, `console.log`, animações) dentro da área de preview.
    - *Nota:* Scripts são executados manualmente para evitar travamentos durante a digitação.

## 5. Exemplos de Código Prontos

### Exemplo 1: Banner Fixo no Topo
Cria uma barra vermelha no topo da tela avisando sobre manutenção.

```html
<div style="
  position: fixed; 
  top: 0; 
  left: 0; 
  width: 100%; 
  background-color: #ef4444; 
  color: white; 
  z-index: 9999; 
  text-align: center; 
  padding: 8px; 
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
">
  ⚠️ Atenção: Manutenção programada para hoje às 22:00h!
</div>
```

### Exemplo 2: Script de Boas-Vindas (Console)
Envia uma mensagem para o console do navegador do usuário (útil para debug ou easter eggs).

```html
<script>
  console.log("%c TreinAI ", "background: #22c55e; color: #fff; border-radius: 4px; padding: 4px;", "Bem-vindo à melhor plataforma fitness!");
</script>
```

### Exemplo 3: Modal Simples (HTML + CSS)
```html
<div style="position: fixed; bottom: 20px; right: 20px; background: white; padding: 20px; border-radius: 10px; shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 50; border: 1px solid #ddd;">
  <h3 style="margin: 0 0 10px 0; color: #333;">Precisa de ajuda?</h3>
  <a href="/dashboard/ajuda" style="background: #2563eb; color: white; padding: 8px 16px; text-decoration: none; border-radius: 5px; display: inline-block;">Falar com Suporte</a>
</div>
```

### Exemplo 4: Feliz 2026 com Fogos de Artifício 🎉
Este script cria uma animação de fogos de artifício em tela cheia com uma mensagem de celebração. Inclui um botão para o usuário fechar a animação.

```html
<div id="fireworks-container" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 9999; pointer-events: none; overflow: hidden;">
  <!-- Mensagem Central -->
  <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; pointer-events: auto; z-index: 10;">
    <h1 style="font-size: 4rem; color: #fff; text-shadow: 0 0 20px #d946ef, 0 0 40px #8b5cf6; font-family: sans-serif; margin-bottom: 1rem; animation: pulse 2s infinite;">✨ Feliz 2026! ✨</h1>
    <p style="color: #fff; font-size: 1.5rem; text-shadow: 0 2px 4px rgba(0,0,0,0.8); margin-bottom: 2rem;">
      O TreinAI deseja a você um ano de muitas conquistas, saúde e treinos pesados!
    </p>
    <button onclick="document.getElementById('fireworks-container').remove()" style="padding: 12px 24px; border: none; background: white; color: #333; font-weight: bold; border-radius: 50px; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.3); transition: transform 0.2s;">
      Fechar Celebração
    </button>
  </div>
  
  <!-- Canvas para os fogos -->
  <canvas id="fireworks-canvas" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></canvas>
</div>

<style>
@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.9; }
  100% { transform: scale(1); opacity: 1; }
}
</style>

<script>
(function() {
  // Configuração dos Fogos
  const canvas = document.getElementById('fireworks-canvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  let width = window.innerWidth;
  let height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;

  const particles = [];
  
  // Atualiza tamanho da tela
  window.addEventListener('resize', () => {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
  });

  class Particle {
    constructor(x, y, color) {
      this.x = x;
      this.y = y;
      this.color = color;
      this.velocity = {
        x: (Math.random() - 0.5) * 8,
        y: (Math.random() - 0.5) * 8
      };
      this.alpha = 1;
      this.friction = 0.96;
      this.gravity = 0.04;
    }

    draw() {
      ctx.globalAlpha = this.alpha;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
    }

    update() {
      this.velocity.x *= this.friction;
      this.velocity.y *= this.friction;
      this.x += this.velocity.x;
      this.y += this.velocity.y + this.gravity;
      this.alpha -= 0.01;
    }
  }

  function createFirework(x, y) {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    for (let i = 0; i < 40; i++) {
      particles.push(new Particle(x, y, color));
    }
  }

  function loop() {
    if (!document.getElementById('fireworks-canvas')) return; // Para se o elemento for removido
    
    requestAnimationFrame(loop);
    
    // Rastro dos fogos
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';

    particles.forEach((p, index) => {
      p.update();
      p.draw();
      if (p.alpha <= 0) particles.splice(index, 1);
    });

    // Cria novos fogos aleatoriamente
    if (Math.random() < 0.05) {
      createFirework(Math.random() * width, Math.random() * height * 0.6);
    }
  }

  loop();
})();
</script>
```

## 6. ⚠️ Segurança e Cuidados (Importante)

1.  **Poder Total**: O código injetado roda no navegador do usuário com as credenciais dele. **NUNCA** cole scripts que você não entende ou de fontes não confiáveis.
2.  **XSS (Cross-Site Scripting)**: Um script malicioso pode roubar cookies ou tokens. A responsabilidade é do Admin.
3.  **Quebra de Layout**:
    - Evite estilos globais como `* { display: none; }` (isso sumiria com o site todo).
    - Use classes específicas ou estilos inline.
    - Cuidado com `z-index` muito alto cobrindo menus.
4.  **Loops Infinitos**: Evite códigos como `while(true)` ou `setInterval` sem limpeza, pois podem travar o navegador do usuário (e o seu no preview).

---
*Gerado automaticamente pelo Assistente TreinAI.*
