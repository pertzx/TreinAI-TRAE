import React, { useEffect, useState, useCallback } from 'react'
import api from '../../../../Api'

const AdminCacheRedis = ({ tema, user }) => {
  // Validação de segurança - apenas admins podem acessar
  const isAdmin = !!(user && user.role === 'admin')
  
  // Estados principais
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  
  // Estados para dados do cache
  const [cacheStats, setCacheStats] = useState(null)
  const [monitoring, setMonitoring] = useState(null)
  const [alerts, setAlerts] = useState([])
  
  // Estados para operações
  const [selectedOperation, setSelectedOperation] = useState('')
  const [clearPattern, setClearPattern] = useState('')
  const [alertConfig, setAlertConfig] = useState({
    memoryThreshold: 80,
    performanceThreshold: 1000,
    enableAlerts: true
  })

  const theme = {
    container: tema === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900',
    card: tema === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200',
    text: tema === 'dark' ? 'text-gray-100' : 'text-gray-900',
    muted: tema === 'dark' ? 'text-gray-400' : 'text-gray-500',
    input: tema === 'dark' 
      ? 'bg-gray-700 text-gray-100 border-gray-600 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
      : 'bg-white text-gray-900 border-gray-300 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500',
    button: 'bg-blue-600 hover:bg-blue-700 text-white',
    danger: 'bg-red-600 text-white',
    success: 'bg-green-600 text-white',
    warning: 'bg-yellow-600 text-white'
  }

  // Buscar estatísticas do cache com useCallback
  const fetchCacheStats = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/admin/cache-dashboard')
      if (res.data?.stats) {
        setCacheStats(res.data.stats)
        setLastUpdate(new Date())
      }
      if (res.data?.erro) {
        setErro(res.data.erro)
      }
    } catch (error) {
      setErro('Erro ao buscar estatísticas do cache: ' + error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Buscar monitoramento em tempo real com useCallback
  const fetchMonitoring = useCallback(async () => {
    try {
      const res = await api.get('/admin/cache-monitoring')
      if (res.data?.monitoring) {
        setMonitoring(res.data.monitoring)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Erro ao buscar monitoramento:', error)
    }
  }, [])

  // Executar operação de manutenção com refresh imediato
  const executeMaintenance = async () => {
    if (!selectedOperation) {
      setErro('Selecione uma operação de manutenção')
      return
    }

    try {
      setLoading(true)
      const payload = {
        operation: selectedOperation,
        ...(selectedOperation === 'clear' && clearPattern && { pattern: clearPattern })
      }
      
      const res = await api.post('/admin/cache-maintenance', payload)
      if (res.data?.success) {
        setMsg(res.data.msg || 'Operação executada com sucesso')
        // Refresh imediato após operação
        await fetchCacheStats()
        await fetchMonitoring()
      } else {
        setErro(res.data?.erro || 'Erro ao executar operação')
      }
    } catch (error) {
      setErro('Erro ao executar manutenção: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Função para refresh manual
  const handleManualRefresh = () => {
    fetchCacheStats()
    fetchMonitoring()
  }

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchCacheStats()
        fetchMonitoring()
      }, 60000) // 60 segundos (aumentado de 30s para reduzir requisições)

      return () => clearInterval(interval)
    }
  }, [autoRefresh, fetchCacheStats, fetchMonitoring])

  // Configurar alertas
  const configureAlerts = async () => {
    try {
      setLoading(true)
      const res = await api.post('/admin/cache-alerts', alertConfig)
      if (res.data?.success) {
        setMsg('Configuração de alertas atualizada com sucesso')
      } else {
        setErro(res.data?.erro || 'Erro ao configurar alertas')
      }
    } catch (error) {
      setErro('Erro ao configurar alertas: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      fetchCacheStats()
      fetchMonitoring()
      
      // Atualizar monitoramento a cada 60 segundos (reduzido de 30s)
      const interval = setInterval(fetchMonitoring, 60000)
      return () => clearInterval(interval)
    }
  }, [isAdmin])

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

  // Verificação de segurança
  if (!isAdmin) {
    return (
      <div className="p-4 text-red-600">
        Acesso negado: somente administradores podem gerenciar o cache Redis.
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

      {/* Painel de Controle de Auto-Refresh */}
      <div className={`${theme.card} border rounded-lg p-4 mb-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold">🔄 Controle de Atualização</h3>
            <label className={`flex items-center space-x-2 ${theme.text}`}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <span>Auto-refresh (60s)</span>
            </label>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dashboard do Cache com Gráficos */}
        <div className={`${theme.card} border rounded-lg p-4`}>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            🗄️ Dashboard do Cache
            <button
              onClick={fetchCacheStats}
              disabled={loading}
              className={`ml-auto px-3 py-1 rounded text-sm ${theme.button} disabled:opacity-50`}
            >
              {loading ? 'Carregando...' : 'Atualizar'}
            </button>
          </h3>
          
          {cacheStats ? (
            <div className="space-y-4">
              {/* Métricas Principais */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className={`text-sm ${theme.muted}`}>Uso de Memória</p>
                  <p className="text-xl font-bold">{cacheStats.memoryUsage || 'N/A'}</p>
                  {/* Barra de progresso para memória */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${Math.min(parseInt(cacheStats.memoryUsage) || 0, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <p className={`text-sm ${theme.muted}`}>Total de Chaves</p>
                  <p className="text-xl font-bold">{cacheStats.totalKeys || 0}</p>
                </div>
                <div>
                  <p className={`text-sm ${theme.muted}`}>Hit Rate</p>
                  <p className="text-xl font-bold">{cacheStats.hitRate || 'N/A'}%</p>
                  {/* Barra de progresso para hit rate */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${Math.min(parseFloat(cacheStats.hitRate) || 0, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <p className={`text-sm ${theme.muted}`}>Uptime</p>
                  <p className="text-xl font-bold">{cacheStats.uptime || 'N/A'}</p>
                </div>
              </div>

              {/* Gráfico de Distribuição de TTL */}
              {cacheStats.ttlAnalysis && (
                <div>
                  <p className={`text-sm ${theme.muted} mb-2`}>📊 Distribuição de TTL</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Sem TTL</span>
                      <span className="text-sm font-bold">{cacheStats.ttlAnalysis.noTTL || 0}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full" 
                        style={{ width: `${Math.min((cacheStats.ttlAnalysis.noTTL / (cacheStats.totalKeys || 1)) * 100, 100)}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Expirando em 1h</span>
                      <span className="text-sm font-bold">{cacheStats.ttlAnalysis.expiring1h || 0}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full" 
                        style={{ width: `${Math.min((cacheStats.ttlAnalysis.expiring1h / (cacheStats.totalKeys || 1)) * 100, 100)}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Expirando em 24h</span>
                      <span className="text-sm font-bold">{cacheStats.ttlAnalysis.expiring24h || 0}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${Math.min((cacheStats.ttlAnalysis.expiring24h / (cacheStats.totalKeys || 1)) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Métricas de Performance */}
              {cacheStats.performance && (
                <div>
                  <p className={`text-sm ${theme.muted} mb-2`}>⚡ Performance</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Operações/seg: <span className="font-bold">{cacheStats.performance.opsPerSec || 0}</span></div>
                    <div>Latência média: <span className="font-bold">{cacheStats.performance.avgLatency || 0}ms</span></div>
                    <div>Conexões: <span className="font-bold">{cacheStats.performance.connections || 0}</span></div>
                    <div>Evictions: <span className="font-bold">{cacheStats.performance.evictions || 0}</span></div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className={theme.muted}>Carregando estatísticas...</p>
          )}
        </div>

        {/* Monitoramento em Tempo Real com Gráficos */}
        <div className={`${theme.card} border rounded-lg p-4`}>
          <h3 className="text-lg font-semibold mb-4">⚡ Monitoramento em Tempo Real</h3>
          
          {monitoring ? (
            <div className="space-y-4">
              {/* Status Geral */}
              <div className="text-center">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  monitoring.status === 'healthy' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {monitoring.status === 'healthy' ? '✅ Sistema Saudável' : '❌ Problemas Detectados'}
                </div>
              </div>

              {/* Métricas em Tempo Real */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className={`text-sm ${theme.muted}`}>Conexões Ativas</p>
                  <p className="text-2xl font-bold text-blue-500">{monitoring.activeConnections || 0}</p>
                </div>
                <div className="text-center">
                  <p className={`text-sm ${theme.muted}`}>Comandos/seg</p>
                  <p className="text-2xl font-bold text-green-500">{monitoring.commandsPerSecond || 0}</p>
                </div>
                <div className="text-center">
                  <p className={`text-sm ${theme.muted}`}>Latência Média</p>
                  <p className="text-2xl font-bold text-yellow-500">{monitoring.avgLatency || 0}ms</p>
                </div>
                <div className="text-center">
                  <p className={`text-sm ${theme.muted}`}>CPU Usage</p>
                  <p className="text-2xl font-bold text-purple-500">{monitoring.cpuUsage || 0}%</p>
                </div>
              </div>

              {/* Gráfico de Latência */}
              {monitoring.latencyHistory && (
                <div>
                  <p className={`text-sm ${theme.muted} mb-2`}>📈 Histórico de Latência (últimos 10 min)</p>
                  <div className="flex items-end space-x-1 h-20">
                    {monitoring.latencyHistory.map((latency, index) => (
                      <div
                        key={index}
                        className="bg-blue-500 rounded-t"
                        style={{
                          height: `${Math.max((latency / Math.max(...monitoring.latencyHistory)) * 100, 5)}%`,
                          width: `${100 / monitoring.latencyHistory.length}%`
                        }}
                        title={`${latency}ms`}
                      ></div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Alertas Ativos */}
              {monitoring.alerts && monitoring.alerts.length > 0 && (
                <div>
                  <p className={`text-sm ${theme.muted} mb-2`}>🚨 Alertas Ativos</p>
                  <div className="space-y-1">
                    {monitoring.alerts.map((alert, index) => (
                      <div key={index} className={`p-2 rounded text-sm ${theme.warning}`}>
                        <div className="flex items-center justify-between">
                          <span>{alert.message}</span>
                          <span className="text-xs">{alert.severity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className={theme.muted}>Carregando monitoramento...</p>
          )}
        </div>

        {/* Operações de Manutenção */}
        <div className={`${theme.card} border rounded-lg p-4`}>
          <h3 className="text-lg font-semibold mb-4">🔧 Manutenção do Cache</h3>
          
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium ${theme.text} mb-2`}>
                Operação
              </label>
              <select
                value={selectedOperation}
                onChange={(e) => setSelectedOperation(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg ${theme.input}`}
              >
                <option value="">Selecione uma operação</option>
                <option value="stats">📊 Estatísticas Detalhadas</option>
                <option value="clear">🗑️ Limpar Cache</option>
                <option value="optimize">⚡ Otimização Automática</option>
                <option value="analyze">🔍 Análise de TTL</option>
                <option value="defragment">🔧 Desfragmentação</option>
                <option value="backup">💾 Backup de Chaves</option>
              </select>
            </div>

            {selectedOperation === 'clear' && (
              <div>
                <label className={`block text-sm font-medium ${theme.text} mb-2`}>
                  Padrão para Limpeza (opcional)
                </label>
                <input
                  type="text"
                  value={clearPattern}
                  onChange={(e) => setClearPattern(e.target.value)}
                  placeholder="Ex: user:*, session:*"
                  className={`w-full px-3 py-2 border rounded-lg ${theme.input}`}
                />
                <p className={`text-xs ${theme.muted} mt-1`}>
                  Deixe vazio para limpar todo o cache
                </p>
              </div>
            )}

            <button
              onClick={executeMaintenance}
              disabled={loading || !selectedOperation}
              className={`w-full px-4 py-2 rounded-lg ${theme.button} disabled:opacity-50`}
            >
              {loading ? 'Executando...' : 'Executar Operação'}
            </button>
          </div>
        </div>

        {/* Configuração de Alertas */}
        <div className={`${theme.card} border rounded-lg p-4`}>
          <h3 className="text-lg font-semibold mb-4">🚨 Configuração de Alertas</h3>
          
          <div className="space-y-4">
            <div>
              <label className={`flex items-center space-x-2 ${theme.text}`}>
                <input
                  type="checkbox"
                  checked={alertConfig.enableAlerts}
                  onChange={(e) => setAlertConfig(prev => ({
                    ...prev,
                    enableAlerts: e.target.checked
                  }))}
                  className="rounded"
                />
                <span>Habilitar Alertas</span>
              </label>
            </div>

            <div>
              <label className={`block text-sm font-medium ${theme.text} mb-2`}>
                Limite de Memória (%)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={alertConfig.memoryThreshold}
                onChange={(e) => setAlertConfig(prev => ({
                  ...prev,
                  memoryThreshold: parseInt(e.target.value)
                }))}
                className={`w-full px-3 py-2 border rounded-lg ${theme.input}`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${theme.text} mb-2`}>
                Limite de Performance (ms)
              </label>
              <input
                type="number"
                min="1"
                value={alertConfig.performanceThreshold}
                onChange={(e) => setAlertConfig(prev => ({
                  ...prev,
                  performanceThreshold: parseInt(e.target.value)
                }))}
                className={`w-full px-3 py-2 border rounded-lg ${theme.input}`}
              />
            </div>

            <button
              onClick={configureAlerts}
              disabled={loading}
              className={`w-full px-4 py-2 rounded-lg ${theme.button} disabled:opacity-50`}
            >
              {loading ? 'Salvando...' : 'Salvar Configuração'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminCacheRedis