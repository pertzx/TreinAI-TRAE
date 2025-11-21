import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import Logo from '../../../components/Logo';
import { LuMenu, LuX } from 'react-icons/lu';
import { FaHome, FaSearch, FaDumbbell, FaChartLine, FaGamepad, FaUser, FaCog, FaUserShield, FaQuestionCircle, FaUserTie, FaComments, FaTrophy } from 'react-icons/fa';
import { buildImageUrl } from '../../../utils/imageUtils';
import { useUnreadChats } from '../../../hooks/useUnreadChats';
import { motion, AnimatePresence } from 'framer-motion';
import AdBanner from './AdBanner';

const Header = ({ user, tema }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [bannerProgress, setBannerProgress] = useState(1);
  const [atTop, setAtTop] = useState(true);
  const [userWantsVisible, setUserWantsVisible] = useState(true);
  const scrollDebounceRef = useRef(null);
  const lastScrollYRef = useRef(typeof window !== 'undefined' ? window.scrollY : 0);
  const [viewportW, setViewportW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const bannerContentRef = useRef(null);
  const [bannerHeight, setBannerHeight] = useState(0);

  // Hook para detectar chats não lidos
  const { hasUnreadChats } = useUnreadChats(user?.userId || user?._id || user?.id);

  const navLinks = [
    { name: 'Home', href: '/dashboard', icon: FaHome },
    { name: 'Encontrar', href: '/dashboard/encontrar', icon: FaSearch },
    { name: 'Meus Treinos', href: '/dashboard/meus-treinos', icon: FaDumbbell },
    { name: 'Histórico', href: '/dashboard/historico', icon: FaChartLine },
    { name: 'Recordes', href: '/dashboard/recordes', icon: FaTrophy },
    { name: 'Coach', href: '/dashboard/coach', icon: FaUserTie },
    { name: 'Perfil', href: '/dashboard/perfil', icon: FaUser },
    { name: 'Configurações', href: '/dashboard/configuracoes', icon: FaCog },
    { name: 'Ajuda', href: '/dashboard/ajuda', icon: FaQuestionCircle },
  ];

  // Adicionar Admin apenas se o usuário for admin
  if (user?.role === 'admin' || user?.isAdmin) {
    navLinks.splice(-1, 0, { name: 'Admin', href: '/dashboard/admin', icon: FaUserShield });
  }

  // Classes do tema
  const themeClasses = tema === 'dark'
    ? {
      headerBg: 'text-white border-b border-blue-600',
      logoText: 'text-blue-600',
      linkHover: 'hover:text-blue-400',
      buttonBg: 'bg-green-500 hover:bg-green-600 text-white'
    }
    : {
      headerBg: 'text-black border-b border-gray-300',
      logoText: 'text-blue-700',
      linkHover: 'hover:text-blue-500',
      buttonBg: 'bg-green-600 hover:bg-green-700 text-white'
    };

  // Scroll detector with 100ms debounce (progressive resize)
  useEffect(() => {
    const handler = () => {
      if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
      const currentY = window.scrollY || 0;
      lastScrollYRef.current = currentY;
      scrollDebounceRef.current = setTimeout(() => {
        const TOP_T = 100;
        const isTop = currentY <= TOP_T;
        setAtTop(isTop);
        setBannerVisible(isTop);
        setBannerProgress(isTop ? 1 : 0);
      }, 50);
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => {
      window.removeEventListener('scroll', handler);
      if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
    };
  }, [viewportW]);

  useEffect(() => {
    let resizeTimer = null;
    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setViewportW(window.innerWidth);
        if (bannerContentRef.current) {
          const measured = bannerContentRef.current.offsetHeight || 0;
          if (measured) setBannerHeight(measured);
        }
      }, 100);
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      window.removeEventListener('resize', onResize);
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, []);

  

  useEffect(() => {
    if (bannerContentRef.current && bannerHeight === 0) {
      const measured = bannerContentRef.current.offsetHeight || 0;
      setBannerHeight(measured || (viewportW < 640 ? 96 : 120));
    }
  }, [viewportW, bannerHeight]);

  const baseHeight = bannerHeight || (viewportW < 640 ? 96 : 120);

  return (
    <header
      className={`${themeClasses.headerBg} backdrop-blur-sm sticky top-0 z-50 p-3 flex flex-col gap-4 mb-3`}
    >
      <div className="flex justify-between flex-col gap-2 sm:flex-row sm:gap-0 items-center">
        {/* Logo e nome */}
        <NavLink to="/dashboard" className="flex items-center gap-2">
          <Logo scale={1} />
          <h1 className={`font-bold text-2xl ${themeClasses.logoText}`}>TreinAI</h1>
        </NavLink>

        {/* NavLinks desktop */}
        <nav className="hidden 2xl:flex gap-5">
          {navLinks.map((link) => (
            <NavLink
              key={link.href}
              to={link.href}
              end={link.href === '/dashboard'} // Aplica end apenas no Home
              className={({ isActive }) =>
                `${themeClasses.linkHover} transition ${isActive ? 'font-bold text-blue-600' : ''} flex items-center gap-2`
              }
            >
              <link.icon />
              {link.name}
            </NavLink>
          ))}
        </nav>

        {/* Botão e círculo */}
        <div className="flex items-center gap-4">

          <p>Olá, {user.username}</p>

          {/* Botão de Chat com notificação */}
          <NavLink
            to="/dashboard/chat"
            className={({ isActive }) =>
              `relative p-2 rounded-full transition-colors ${isActive
                ? 'bg-blue-600 text-white'
                : tema === 'dark'
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`
            }
            title="Chat"
          >
            <FaComments className="text-lg" />
            {hasUnreadChats && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-white"></span>
            )}
          </NavLink>

          <NavLink to="/dashboard/perfil" className="w-10 h-10 rounded-full bg-blue-600"
            style={{
              backgroundImage: `url(${buildImageUrl(user.avatar)})`,
              backgroundPosition: 'center',
              backgroundSize: 'cover',
              backgroundRepeat: 'no-repeat'
            }}
          ></NavLink>



          {/* Botão mobile para abrir menu */}
          <AnimatePresence>
            <motion.button
              animate={{ rotate: menuOpen ? 90 : 0 }}
              className="2xl:hidden ml-2 p-2 bg-gray-300/5 rounded-full border border-gray-300"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <LuX className="text-2xl" /> : <LuMenu className="text-2xl" />}
            </motion.button>
          </AnimatePresence>
        </div>
      </div>

      {/* Menu mobile */}
      {menuOpen && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gray-300/5 backdrop-blur-sm p-4 rounded-2xl shadow-lg border border-gray-200"
          >
            <nav className="flex flex-col gap-3 2xl:hidden">
              {navLinks.map((link) => (
                <NavLink
                  key={link.href}
                  to={link.href}
                  end={link.href === '/dashboard'} // Aplica end apenas no Home
                  className={({ isActive }) =>
                    `${themeClasses.linkHover} transition ${isActive ? 'font-bold text-blue-600' : ''} flex items-center gap-2`
                  }
                  onClick={() => setMenuOpen(false)} // fecha menu ao clicar
                >
                  <link.icon />
                  {link.name}
                </NavLink>
              ))}
            </nav>
          </motion.div>

          {user && user.planInfos && user.planInfos.planType && user.planInfos.planType === "free" && (
            <motion.div
              className="rounded-xl overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, ease: 'easeInOut' }}
            >
              <div ref={bannerContentRef} className="w-full">
                <AdBanner tema={tema} user={user} showPlaceholder={true} className="w-full" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {user && user.planInfos && user.planInfos.planType && user.planInfos.planType === "free" && (
        <motion.div
          className={`${!bannerVisible ? 'hidden' : ''} rounded-xl overflow-hidden`}
          initial={{ height: baseHeight, opacity: 1 }}
          animate={{ height: bannerVisible ? baseHeight : 0, opacity: bannerVisible ? 1 : 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          <div ref={bannerContentRef} className="w-full">
            <AdBanner tema={tema} user={user} showPlaceholder={true} className="w-full" />
          </div>
        </motion.div>
      )}
    </header>
  );
};


export default Header;