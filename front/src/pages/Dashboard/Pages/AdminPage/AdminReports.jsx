import React, { useEffect, useState, useMemo, useCallback } from 'react'
import api from '../../../../Api'

const AdminReports = ({ tema, user }) => {
  // Validação de segurança - apenas admins podem acessar
  const isAdmin = !!(user && user.role === 'admin')
  
  // Estados para diferentes seções
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  // Estados para dados
  const [dashboardData, setDashboardData] = useState(null)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [errorLogs, setErrorLogs] = useState([])
  const [performanceData, setPerformanceData] = useState(null)
  const [cacheData, setCacheData] = useState(null)

  // Filtros para logs de erro
  const [errorFilters, setErrorFilters] = useState({
    apiName: '',
    errorType: '',
    severity: 'all',
    resolved: 'all'
  })

  // Paginação para logs de erro
  const [errorPage, setErrorPage] = useState(1)
  const [errorPerPage] = useState(10)

  const theme = {
    container: tema === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900',
    card: tema === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200',
    input: tema === 'dark' 
      ? 'bg-gray-700 text-gray-100 border-gray-600 placeholder-gray-400'
      : 'bg-white text-gray-900 border-gray-300 placeholder-gray-500',
    button: 'bg-blue-600 hover:bg-blue-700 text-white',
    success: 'bg-green-600 text-white',
    danger: 'bg-red-600 text-white',
    warning: 'bg-yellow-600 text-white',
    muted: tema === 'dark' ? 'text-gray-400' : 'text-gray-600'
  }

  // Função para buscar dashboard geral com useCallback
  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.post('/admin/ai-dashboard', { adminId: user._id })
      if (res.data?.success) {
        setDashboardData(res.data.data)
        setLastUpdate(new Date())
      } else {
        setErro(res.data?.msg || 'Erro ao buscar dashboard')
      }
    } catch (error) {
      console.error('Erro dashboard:', error)
      setErro('Erro ao carregar dashboard')
    } finally {
      setLoading(false)
    }
  }, [user._id])

  // Função para buscar analytics detalhadas com useCallback
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.post('/admin/detailed-analytics', { 
        adminId: user._id,
        timeRange: '30d' // últimos 30 dias
      })
      if (res.data?.success) {
        setAnalyticsData(res.data.data)
        setLastUpdate(new Date())
      } else {
        setErro(res.data?.msg || 'Erro ao buscar analytics')
      }
    } catch (error) {
      console.error('Erro analytics:', error)
      setErro('Erro ao carregar analytics')
    } finally {
      setLoading(false)
    }
  }, [user._id])

  // Função para buscar logs de erro com useCallback
  const fetchErrorLogs = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.post('/admin/error-logs', { 
        adminId: user._id,
        ...errorFilters,
        page: errorPage,
        perPage: errorPerPage
      })
      if (res.data?.success) {
        setErrorLogs(res.data.logs || [])
        setLastUpdate(new Date())
      } else {
        setErro(res.data?.msg || 'Erro ao buscar logs')
      }
    } catch (error) {
      console.error('Erro logs:', error)
      setErro('Erro ao carregar logs de erro')
    } finally {
      setLoading(false)
    }
  }, [user._id, errorFilters, errorPage, errorPerPage])

  // Função para buscar métricas de performance com useCallback
  const fetchPerformance = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.post('/admin/api-performance', { adminId: user._id })
      if (res.data?.success) {
        setPerformanceData(res.data.data)
        setLastUpdate(new Date())
      } else {
        setErro(res.data?.msg || 'Erro ao buscar performance')
      }
    } catch (error) {
      console.error('Erro performance:', error)
      setErro('Erro ao carregar métricas de performance')
    } finally {
      setLoading(false)
    }
  }, [user._id])

  // Função para buscar dados do cache com useCallback
  const fetchCacheData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/admin/cache-dashboard')
      if (res.data?.success) {
        setCacheData(res.data.data)
        setLastUpdate(new Date())
      } else {
        setErro(res.data?.msg || 'Erro ao buscar cache')
      }
    } catch (error) {
      console.error('Erro cache:', error)
      setErro('Erro ao carregar dados do cache')
    } finally {
      setLoading(false)
    }
  }, [])

  // Função para resolver erro com refresh imediato
  const resolveError = async (errorLogId) => {
    try {
      const res = await api.post('/admin/resolve-error', { 
        adminId: user._id, 
        errorLogId 
      })
      if (res.data?.success) {
        setMsg('Erro marcado como resolvido')
        fetchErrorLogs() // Refresh imediato
      } else {
        setErro(res.data?.msg || 'Erro ao resolver')
      }
    } catch (error) {
      console.error('Erro ao resolver:', error)
      setErro('Erro ao marcar como resolvido')
    }
  }

  // Função para refresh manual
  const handleManualRefresh = () => {
    switch (activeTab) {
      case 'dashboard':
        fetchDashboard()
        break
      case 'analytics':
        fetchAnalytics()
        break
      case 'errors':
        fetchErrorLogs()
        break
      case 'performance':
        fetchPerformance()
        break
      case 'cache':
        fetchCacheData()
        break
      default:
        break
    }
  }

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        handleManualRefresh()
      }, 60000) // 60 segundos (aumentado de 30s para reduzir requisições)

      return () => clearInterval(interval)
    }
  }, [autoRefresh, activeTab, fetchDashboard, fetchAnalytics, fetchErrorLogs, fetchPerformance, fetchCacheData])

  // Carregar dados baseado na aba ativa
  useEffect(() => {
    switch (activeTab) {
      case 'dashboard':
        fetchDashboard()
        break
      case 'analytics':
        fetchAnalytics()
        break
      case 'errors':
        fetchErrorLogs()
        break
      case 'performance':
        fetchPerformance()
        break
      case 'cache':
        fetchCacheData()
        break
      default:
        break
    }
  }, [activeTab, errorFilters, errorPage, fetchDashboard, fetchAnalytics, fetchErrorLogs, fetchPerformance, fetchCacheData])

  // Limpar mensagens após 3 segundos
  useEffect(() => {
    if (erro || msg) {
      const timer = setTimeout(() => {
        setErro('')
        setMsg('')
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [erro, msg])

  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard Geral', icon: '📊' },
    { id: 'analytics', label: '📈 Analytics Detalhadas', icon: '📈' },
    { id: 'errors', label: '🚨 Logs de Erro', icon: '🚨' },
    { id: 'performance', label: '⚡ Performance', icon: '⚡' },
    { id: 'cache', label: '🗄️ Cache Redis', icon: '🗄️' }
  ]

  // Verificação de segurança
  if (!isAdmin) {
    return (
      <div className="p-4 text-red-600">
        Acesso negado: somente administradores podem acessar relatórios.
      </div>
    )
  }

  return (
    <div className={`${theme.container} p-4`}>
      {/* Mensagens de feedback */}
      {erro && (
        <div className={`${theme.danger} p-3 rounded-lg mb-4 fixed top-4 right-4 z-50`}>
          {erro}
        </div>
      )}
      {msg && (
        <div className={`${theme.success} p-3 rounded-lg mb-4 fixed top-4 right-4 z-50`}>
          {msg}
        </div>
      )}

      {/* Navegação por abas */}
      <div className="flex flex-wrap gap-2 mb-6 border-b pb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id
                ? theme.button
                : `${theme.card} border hover:bg-opacity-80`
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Painel de controle de auto-refresh */}
      <div className={`${theme.card} p-4 rounded-lg border mb-6`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Auto-refresh:</label>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  autoRefresh 
                    ? theme.success 
                    : `${theme.card} border hover:bg-opacity-80`
                }`}
              >
                {autoRefresh ? '✅ Ativo' : '⏸️ Pausado'}
              </button>
            </div>
            
            <button
              onClick={handleManualRefresh}
              disabled={loading}
              className={`px-3 py-1 rounded text-sm ${theme.button} disabled:opacity-50`}
            >
              🔄 Atualizar Agora
            </button>
          </div>
          
          <div className={`text-sm ${theme.muted}`}>
            Última atualização: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Carregando...</span>
        </div>
      )}

      {/* Conteúdo das abas */}
      {!loading && (
        <>
           {/* Dashboard Geral */}
           {activeTab === 'dashboard' && (
             <div className="space-y-6">
               <h2 className="text-2xl font-bold mb-4">📊 Dashboard Administrativo</h2>
               
               {dashboardData ? (
                 <>
                   {/* Cards de métricas principais */}
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                     <div className={`${theme.card} p-4 rounded-lg border`}>
                       <h3 className="font-semibold text-lg">👥 Usuários</h3>
                       <p className="text-2xl font-bold text-blue-600">
                         {dashboardData.totalUsers || 0}
                       </p>
                       <p className={theme.muted}>Total de usuários</p>
                     </div>
                     
                     <div className={`${theme.card} p-4 rounded-lg border`}>
                       <h3 className="font-semibold text-lg">🛡️ Admins</h3>
                       <p className="text-2xl font-bold text-green-600">
                         {dashboardData.totalAdmins || 0}
                       </p>
                       <p className={theme.muted}>Administradores</p>
                     </div>
                     
                     <div className={`${theme.card} p-4 rounded-lg border`}>
                       <h3 className="font-semibold text-lg">📈 APIs Ativas</h3>
                       <p className="text-2xl font-bold text-purple-600">
                         {dashboardData.activeAPIs || 0}
                       </p>
                       <p className={theme.muted}>APIs funcionando</p>
                     </div>
                     
                     <div className={`${theme.card} p-4 rounded-lg border`}>
                       <h3 className="font-semibold text-lg">🚨 Erros</h3>
                       <p className="text-2xl font-bold text-red-600">
                         {dashboardData.totalErrors || 0}
                       </p>
                       <p className={theme.muted}>Erros não resolvidos</p>
                     </div>
                   </div>

                   {/* Gráficos avançados */}
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     {/* Gráfico de barras - Usuários por tipo */}
                     <div className={`${theme.card} p-6 rounded-lg border`}>
                       <h3 className="font-semibold text-lg mb-4">📊 Distribuição de Usuários</h3>
                       <div className="space-y-3">
                         <div className="flex items-center justify-between">
                           <span>Usuários Regulares</span>
                           <div className="flex items-center gap-2">
                             <div className="w-32 bg-gray-200 rounded-full h-2">
                               <div 
                                 className="bg-blue-600 h-2 rounded-full" 
                                 style={{width: `${((dashboardData.totalUsers - dashboardData.totalAdmins) / dashboardData.totalUsers * 100) || 0}%`}}
                               ></div>
                             </div>
                             <span className="text-sm font-medium">{(dashboardData.totalUsers - dashboardData.totalAdmins) || 0}</span>
                           </div>
                         </div>
                         <div className="flex items-center justify-between">
                           <span>Administradores</span>
                           <div className="flex items-center gap-2">
                             <div className="w-32 bg-gray-200 rounded-full h-2">
                               <div 
                                 className="bg-green-600 h-2 rounded-full" 
                                 style={{width: `${(dashboardData.totalAdmins / dashboardData.totalUsers * 100) || 0}%`}}
                               ></div>
                             </div>
                             <span className="text-sm font-medium">{dashboardData.totalAdmins || 0}</span>
                           </div>
                         </div>
                       </div>
                     </div>

                     {/* Gráfico de status das APIs */}
                     <div className={`${theme.card} p-6 rounded-lg border`}>
                       <h3 className="font-semibold text-lg mb-4">⚡ Status das APIs</h3>
                       <div className="space-y-3">
                         <div className="flex items-center justify-between">
                           <span>APIs Ativas</span>
                           <div className="flex items-center gap-2">
                             <div className="w-32 bg-gray-200 rounded-full h-2">
                               <div 
                                 className="bg-green-600 h-2 rounded-full" 
                                 style={{width: `${(dashboardData.activeAPIs / (dashboardData.activeAPIs + dashboardData.totalErrors) * 100) || 0}%`}}
                               ></div>
                             </div>
                             <span className="text-sm font-medium">{dashboardData.activeAPIs || 0}</span>
                           </div>
                         </div>
                         <div className="flex items-center justify-between">
                           <span>Com Erros</span>
                           <div className="flex items-center gap-2">
                             <div className="w-32 bg-gray-200 rounded-full h-2">
                               <div 
                                 className="bg-red-600 h-2 rounded-full" 
                                 style={{width: `${(dashboardData.totalErrors / (dashboardData.activeAPIs + dashboardData.totalErrors) * 100) || 0}%`}}
                               ></div>
                             </div>
                             <span className="text-sm font-medium">{dashboardData.totalErrors || 0}</span>
                           </div>
                         </div>
                       </div>
                     </div>
                   </div>

                   {/* Métricas adicionais */}
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className={`${theme.card} p-4 rounded-lg border`}>
                       <h4 className="font-semibold mb-2">📈 Crescimento</h4>
                       <p className="text-lg font-bold text-green-600">+{dashboardData.userGrowth || 0}%</p>
                       <p className={`text-sm ${theme.muted}`}>Novos usuários este mês</p>
                     </div>
                     <div className={`${theme.card} p-4 rounded-lg border`}>
                       <h4 className="font-semibold mb-2">🎯 Engajamento</h4>
                       <p className="text-lg font-bold text-blue-600">{dashboardData.engagementRate || 0}%</p>
                       <p className={`text-sm ${theme.muted}`}>Taxa de engajamento</p>
                     </div>
                     <div className={`${theme.card} p-4 rounded-lg border`}>
                       <h4 className="font-semibold mb-2">⚡ Performance</h4>
                       <p className="text-lg font-bold text-purple-600">{dashboardData.avgResponseTime || 0}ms</p>
                       <p className={`text-sm ${theme.muted}`}>Tempo médio de resposta</p>
                     </div>
                   </div>
                 </>
               ) : (
                 <p className={theme.muted}>Nenhum dado disponível</p>
               )}
             </div>
           )}

          {/* Analytics Detalhadas */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-4">📈 Analytics Detalhadas</h2>
              
              {analyticsData ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className={`${theme.card} p-4 rounded-lg border`}>
                    <h3 className="font-semibold text-lg mb-3">🏋️ Métricas de Treino</h3>
                    <div className="space-y-2">
                      <p>Total de treinos: <span className="font-bold">{analyticsData.totalWorkouts || 0}</span></p>
                      <p>Treinos hoje: <span className="font-bold">{analyticsData.workoutsToday || 0}</span></p>
                      <p>Usuários ativos: <span className="font-bold">{analyticsData.activeUsers || 0}</span></p>
                    </div>
                  </div>
                  
                  <div className={`${theme.card} p-4 rounded-lg border`}>
                    <h3 className="font-semibold text-lg mb-3">🎯 Engajamento</h3>
                    <div className="space-y-2">
                      <p>Taxa de retenção: <span className="font-bold">{analyticsData.retentionRate || 0}%</span></p>
                      <p>Sessões médias: <span className="font-bold">{analyticsData.avgSessions || 0}</span></p>
                      <p>Tempo médio: <span className="font-bold">{analyticsData.avgTime || 0}min</span></p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className={theme.muted}>Nenhum dado de analytics disponível</p>
              )}
            </div>
          )}

          {/* Logs de Erro */}
          {activeTab === 'errors' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-4">🚨 Logs de Erro das APIs</h2>
              
              {/* Filtros */}
              <div className={`${theme.card} p-4 rounded-lg border`}>
                <h3 className="font-semibold mb-3">Filtros</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <input
                    type="text"
                    placeholder="Nome da API"
                    value={errorFilters.apiName}
                    onChange={(e) => setErrorFilters({...errorFilters, apiName: e.target.value})}
                    className={`${theme.input} p-2 rounded border`}
                  />
                  <input
                    type="text"
                    placeholder="Tipo de erro"
                    value={errorFilters.errorType}
                    onChange={(e) => setErrorFilters({...errorFilters, errorType: e.target.value})}
                    className={`${theme.input} p-2 rounded border`}
                  />
                  <select
                    value={errorFilters.severity}
                    onChange={(e) => setErrorFilters({...errorFilters, severity: e.target.value})}
                    className={`${theme.input} p-2 rounded border`}
                  >
                    <option value="all">Todas as severidades</option>
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                    <option value="critical">Crítica</option>
                  </select>
                  <select
                    value={errorFilters.resolved}
                    onChange={(e) => setErrorFilters({...errorFilters, resolved: e.target.value})}
                    className={`${theme.input} p-2 rounded border`}
                  >
                    <option value="all">Todos</option>
                    <option value="true">Resolvidos</option>
                    <option value="false">Não resolvidos</option>
                  </select>
                </div>
              </div>

              {/* Lista de erros */}
              <div className="space-y-4">
                {errorLogs.length > 0 ? (
                  errorLogs.map((log, index) => (
                    <div key={index} className={`${theme.card} p-4 rounded-lg border`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{log.apiName || 'API não identificada'}</h4>
                          <p className={`text-sm ${theme.muted}`}>
                            {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Data não disponível'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            log.severity === 'critical' ? 'bg-red-600 text-white' :
                            log.severity === 'high' ? 'bg-orange-600 text-white' :
                            log.severity === 'medium' ? 'bg-yellow-600 text-white' :
                            'bg-gray-600 text-white'
                          }`}>
                            {log.severity || 'unknown'}
                          </span>
                          {!log.resolved && (
                            <button
                              onClick={() => resolveError(log._id)}
                              className={`px-3 py-1 rounded text-xs ${theme.success}`}
                            >
                              Resolver
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm mb-2"><strong>Tipo:</strong> {log.errorType || 'Não especificado'}</p>
                      <p className="text-sm"><strong>Mensagem:</strong> {log.message || 'Sem mensagem'}</p>
                      {log.resolved && (
                        <p className="text-sm text-green-600 mt-2">✅ Resolvido</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className={theme.muted}>Nenhum log de erro encontrado</p>
                )}
              </div>
            </div>
          )}

          {/* Performance */}
          {activeTab === 'performance' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-4">⚡ Métricas de Performance</h2>
              
              {performanceData ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className={`${theme.card} p-4 rounded-lg border`}>
                    <h3 className="font-semibold text-lg mb-3">🕐 Tempo de Resposta</h3>
                    <div className="space-y-2">
                      <p>Média geral: <span className="font-bold">{performanceData.avgResponseTime || 0}ms</span></p>
                      <p>API mais rápida: <span className="font-bold">{performanceData.fastestAPI || 'N/A'}</span></p>
                      <p>API mais lenta: <span className="font-bold">{performanceData.slowestAPI || 'N/A'}</span></p>
                    </div>
                  </div>
                  
                  <div className={`${theme.card} p-4 rounded-lg border`}>
                    <h3 className="font-semibold text-lg mb-3">📊 Taxa de Sucesso</h3>
                    <div className="space-y-2">
                      <p>Taxa geral: <span className="font-bold">{performanceData.successRate || 0}%</span></p>
                      <p>Requests hoje: <span className="font-bold">{performanceData.requestsToday || 0}</span></p>
                      <p>Erros hoje: <span className="font-bold">{performanceData.errorsToday || 0}</span></p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className={theme.muted}>Nenhum dado de performance disponível</p>
              )}
            </div>
          )}

          {/* Cache Redis */}
          {activeTab === 'cache' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-4">🗄️ Dashboard do Cache Redis</h2>
              
              {cacheData ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className={`${theme.card} p-4 rounded-lg border`}>
                    <h3 className="font-semibold text-lg mb-3">💾 Uso de Memória</h3>
                    <div className="space-y-2">
                      <p>Usado: <span className="font-bold">{cacheData.memoryUsed || 0}MB</span></p>
                      <p>Total: <span className="font-bold">{cacheData.memoryTotal || 0}MB</span></p>
                      <p>Percentual: <span className="font-bold">{cacheData.memoryPercent || 0}%</span></p>
                    </div>
                  </div>
                  
                  <div className={`${theme.card} p-4 rounded-lg border`}>
                    <h3 className="font-semibold text-lg mb-3">🔑 Chaves</h3>
                    <div className="space-y-2">
                      <p>Total: <span className="font-bold">{cacheData.totalKeys || 0}</span></p>
                      <p>Expiradas: <span className="font-bold">{cacheData.expiredKeys || 0}</span></p>
                      <p>Hit Rate: <span className="font-bold">{cacheData.hitRate || 0}%</span></p>
                    </div>
                  </div>
                  
                  <div className={`${theme.card} p-4 rounded-lg border`}>
                    <h3 className="font-semibold text-lg mb-3">⚡ Performance</h3>
                    <div className="space-y-2">
                      <p>Conexões: <span className="font-bold">{cacheData.connections || 0}</span></p>
                      <p>Comandos/s: <span className="font-bold">{cacheData.commandsPerSec || 0}</span></p>
                      <p>Latência: <span className="font-bold">{cacheData.latency || 0}ms</span></p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className={theme.muted}>Nenhum dado de cache disponível</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default AdminReports