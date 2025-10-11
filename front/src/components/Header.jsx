import React, { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LuMenu, LuX, LuInfo, LuFileText, LuShield, LuLayoutDashboard, LuLogIn } from 'react-icons/lu'
import Logo from './Logo'
import { FaHome } from 'react-icons/fa'

function Header({ logado }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen)
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
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className='flex max-w-full min-w-3/4 md:min-w-1/2 fixed top-2 left-1/2 z-100 mt-4 transform -translate-x-1/2 justify-between items-center bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl select-none shadow-lg'
        >
            {/* Logo e título */}
            <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
                <Link to={'/'} className='flex items-center group'>
                    <motion.div
                        className='mr-2 rounded-4xl flex items-center justify-center'
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.7 }}
                    >
                        <Logo scale={0.8} />
                    </motion.div>
                    <h1 className='font-bold text-lg md:text-4xl bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent group-hover:from-green-400 group-hover:to-blue-400 transition-all duration-300'>
                        TreinAI
                    </h1>
                </Link>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
                {/* Links institucionais */}
                <div className="flex items-center gap-6">
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
                                        `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 relative group ${isActive
                                            ? 'text-green-400 bg-green-400/10'
                                            : 'text-gray-300 hover:text-white hover:bg-white/10'
                                        }`
                                    }
                                >
                                    <IconComponent className="w-4 h-4" />
                                    {item.label}
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
                >
                    {logado ? (
                        <NavLink
                            to="/dashboard"
                            className={({ isActive }) =>
                                `flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${isActive
                                    ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-500/25'
                                    : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 hover:shadow-lg hover:shadow-green-500/25 hover:scale-105'
                                }`
                            }
                        >
                            <LuLayoutDashboard className="w-4 h-4" />
                            Dashboard
                        </NavLink>
                    ) : (
                        <NavLink
                            to="/login"
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-green-700 hover:shadow-lg hover:shadow-green-500/25 hover:scale-105 transition-all duration-300"
                        >
                            <LuLogIn className="w-4 h-4" />
                            Login
                        </NavLink>
                    )}
                </motion.div>
            </div>

            {/* Mobile Menu Button */}
            <motion.button
                className="md:hidden ml-2 p-2 rounded-lg ring border-2 border-transparent ring-blue-600 bg-white/40 hover:bg-white/20 transition-colors"
                onClick={toggleMobileMenu}
                whileTap={{ scale: 0.95 }}
            >
                <motion.div
                    animate={{ rotate: mobileMenuOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {mobileMenuOpen ? (
                        <LuX className="w-6 h-6 font-extralight text-blue-600"/>
                    ) : (
                        <LuMenu className="w-6 h-6 font-extralight  text-blue-600"/>
                    )}
                </motion.div>
            </motion.button>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                                                                    
                        {/* Mobile Menu */}
                        <motion.div
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="absolute top-full left-4 right-4 mt-3 z-50 md:hidden"
                            role="menu"
                            aria-label="Menu de navegação móvel"
                        >
                            <div className="bg-white/95 backdrop-blur-xl border border-white/30 rounded-2xl shadow-2xl overflow-hidden">
                                {/* Menu Header */}
                                <div className="px-6 py-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 border-b border-white/20">
                                    <h3 className="text-lg font-semibold text-gray-800">Menu</h3>
                                </div>
                                
                                {/* Navigation Items */}
                                <div className="p-4 space-y-1">
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
                                                        `flex items-center gap-4 px-4 py-3.5 rounded-xl font-medium transition-all duration-300 group ${isActive
                                                            ? 'text-green-600 bg-green-50 border border-green-200 shadow-sm'
                                                            : 'text-gray-700 hover:text-green-600 hover:bg-gray-50 active:bg-gray-100'
                                                        }`
                                                    }
                                                    role="menuitem"
                                                >
                                                    <IconComponent className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${({ isActive }) => isActive ? 'text-green-600' : 'text-gray-500'}`} />
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
                                    className="p-4 pt-2 border-t border-gray-200/50"
                                >
                                    {logado ? (
                                        <NavLink
                                            to="/dashboard"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="flex items-center justify-center gap-3 w-full px-4 py-3.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                                            role="menuitem"
                                        >
                                            <LuLayoutDashboard className="w-5 h-5" />
                                            <span>Dashboard</span>
                                        </NavLink>
                                    ) : (
                                        <NavLink
                                            to="/login"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="flex items-center justify-center gap-3 w-full px-4 py-3.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                                            role="menuitem"
                                        >
                                            <LuLogIn className="w-5 h-5" />
                                            <span>Entrar</span>
                                        </NavLink>
                                    )}
                                </motion.div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

export default Header
