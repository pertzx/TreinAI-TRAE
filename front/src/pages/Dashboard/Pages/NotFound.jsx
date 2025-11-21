import React from 'react'
import { NavLink } from 'react-router-dom'
import { FiHome, FiSearch, FiRepeat } from 'react-icons/fi'
import AdBanner from '../Components/AdBanner'

const NotFound = ({ user, tema }) => {
  const isDark = tema === 'dark'
  const bg = isDark ? 'bg-gradient-to-br from-gray-900 via-gray-950 to-black' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'
  const text = isDark ? 'text-white' : 'text-gray-900'
  const subtext = isDark ? 'text-gray-300' : 'text-gray-600'
  const card = isDark ? 'bg-gray-900/60 border border-gray-800' : 'bg-white/80 border border-gray-200'
  const btn = isDark ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'

  return (
    <div className={`${bg} min-h-[70vh] rounded-2xl p-4 sm:p-6 lg:p-8`}> 
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2">
          <div className={`rounded-2xl p-6 sm:p-8 ${card}`}> 
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/20 flex items-center justify-center">
                <span className="text-2xl font-bold text-blue-600">404</span>
              </div>
              <h1 className={`text-2xl sm:text-3xl font-extrabold ${text}`}>Página não encontrada</h1>
            </div>
            <p className={`mb-6 ${subtext}`}>Não foi possível localizar o conteúdo solicitado. Aproveite para explorar outras áreas enquanto exibimos recomendações.</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <NavLink to="/dashboard" className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl ${btn}`}>
                <FiHome className="w-5 h-5" />
                Home
              </NavLink>
              <NavLink to="/dashboard/encontrar" className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl ${btn}`}>
                <FiSearch className="w-5 h-5" />
                Encontrar
              </NavLink>
              <NavLink to="/dashboard" className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl ${btn}`}>
                <FiRepeat className="w-5 h-5" />
                Tentar novamente
              </NavLink>
            </div>

            <div className="mt-6 sm:mt-8 rounded-2xl overflow-hidden">
              <AdBanner tema={tema} user={user} showPlaceholder={true} className="w-full h-[140px] sm:h-[160px]" />
            </div>
          </div>
        </div>

        <div className="space-y-4 lg:space-y-6">
          <div className={`rounded-2xl p-4 ${card}`}>
            <AdBanner tema={tema} user={user} showPlaceholder={true} className="w-full h-[180px]" />
          </div>
          <div className={`rounded-2xl p-4 ${card}`}>
            <AdBanner tema={tema} user={user} showPlaceholder={true} className="w-full h-[220px]" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotFound