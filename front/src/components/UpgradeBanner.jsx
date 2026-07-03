import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FaExclamationTriangle } from 'react-icons/fa';
import api from '../Api.js';

/**
 * Banner de upsell contextual: aparece só quando o uso de IA está alto
 * (status warning/critical/exhausted vindo de /tokens/token-stats). Mostra %
 * (nunca R$) e CTA para /planos.
 */
export default function UpgradeBanner({ className = '' }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.post('/tokens/token-stats', {});
        if (!cancelled) setStats(res?.data?.stats || null);
      } catch (e) { /* silencioso */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const status = stats?.status;
  if (!status || status === 'ok') return null;

  const exhausted = status === 'exhausted';
  const isFree = stats?.isFree;
  const percent = Math.round(Number(stats?.percentUsed || 0));

  return (
    <div className={`rounded-2xl p-4 flex items-center gap-3 border ${exhausted
      ? 'bg-red-500/10 border-red-500/30 text-red-500'
      : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400'} ${className}`}>
      <FaExclamationTriangle className="shrink-0" />
      <div className="text-sm flex-1">
        {exhausted
          ? (isFree ? 'Sua cortesia de IA acabou.' : 'Você atingiu o limite de IA do seu plano neste período.')
          : `Seu uso de IA já está em ${percent}% do plano.`}
      </div>
      <NavLink to="/planos"
        className="shrink-0 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white text-sm font-semibold">
        {isFree ? 'Assinar' : 'Fazer upgrade'}
      </NavLink>
    </div>
  );
}
