import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import Logo from '../../../components/Logo';
import { LuMenu } from 'react-icons/lu';
import { FaHome, FaSearch, FaDumbbell, FaChartLine, FaGamepad, FaUser, FaCog, FaUserShield, FaQuestionCircle, FaUserTie, FaComments } from 'react-icons/fa';
import { buildImageUrl } from '../../../utils/imageUtils';
import { useUnreadChats } from '../../../hooks/useUnreadChats';

const Header = ({ user, tema }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Hook para detectar chats não lidos
  const { hasUnreadChats } = useUnreadChats(user?.userId || user?._id || user?.id);

  const navLinks = [
    { name: 'Home', href: '/dashboard', icon: FaHome },
    { name: 'Encontrar', href: '/dashboard/encontrar', icon: FaSearch },
    { name: 'Meus Treinos', href: '/dashboard/meus-treinos', icon: FaDumbbell },
    { name: 'Histórico', href: '/dashboard/historico', icon: FaChartLine },
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
      headerBg: 'bg-[#10151e] text-white border-b border-blue-600',
      logoText: 'text-blue-600',
      linkHover: 'hover:text-blue-400',
      buttonBg: 'bg-green-500 hover:bg-green-600 text-white'
    }
    : {
      headerBg: 'bg-white text-black border-b border-gray-300',
      logoText: 'text-blue-700',
      linkHover: 'hover:text-blue-500',
      buttonBg: 'bg-green-600 hover:bg-green-700 text-white'
    };

  return (
    <header className={`${themeClasses.headerBg} p-3`}>
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
                `${themeClasses.linkHover} transition ${isActive ? 'font-bold' : ''} flex items-center gap-2`
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
              `relative p-2 rounded-full transition-colors ${
                isActive 
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
          <button
            className="2xl:hidden ml-2"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <LuMenu className="text-2xl" />
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      {menuOpen && (
        <nav className="flex flex-col gap-3 mt-3 2xl:hidden">
          {navLinks.map((link) => (
            <NavLink
              key={link.href}
              to={link.href}
              end={link.href === '/dashboard'} // Aplica end apenas no Home
              className={({ isActive }) =>
                `${themeClasses.linkHover} transition ${isActive ? 'font-bold' : ''} flex items-center gap-2`
              }
              onClick={() => setMenuOpen(false)} // fecha menu ao clicar
            >
              <link.icon />
              {link.name}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
};

export default Header;
