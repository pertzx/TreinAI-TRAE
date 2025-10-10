import React from 'react'
import { Link, NavLink } from 'react-router-dom'
import Logo from './Logo'

function Header({ logado }) {

    return (
        <div className='flex w-full justify-between items-center mb-5 bg-black/20 p-5 rounded-4xl select-none'>
            {/* Logo e título */}
            <Link to={'/'} className='flex items-center'>
                <div className='pr-2 rounded-4xl'><Logo scale={1} /></div>
                <h1 className='font-medium text-md md:text-4xl'>TreinAI</h1>
            </Link>

            {/* Links de navegação */}
            <div className="flex items-center gap-2 md:gap-4">
                {/* Links institucionais */}
                <div className="hidden md:flex items-center gap-2 text-sm">
                    <NavLink
                        to="/sobre"
                        className="text-gray-300 hover:text-white transition-colors"
                    >
                        Sobre
                    </NavLink>
                    <span className="text-gray-500">|</span>
                    <NavLink
                        to="/termos"
                        className="text-gray-300 hover:text-white transition-colors"
                    >
                        Termos
                    </NavLink>
                    <span className="text-gray-500">|</span>
                    <NavLink
                        to="/politica-de-privacidade"
                        className="text-gray-300 hover:text-white transition-colors"
                    >
                        Privacidade
                    </NavLink>
                </div>

                {logado && (
                    <NavLink
                        to="/dashboard"
                        className={({ isActive }) =>
                            `px-4 py-2 rounded-3xl ${isActive ? 'bg-green-700 text-white' : 'bg-green-600 text-white hover:bg-green-700'} transition-colors`
                        }
                    >
                        Dashboard
                    </NavLink>
                )}

                {!logado && (
                    <NavLink
                        to="/login"
                        className="px-4 py-2 bg-green-600 text-white rounded-3xl hover:bg-green-700 transition-colors"
                    >
                        Login
                    </NavLink>
                )}
            </div>
        </div>
    )
}

export default Header
