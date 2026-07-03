import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { FaCoins, FaCrown, FaExclamationTriangle } from 'react-icons/fa';
import api from '../Api.js';

/**
 * Barra de uso de IA em PERCENTUAL (nunca em R$).
 * Busca o uso em /tokens/token-stats (percentUsed/status). O cliente vê só %,
 * para não ter a sensação de "gasto em dinheiro".
 */
const TokenUsageBar = ({ user, className = '' }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.post('/tokens/token-stats', {});
        if (!cancelled) setStats(res?.data?.stats || null);
      } catch (e) {
        if (!cancelled) setStats(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.email, user?.planInfos?.periodStart]);

  const data = useMemo(() => {
    const percentage = Math.min(100, Math.max(0, Number(stats?.percentUsed || 0)));
    const isFree = stats?.isFree ?? (user?.planInfos?.planType || 'free') === 'free';
    const isExhausted = stats?.status === 'exhausted' || percentage >= 100;
    return { isFree, percentage, isExhausted };
  }, [stats, user]);

  const { isFree, percentage, isExhausted } = data;

  const getBarColor = () => {
    if (isExhausted) return 'bg-gray-500';
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getLabelText = () => {
    if (isFree) return isExhausted ? 'Cortesia esgotada' : 'Cortesia de IA';
    return 'Uso de IA do plano';
  };

  if (loading) {
    return (
      <div className={`w-full max-w-md mx-auto ${className}`}>
        <div className="h-2.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
      </div>
    );
  }

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <div className="flex items-center justify-between mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          {isFree ? <FaCoins className="text-yellow-500" /> : <FaCrown className="text-purple-500" />}
          <span className={isExhausted ? 'text-red-500 font-semibold' : ''}>{getLabelText()}</span>
          {isFree && !isExhausted && (
            <span className="text-[10px] text-yellow-600 dark:text-yellow-400 ml-1">(cortesia única)</span>
          )}
        </div>
        <span className={isExhausted ? 'text-red-500 font-semibold' : ''}>
          {Math.round(percentage)}%
        </span>
      </div>

      <div className="relative h-2.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: isExhausted ? '100%' : `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full rounded-full ${getBarColor()}`}
        />
        {isExhausted && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[8px] text-white font-bold uppercase tracking-wider">Esgotado</span>
          </div>
        )}
      </div>

      {!isExhausted && percentage >= 85 && (
        <div className="mt-2 text-[10px] text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
          <FaExclamationTriangle />
          <span>
            Uso de IA quase no limite! {isFree
              ? <NavLink to="/planos" className="underline font-semibold hover:text-yellow-700">Faça upgrade</NavLink>
              : <>Aguarde a renovação ou <NavLink to="/planos" className="underline font-semibold hover:text-yellow-700">faça upgrade</NavLink>.</>}
          </span>
        </div>
      )}

      {isExhausted && (
        <div className="mt-2 text-[10px] text-red-600 dark:text-red-400 flex items-center gap-1">
          <FaExclamationTriangle />
          <span>
            {isFree
              ? <>Cortesia esgotada! <NavLink to="/planos" className="underline font-semibold hover:text-red-700">Assine um plano</NavLink></>
              : <>Limite de IA atingido neste período. Aguarde a renovação ou <NavLink to="/planos" className="underline font-semibold hover:text-red-700">faça upgrade</NavLink>.</>}
          </span>
        </div>
      )}
    </div>
  );
};

export default TokenUsageBar;
