import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../Api';
import { getBrazilDate } from '../../../../helpers/getBrazilDate.js';
import TokensChart from '../Components/TokensChart.jsx';
import { useToast } from '../../../components/Toast.jsx';
import TokenUsageBar from '../../../components/TokenUsageBar.jsx';
import { hasAccess } from '../../../utils/planAccess.js';

/**
 * Configuracoes - usa `tema` com valores 'dark' | 'light'
 * Props:
 *  - setTema(tema)  // função para atualizar tema no nível superior
 *  - tema           // 'dark' ou 'light'
 *  - user           // user object do backend
 */

const Switch = ({ checked, onChange, label, tema }) => (
  <button
    role="switch"
    aria-checked={checked}
    onClick={onChange}
    className={`relative inline-flex items-center h-10 w-20 rounded-full p-1 transition-all focus:outline-none ${checked ? (tema === 'dark' ? 'bg-blue-600' : 'bg-blue-600') : (tema === 'dark' ? 'bg-gray-600' : 'bg-gray-200')
      }`}
  >
    <span
      className={`inline-block w-8 h-8 rounded-full bg-white transform transition-transform ${checked ? 'translate-x-10' : 'translate-x-0'
        }`}
    />
    <span className="sr-only">{label}</span>
  </button>
);

const Configuracoes = ({ setTema, tema, user, setUser }) => {
  const navigate = useNavigate();
  const [loginSeguro, setLoginSeguro] = useState(user?.stats?.loginSeguro || false);
  const [hideAds, setHideAds] = useState(user?.preferences?.hideAds === true);
  const canHideAds = hasAccess(user, 'semAnuncios');

  const [saving, setSaving] = useState({ theme: false, loginSeguro: false, hideAds: false });
  const [planLoading, setPlanLoading] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);

  const [currentPlan, setCurrentPlan] = useState(user?.planInfos?.planType || 'free');
  const [planInfos, setPlanInfos] = useState(user?.planInfos || {});
  const [plans, setPlans] = useState([]); // planos ativos vindos da API
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPlan, setPendingPlan] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [changeError, setChangeError] = useState(null); // mensagem de erro ao tentar trocar para mesmo valor/tipo

  // Estados para tokens
  const [tokensTotal, setTokensTotal] = useState(0);
  const [tokensToday, setTokensToday] = useState(0);

  // Estado para controlar exibição de dispositivos
  const [showAllDevices, setShowAllDevices] = useState(false);
  const INITIAL_DEVICES_SHOWN = 1;

  // Toast
  const { showError, showSuccess } = useToast();

  // Função de logout
  const handleLogout = async () => {
    try {
      // Fazer requisição de logout para o backend
      await api.post('/logout');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      // Limpar todos os dados locais independentemente do resultado da requisição
      localStorage.clear();
      sessionStorage.clear();

      // Limpar cookies (se houver)
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      });

      // Redirecionar para login
      navigate('/login');
    }
  };

  // Buscar planos ativos da API (fonte da visualização/venda em Configurações).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/plans');
        if (!cancelled) setPlans(Array.isArray(res?.data?.plans) ? res.data.plans : []);
      } catch (e) { if (!cancelled) setPlans([]); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Mapa de exibição derivado dos planos (compat com askChangePlan/modal).
  const priceMapForDisplay = React.useMemo(() => {
    const map = {};
    for (const p of plans) {
      map[p.key] = { label: p.name || p.key, price: p.precoText || (p.priceBRL ? String(p.priceBRL) : (p.tipo === 'cortesia' ? 0 : '')), plan: p };
    }
    if (!map[currentPlan]) map[currentPlan] = { label: currentPlan, price: '' };
    return map;
  }, [plans, currentPlan]);

  const ACCESS_LABELS = { nutriAI: 'NutriAI', coachPanel: 'Painel Coach', semAnuncios: 'Sem anúncios', editarTreinos: 'Editar treinos' };

  // Função para formatar números
  const fmt = (n) => (typeof n === 'number' ? Math.round(n).toLocaleString('pt-BR') : '0');

  useEffect(() => {
    if (user?.stats?.loginSeguro === true) {
      setLoginSeguro(true);
    } else {
      setLoginSeguro(false);
    }

    setHideAds(user?.preferences?.hideAds === true);

    // Sincroniza tema -> se user tiver preferência usa ela
    if (user?.preferences?.theme === 'dark' || user?.preferences?.theme === 'light') {
      setTema(user.preferences.theme);
    } else {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark' || savedTheme === 'light') setTema(savedTheme);
    }

    if (user?.planInfos) {
      setCurrentPlan(user.planInfos.planType);
      setPlanInfos(user.planInfos);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Uso de IA em PERCENTUAL (nunca em R$) — vem de /tokens/token-stats.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.post('/tokens/token-stats', {});
        const stats = res?.data?.stats || {};
        if (cancelled) return;
        setTokensTotal(Number(stats.percentUsed || 0)); // % do plano usado no período

        const brazilDayKey = (d) => {
          try { return new Date(d).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); }
          catch { return new Date(d).toISOString().slice(0, 10); }
        };
        const todayKey = brazilDayKey(new Date());
        const dp = Array.isArray(stats.dailyPercent) ? stats.dailyPercent : [];
        const today = dp.find(e => e.date === todayKey);
        setTokensToday(Number(today?.percent || 0));
      } catch (e) {
        if (!cancelled) { setTokensTotal(0); setTokensToday(0); }
      }
    })();
    return () => { cancelled = true; };
  }, [user?.email, user?.planInfos?.periodStart]);

  const formatDate = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const applyPlanResponse = (resData, novoPlano) => {
    if (!resData) return;
    if (resData.subscription || resData.planInfos) {
      const subs = resData.subscription || resData.planInfos;
      const nextPaymentValue = subs?.nextPaymentValue ?? (priceMapForDisplay[novoPlano]?.price ?? null);
      const nextPaymentDate = subs?.nextPaymentDate ?? subs?.expirationDate ?? null;
      const subscriptionId = subs?.id ?? subs?.subscriptionId ?? null;
      const status = subs?.status ?? (novoPlano === 'free' ? 'inativo' : 'ativo');

      setPlanInfos((prev) => ({
        ...prev,
        planType: novoPlano,
        status,
        subscriptionId,
        nextPaymentValue,
        nextPaymentDate,
      }));
      setCurrentPlan(novoPlano);
      return;
    }

    setPlanInfos((prev) => ({
      ...prev,
      planType: novoPlano,
      status: novoPlano === 'free' ? 'inativo' : 'ativo',
      subscriptionId: prev.subscriptionId || null,
      nextPaymentValue: priceMapForDisplay[novoPlano].price,
      nextPaymentDate: novoPlano === 'free' ? null : new Date(getBrazilDate() + 30 * 24 * 3600 * 1000).toISOString(),
    }));
    setCurrentPlan(novoPlano);
  };

  // ======== REQUISIÇÕES REAIS ========
  const toggleTema = async () => {
    const novoTema = tema === 'dark' ? 'light' : 'dark';
    setTema(novoTema);
    localStorage.setItem('theme', novoTema);

    setSaving((prev) => ({ ...prev, theme: true }));
    setGlobalLoading(true);
    try {
      await api.post('/change-theme', { email: user.email, novoTema });
    } catch (err) {
      console.error('Erro ao salvar tema no servidor:', err);
    } finally {
      setSaving((prev) => ({ ...prev, theme: false }));
      setGlobalLoading(false);
    }
  };

  const toggleLoginSeguro = async () => {
    const novoLoginSeguro = !loginSeguro;

    // Atualiza o estado local imediatamente para feedback visual
    setLoginSeguro(novoLoginSeguro);

    setSaving((prev) => ({ ...prev, loginSeguro: true }));
    setGlobalLoading(true);

    try {
      const res = await api.post('/change-loginSeguro', {
        email: user.email,
        novoLoginSeguro
      });

      // Verifica se a resposta foi bem-sucedida
      if (res.data && res.data.success) {
        console.log('Login seguro alterado com sucesso:', res.data.loginSeguro);
        // O estado já foi atualizado acima, então não precisa fazer nada mais
      } else {
        // Se houve erro, reverte o estado
        setLoginSeguro(!novoLoginSeguro);
        console.error('Erro na resposta do servidor:', res.data?.msg || 'Erro desconhecido');

        // Aqui você pode adicionar um toast ou notificação de erro
        // toast.error(res.data?.msg || 'Erro ao alterar configuração de login seguro');
      }
    } catch (err) {
      // Em caso de erro, reverte o estado
      setLoginSeguro(!novoLoginSeguro);
      console.error('Erro ao salvar login seguro no servidor:', err);

      // Tratamento de diferentes tipos de erro
      if (err.response?.status === 400) {
        console.error('Dados inválidos:', err.response.data?.msg);
      } else if (err.response?.status === 404) {
        console.error('Usuário não encontrado:', err.response.data?.msg);
      } else if (err.response?.status === 500) {
        console.error('Erro interno do servidor:', err.response.data?.msg);
      } else {
        console.error('Erro de conexão ou desconhecido');
      }

      // Aqui você pode adicionar um toast ou notificação de erro
      // toast.error('Erro ao alterar configuração de login seguro. Tente novamente.');
    } finally {
      setSaving((prev) => ({ ...prev, loginSeguro: false }));
      setGlobalLoading(false);
    }
  };

  const toggleHideAds = async () => {
    if (!canHideAds) {
      showError('Desativar anúncios está disponível apenas em planos com o recurso "Sem anúncios".');
      return;
    }

    const novoHideAds = !hideAds;
    setHideAds(novoHideAds); // feedback visual imediato
    setSaving((prev) => ({ ...prev, hideAds: true }));

    try {
      const res = await api.post('/change-hideAds', { novoHideAds });

      if (res.data?.success) {
        // Propaga para o estado do Dashboard: Header/AdBanner reagem na hora.
        setUser?.((prev) => ({
          ...prev,
          preferences: { ...(prev?.preferences || {}), hideAds: novoHideAds }
        }));
        showSuccess(res.data.msg || (novoHideAds ? 'Anúncios desativados.' : 'Anúncios reativados.'));
      } else {
        setHideAds(!novoHideAds);
        showError(res.data?.msg || 'Erro ao alterar preferência de anúncios.');
      }
    } catch (err) {
      setHideAds(!novoHideAds);
      showError(err.response?.data?.msg || 'Erro ao alterar preferência de anúncios. Tente novamente.');
    } finally {
      setSaving((prev) => ({ ...prev, hideAds: false }));
    }
  };

  // NOVA LÓGICA: bloquear solicitações para mesmo tipo OU mesmo valor
  const askChangePlan = (novoPlano) => {
    const novoPreco = priceMapForDisplay[novoPlano]?.price ?? null;
    const precoAtual = priceMapForDisplay[currentPlan]?.price ?? null;

    if (novoPlano === currentPlan) {
      setChangeError('Você já está neste plano. Escolha outro plano diferente.');
      clearErrorAfter();
      return;
    }

    // bloqueia quando o preço é igual (mesmo valor)
    if (novoPreco !== null && precoAtual !== null && novoPreco === precoAtual) {
      setChangeError('O plano selecionado tem o mesmo valor do seu plano atual — alteração não permitida.');
      clearErrorAfter();
      return;
    }

    // tudo ok — abre modal de confirmação
    setPendingPlan(novoPlano);
    setConfirmText('');
    // setPassword('');
    setConfirmOpen(true);
  };

  const clearErrorAfter = (ms = 4000) => {
    setTimeout(() => setChangeError(null), ms);
  };

  const confirmChangePlan = async () => {
    if (!pendingPlan) return;
    if (confirmText.trim().toLowerCase() !== pendingPlan.toLowerCase()) {
      return;
    }

    if (!password) {
      return;
    }

    setPlanLoading(true);
    setGlobalLoading(true);

    try {
      const payload = { userId: user?._id, plan: pendingPlan, password, email: user?.email };
      const res = await api.post('/atualizar-plano', payload);

      // aplicar resposta no frontend
      applyPlanResponse(res?.data, pendingPlan);

      if (res?.data?.url) window.location.href = res?.data?.url;
      if (res?.data?.msg) console.log('Resposta do backend:', res.data.msg);
    } catch (err) {
      showError(err?.response?.data?.msg || 'Erro ao tentar alterar plano. Tente novamente.');
      console.error('Erro ao tentar alterar plano:', err);
    } finally {
      setPlanLoading(false);
      setGlobalLoading(false);
      setConfirmOpen(false);
      setPendingPlan(null);
      setConfirmText('');
      setPassword('');
      // opcional: recarregar para garantir dados sincronizados com webhook
      // window.location.reload();
    }
  };

  const closeModal = () => {
    if (planLoading) return;
    setConfirmOpen(false);
    setPendingPlan(null);
    setConfirmText('');
    setPassword('');
  };

  const trocaExplicacao = (novoPlano) => {
    if (novoPlano === 'free') {
      return (
        <div>
          <p>Ao escolher <strong>Free</strong>, sua assinatura será cancelada (se houver).</p>
          <p>O acesso pago será removido e seu plano ficará como <strong>FREE</strong>.</p>
          <p>O timing final depende do fluxo Stripe/backend.</p>
        </div>
      );
    }

    return (
      <div>
        <p>Ao trocar para <strong>{novoPlano}</strong> vamos solicitar ao backend a mudança da assinatura no Stripe. Nessa operação:</p>

        <ul>
          <li>
            O Stripe pode aplicar ajuste proporcional (proration):<br />
            <code>(Preço do novo plano – Saldo do plano atual) + Preço do novo plano</code><br />
            Esse valor aparece na próxima fatura e pode fazer o valor parecer maior temporariamente.
          </li>
          <li>
            <strong>Por que isso acontece:</strong> o Stripe precisa ajustar o que você já pagou do plano antigo e o que vai usar do novo plano.
            O crédito do plano antigo (não usado) é subtraído, e o débito do novo plano (parte do mês que você vai usar) é somado.<br />
            Por isso, no mês da troca, o valor pode ser maior, mas <strong>nos meses seguintes você paga apenas o preço normal do novo plano</strong>.
          </li>
          <li>A alteração pode ser aplicada imediatamente ou ao fim do ciclo, dependendo da configuração do Stripe.</li>
          <li>Seu perfil será atualizado com os novos valores assim que a mudança for confirmada.</li>
        </ul>
      </div>
    );
  };



  // Estilos condicionais baseados em tema ('dark' | 'light')
  const containerClass = tema === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-black';
  const cardClass = tema === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const subtleBg = tema === 'dark' ? 'bg-gray-700' : 'bg-gray-50';

  return (
    <div className={`flex w-full items-center mt-5 gap-4 flex-col p-4 ${containerClass}`}>
      {globalLoading && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
          <div className="bg-white/95 dark:bg-gray-900 p-6 rounded-2xl flex items-center gap-3">
            <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin border-blue-600" />
            <div>Carregando...</div>
          </div>
        </div>
      )}

      {/* Banner de erro temporário ao tentar trocar para mesmo plano/valor */}
      {changeError && (
        <div className="w-full max-w-2xl p-3 rounded-lg border border-red-400 bg-red-50 text-red-700">
          {changeError}
        </div>
      )}

      {/* Tema */}
      <div className={`flex items-center justify-between w-full max-w-2xl p-4 rounded-2xl border ${cardClass}`}>
        <div>
          <div className="text-sm font-medium">Tema</div>
          <div className="text-xs ">Altera entre tema claro e escuro</div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs">{tema === 'dark' ? 'Dark' : 'Light'}</span>
          <Switch checked={tema === 'dark'} onChange={toggleTema} label="Alternar tema" tema={tema} />
        </div>
      </div>

      {/* Anúncios */}
      <div className={`flex items-center justify-between w-full max-w-2xl p-4 rounded-2xl border ${cardClass}`}>
        <div>
          <div className="text-sm font-medium">Anúncios</div>
          <div className="text-xs ">
            {canHideAds
              ? 'Seu plano permite desativar a exibição de anúncios na plataforma.'
              : 'Anúncios ajudam a manter o TreinAI. Planos com o recurso "Sem anúncios" permitem desativá-los aqui.'}
          </div>
        </div>
        <div className={`flex items-center gap-3 ${canHideAds ? '' : 'opacity-50'}`}>
          <span className="text-xs">{hideAds ? 'Desativados' : 'Ativados'}</span>
          <Switch checked={!hideAds} onChange={toggleHideAds} label="Alternar exibição de anúncios" tema={tema} />
        </div>
      </div>

      {/* User ID */}
      <div className={`flex items-center justify-between w-full max-w-2xl p-4 rounded-2xl border ${cardClass}`}>
        <div>
          <div className="text-sm font-medium">ID do Usuário</div>
          <div className="text-xs ">Seu identificador único no sistema</div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <code className={`px-3 py-1 rounded-lg text-xs font-mono ${tema === 'dark'
            ? 'bg-gray-700 text-green-400'
            : 'bg-gray-100 text-gray-800'
            }`}>
            {user?._id || 'N/A'}
          </code>
          <button
            onClick={() => {
              const textToCopy = user?._id || '';

              // Função de fallback para navegadores sem Clipboard API
              const fallbackCopyTextToClipboard = (text) => {
                const textArea = document.createElement("textarea");
                textArea.value = text;

                // Evita scroll para o elemento
                textArea.style.top = "0";
                textArea.style.left = "0";
                textArea.style.position = "fixed";
                textArea.style.opacity = "0";

                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                try {
                  const successful = document.execCommand('copy');
                  if (successful) {
                    console.log('User ID copied to clipboard using fallback!');
                    // Opcional: adicionar notificação de sucesso aqui
                  } else {
                    console.error('Fallback: Unable to copy');
                  }
                } catch (err) {
                  console.error('Fallback: Unable to copy', err);
                }

                document.body.removeChild(textArea);
              };

              // Tentar usar a Clipboard API moderna primeiro
              if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                  console.log('User ID copied to clipboard!');
                  // Opcional: adicionar notificação de sucesso aqui
                }).catch(err => {
                  console.error('Failed to copy text: ', err);
                  // Usar fallback se a Clipboard API falhar
                  fallbackCopyTextToClipboard(textToCopy);
                });
              } else {
                // Usar método de fallback para navegadores sem suporte
                fallbackCopyTextToClipboard(textToCopy);
              }
            }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${tema === 'dark'
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
          >
            Copiar
          </button>
        </div>
      </div>

      {/* Logout */}
      <div className={`flex items-center justify-between w-full max-w-2xl p-4 rounded-2xl border ${cardClass}`}>
        <div>
          <div className="text-sm font-medium">Sair da Conta</div>
          <div className="text-xs ">Fazer logout e limpar todos os dados do site</div>
        </div>
        <button
          onClick={handleLogout}
          className={`px-4 py-2 rounded-lg font-semibold transition ${tema === 'dark'
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
        >
          Logout
        </button>
      </div>

      {/* Tokens summary */}
      <div className={`${cardClass} w-full max-w-2xl p-4 rounded-2xl border`}>
        <h3 className="font-semibold mb-4">Usagem (IA)</h3>

        {/* Barra visual de tokens */}
        <div className="mb-4">
          <TokenUsageBar user={user} />
        </div>

        {/* Resumo do uso de IA (em %) */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <div className="text-xs text-gray-500">Uso de IA do período</div>
            <div className="text-lg font-bold">{Math.round(Number(tokensTotal || 0))}%</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Uso de IA hoje</div>
            <div className="text-lg font-bold">{Number(tokensToday || 0).toFixed(1).replace('.', ',')}%</div>
          </div>
        </div>

        {/* Gráfico de uso */}
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Histórico dos últimos 14 dias</h4>
          <TokensChart days={14} tema={tema} />
        </div>

        <div className={`text-xs mt-2 ${tema === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Uso de IA em % do seu plano no período atual (fuso America/Sao_Paulo).</div>
      </div>

      {/* Devices history */}
      <div className={`${cardClass} w-full max-w-2xl p-4 rounded-2xl border`}>
        <h3 className="font-semibold mb-4">Segurança da conta</h3>

        {/* Infos */}
        <div className="flex flex-col justify-between gap-4 mb-4">
          <div className={`flex items-center justify-between w-full max-w-2xl p-4 rounded-2xl border ${cardClass}`}>
            <div>
              <div className="text-sm font-medium">Login seguro</div>
              <div className="text-xs ">Importante pra gerenciar quem acessar a sua conta. toda vez que alguem acessar voce recebera um email e podera bloquear esse dispositivo.</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs">{loginSeguro === true ? 'Ativado' : 'Desativado'}</span>
              <Switch checked={loginSeguro} onChange={toggleLoginSeguro} label="Alternar login seguro" tema={loginSeguro} />
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Historico de dispositivos</h3>
            {user?.stats?.deviceHistory?.length > 0 ? (
              <div className={`p-4 bg-black/10 rounded-2xl`}>{/* Botão Mostrar mais/menos */}
                {user.stats.deviceHistory.length > INITIAL_DEVICES_SHOWN && (
                  <div className="flex justify-center mb-4">
                    <button
                      onClick={() => setShowAllDevices(!showAllDevices)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors duration-200 ${tema === 'dark'
                          ? 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    >
                      {showAllDevices
                        ? `Mostrar menos (${INITIAL_DEVICES_SHOWN} de ${user.stats.deviceHistory.length})`
                        : `Mostrar mais (${user.stats.deviceHistory.length - INITIAL_DEVICES_SHOWN} restantes)`
                      }
                    </button>
                  </div>
                )}

                {user.stats.deviceHistory
                  .slice(0, showAllDevices ? user.stats.deviceHistory.length : INITIAL_DEVICES_SHOWN)
                  .map((d, i) => {
                    // Função para formatar data
                    const formatDeviceDate = (date) => {
                      if (!date) return 'N/A';
                      try {
                        return new Date(date).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                      } catch (error) {
                        return 'Data inválida';
                      }
                    };

                    // Função para formatar localização
                    const formatLocation = (location) => {
                      if (!location || (!location.lat && !location.lon)) return 'Localização não disponível';
                      if (location.lat === null || location.lon === null) return 'Localização não disponível';
                      return `${location.lat?.toFixed(4)}, ${location.lon?.toFixed(4)}`;
                    };

                    // Função para truncar systemInfo se muito longo
                    const formatSystemInfo = (systemInfo) => {
                      if (!systemInfo) return 'Informações não disponíveis';
                      return systemInfo.length > 50 ? `${systemInfo.substring(0, 50)}...` : systemInfo;
                    };

                    return (
                      <div key={i} className={`w-full max-w-2xl p-4 rounded-2xl border mb-3 ${cardClass} ${d.bloqueado ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="text-sm font-medium flex items-center gap-2">
                              Dispositivo {i + 1}
                              {d.bloqueado && (
                                <span className="px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full">
                                  Bloqueado
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              ID: {d.deviceId || 'N/A'}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {d.loginCount || 0} login(s)
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div className="text-xs text-gray-500 dark:text-gray-400">Sistema</div>
                            <div className="font-medium text-sm" title={d.systemInfo}>
                              {formatSystemInfo(d.systemInfo)}
                            </div>
                          </div>

                          <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Localização</div>
                            {d.location && d.location.lat !== null && d.location.lon !== null ? (
                              <div className="w-full h-32 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                                <iframe
                                  src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_API_GOOGLE_SEARCH_IMAGES}&q=${d.location.lat},${d.location.lon}&zoom=12&maptype=roadmap`}
                                  width="100%"
                                  height="100%"
                                  style={{ border: 0 }}
                                  allowFullScreen=""
                                  loading="lazy"
                                  referrerPolicy="no-referrer-when-downgrade"
                                  title={`Localização do Dispositivo ${i + 1}`}
                                  className="transition-all duration-300 hover:scale-105"
                                />
                              </div>
                            ) : (
                              <div className="w-full h-32 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 flex flex-col items-center justify-center">
                                <svg className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                  Este dispositivo não mostra a localização
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div className="text-xs text-gray-500 dark:text-gray-400">Primeiro Login</div>
                            <div className="font-medium text-sm">
                              {formatDeviceDate(d.firstLoginDate)}
                            </div>
                          </div>

                          <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div className="text-xs text-gray-500 dark:text-gray-400">Último Acesso</div>
                            <div className="font-medium text-sm">
                              {formatDeviceDate(d.lastActivity || d.loginDate)}
                            </div>
                          </div>
                        </div>

                        {d.blockedAt && (
                          <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
                            <div className="text-xs text-red-600 dark:text-red-400">
                              Bloqueado em: {formatDeviceDate(d.blockedAt)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}


              </div>
            ) : (
              <div className={`w-full max-w-2xl p-6 rounded-2xl border text-center ${cardClass}`}>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Nenhum dispositivo registrado ainda
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Plan Info */}
      <div className={`w-full max-w-2xl p-4 rounded-2xl border ${subtleBg} ${cardClass}`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-medium">Plano Atual</div>
            <div className="text-xs ">Resumo das informações da assinatura</div>
          </div>
          <div className="text-sm text-gray-300 capitalize">{currentPlan}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl border">
            <div className="text-xs ">Status</div>
            <div className="font-medium capitalize">{planInfos.status || '—'}</div>
          </div>
          {/* <div className="p-3 rounded-xl border">
            <div className="text-xs ">Próximo valor</div>
            <div className="font-medium">R$ {planInfos.nextPaymentValue ?? '—'}</div>
            <div className="text-xs ">{formatDate(planInfos.nextPaymentDate)}</div>
          </div> */}
          <div className="p-3 rounded-xl border">
            <div className="text-xs ">Subscription ID</div>
            <div className="font-mono text-xs break-all">{planInfos.subscriptionId || '—'}</div>
          </div>
        </div>

        <div className="text-xs  mt-3">
          Sua próxima fatura será gerada em: {planInfos.expirationDate ? formatDate(planInfos.expirationDate) : planInfos.nextPaymentDate ? formatDate(planInfos.nextPaymentDate) : '_'}
        </div>
      </div>

      {/* Planos — visualização de venda */}
      <div className="w-full max-w-5xl">
        <div className="flex items-center justify-between mb-4 px-1">
          <div>
            <div className="text-lg font-semibold">Escolha seu plano</div>
            <div className="text-xs opacity-70">Desbloqueie mais recursos e mais IA.</div>
          </div>
          <div className="text-xs opacity-70">Plano atual: <strong className="capitalize">{currentPlan}</strong></div>
        </div>

        {plans.length === 0 ? (
          <div className="text-sm opacity-70 px-1">Carregando planos...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((p) => {
              const isCurrent = currentPlan === p.key;
              const accent = { gray: 'from-gray-500 to-gray-600', blue: 'from-blue-500 to-blue-600', purple: 'from-purple-500 to-purple-600', emerald: 'from-emerald-500 to-emerald-600' }[p.accent] || 'from-blue-500 to-blue-600';
              const accessItems = Object.keys(ACCESS_LABELS).map(flag => ({ text: ACCESS_LABELS[flag], included: !!p.access?.[flag] }));
              const bullets = [...accessItems, ...((p.features || []).map(f => ({ text: f.text, included: f.included !== false, highlight: f.highlight })))];
              return (
                <div key={p.key} className={`relative rounded-2xl border p-5 flex flex-col ${tema === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} ${p.popular ? 'ring-2 ring-amber-500/50' : ''} ${isCurrent ? 'ring-2 ring-blue-500/60' : ''}`}>
                  {p.popular && <div className="absolute -top-2 right-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">POPULAR</div>}
                  {isCurrent && <div className="absolute -top-2 left-3 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">SEU PLANO</div>}

                  <div className={`w-10 h-10 rounded-xl mb-3 bg-gradient-to-r ${accent}`} />
                  <div className="text-lg font-bold">{p.name}</div>
                  {p.subtitle && <div className="text-xs opacity-70 mb-2">{p.subtitle}</div>}
                  <div className="text-2xl font-extrabold mb-1">{p.precoText || (p.tipo === 'cortesia' ? 'Grátis' : '—')}</div>
                  {p.description && <div className="text-xs opacity-70 mb-3">{p.description}</div>}

                  <ul className="space-y-1.5 mb-4 flex-1">
                    {bullets.map((b, i) => (
                      <li key={i} className={`flex items-center gap-2 text-sm ${!b.included ? 'opacity-50' : ''}`}>
                        <span className={b.included ? 'text-emerald-500' : 'text-gray-400'}>{b.included ? '✓' : '✕'}</span>
                        <span className={b.highlight ? 'font-semibold text-emerald-500' : (!b.included ? 'line-through' : '')}>{b.text}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    disabled={planLoading || isCurrent}
                    onClick={() => askChangePlan(p.key)}
                    className={`w-full py-2.5 rounded-xl font-semibold text-sm transition ${isCurrent ? 'bg-gray-500/30 text-gray-400 cursor-not-allowed' : `bg-gradient-to-r ${accent} text-white hover:opacity-90`}`}
                  >
                    {isCurrent ? 'Plano atual' : (p.buttonText || (p.tipo === 'cortesia' ? 'Selecionar' : 'Assinar'))}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="text-xs opacity-60 mt-3 px-1">
          A troca é confirmada no Stripe (proration no meio do ciclo). Ao voltar para o gratuito, a assinatura é cancelada.
        </div>
      </div>

      {/* Modal de confirmação (input) */}
      {confirmOpen && pendingPlan && (
        <div className="fixed max-h-full inset-0 z-50 flex items-center justify-center p-4">
          <div className="inset-0 bg-black/40" onClick={closeModal} />
          <div className={`max-h-full overflow-y-auto ${tema === 'dark' ? 'bg-gray-900' : 'bg-white'} relative w-full max-w-lg rounded-2xl p-6 shadow-lg z-10`}>
            <h3 className="text-lg font-semibold mb-2">Confirmar alteração para "{pendingPlan}"</h3>

            <div className="mb-3 text-sm ">
              {trocaExplicacao(pendingPlan)}
            </div>

            <div className="mb-3 grid grid-cols-2 gap-3">
              <div className="p-3 flex flex-col justify-evenly rounded border">
                <div className="text-xs ">Plano atual</div>
                <div className="font-medium capitalize">{currentPlan}</div>
              </div>
              <div className="p-3 rounded border">
                <div className="text-xs ">Novo plano</div>
                <div className="font-medium capitalize">{pendingPlan}</div>
                <div className="text-xs ">Valor: {priceMapForDisplay[pendingPlan]?.price || '—'}</div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs  mb-1">Digite o nome do plano para confirmar</label>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={`Digite "${pendingPlan}" para confirmar`}
                className="w-full px-3 py-2 rounded-lg border focus:ring-2"
              />
            </div>

            <div className="mb-4">
              <label className="block text-xs  mb-1">Digite a sua senha confirmar</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={`Digite a sua senha`}
                type='password'
                className="w-full px-3 py-2 rounded-lg border focus:ring-2"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={closeModal} disabled={planLoading} className="px-4 py-2 rounded-lg border">Cancelar</button>
              <button
                disabled={planLoading || confirmText.trim().toLowerCase() !== pendingPlan.toLowerCase()}
                onClick={confirmChangePlan}
                className={`px-4 py-2 rounded-lg font-semibold ${planLoading ? 'bg-gray-400 text-white' : 'bg-blue-600 text-white'}`}
              >
                {planLoading ? 'Processando...' : `Confirmar mudança para ${pendingPlan}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-2xl text-xs  text-center mt-2">
        {globalLoading ? (
          <span>Operação em andamento...</span>
        ) : (
          <span>Alterações aplicadas no servidor. Webhooks do Stripe podem atualizar os dados finais do plano em seguida.</span>
        )}
      </div>
    </div>
  );
};

export default Configuracoes;
