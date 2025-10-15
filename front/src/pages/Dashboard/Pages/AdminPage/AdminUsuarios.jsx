import React, { useEffect, useMemo, useState, useCallback } from 'react'
import api from '../../../../Api'
import { getBrazilDate } from '../../../../../helpers/getBrazilDate.js'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

export default function AdminUsuarios({ tema, user }) {
  // Validação de segurança - apenas admins podem acessar
  const isAdmin = !!(user && user.role === 'admin')

  const [usuarios, setUsuarios] = useState([])
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const [mostrar, setMostrar] = useState(false)

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(50)

  // Filtros
  const [filterPlan, setFilterPlan] = useState('all') // all, free, pro, max, coach
  const [filterStatus, setFilterStatus] = useState('all') // all, ativo, inativo
  const [q, setQ] = useState('') // pesquisa

  // Ordenação
  const [sortBy, setSortBy] = useState('none') // none, tokens_desc, tokens_asc

  // Estados para gráficos
  const [selectedUser, setSelectedUser] = useState(null)
  const [showMainChart, setShowMainChart] = useState(false)
  const [showIndividualCharts, setShowIndividualCharts] = useState(false)

  const fetchUsuarios = async () => {
    try {
      // Buscar usuários usando apenas cookies httpOnly
      const res = await api.post('/admin/usuarios', { adminId: user._id })
      console.log(res)
      if (res.data?.users) setUsuarios(res.data.users)
      if (res.data?.msg) setMsg(res.data.msg)
      if (res.data?.erro) setErro(res.data.erro)

      setTimeout(() => { setMsg(''); setErro('') }, 3000)
    } catch (error) {
      console.error(error)
      setErro('Erro ao buscar usuários. Tente novamente mais tarde.')
      setTimeout(() => { setMsg(''); setErro('') }, 3000)
    }
  }

  useEffect(() => {
    fetchUsuarios()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Função para enriquecer dados dos usuários com cálculos de tokens e dispositivos
  const enrichedUsers = useMemo(() => {
    if (!usuarios || !Array.isArray(usuarios)) return [];

    // Função para formatar data no padrão brasileiro
    const brazilDayKey = (date) => {
      if (!date) return null;
      const d = new Date(date);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    };

    const today = brazilDayKey(new Date());

    return usuarios.map(user => {
      // Cálculo de tokens
      const tokenEntries = user.stats?.tokens || [];
      const tokensTotal = Array.isArray(tokenEntries)
        ? tokenEntries.reduce((sum, entry) => {
          if (!entry || typeof entry !== 'object') return sum;
          const valor = entry.valor || entry.value || 0;
          return sum + (typeof valor === 'number' ? valor : 0);
        }, 0)
        : 0;

      const tokensToday = Array.isArray(tokenEntries)
        ? tokenEntries
          .filter(entry => {
            if (!entry || typeof entry !== 'object') return false;
            const entryDate = entry.data || entry.date || entry.createdAt || entry.publishedAt;
            return brazilDayKey(entryDate) === today;
          })
          .reduce((sum, entry) => {
            const valor = entry.valor || entry.value || 0;
            return sum + (typeof valor === 'number' ? valor : 0);
          }, 0)
        : 0;

      // Cálculo de dispositivos
      const deviceHistory = user.stats?.deviceHistory || [];
      const totalLoginCount = Array.isArray(deviceHistory)
        ? deviceHistory.reduce((sum, device) => {
          return sum + (device.loginCount || 0);
        }, 0)
        : 0;

      // Encontrar a lastActivity mais recente
      const mostRecentActivity = Array.isArray(deviceHistory) && deviceHistory.length > 0
        ? deviceHistory.reduce((latest, device) => {
          const deviceActivity = device.lastActivity || device.loginDate;
          if (!deviceActivity) return latest;

          const deviceDate = new Date(deviceActivity);
          const latestDate = latest ? new Date(latest) : new Date(0);

          return deviceDate > latestDate ? deviceActivity : latest;
        }, null)
        : null;

      return {
        ...user,
        tokensTotal,
        tokensToday,
        totalLoginCount,
        mostRecentActivity,
        deviceCount: Array.isArray(deviceHistory) ? deviceHistory.length : 0
      };
    });

  }
    // </div >
  )
  // Função para gerar dados do gráfico principal (todos os usuários)
  const generateMainChartData = useMemo(() => {
    if (!usuarios || usuarios.length === 0) return null

    // Agregar tokens de todos os usuários por data
    const aggregatedData = {}
    
    usuarios.forEach(user => {
      if (user.tokens && Array.isArray(user.tokens)) {
        user.tokens.forEach(token => {
          // Tentar diferentes formatos de data
          const dateValue = token.date || token.createdAt || token.timestamp || token.data
          const tokenValue = token.value || token.amount || token.tokens || token.quantidade || 0
          
          if (dateValue && tokenValue) {
            const date = new Date(dateValue).toISOString().split('T')[0] // YYYY-MM-DD
            aggregatedData[date] = (aggregatedData[date] || 0) + tokenValue
          }
        })
      }
    })

    // Converter para array e ordenar por data
    const sortedData = Object.entries(aggregatedData)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .slice(-30) // Últimos 30 dias

    if (sortedData.length === 0) return null

    return {
      labels: sortedData.map(([date]) => {
        const d = new Date(date)
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      }),
      datasets: [{
        label: 'Tokens Gastos (Todos os Usuários)',
        data: sortedData.map(([, value]) => value),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      }]
    }
  }, [usuarios])

  // Função para gerar dados do gráfico individual de um usuário (memoizada para performance)
  const generateUserChartData = useCallback((user) => {
    if (!user || !user.stats ||!user.stats.tokens || !Array.isArray(user.stats.tokens)) return null

    // Agregar tokens por data para este usuário específico
    const aggregatedData = {}
    
    user.stats.tokens.forEach(token => {
      const dateValue = token.date || token.createdAt || token.timestamp || token.data
      const tokenValue = token.valor || token.amount || token.tokens || token.quantidade || 0
      
      if (dateValue && tokenValue) {
        const date = new Date(dateValue).toISOString()
        aggregatedData[date] = (aggregatedData[date] || 0) + tokenValue
      }
    })

    const sortedData = Object.entries(aggregatedData)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .slice(-15) // Últimos 15 dias para gráficos individuais

    if (sortedData.length === 0) return null

    return {
      labels: sortedData.map(([date]) => {
        const d = new Date(date)
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      }),
      datasets: [{
        label: `Tokens - ${user.name || user.username}`,
        data: sortedData.map(([, value]) => value),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: 'rgb(16, 185, 129)',
        pointBorderColor: '#fff',
        pointBorderWidth: 1,
        pointRadius: 2,
        pointHoverRadius: 4,
      }]
    }
  }, [])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: tema === 'dark' ? '#E5E7EB' : '#374151',
          font: { size: 12 }
        }
      },
      title: {
        display: false
      }
    },
    scales: {
      x: {
        grid: {
          color: tema === 'dark' ? '#374151' : '#E5E7EB',
          borderColor: tema === 'dark' ? '#4B5563' : '#D1D5DB'
        },
        ticks: {
          color: tema === 'dark' ? '#9CA3AF' : '#6B7280',
          font: { size: 11 }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: tema === 'dark' ? '#374151' : '#E5E7EB',
          borderColor: tema === 'dark' ? '#4B5563' : '#D1D5DB'
        },
        ticks: {
          color: tema === 'dark' ? '#9CA3AF' : '#6B7280',
          font: { size: 11 }
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  }

  // Opções específicas para gráficos individuais (menores)
  const individualChartOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      legend: {
        display: false
      }
    },
    scales: {
      ...chartOptions.scales,
      x: {
        ...chartOptions.scales.x,
        ticks: {
          ...chartOptions.scales.x.ticks,
          maxTicksLimit: 5
        }
      }
    }
  }
  
  const filteredUsers = useMemo(() => {
    const term = q.trim().toLowerCase()
    let list = enrichedUsers.filter(u => {
      const planType = (u?.planInfos?.planType || '').toLowerCase()
      const status = (u?.planInfos?.status || '').toLowerCase()

      if (filterPlan !== 'all' && planType !== filterPlan) return false
      if (filterStatus !== 'all' && status !== filterStatus) return false

      if (!term) return true

      const fields = [u.name, u.username, u.email, planType, status]
      return fields.some(f => (f || '').toString().toLowerCase().includes(term))
    })

    if (sortBy === 'tokens_desc') {
      list.sort((a, b) => (b.tokensTotal || 0) - (a.tokensTotal || 0))
    } else if (sortBy === 'tokens_asc') {
      list.sort((a, b) => (a.tokensTotal || 0) - (b.tokensTotal || 0))
    }

    return list
  }, [enrichedUsers, filterPlan, filterStatus, q, sortBy])

  // Atualiza pagina quando filtros/perPage mudam
  useEffect(() => {
    setCurrentPage(1)
  }, [filteredUsers.length, perPage])

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredUsers.length / perPage))
  }, [filteredUsers.length, perPage])

  const pagedUsuarios = useMemo(() => {
    const start = (currentPage - 1) * perPage
    return filteredUsers.slice(start, start + perPage)
  }, [filteredUsers, currentPage, perPage])

  // Memoizar usuários com dados de gráfico para otimizar performance
  const usersWithChartData = useMemo(() => {
    return pagedUsuarios.filter(user => generateUserChartData(user) !== null)
  }, [pagedUsuarios, generateUserChartData])

  const gotoPage = (n) => {
    const page = Math.min(Math.max(1, n), totalPages)
    setCurrentPage(page)
  }

  const clearFilters = () => {
    setFilterPlan('all')
    setFilterStatus('all')
    setQ('')
    setSortBy('none')
  }

  // Verificação de segurança
  if (!isAdmin) {
    return (
      <div className="p-4 text-red-600">
        Acesso negado: somente administradores podem gerenciar usuários.
      </div>
    )
  }

  return (
    <div className={`p-6 ${tema === 'dark' ? ' text-white' : ' text-gray-900'}`}>
      {erro !== '' && <p className='text-white bg-red-800 p-3 rounded-2xl fixed right-2 top-2 z-50'>{erro}</p>}
      {msg !== '' && <p className='text-white bg-green-500 p-3 rounded-2xl fixed right-2 top-2 z-50'>{msg}</p>}

      {/* Header com título e botões */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className={`text-3xl font-bold ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Administração de Usuários
          </h1>
          <p className={`text-sm ${tema === 'dark' ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
            Gerencie usuários, visualize estatísticas e monitore atividades
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setMostrar(!mostrar)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${tema === 'dark' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
          >
            {mostrar ? 'Ocultar Usuários' : 'Mostrar Usuários'}
          </button>
        </div>
      </div>

      {mostrar && (
        <div className={`p-4 rounded-lg shadow-sm ${tema === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
          {/* Controles de filtro melhorados */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${tema === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Plano:
              </label>
              <select
                value={filterPlan}
                onChange={e => setFilterPlan(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border transition-colors duration-200 ${tema === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
              >
                <option value='all'>Todos</option>
                <option value='free'>Free</option>
                <option value='pro'>Pro</option>
                <option value='max'>Max</option>
                <option value='coach'>Coach</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${tema === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Status:
              </label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border transition-colors duration-200 ${tema === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
              >
                <option value='all'>Todos</option>
                <option value='ativo'>Ativo</option>
                <option value='inativo'>Inativo</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${tema === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Ordenar por:
              </label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border transition-colors duration-200 ${tema === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
              >
                <option value='none'>Nenhuma</option>
                <option value='tokens_desc'>Mais tokens</option>
                <option value='tokens_asc'>Menos tokens</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${tema === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Por página:
              </label>
              <select
                value={perPage}
                onChange={e => setPerPage(Number(e.target.value))}
                className={`w-full px-3 py-2 rounded-lg border transition-colors duration-200 ${tema === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* Barra de pesquisa e botão limpar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1">
              <input
                type='text'
                placeholder='Pesquisar nome, username, email, plano...'
                value={q}
                onChange={e => setQ(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border transition-colors duration-200 ${tema === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
              />
            </div>
            <button
              onClick={clearFilters}
              className={`px-4 py-2 rounded-lg border transition-colors duration-200 ${tema === 'dark'
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
            >
              Limpar Filtros
            </button>
          </div>

          {/* Estatísticas */}
          <div className={`mb-4 p-3 rounded-lg ${tema === 'dark' ? 'bg-gray-700' : 'bg-blue-50'}`}>
            <div className="flex flex-wrap gap-4 text-sm">
              <span className={`${tema === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                <strong>Total de usuários:</strong> {filteredUsers.length} (de {usuarios.length})
              </span>
              <span className={`${tema === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                <strong>Página:</strong> {currentPage} de {totalPages}
              </span>
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className={`text-center py-8 ${tema === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              <div className="text-4xl mb-2">👥</div>
              <p className="text-lg font-medium mb-1">Nenhum usuário encontrado</p>
              <p className="text-sm">Tente ajustar os filtros ou a pesquisa</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className={`min-w-full ${tema === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-md rounded-lg overflow-hidden`}>
                <thead className={`${tema === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${tema === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Usuário
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${tema === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Plano
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${tema === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Tokens
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${tema === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Dispositivos
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${tema === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Última Atividade
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${tema === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className={`${tema === 'dark' ? 'bg-gray-800' : 'bg-white'} divide-y ${tema === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {pagedUsuarios.map((u) => (
                    <tr key={u._id} className={`hover:${tema === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} transition-colors duration-200`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`h-10 w-10 rounded-full ${u.planInfos?.status === 'ativo' ? 'bg-green-500' : 'bg-gray-500'} flex items-center justify-center`}>
                            <span className="text-sm font-medium text-white">
                              {u.username?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className={`text-sm font-medium ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {u.name || u.username}
                            </div>
                            <div className={`text-sm ${tema === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                              {u.email}
                            </div>
                            <div className={`text-xs ${tema === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                              @{u.username}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${u.planInfos?.status === 'ativo'
                          ? u.planInfos?.planType === 'free'
                            ? 'bg-gray-100 text-gray-800'
                            : u.planInfos?.planType === 'pro'
                              ? 'bg-blue-100 text-blue-800'
                              : u.planInfos?.planType === 'max'
                                ? 'bg-purple-100 text-purple-800'
                                : u.planInfos?.planType === 'coach'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                          : 'bg-red-100 text-red-800'
                          }`}>
                          {u.planInfos?.status === 'ativo' ? (u.planInfos?.planType || 'free').toUpperCase() : 'INATIVO'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          <div className="font-medium">Total: {u.tokensTotal?.toLocaleString() || 0}</div>
                          <div className={`text-xs ${tema === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            Hoje: {u.tokensToday?.toLocaleString() || 0}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          <div className="font-medium">{u.deviceCount || 0} dispositivos</div>
                          <div className={`text-xs ${tema === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {u.totalLoginCount || 0} logins totais
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${tema === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                          {u.mostRecentActivity
                            ? new Date(u.mostRecentActivity).toLocaleString('pt-BR', {
                              timeZone: 'America/Sao_Paulo',
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                            : 'Nunca'
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-2">
                          {/* Botão para ver gráfico detalhado */}
                          <button
                            onClick={() => setSelectedUser(u)}
                            className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium transition-colors duration-200 ${tema === 'dark'
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              }`}
                          >
                            📊 Detalhes
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Controles de paginação melhorados */}
          <div className={`flex items-center justify-between flex-wrap gap-4 mt-6 p-4 rounded-lg ${tema === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => gotoPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg border transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${tema === 'dark'
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-600 disabled:hover:bg-transparent'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-100 disabled:hover:bg-transparent'
                  }`}
              >
                ← Anterior
              </button>

              <div className='flex items-center gap-1'>
                {(() => {
                  const range = []
                  const maxButtons = 5
                  let start = Math.max(1, currentPage - Math.floor(maxButtons / 2))
                  let end = start + maxButtons - 1
                  if (end > totalPages) {
                    end = totalPages
                    start = Math.max(1, end - maxButtons + 1)
                  }
                  for (let i = start; i <= end; i++) range.push(i)
                  return range.map(p => (
                    <button
                      key={p}
                      onClick={() => gotoPage(p)}
                      className={`px-3 py-2 rounded-lg border transition-colors duration-200 ${p === currentPage
                        ? tema === 'dark'
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-blue-500 border-blue-500 text-white'
                        : tema === 'dark'
                          ? 'border-gray-600 text-gray-300 hover:bg-gray-600'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                      {p}
                    </button>
                  ))
                })()}
              </div>

              <button
                onClick={() => gotoPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-lg border transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${tema === 'dark'
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-600 disabled:hover:bg-transparent'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-100 disabled:hover:bg-transparent'
                  }`}
              >
                Próxima →
              </button>
            </div>

            <div className='flex items-center gap-2 text-sm'>
              <span className={`${tema === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Ir para página:
              </span>
              <input
                type='number'
                min={1}
                max={totalPages}
                value={currentPage}
                onChange={e => gotoPage(Number(e.target.value || 1))}
                className={`w-16 px-2 py-1 rounded-lg border transition-colors duration-200 ${tema === 'dark'
                  ? 'bg-gray-600 border-gray-500 text-white focus:border-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
              />
            </div>
          </div>

          {/* Gráfico de detalhes do usuário selecionado */}
          {selectedUser && (
            <div className={`mt-6 p-6 rounded-lg shadow-lg ${tema === 'dark' ? 'bg-gray-700' : 'bg-white'}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-xl font-semibold ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Gráfico de Tokens - {selectedUser.name || selectedUser.username}
                </h3>
                <button
                  onClick={() => setSelectedUser(null)}
                  className={`p-2 rounded-lg transition-colors duration-200 ${tema === 'dark'
                    ? 'text-gray-400 hover:text-white hover:bg-gray-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  ✕
                </button>
              </div>
              
              <div className="h-96 mb-4">
                {generateUserChartData(selectedUser) ? (
                  <Line data={generateUserChartData(selectedUser)} options={chartOptions} />
                ) : (
                  <div className={`flex items-center justify-center h-full ${tema === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    <div className="text-center">
                      <div className="text-4xl mb-2">📊</div>
                      <p>Nenhum dado de tokens disponível para este usuário</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Informações adicionais do usuário */}
              <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg ${tema === 'dark' ? 'bg-gray-600' : 'bg-gray-50'}`}>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${tema === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                    {selectedUser.tokensTotal?.toLocaleString() || 0}
                  </div>
                  <div className={`text-sm ${tema === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    Tokens Totais
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${tema === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                    {selectedUser.deviceCount || 0}
                  </div>
                  <div className={`text-sm ${tema === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    Dispositivos
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${tema === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>
                    {selectedUser.totalLoginCount || 0}
                  </div>
                  <div className={`text-sm ${tema === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    Total de Logins
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
