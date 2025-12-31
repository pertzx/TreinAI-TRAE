import React, { useMemo, useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement
} from 'chart.js'
import { Pie, Bar, Line } from 'react-chartjs-2'
import api from '../../../../Api'
import { FiUsers, FiDollarSign, FiActivity, FiUserCheck, FiUserX, FiTrendingUp } from 'react-icons/fi'

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement
)

export default function AdminDashboard({ tema, user }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [supports, setSupports] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, supportsRes] = await Promise.all([
            api.post('/admin/usuarios', { adminId: user._id }),
            api.get(`/admin/supports-by-admin?adminId=${user._id}&perPage=5`)
        ])
        
        if (usersRes.data?.users) setUsers(usersRes.data.users)
        if (supportsRes.data?.supports) setSupports(supportsRes.data.supports)
      } catch (error) {
        console.error('Erro ao buscar dados dashboard', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user._id])

  const stats = useMemo(() => {
    if (!users.length) return null

    const planPrices = {
      'free': 0,
      'pro': 39.99,
      'max': 79.99,
      'coach': 149.99
    }

    let totalUsers = users.length
    let totalMRR = 0
    let activeToday = 0
    let planCounts = { free: 0, pro: 0, max: 0, coach: 0 }
    let platformDistribution = { mobile: 0, desktop: 0 }
    let newUsersLast30Days = 0

    const today = new Date().toDateString()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    users.forEach(u => {
      // Plan counts & MRR
      const p = (u.plan || 'free').toLowerCase()
      if (planCounts[p] !== undefined) planCounts[p]++
      else planCounts.free++ // fallback

      totalMRR += planPrices[p] || 0

      // Active today
      // Check last login or token usage today from u.stats
      // u.stats might be undefined if not populated correctly by backend, but let's try
      // AdminUsuarios.jsx logic suggests u.stats.deviceHistory exists
      
      let lastActivityDate = null
      if (u.stats?.deviceHistory?.length) {
         // Find most recent
         u.stats.deviceHistory.forEach(d => {
             const dDate = new Date(d.lastActivity || d.loginDate)
             if (!lastActivityDate || dDate > lastActivityDate) lastActivityDate = dDate
         })
      }

      if (lastActivityDate && lastActivityDate.toDateString() === today) {
          activeToday++
      }

      // New Users
      const createdAt = new Date(u.createdAt)
      if (createdAt > thirtyDaysAgo) newUsersLast30Days++
    })

    return {
      totalUsers,
      totalMRR: totalMRR.toFixed(2),
      activeToday,
      planCounts,
      newUsersLast30Days
    }
  }, [users])

  const chartTheme = {
      textColor: tema === 'dark' ? '#E5E7EB' : '#374151',
      gridColor: tema === 'dark' ? '#374151' : '#E5E7EB'
  }

  const pieData = {
    labels: ['Free', 'Pro', 'Max', 'Coach'],
    datasets: [
      {
        label: '# de Usuários',
        data: stats ? [stats.planCounts.free, stats.planCounts.pro, stats.planCounts.max, stats.planCounts.coach] : [],
        backgroundColor: [
          'rgba(156, 163, 175, 0.5)', // Gray for Free
          'rgba(59, 130, 246, 0.5)',  // Blue for Pro
          'rgba(139, 92, 246, 0.5)',  // Purple for Max
          'rgba(16, 185, 129, 0.5)',  // Green for Coach
        ],
        borderColor: [
          'rgba(156, 163, 175, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(139, 92, 246, 1)',
          'rgba(16, 185, 129, 1)',
        ],
        borderWidth: 1,
      },
    ],
  }

  if (loading) return <div className="p-4">Carregando dashboard...</div>
  if (!stats) return <div className="p-4">Sem dados para exibir.</div>

  return (
    <div className={`p-4 ${tema === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
        <h2 className="text-2xl font-bold mb-6">Visão Geral</h2>
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className={`p-4 rounded-xl shadow-sm border ${tema === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium opacity-70">Total Usuários</h3>
                    <FiUsers className="text-blue-500" />
                </div>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
                <p className="text-xs text-green-500 flex items-center mt-1">
                    <FiTrendingUp className="mr-1" /> +{stats.newUsersLast30Days} nos últimos 30 dias
                </p>
            </div>

            <div className={`p-4 rounded-xl shadow-sm border ${tema === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium opacity-70">MRR Estimado</h3>
                    <FiDollarSign className="text-green-500" />
                </div>
                <p className="text-2xl font-bold">R$ {stats.totalMRR}</p>
                <p className="text-xs opacity-50 mt-1">Baseado nos planos atuais</p>
            </div>

            <div className={`p-4 rounded-xl shadow-sm border ${tema === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium opacity-70">Ativos Hoje</h3>
                    <FiActivity className="text-orange-500" />
                </div>
                <p className="text-2xl font-bold">{stats.activeToday}</p>
                <p className="text-xs opacity-50 mt-1">Usuários que logaram hoje</p>
            </div>

            <div className={`p-4 rounded-xl shadow-sm border ${tema === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium opacity-70">Conversão Pro+</h3>
                    <FiUserCheck className="text-purple-500" />
                </div>
                <p className="text-2xl font-bold">
                    {((stats.planCounts.pro + stats.planCounts.max + stats.planCounts.coach) / stats.totalUsers * 100).toFixed(1)}%
                </p>
                <p className="text-xs opacity-50 mt-1">Taxa de assinantes pagos</p>
            </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className={`col-span-1 p-4 rounded-xl shadow-sm border ${tema === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <h3 className="text-lg font-semibold mb-4">Distribuição de Planos</h3>
                <div className="h-64 flex justify-center">
                    <Pie data={pieData} options={{ maintainAspectRatio: false }} />
                </div>
            </div>

            <div className={`col-span-2 p-4 rounded-xl shadow-sm border ${tema === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <h3 className="text-lg font-semibold mb-4">Últimos Tickets de Suporte</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className={`text-xs uppercase ${tema === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-700'}`}>
                            <tr>
                                <th className="px-4 py-3">Assunto</th>
                                <th className="px-4 py-3">Usuário</th>
                                <th className="px-4 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {supports.length > 0 ? supports.map(ticket => (
                                <tr key={ticket._id} className={`border-b ${tema === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                                    <td className="px-4 py-3 font-medium">{ticket.assunto}</td>
                                    <td className="px-4 py-3">{ticket.userId?.name || 'Anon'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs ${ticket.resposta ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {ticket.resposta ? 'Respondido' : 'Pendente'}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="3" className="px-4 py-3 text-center opacity-50">Nenhum ticket recente</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
  )
}
