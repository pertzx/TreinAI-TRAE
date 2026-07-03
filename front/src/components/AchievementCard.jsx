import React, { useEffect, useRef, useState } from 'react';

/**
 * Card de conquista compartilhável, renderizado em <canvas> com a marca TreinAI.
 * Permite Compartilhar (Web Share API com o PNG) e Baixar. Sem storage no servidor.
 *
 * Props:
 *  - milestone: { title, message, emoji }
 *  - userName: string (nome do usuário)
 *  - onClose: () => void
 */
export default function AchievementCard({ milestone, userName = '', onClose }) {
  const canvasRef = useRef(null);
  const [imgUrl, setImgUrl] = useState(null);

  useEffect(() => {
    if (!milestone) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = 1080, H = 1080;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Fundo gradiente
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.55, '#1e3a8a');
    grad.addColorStop(1, '#6d28d9');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Moldura sutil
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 6;
    ctx.strokeRect(48, 48, W - 96, H - 96);

    ctx.textAlign = 'center';

    // Marca
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '600 44px system-ui, sans-serif';
    ctx.fillText('TreinAI', W / 2, 150);

    // Emoji grande
    ctx.font = '220px system-ui, sans-serif';
    ctx.fillText(milestone.emoji || '🏆', W / 2, 470);

    // Título (quebra em até 2 linhas)
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 76px system-ui, sans-serif';
    wrapText(ctx, milestone.title || 'Conquista desbloqueada!', W / 2, 620, W - 200, 88, 2);

    // Mensagem
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '400 44px system-ui, sans-serif';
    wrapText(ctx, milestone.message || '', W / 2, 800, W - 240, 58, 3);

    // Nome do usuário
    if (userName) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '600 40px system-ui, sans-serif';
      ctx.fillText(`— ${userName}`, W / 2, 980);
    }

    try { setImgUrl(canvas.toDataURL('image/png')); } catch { /* noop */ }
  }, [milestone, userName]);

  const dataURLtoBlob = (dataUrl) => {
    const [head, body] = dataUrl.split(',');
    const mime = head.match(/:(.*?);/)[1];
    const bin = atob(body);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  };

  const handleShare = async () => {
    if (!imgUrl) return;
    try {
      const blob = dataURLtoBlob(imgUrl);
      const file = new File([blob], 'treinai-conquista.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: milestone.title,
          text: `${milestone.title} — TreinAI`,
        });
        return;
      }
    } catch { /* cai para download */ }
    handleDownload();
  };

  const handleDownload = () => {
    if (!imgUrl) return;
    const a = document.createElement('a');
    a.href = imgUrl;
    a.download = 'treinai-conquista.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (!milestone) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-gray-700" onClick={e => e.stopPropagation()}>
        <div className="rounded-2xl overflow-hidden mb-4 border border-white/10">
          <canvas ref={canvasRef} className="w-full h-auto block" />
        </div>
        <div className="flex gap-3">
          <button onClick={handleShare}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white font-semibold">
            Compartilhar
          </button>
          <button onClick={handleDownload}
            className="px-4 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-semibold">
            Baixar
          </button>
          <button onClick={onClose}
            className="px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// Quebra texto centralizado em até maxLines linhas.
function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines - 1) break;
    } else {
      line = test;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  lines.forEach((ln, i) => ctx.fillText(ln, x, y + i * lineHeight));
}
