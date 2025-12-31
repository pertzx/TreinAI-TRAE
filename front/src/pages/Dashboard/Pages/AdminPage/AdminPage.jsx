import React, { useEffect, useState } from 'react'
import AdminDashboard from './AdminDashboard'
import AdminSuporte from './AdminSuporte'
import AdminUsuarios from './AdminUsuarios'
import AdminAnuncios from './AdminAnuncios'
import AdminLocais from './AdminLocais'
import AdminRankings from './AdminRankings'
import AdminAvaliacoes from './AdminAvaliacoes'
import AdminReports from './AdminReports'
import AdminCacheRedis from './AdminCacheRedis'

const AdminPage = ({ user, tema = 'dark' }) => {
  const isAdmin = !!(user && user.role === 'admin')
  const [activeTab, setActiveTab] = useState('dashboard')

  const theme = {
    container: tema === 'dark' ? 'p-2 bg-gray-900 text-gray-100' : 'p-2 bg-white text-gray-900',
    muted: tema === 'dark' ? 'text-gray-400' : 'text-gray-500',
    panel: tema === 'dark' ? 'bg-gray-800' : 'bg-gray-50',
    border: tema === 'dark' ? 'border-gray-700' : 'border-gray-200',
    input: tema === 'dark'
      ? 'bg-gray-700 text-gray-100 border-gray-600 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
      : 'bg-white text-gray-900 border-gray-300 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500',
    button: 'bg-blue-600 hover:bg-blue-700 text-white',
    tabActive: tema === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white',
    tabInactive: tema === 'dark' ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
  }

  const tabs = [
    { id: 'dashboard', label: '📊 Visão Geral', component: <AdminDashboard tema={tema} user={user} /> },
    { id: 'usuarios', label: '👥 Usuários', component: <AdminUsuarios tema={tema} user={user} /> },
    { id: 'reports', label: '📈 Relatórios AI', component: <AdminReports tema={tema} user={user} /> },
    { id: 'cache', label: '🗄️ Cache Redis', component: <AdminCacheRedis tema={tema} user={user} /> },
    { id: 'suporte', label: '🛠️ Suportes', component: <AdminSuporte tema={tema} user={user} /> },
    { id: 'locais', label: '📍 Locais', component: <AdminLocais tema={tema} user={user} /> },
    { id: 'avaliacoes', label: '⭐ Avaliações', component: <AdminAvaliacoes tema={tema} user={user} /> },
    { id: 'anuncios', label: '📣 Anúncios', component: <AdminAnuncios tema={tema} user={user} /> },
    { id: 'rankings', label: '📊 Rankings', component: <AdminRankings tema={tema} user={user} /> }
  ]

  useEffect(() => {
    document.title = isAdmin ? 'Admin - TreinAI' : 'Acesso negado - TreinAI'
  }, [isAdmin])

  if (!isAdmin) {
    return (
      <div className={`${theme.container}`}>
        <div className={`p-4 rounded-lg shadow ${theme.panel} ${theme.border}`}>
          Acesso negado. Você não tem permissão para acessar esta página.
        </div>
      </div>
    )
  }

  return (
    <div className={`${theme.container} min-h-screen`}>
      <div className="mb-6 overflow-x-auto pb-2">
        <div className="flex space-x-2 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id ? theme.tabActive : theme.tabInactive
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="animate-fade-in">
        {tabs.find(t => t.id === activeTab)?.component}
      </div>
    </div>
  )
}

export default AdminPage
