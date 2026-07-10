import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../Api.js';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Header from './Components/Header.jsx';
import AdBanner from './Components/AdBanner.jsx';
import MeusTreinos from './Pages/MeusTreinos.jsx';
import MinhaAnamnese from './Pages/MinhaAnamnese.jsx';
import Historico from './Pages/Historico.jsx';
import Perfil from './Pages/Perfil.jsx';
import Configuracoes from './Pages/Configuracoes.jsx';
import OnboardingQuestionnaireFitness from './Components/OnboardingQuestionnaireFitness.jsx';
import OnboardingPersonalInfo from './Components/OnboardingPersonalInfo.jsx';
import BuscarImagens from '../../components/BuscarImagens.jsx';
import ChatTreino from './Components/ChatTreino.jsx';
import BMIChart from './Components/BMIchart.jsx';
import HistoricoChart from './Components/HistoricoChart.jsx';
import Encontrar from './Pages/Encontrar.jsx';
import TokensChart from './Components/TokensChart.jsx';
import UpgradeBanner from '../../components/UpgradeBanner.jsx';
import { hasAccess, isFreeUser } from '../../utils/planAccess.js';
import Coach from './Pages/Coach.jsx';
import CoachEspecifico from './Pages/CoachEspecifico.jsx';
import ChatsOptimized from '../../components/ChatsOptimized.jsx';
import Footer from './Components/Footer.jsx';
import ChatNutriAI from './Components/ChatNutriAi.jsx';
import InfoCoachs from '../../components/InfoCoachs.jsx';
import AnunciosDash from './Pages/AnunciosDash.jsx';
import CriarLocal from './Pages/CriarLocal.jsx';
import LocaisDashboard from './Pages/LocaisDashboard.jsx';
import AdminPage from './Pages/AdminPage/AdminPage.jsx';
import SupportPage from './Pages/SupportPage.jsx';
import Recordes from './Pages/Recordes.jsx';
import LoadingSpinner from '../../components/LoadingSpinner';

import { handleError, clearErrorAfterDelay, isAuthError } from '../../utils/errorHandler';
import { useToast } from '../../components/Toast.jsx';
import { FaUser, FaChartLine, FaDumbbell, FaAppleAlt, FaCog, FaSignOutAlt, FaQuestionCircle, FaMapMarkerAlt, FaUsers, FaSearch, FaBullhorn, FaShieldAlt, FaCrown, FaStar, FaTrophy, FaExclamationTriangle, FaHeadset } from 'react-icons/fa';
import { MdDarkMode, MdLightMode, MdTrendingUp, MdInsights } from 'react-icons/md';
import { FaRobot } from 'react-icons/fa6';
import { IoMdFitness } from 'react-icons/io';
import { TbMoodKid } from 'react-icons/tb';
import { FaUserTie } from 'react-icons/fa6';
import { FaUserShield } from 'react-icons/fa6';
import { LuActivity, LuTarget, LuZap } from 'react-icons/lu';
import axios from 'axios';
import { buildImageUrl } from '../../utils/imageUtils.js';
import NotFound from './Pages/NotFound.jsx';
import GlobalEventManager from '../../components/GlobalEventManager.jsx';

const Dashboard = ({ needToPay, plano }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tema, setTema] = useState(localStorage.getItem('tema') || 'light');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState('personal'); // 'personal' ou 'fitness'
  const [treinoStatus, setTreinoStatus] = useState(null);
  const [userGamification, setUserGamification] = useState(null);
  const [dispositivoBloqueado, setDispositivoBloqueado] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { showError, showInfo, showWarning, showSuccess } = useToast();
  
  // Ref para controlar execução única do useEffect principal
  const hasInitialized = useRef(false);
  const freeToastShown = useRef(false);

  useEffect(() => {
    // Só avisa uma vez, e apenas com o usuário carregado (setUser roda várias
    // vezes — onboarding, perfil — e re-disparava o toast a cada mudança).
    if (!freeToastShown.current && isFreeUser(user)) {
      freeToastShown.current = true;
      showWarning('Você está usando o plano gratuito. Para acessar todas as funcionalidades, por favor, atualize seu plano.');
    }
  }, [user])

  // Uso: const id = await buildIdentifier({ geolocationTimeout:20000 });
  async function buildIdentifier({ geolocationTimeout = 20000 } = {}) {
    const sanitize = s => String(s || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/[^A-Za-z0-9 .,_\-;:()]/g, '')
      .trim()
      .slice(0, 256);

    // --- Extrai apenas o trecho (<system-information>) do User-Agent ---
    function extractSystemInfo() {
      const ua = navigator.userAgent || 'unknown';
      const match = ua.match(/\(([^)]+)\)/);
      const systemInfo = match ? match[1] : ua;
      return sanitize(systemInfo);
    }

    // --- Obter localização (coordenadas lat/lon) ---
    async function getLocation(timeout) {
      const geoPromise = new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject('no-geo');
        const t = setTimeout(() => reject('timeout'), timeout);
        navigator.geolocation.getCurrentPosition(
          pos => { clearTimeout(t); resolve(pos); },
          err => { clearTimeout(t); reject(err); },
          { enableHighAccuracy: false, timeout }
        );
      });

      try {
        const pos = await geoPromise;
        return {
          lat: parseFloat(pos.coords.latitude.toFixed(6)),
          lon: parseFloat(pos.coords.longitude.toFixed(6))
        };
      } catch {
        return {
          lat: null,
          lon: null,
        };
      }
    }

    // --- Execução ---
    const [systemInfo, location] = await Promise.all([
      extractSystemInfo(),
      getLocation(geolocationTimeout)
    ]);

    return { identificador: `(${systemInfo})+(${location.lat}_${location.lon})`, systemInfo, location };
  }

  useEffect(() => {
    // Previne execução dupla em StrictMode
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const fetchUser = async () => {
      try {
        setLoading(true);
        
        // Buscar dados do usuário usando apenas cookies httpOnly
        const { identificador, systemInfo, location } = await buildIdentifier();

        console.log(identificador, systemInfo, location)

        const res = await api.post('/dashboard', {
          identificador,
          systemInfo,
          location
        });

        console.log(res)
        
        if (res?.data?.user) {
          setUser(res.data.user);

          // Verificar se o dispositivo está bloqueado
          if (res.data?.bloqueado !== undefined) {
            setDispositivoBloqueado(res.data.bloqueado);
          }

          // Buscar dados de gamificação após carregar o usuário
          try {
            const gamificationResponse = await api.get('/gamification/user-gamification', {
              params: {
                userId: res.data.user._id
              },
              timeout: 10000 // 10 segundos de timeout
            });

            console.log(gamificationResponse)

            if (gamificationResponse.data?.success) {
              setUserGamification(gamificationResponse.data.data);
            }
          } catch (gamificationError) {
            console.warn('Erro ao buscar dados de gamificação:', gamificationError);
            // Não mostra erro para o usuário, apenas log
          }
        }
      } catch (error) {
        const errorMessage = handleError(error);
        
        // Tratamento específico para erros de rede
        if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
          showError('Erro de conectividade. Verifique sua conexão com a internet e tente novamente.');
          console.error('Network error detected:', error);
        } else if (error.response?.status === 0) {
          showError('Servidor indisponível. Tente novamente em alguns instantes.');
          console.error('Server unavailable:', error);
        } else {
          showError(errorMessage);
        }
        
        console.error('Dashboard fetch user error:', error);

        if (error.response?.data?.msg == "Usuário não encontrado no dashboard.") {
          // deletar todos os cookies e dados do site 
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
          // navigate('/login')
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();

    // Carregar tema do localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) setTema(savedTheme);
  }, [navigate]);

  // Atualiza o tema com base nas preferências do usuário (quando user muda)
  useEffect(() => {
    if (user?.preferences?.theme) {
      setTema(user.preferences.theme);
    }
  }, [user]);

  // Decide se deve mostrar o onboarding (após user carregado)
  useEffect(() => {
    if (!user) return;

    const loginCount = Number(user?.stats?.loginCount ?? 0);

    // Detecta se backend já marcou como completado (vários possíveis campos)
    const onboardCompleted =
      user?.onboarding?.completed === true ||
      user?.stats?.onboarded === true ||
      user?.onboarded === true ||
      user?.preferences?.onboardCompleted === true;

    // Verifica se tem informações pessoais básicas
    const hasPersonalInfo = user?.perfil?.idade && user.perfil?.city && user.perfil?.state && user.perfil?.country;

    // Verifica se tem respostas do questionário de fitness
    const hasFitnessAnswers = user?.onboarding?.answers && user.onboarding.answers.length > 0;

    // Só mostra onboarding se:
    // 1. Não foi completado ainda
    // 2. É um dos primeiros logins (até 5 tentativas)
    // 3. Falta alguma informação essencial
    if (!onboardCompleted && loginCount <= 5 && (!hasPersonalInfo || !hasFitnessAnswers)) {
      setShowOnboarding(true);

      // Define qual etapa mostrar baseado nas informações já coletadas
      if (!hasPersonalInfo) {
        setOnboardingStep('personal');
      } else if (!hasFitnessAnswers) {
        setOnboardingStep('fitness');
      }
    } else {
      setShowOnboarding(false);
    }
  }, [user]);



  const handlePay = async () => {
    try {
      setLoading(true);
      const res = await api.post('/create-checkout-session', {
        plan: user?.planInfos?.planType,
        userId: user?._id
      });
      window.location.href = res?.data?.url;
    } catch (err) {
      const errorMessage = handleError(err);
      showError('Erro ao processar pagamento. Tente novamente.');
      console.error('Payment processing error:', err);
    } finally {
      setLoading(false);
    }
  };

  const isBanned = !!user?.ban?.banned;
  const isSupportPath = typeof location?.pathname === 'string' && (location.pathname === '/dashboard/ajuda' || location.pathname.startsWith('/dashboard/ajuda/'));

  useEffect(() => {
    if (!isBanned) return;
    if (isSupportPath) return;
    navigate('/dashboard/ajuda', { replace: true });
  }, [isBanned, isSupportPath, navigate]);

  if (isBanned && !isSupportPath) {
    return null;
  }

  if (isBanned && isSupportPath) {
    const bannedThemeClasses = tema === 'dark'
      ? 'min-h-screen bg-gray-900 text-white'
      : 'min-h-screen bg-gray-50 text-gray-900';
    return (
      <div className={bannedThemeClasses}>
        <SupportPage user={user} tema={tema} />
      </div>
    );
  }

  if (loading) {
    return (
      <LoadingSpinner
        fullScreen={true}
        text="Carregando dashboard..."
        size="large"
      />
    );
  }

  // Componente de alerta de segurança para dispositivo bloqueado
  const SecurityAlert = () => (
    dispositivoBloqueado && (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-4xl"
      >
        <div className="bg-red-500/95 backdrop-blur-sm border border-red-400 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                <FaExclamationTriangle className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">
                🔒 Dispositivo Bloqueado por Segurança
              </h3>
              <p className="text-red-100 mb-4 leading-relaxed">
                Este dispositivo foi identificado como suspeito e bloqueado por medidas de segurança.
                Suas funcionalidades podem estar limitadas. Se você é o proprietário legítimo desta conta,
                entre em contato com o suporte para desbloqueio.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => navigate('/suporte')}
                  className="px-6 py-3 bg-white text-red-600 font-semibold rounded-xl hover:bg-red-50 transition-all duration-200 flex items-center gap-2"
                >
                  <FaHeadset className="w-4 h-4" />
                  Contatar Suporte
                </button>
                <button
                  onClick={() => {
                    localStorage.clear();
                    navigate('/login');
                  }}
                  className="px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-all duration-200 flex items-center gap-2"
                >
                  <FaSignOutAlt className="w-4 h-4" />
                  Sair da Conta
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    )
  );

  const themeClasses = tema === 'dark'
    ? 'bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 text-white'
    : 'bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-900';

  // Componente de boas-vindas melhorado
  const WelcomeSection = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={`relative overflow-hidden rounded-3xl p-8 mb-8 ${tema === 'dark'
        ? 'bg-gradient-to-r from-blue-900/50 via-purple-900/50 to-green-900/50 border border-gray-700/50'
        : 'bg-gradient-to-r from-blue-50 via-purple-50 to-green-50 border border-gray-200/50'
        } backdrop-blur-sm`}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-40 h-40 bg-green-500 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-36 h-36 bg-purple-500 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="flex-1 text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 justify-center lg:justify-start mb-4"
          >
            <div className={`p-3 h-10 aspect-square rounded-2xl ${tema === 'dark' ? 'bg-blue-500/20' : 'bg-blue-500/10'}`} style={{
              background: `url(${buildImageUrl(user?.avatar)})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat"
            }}>
            </div>
            <div>
              <h1 className={`text-3xl lg:text-4xl font-bold ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Olá, {user?.username || 'Usuário'}!
              </h1>
              <p className={`text-lg ${tema === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Bem-vindo de volta ao TreinAI
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap items-center gap-4 justify-center lg:justify-start"
          >
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${tema === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-500/10 text-green-600'
              }`}>
              <FaCrown className="w-4 h-4" />
              <span className="font-semibold text-sm">
                Plano {user?.planInfos?.planType?.charAt(0).toUpperCase() + user?.planInfos?.planType?.slice(1)}
              </span>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${tema === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-500/10 text-blue-600'
              }`}>
              <LuZap className="w-4 h-4" />
              <span className="font-semibold text-sm">
                {Array.isArray(user?.stats?.tokens) ? user.stats.tokens.length : (user?.stats?.tokenCount || 0)} dias de uso.
              </span>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="flex gap-4"
        >
          <div className={`p-4 rounded-2xl ${tema === 'dark' ? 'bg-gray-800/50' : 'bg-white/50'} backdrop-blur-sm text-center`}>
            <LuActivity className={`w-8 h-8 mx-auto mb-2 ${tema === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />
            <p className={`text-2xl font-bold ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {userGamification?.workouts || 0}
            </p>
            <p className={`text-sm ${tema === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Treinos</p>
          </div>
          <div className={`p-4 rounded-2xl ${tema === 'dark' ? 'bg-gray-800/50' : 'bg-white/50'} backdrop-blur-sm text-center`}>
            <LuTarget className={`w-8 h-8 mx-auto mb-2 ${tema === 'dark' ? 'text-green-400' : 'text-green-500'}`} />
            <p className={`text-2xl font-bold ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {userGamification?.streak || 0}
            </p>
            <p className={`text-sm ${tema === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Sequência</p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );

  const db = user ? (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="max-w-6xl mx-auto px-2 sm:px-3 lg:px-4"
    >
      {/* Seção de Boas-vindas */}
      <WelcomeSection />

      {/* Banner Coach (se aplicável) */}
      <AnimatePresence>
        {user && hasAccess(user, 'coachPanel') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <Link
              to={'coach'}
              className={`block relative overflow-hidden rounded-3xl p-8 text-center group transition-all duration-300 hover:scale-[1.02] ${tema === 'dark'
                ? 'bg-gradient-to-r from-yellow-900/30 via-orange-900/30 to-yellow-900/30 border border-yellow-500/30 hover:border-yellow-400/50'
                : 'bg-gradient-to-r from-yellow-50 via-orange-50 to-yellow-50 border border-yellow-200 hover:border-yellow-300'
                }`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 flex items-center justify-center gap-4">
                <div className="p-3 rounded-2xl bg-yellow-500/20">
                  <FaCrown className="w-8 h-8 text-yellow-500" />
                </div>
                <div>
                  <h2 className={`text-2xl lg:text-3xl font-bold ${tema === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>
                    Acesse o seu painel coach
                  </h2>
                  <p className={`text-lg ${tema === 'dark' ? 'text-yellow-300/80' : 'text-yellow-600/80'}`}>
                    /dashboard/coach
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna Principal - Treino e NutriAI */}
        <div className="lg:col-span-2 space-y-8">
          {/* Card Treino do Dia */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`relative overflow-hidden rounded-3xl ${tema === 'dark'
              ? 'bg-gray-800/50 border border-gray-700/50'
              : 'bg-white/80 border border-gray-200/50'
              } backdrop-blur-sm hover:shadow-2xl transition-all duration-300`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-green-500/5"></div>
            <div className="relative z-10">
              <ChatTreino tema={tema} user={user} />
            </div>
          </motion.div>

          {/* Card NutriAI */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`relative overflow-hidden rounded-3xl ${tema === 'dark'
              ? 'bg-gray-800/50 border border-gray-700/50'
              : 'bg-white/80 border border-gray-200/50'
              } backdrop-blur-sm hover:shadow-2xl transition-all duration-300`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-blue-500/5"></div>
            <div className="relative z-10">
              <ChatNutriAI user={user} tema={tema} />
            </div>
          </motion.div>
        </div>

        {/* Coluna Lateral - Analytics */}
        <div className="space-y-8">
          {/* Card Desempenho */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className={`relative overflow-hidden rounded-3xl p-6 ${tema === 'dark'
              ? 'bg-gray-800/50 border border-gray-700/50'
              : 'bg-white/80 border border-gray-200/50'
              } backdrop-blur-sm hover:shadow-2xl transition-all duration-300`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5"></div>

            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${tema === 'dark' ? 'bg-purple-500/20' : 'bg-purple-500/10'}`}>
                    <MdTrendingUp className="w-6 h-6 text-purple-500" />
                  </div>
                  <div>
                    <h2 className={`text-xl font-bold ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Desempenho
                    </h2>
                    <p className={`text-sm ${tema === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Seus progressos
                    </p>
                  </div>
                </div>
                <div className={`w-2 h-12 rounded-full bg-gradient-to-b from-purple-500 to-pink-500`}></div>
              </div>

              {/* Charts Grid */}
              <div className="space-y-6">
                {/* BMI Chart */}
                <div className={`p-5 rounded-2xl ${tema === 'dark' ? 'bg-gray-700/30 border border-gray-600/30' : 'bg-gray-50/50 border border-gray-200/30'
                  } hover:shadow-lg transition-all duration-200`}>
                  <div className="flex items-center gap-2 mb-4">
                    <LuActivity className={`w-5 h-5 ${tema === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />
                    <h3 className={`font-semibold ${tema === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                      Índice de Massa Corporal
                    </h3>
                  </div>
                  <div className="min-h-[200px]">
                    <BMIChart
                      alturaHistory={user?.perfil?.altura}
                      pesoHistory={user?.perfil?.pesoAtual}
                      targetBMI={22.5}
                      tema={tema}
                    />
                  </div>
                </div>

                {/* Histórico Chart */}
                <div className={`p-5 rounded-2xl ${tema === 'dark' ? 'bg-gray-700/30 border border-gray-600/30' : 'bg-gray-50/50 border border-gray-200/30'
                  } hover:shadow-lg transition-all duration-200`}>
                  <div className="flex items-center gap-2 mb-4">
                    <FaTrophy className={`w-5 h-5 ${tema === 'dark' ? 'text-green-400' : 'text-green-500'}`} />
                    <h3 className={`font-semibold ${tema === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                      Histórico de Treinos
                    </h3>
                  </div>
                  <div className="min-h-[200px]">
                    <HistoricoChart tema={tema} historico={user?.historico} />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card Estatísticas */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className={`relative overflow-hidden rounded-3xl p-6 ${tema === 'dark'
              ? 'bg-gray-800/50 border border-gray-700/50'
              : 'bg-white/80 border border-gray-200/50'
              } backdrop-blur-sm hover:shadow-2xl transition-all duration-300`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-blue-500/5"></div>

            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${tema === 'dark' ? 'bg-green-500/20' : 'bg-green-500/10'}`}>
                    <MdInsights className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <h2 className={`text-xl font-bold ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Estatísticas
                    </h2>
                    <p className={`text-sm ${tema === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Consumo e métricas
                    </p>
                  </div>
                </div>
                <div className={`w-2 h-12 rounded-full bg-gradient-to-b from-green-500 to-blue-500`}></div>
              </div>

              {/* Upsell contextual quando o uso de IA está alto */}
              <UpgradeBanner className="mb-4" />

              {/* Tokens Chart */}
              <div className={`p-5 rounded-2xl ${tema === 'dark' ? 'bg-gray-700/30 border border-gray-600/30' : 'bg-gray-50/50 border border-gray-200/30'
                } hover:shadow-lg transition-all duration-200`}>
                <div className="flex items-center gap-2 mb-4">
                  <LuZap className={`w-5 h-5 ${tema === 'dark' ? 'text-yellow-400' : 'text-yellow-500'}`} />
                  <h3 className={`font-semibold ${tema === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                    Uso de IA (% do plano)
                  </h3>
                </div>
                <div className="min-h-[200px]">
                  <TokensChart tema={tema} />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  ) : (
    // Componente para quando não há dados de usuário
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="max-w-md mx-auto px-4 py-8"
    >
      <motion.div
        className={`relative overflow-hidden rounded-3xl p-8 text-center ${tema === 'dark'
          ? 'bg-gray-800/50 border border-gray-700/50'
          : 'bg-white/80 border border-gray-200/50'
          } backdrop-blur-sm shadow-2xl`}
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        {/* Gradiente de fundo */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5"></div>

        <div className="relative z-10">
          {/* Ícone animado */}
          <motion.div
            className={`mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center ${tema === 'dark' ? 'bg-blue-500/20' : 'bg-blue-500/10'
              }`}
            animate={{
              rotate: [0, 10, -10, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          >
            <FaUser className="w-10 h-10 text-blue-500" />
          </motion.div>

          {/* Título */}
          <motion.h2
            className={`text-2xl font-bold mb-4 ${tema === 'dark' ? 'text-white' : 'text-gray-900'
              }`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            Dados não encontrados
          </motion.h2>

          {/* Mensagem */}
          <motion.p
            className={`text-lg mb-8 leading-relaxed ${tema === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            Não foi possível carregar seus dados. Por favor, faça login novamente para acessar o dashboard.
          </motion.p>

          {/* Botão para voltar ao login */}
          <motion.button
            onClick={() => {
              // deletar todos os cookies e dados do site 
              // Limpar todos os dados locais independentemente do resultado da requisição
              let limpo = false

              try {
                localStorage.clear();
                sessionStorage.clear();
                document.cookie.split(";").forEach((c) => {
                  const eqPos = c.indexOf("=");
                  const name = eqPos > -1 ? c.substr(0, eqPos) : c;
                  document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
                });
                limpo = true
              } catch (error) {
                console.error("Erro ao limpar dados locais:", error);
                limpo = false
              }

              while (true) {
                if (limpo) {
                  navigate('/login')
                }
              }

            }}
            className={`w-full py-4 px-6 rounded-2xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 ${tema === 'dark'
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white focus:ring-blue-500/50'
              : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white focus:ring-blue-500/50'
              } shadow-lg hover:shadow-xl`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-center gap-3">
              <FaSignOutAlt className="w-5 h-5" />
              Voltar ao Login
            </div>
          </motion.button>

          {/* Elementos decorativos */}
          <motion.div
            className="absolute -top-4 -right-4 w-8 h-8 rounded-full bg-blue-500/20"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: 0.5
            }}
          />
          <motion.div
            className="absolute -bottom-4 -left-4 w-6 h-6 rounded-full bg-purple-500/20"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.4, 0.7, 0.4]
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              delay: 1
            }}
          />
        </div>
      </motion.div>
    </motion.div>
  )

  // Se não há usuário e não está carregando, mostra o componente de dados não encontrados
  if (!loading && !user) {
    return (
      <div className={`min-h-screen w-full flex flex-col items-center justify-center p-4 ${themeClasses}`}>
        {/* Componente para quando não há dados de usuário */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-md mx-auto px-4 py-8"
        >
          <motion.div
            className={`relative overflow-hidden rounded-3xl p-8 text-center ${tema === 'dark'
              ? 'bg-gray-800/50 border border-gray-700/50'
              : 'bg-white/80 border border-gray-200/50'
              } backdrop-blur-sm shadow-2xl`}
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {/* Gradiente de fundo */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5"></div>

            <div className="relative z-10">
              {/* Ícone animado */}
              <motion.div
                className={`mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center ${tema === 'dark' ? 'bg-blue-500/20' : 'bg-blue-500/10'
                  }`}
                animate={{
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.05, 1]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
              >
                <FaUser className="w-10 h-10 text-blue-500" />
              </motion.div>

              {/* Título */}
              <motion.h2
                className={`text-2xl font-bold mb-4 ${tema === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                Dados não encontrados
              </motion.h2>

              {/* Mensagem */}
              <motion.p
                className={`text-lg mb-8 leading-relaxed ${tema === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                Não foi possível carregar seus dados. Por favor, faça login novamente para acessar o dashboard. <p className='text-sm'>Isso provavelmente ocorreu porque o dono do email desta conta bloqueou o seu dispositivo. Se acha que foi um erro entre em contato ou faça login novamente.</p>
              </motion.p>

              {/* Botão para voltar ao login */}
              <motion.button
                onClick={() => navigate('/login')}
                className={`w-full py-4 px-6 rounded-2xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 ${tema === 'dark'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white focus:ring-blue-500/50'
                  : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white focus:ring-blue-500/50'
                  } shadow-lg hover:shadow-xl`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-center gap-3">
                  <FaSignOutAlt className="w-5 h-5" />
                  Voltar ao Login
                </div>
              </motion.button>

              {/* Elementos decorativos */}
              <motion.div
                className="absolute -top-4 -right-4 w-8 h-8 rounded-full bg-blue-500/20"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: 0.5
                }}
              />
              <motion.div
                className="absolute -bottom-4 -left-4 w-6 h-6 rounded-full bg-purple-500/20"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.4, 0.7, 0.4]
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  delay: 1
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full flex flex-col items-center p-1 ${themeClasses}`}>
      <GlobalEventManager />
      {/* Alerta de segurança para dispositivo bloqueado */}
      <SecurityAlert />

      {/* Onboarding full-screen */}
      {showOnboarding && onboardingStep === 'personal' && (
        <OnboardingPersonalInfo
          user={user}
          setUser={setUser}
          onComplete={() => setOnboardingStep('fitness')}
          tema={tema}
        />
      )}

      {showOnboarding && onboardingStep === 'fitness' && (
        <OnboardingQuestionnaireFitness
          user={user}
          setUser={setUser}
          setShowOnboard={setShowOnboarding}
          tema={tema}
        />
      )}

      {!showOnboarding && user?.planInfos?.status !== 'ativo' && user?.planInfos?.planType !== 'free' ? (
        <div className='w-full'>
          <h1 className='mb-2'>Acesse o sistema ao ativar seu plano. Caso prefira, altere para o plano Free e continue usando com limitaçoes.</h1>
          <button
            onClick={handlePay}
            className="bg-green-600 hover:bg-green-700 py-2 px-6 rounded-lg font-semibold transition"
          >
            Ativar Plano
          </button>

          <Configuracoes user={user} setUser={setUser} setTema={setTema} tema={tema} />
        </div>
      ) :
        !showOnboarding && (
          <div className="w-full h-full">
            {user && <Header tema={tema} user={user} />}
            <Routes>
              <Route path="admin" element={<AdminPage user={user} tema={tema} />} />
              <Route path="ajuda" element={<SupportPage user={user} tema={tema} />} />
              <Route path="recordes" element={<Recordes user={user} tema={tema} />} />
              <Route path="meus-treinos" element={<MeusTreinos tema={tema} user={user} setUser={setUser} />} />
              <Route path="historico" element={<Historico historico={user?.historico} tema={tema} />} />
              <Route path="perfil" element={<Perfil user={user} tema={tema} />} />
              <Route path="configuracoes" element={<Configuracoes setTema={setTema} tema={tema} user={user} setUser={setUser} />} />
              <Route path="anamnese" element={<MinhaAnamnese tema={tema} />} />
              <Route path="encontrar" element={<Encontrar user={user} tema={tema} />} />
              <Route path="coach/*" element={<Coach tema={tema} user={user} />} />
              <Route path="coach/u/" element={<CoachEspecifico user={user} />} />
              <Route path="/chat" element={<ChatsOptimized user={user} tema={tema} />} />
              <Route path="/infosCoach" element={<InfoCoachs user={user} />} />
              <Route path="/anuncios" element={<AnunciosDash user={user} tema={tema} />} />
              <Route path="/locais" element={<LocaisDashboard tema={tema} user={user} />} />
              <Route path="" element={db} />
              <Route path="*" element={<NotFound tema={tema} user={user}/>} />
            </Routes>
            {user && <Footer tema={tema} user={user} initialMinimized={true} />}
          </div>
        )}
    </div>
  );
};

export default Dashboard;
