import React, { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LuMenu, LuX, LuInfo, LuFileText, LuShield, LuLayoutDashboard, LuLogIn, LuChevronUp, LuChevronDown } from 'react-icons/lu'
import Logo from './Logo'
import { FaHome } from 'react-icons/fa'

function Header({ logado }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [isMinimized, setIsMinimized] = useState(false)

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen)
    }

    const toggleMinimize = () => {
        setIsMinimized(!isMinimized)
    }

    const navItems = [
        { to: "/", label: "Inicio", icon: FaHome },
        { to: "/sobre", label: "Sobre", icon: LuInfo },
        { to: "/termos", label: "Termos", icon: LuFileText },
        { to: "/politica-de-privacidade", label: "Privacidade", icon: LuShield }
    ]

    return (
        <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ 
                y: 0, 
                opacity: 1,
                width: isMinimized ? "auto" : "auto"
            }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={`flex w-full max-w-7xl ${isMinimized ? 'min-w-fit px-2 py-2 sm:px-3 sm:py-3' : 'min-w-[90%] sm:min-w-[85%] md:min-w-[75%] lg:min-w-[60%] xl:min-w-[50%] px-3 py-3 sm:px-4 sm:py-4 md:p-5'} fixed top-2 left-1/2 z-100 mt-2 sm:mt-4 transform -translate-x-1/2 items-center justify-between bg-black/10 backdrop-blur-md border border-white/20 rounded-xl sm:rounded-2xl select-none shadow-lg transition-all duration-500`}
        >
            {/* Logo e título */}
            <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
                <Link to={'/'} className='flex items-center group'>
                    <motion.div
                        className='mr-1 sm:mr-2 rounded-4xl flex items-center justify-center'
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.7 }}
                    >
                        <Logo scale={0.6} className="sm:scale-75 md:scale-100" />
                    </motion.div>
                    <h1 className='font-bold text-base sm:text-lg md:text-2xl lg:text-3xl xl:text-4xl bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent group-hover:from-green-400 group-hover:to-blue-400 transition-all duration-300 drop-shadow-lg'>
                        TreinAI
                    </h1>
                </Link>
            </motion.div>

            {/* Botão de Minimizar/Maximizar */}
            <motion.button
                className="ml-2 sm:ml-3 md:ml-4 p-1.5 sm:p-2 rounded-lg bg-black/30 hover:bg-black/40 transition-all duration-300 border border-white/20 hover:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent"
                onClick={toggleMinimize}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
                aria-label={isMinimized ? "Maximizar header" : "Minimizar header"}
                title={isMinimized ? "Maximizar header" : "Minimizar header"}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        toggleMinimize()
                    }
                }}
            >
                <motion.div
                    animate={{ rotate: isMinimized ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {isMinimized ? (
                        <LuChevronDown className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
                    ) : (
                        <LuChevronUp className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
                    )}
                </motion.div>
            </motion.button>

            {/* Desktop Navigation */}
            <AnimatePresence>
            {!isMinimized && (
                <motion.div 
                    className="hidden ml-2 sm:ml-4 md:ml-6 lg:flex items-center gap-2 sm:gap-4 md:gap-6"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                >
                {/* Links institucionais */}
                <div className="flex bg-black/30 p-2 rounded-2xl items-center gap-2 sm:gap-4 md:gap-6">
                    {navItems.map((item, index) => {
                        const IconComponent = item.icon
                        return (
                            <motion.div
                                key={item.to}
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 + 0.3 }}
                                whileHover={{ y: -2 }}
                            >
                                <NavLink
                                    to={item.to}
                                    className={({ isActive }) =>
                                        `flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 relative group drop-shadow-md ${isActive
                                            ? 'text-green-400 bg-green-400/10 border border-green-400 text-shadow-sm'
                                            : 'text-gray-300 hover:text-white hover:bg-white/10 text-shadow-sm'
                                        }`
                                    }
                                >
                                    <IconComponent className="w-3 h-3 sm:w-4 sm:h-4" />
                                    <span className="hidden sm:inline">{item.label}</span>
                                    <motion.div
                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-green-400 rounded-full"
                                        initial={{ scaleX: 0 }}
                                        whileHover={{ scaleX: 1 }}
                                        transition={{ duration: 0.3 }}
                                    />
                                </NavLink>
                            </motion.div>
                        )
                    })}
                </div>

                {/* CTA Buttons */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="ml-2 sm:ml-4 md:ml-6"
                >
                    {logado ? (
                        <NavLink
                            to="/dashboard"
                            className={({ isActive }) =>
                                `flex items-center gap-1 sm:gap-2 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm md:text-base font-semibold transition-all duration-300 drop-shadow-lg ${isActive
                                    ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-500/25 text-shadow-sm'
                                    : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 hover:shadow-lg hover:shadow-green-500/25 hover:scale-105 text-shadow-sm'
                                }`
                            }
                        >
                            <LuLayoutDashboard className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">Dashboard</span>
                        </NavLink>
                    ) : (
                        <NavLink
                            to="/login"
                            className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm md:text-base font-semibold hover:from-green-600 hover:to-green-700 hover:shadow-lg hover:shadow-green-500/25 hover:scale-105 transition-all duration-300 drop-shadow-lg text-shadow-sm"
                        >
                            <LuLogIn className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">Login</span>
                        </NavLink>
                    )}
                </motion.div>
            </motion.div>
            )}
            </AnimatePresence>

            {/* Mobile Menu Button */}
            <AnimatePresence>
            {!isMinimized && (
            <motion.button
                className="lg:hidden ml-1 sm:ml-2 p-1.5 sm:p-2 rounded-lg ring border-2 border-transparent ring-gray-200 bg-black/30 hover:bg-black/40 transition-colors"
                onClick={toggleMobileMenu}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
            >
                <motion.div
                    animate={{ rotate: mobileMenuOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {mobileMenuOpen ? (
                        <LuX className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 font-extralight text-gray-200"/>
                    ) : (
                        <LuMenu className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 font-extralight text-gray-200"/>
                    )}
                </motion.div>
            </motion.button>
            )}
            </AnimatePresence>

            {/* Mobile Menu Overlay */}
            {!isMinimized && (
            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                                                                    
                        {/* Mobile Menu */}
                        <motion.div
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="absolute top-full left-2 right-2 sm:left-4 sm:right-4 mt-2 sm:mt-3 z-50 lg:hidden"
                            role="menu"
                            aria-label="Menu de navegação móvel"
                        >
                            <div className="bg-white/95 backdrop-blur-xl border border-white/30 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden">
                                {/* Menu Header */}
                                <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 border-b border-white/20">
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-800">Menu</h3>
                                </div>
                                
                                {/* Navigation Items */}
                                <div className="p-3 sm:p-4 space-y-1">
                                    {navItems.map((item, index) => {
                                        const IconComponent = item.icon
                                        return (
                                            <motion.div
                                                key={item.to}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.08, ease: "easeOut" }}
                                            >
                                                <NavLink
                                                    to={item.to}
                                                    onClick={() => setMobileMenuOpen(false)}
                                                    className={({ isActive }) =>
                                                        `flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl text-sm sm:text-base font-medium transition-all duration-300 group ${isActive
                                                            ? 'text-green-600 bg-green-50 border border-green-200 shadow-sm'
                                                            : 'text-gray-700 hover:text-green-600 hover:bg-gray-50 active:bg-gray-100'
                                                        }`
                                                    }
                                                    role="menuitem"
                                                >
                                                    <IconComponent className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:scale-110 ${({ isActive }) => isActive ? 'text-green-600' : 'text-gray-500'}`} />
                                                    <span className="font-medium">{item.label}</span>
                                                </NavLink>
                                            </motion.div>
                                        )
                                    })}
                                </div>

                                {/* Action Button */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: navItems.length * 0.08 + 0.1, ease: "easeOut" }}
                                    className="p-3 sm:p-4 pt-2 border-t border-gray-200/50"
                                >
                                    {logado ? (
                                        <NavLink
                                            to="/dashboard"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="flex items-center justify-center gap-2 sm:gap-3 w-full px-3 sm:px-4 py-3 sm:py-3.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                                            role="menuitem"
                                        >
                                            <LuLayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5" />
                                            <span>Dashboard</span>
                                        </NavLink>
                                    ) : (
                                        <NavLink
                                            to="/login"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="flex items-center justify-center gap-2 sm:gap-3 w-full px-3 sm:px-4 py-3 sm:py-3.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                                            role="menuitem"
                                        >
                                            <LuLogIn className="w-4 h-4 sm:w-5 sm:h-5" />
                                            <span>Entrar</span>
                                        </NavLink>
                                    )}
                                </motion.div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            )}
        </motion.div>
    )
}

export default Header
