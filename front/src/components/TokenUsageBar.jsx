import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FaCoins, FaCrown, FaExclamationTriangle } from 'react-icons/fa';
import api from '../Api.js';

const brl = (v) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;

/**
 * Barra de uso de IA por CUSTO (R$).
 * Busca o orçamento/gasto reais em /tokens/token-stats (reflete margem e configs
 * do servidor). Mantém os estados visuais (ok / atenção / esgotado).
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
    const orcamento = Number(stats?.orcamentoBRL || 0);
    const gasto = Number(stats?.gastoBRL || 0);
    const isFree = stats?.isFree ?? (user?.planInfos?.planType || 'free') === 'free';
    const percentage = orcamento > 0 ? Math.min(100, Math.max(0, (gasto / orcamento) * 100)) : (gasto > 0 ? 100 : 0);
    const isExhausted = orcamento > 0 ? gasto >= orcamento : false;
    return { orcamento, gasto, isFree, percentage, isExhausted };
  }, [stats, user]);

  const { orcamento, gasto, isFree, percentage, isExhausted } = data;

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
          {brl(gasto)} / {brl(orcamento)}
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

      {!isExhausted && percentage >= 80 && (
        <div className="mt-2 text-[10px] text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
          <FaExclamationTriangle />
          <span>
            Uso de IA quase no limite! {isFree
              ? <button className="underline font-semibold hover:text-yellow-700">Faça upgrade</button>
              : 'Aguarde a renovação ou faça upgrade.'}
          </span>
        </div>
      )}

      {isExhausted && (
        <div className="mt-2 text-[10px] text-red-600 dark:text-red-400 flex items-center gap-1">
          <FaExclamationTriangle />
          <span>
            {isFree
              ? <>Cortesia esgotada! <button className="underline font-semibold hover:text-red-700">Assine um plano</button></>
              : 'Limite de IA atingido neste período. Aguarde a renovação ou faça upgrade.'}
          </span>
        </div>
      )}
    </div>
  );
};

export default TokenUsageBar;
