import React, { useEffect } from 'react'
import AdminSuporte from './AdminSuporte'
import AdminUsuarios from './AdminUsuarios'
import AdminAnuncios from './AdminAnuncios'
import AdminLocais from './AdminLocais'
import AdminRankings from './AdminRankings'
import AdminAvaliacoes from './AdminAvaliacoes'
import AdminEventos from './AdminEventos'
import AdminConfig from './AdminConfig'
import AdminPlanos from './AdminPlanos'
import AdminConquistas from './AdminConquistas'
import AdminAnalytics from './AdminAnalytics'
import AdminReports from './AdminReports'
import AdminAuditoria from './AdminAuditoria'

const AdminPage = ({ user, tema = 'dark' }) => {
  const isAdmin = !!(user && user.role === 'admin')

  const theme = {
    container: tema === 'dark' ? 'p-2 bg-gray-900 text-gray-100' : 'p-2 bg-white text-gray-900',
    muted: tema === 'dark' ? 'text-gray-400' : 'text-gray-500',
    panel: tema === 'dark' ? 'bg-gray-800' : 'bg-gray-50',
    border: tema === 'dark' ? 'border border-gray-700' : 'border border-gray-200',
    input: tema === 'dark'
      ? 'bg-gray-700 text-gray-100 border-gray-600 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
      : 'bg-white text-gray-900 border-gray-300 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500',
    button: 'bg-blue-600 hover:bg-blue-700 text-white'
  }

  const components = [
    { label: '📈 Visão Geral (Analytics)', element: <AdminAnalytics tema={tema} user={user} /> },
    { label: '👥 Usuários', element: <AdminUsuarios tema={tema} user={user} /> },
    { label: '📍 Locais', element: <AdminLocais tema={tema} user={user} /> },
    { label: '⭐ Avaliações', element: <AdminAvaliacoes tema={tema} user={user} /> },
    { label: '🛠️ Suportes', element: <AdminSuporte tema={tema} user={user} /> },
    { label: '📣 Anúncios', element: <AdminAnuncios tema={tema} user={user} /> },
    { label: '📊 Rankings', element: <AdminRankings tema={tema} user={user} /> },
    { label: '🎭 Eventos Globais', element: <AdminEventos tema={tema} user={user} /> },
    { label: '💰 Cobrança de IA (custo & margem)', element: <AdminConfig tema={tema} user={user} /> },
    { label: '💳 Planos (landing)', element: <AdminPlanos tema={tema} user={user} /> },
    { label: '🏆 Conquistas (card)', element: <AdminConquistas tema={tema} user={user} /> },
    { label: '🩺 Saúde do sistema', element: <AdminReports tema={tema} user={user} /> },
    { label: '📜 Auditoria', element: <AdminAuditoria tema={tema} user={user} /> }
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
    <div className={`${theme.container}`}>
      {components.map((comp, index) => (
        <div key={index} className={`mb-4 p-4 rounded-lg shadow ${theme.panel} ${theme.border}`}>
          <h2 className="text-lg font-semibold mb-2">{comp.label}</h2>
          <div>{comp.element}</div>
        </div>
      ))}
    </div>
  )
}

export default AdminPage
