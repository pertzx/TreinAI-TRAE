import React, { useState, useEffect } from 'react';
import api from './Api';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import "../src/App.css";
import Menu from './components/Menu';
import Planos from './pages/Planos';
import PublicProfissional from './pages/PublicProfissional';
import Login from './pages/Login';
import LoginNaoAutorizado from './pages/LoginNaoAutorizado';
import Dashboard from './pages/Dashboard/Dashboard';
import SupportPage from './pages/Dashboard/Pages/SupportPage.jsx';
import Success from './pages/Stripe/Success';
import Cancel from './pages/Stripe/Cancel';
import PagamentoSucesso from './pages/PagamentoSucesso';
import PagamentoCancelado from './pages/PagamentoCancelado';
import Sobre from './pages/Sobre';
import Termos from './pages/Termos';
import PoliticaPrivacidade from './pages/PoliticaPrivacidade';
import LgpdDataExport from './pages/LgpdDataExport.jsx';
import { ToastProvider, GlobalToastContainer } from './components/Toast.jsx';
import CookieConsent from './components/CookieConsent';
import Logo from './components/Logo.jsx';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function App() {
  const [plano, setPlano] = useState('free');

  // Registra a visita diária única (dedupe por dia no backend via cookie visitorId).
  useEffect(() => {
    api.post('/analytics/track-visit', {}).catch(() => {});
  }, []);

  const BannedGuard = ({ children }) => {
    const { user, isAuthenticated, isLoading } = useAuth();
    const loc = useLocation();
    const pathname = loc?.pathname || '/';

    const isBanned = !!user?.ban?.banned;
    const isSupportRoute = pathname === '/suporte' || pathname.startsWith('/suporte/') || pathname === '/dashboard/ajuda' || pathname.startsWith('/dashboard/ajuda/');
    const isLoginRoute = pathname === '/login' || pathname.startsWith('/login') || pathname === '/login-nao-autorizado';

    if (!isLoading && isAuthenticated && isBanned && !isSupportRoute && !isLoginRoute) {
      return <Navigate to="/suporte" replace />;
    }

    return children;
  };

  const SupportRoute = () => {
    const { user } = useAuth();
    const tema = localStorage.getItem('theme') || localStorage.getItem('tema') || 'light';
    if (!user) return <LoginNaoAutorizado />;
    return (
      <div className={tema === 'dark' ? 'min-h-screen bg-gray-900 text-white' : 'min-h-screen bg-gray-50 text-gray-900'}>
        <SupportPage tema={tema} user={user} />
      </div>
    );
  };

  const RouteSEO = () => {
    const loc = useLocation();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const path = loc.pathname || '/';
    const makeCanonical = (p) => `${origin}${p}`;
    const setOrCreate = (selector, attr, value) => {
      let el = document.head.querySelector(selector);
      if (!el) {
        el = document.createElement(selector.startsWith('meta') ? 'meta' : 'link');
        if (selector.startsWith('meta')) document.head.appendChild(el); else document.head.appendChild(el);
      }
      if (selector.startsWith('meta')) el.setAttribute(attr, value); else el.setAttribute(attr, value);
    };
    const setMeta = (name, content) => {
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    const setOG = (property, content) => {
      let el = document.querySelector(`meta[property="${property}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute('property', property); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    const setCanonical = (href) => {
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) { link = document.createElement('link'); link.setAttribute('rel', 'canonical'); document.head.appendChild(link); }
      link.setAttribute('href', href);
    };

    const defaults = {
      title: 'TreinAI — App de Treinos, Nutrição e Coach',
      description: 'TreinAI ajuda você a treinar melhor com IA, acompanhar progresso, planos e suporte profissional.',
      image: `${origin}/logo.png`,
      type: 'website',
      robots: 'index,follow'
    };

    const routes = [
      { match: (p) => p === '/', title: 'TreinAI — Muito além do Personal Trainner IA.', description: 'Descubra treinos personalizados, nutrição e recordes com IA.' },
      { match: (p) => p.startsWith('/dashboard/coach'), title: 'Coach — TreinAI', description: 'Coach e acompanhamento profissional dentro do TreinAI.' },
      { match: (p) => p.startsWith('/dashboard/encontrar'), title: 'Encontrar — TreinAI', description: 'Busque profissionais e locais com precisão.' },
      { match: (p) => p.startsWith('/dashboard/meus-treinos'), title: 'Meus Treinos — TreinAI', description: 'Crie, edite e organize seus treinos gerados por IA. Acompanhe sua evolução e alcance seus objetivos com inteligência artificial personalizada.' },
      { match: (p) => p.startsWith('/dashboard/historico'), title: 'Histórico — TreinAI', description: 'Veja histórico de treinos, gráficos e métricas.' },
      { match: (p) => p.startsWith('/dashboard/recordes'), title: 'Recordes — TreinAI', description: 'Registre seus recordes e metas.' },
      { match: (p) => p.startsWith('/dashboard/perfil'), title: 'Perfil — TreinAI', description: 'Gerencie seu perfil e preferências.' },
      { match: (p) => p.startsWith('/dashboard/configuracoes'), title: 'Configurações — TreinAI', description: 'Configure a sua conta e preferencias.' },
      { match: (p) => p.startsWith('/dashboard'), title: 'Dashboard — TreinAI', description: 'Resumo, navegação e acesso às funcionalidades.' },
      { match: (p) => p === '/planos', title: 'Planos — TreinAI', description: 'Conheça os planos Free, Pro, Max e Coach.' },
      { match: (p) => p === '/sobre', title: 'Sobre — TreinAI', description: 'Quem somos, missão e tecnologia.' },
      { match: (p) => p === '/termos', title: 'Termos — TreinAI', description: 'Termos de uso e condições.' },
      { match: (p) => p === '/politica-de-privacidade', title: 'Privacidade — TreinAI', description: 'Como tratamos seus dados.' },
      { match: (p) => p === '/login', title: 'Login — TreinAI', description: 'Entre para acessar seus treinos.', robots: 'noindex,nofollow' },
      { match: (p) => p === '/login-nao-autorizado', title: 'Login não autorizado — TreinAI', description: 'Acesso negado.', robots: 'noindex,nofollow' },
      { match: (p) => p === '/pagamento-sucesso', title: 'Pagamento concluído — TreinAI', description: 'Sua assinatura foi atualizada.', robots: 'noindex' },
      { match: (p) => p === '/pagamento-cancelado', title: 'Pagamento cancelado — TreinAI', description: 'Pagamento não realizado.', robots: 'noindex' },
      { match: (p) => p === '/success', title: 'Stripe Success — TreinAI', description: 'Retorno de pagamento.', robots: 'noindex' },
      { match: (p) => p === '/cancel', title: 'Stripe Cancel — TreinAI', description: 'Pagamento cancelado.', robots: 'noindex' }
    ];

    const info = routes.find(r => r.match(path)) || defaults;
    const title = info.title || defaults.title;
    const description = info.description || defaults.description;
    const image = info.image || defaults.image;
    const type = info.type || defaults.type;
    const robots = info.robots || defaults.robots;

    document.title = title;
    setMeta('description', description);
    setMeta('robots', robots);
    setOG('og:title', title);
    setOG('og:description', description);
    setOG('og:type', type);
    setOG('og:url', makeCanonical(path));
    setOG('og:image', image);
    setCanonical(makeCanonical(path));

    return null;
  };

  return (
    <AuthProvider>
      <ToastProvider>
      <BrowserRouter>
        <RouteSEO />
        {/* <Menu /> */}

        <BannedGuard>
          <Routes>
            <Route path='/' element={<Home />} />
            <Route path='/p/:profissionalId' element={<PublicProfissional />} />
            <Route path='/login' element={<Login plano={plano} />} />
            <Route path='/login-nao-autorizado' element={<LoginNaoAutorizado />} />
            <Route path='/suporte' element={<SupportRoute />} />
            <Route path='/dashboard/*' element={<Dashboard plano={plano} />} />
            <Route path='/success?' element={<Success />} />
            <Route path='/cancel' element={<Cancel />} />
            <Route path='/pagamento-sucesso' element={<PagamentoSucesso />} />
            <Route path='/pagamento-cancelado' element={<PagamentoCancelado />} />
            <Route path='/sobre' element={<Sobre />} />
            <Route path='/termos' element={<Termos />} />
            <Route path='/politica-de-privacidade' element={<PoliticaPrivacidade />} />
            <Route path='/lgpd/exportar-dados' element={<LgpdDataExport />} />
            <Route path='*' element={<p className='font-bold p-5 w-full text-2xl'><Logo scale={1}/>404 Pagina não encontrada. \: <a href="/login" className='text-blue-300'>Ir para Login</a></p>} />
          </Routes>
        </BannedGuard>
        
        <GlobalToastContainer position="top-right" />
        <CookieConsent />
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
