import React, { useEffect, useState, useCallback } from 'react'
import api from '../../../../Api'
import locationsData from '../../../../data/locations.json'

const AdminLocais = ({ tema, user }) => {
  // Validação de segurança - apenas admins podem acessar
  const isAdmin = !!(user && user.role === 'admin')
  
  // Estados principais
  const [locais, setLocais] = useState([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  // Estados para formulário de edição
  const [showForm, setShowForm] = useState(false)
  const [editingLocal, setEditingLocal] = useState(null)
  const [formData, setFormData] = useState({
    nome: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    telefone: '',
    email: '',
    descricao: '',
    horarioFuncionamento: '',
    equipamentos: '',
    ativo: true
  })

  // Estados para filtros e busca
  const [filtros, setFiltros] = useState({
    busca: '',
    cidade: '',
    estado: '',
    ativo: 'all'
  })

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina] = useState(10)
  const [totalItens, setTotalItens] = useState(0)

  // Dados de localização do JSON
  const estados = locationsData.byCountry.Brazil.states || []
  const getCidadesPorEstado = (estado) => {
    return locationsData.byCountry.Brazil.citiesByState[estado] || []
  }

  // Função para buscar locais com useCallback para real-time updates
  const fetchLocais = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    setErro('')
    
    try {
      const params = new URLSearchParams({
        adminId: user?._id,
        page: paginaAtual,
        limit: itensPorPagina,
        ...filtros
      })
      
      const response = await api.get(`/admin/locais?${params}`)
      
      if (response.data.success) {
        setLocais(response.data.locais || [])
        setTotalItens(response.data.total || 0)
        setLastUpdate(new Date())
      } else {
        setErro(response.data.message || 'Erro ao buscar locais')
      }
    } catch (error) {
      console.error('Erro ao buscar locais:', error)
      setErro('Erro ao buscar locais: ' + (error.response?.data?.message || error.message))
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [paginaAtual, itensPorPagina, filtros])

  // Função para salvar local (edição)
  const salvarLocal = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErro('')
    setMsg('')

    try {
      const response = await api.put(`/admin/locais/${editingLocal._id}`, formData)
      
      if (response.data.success) {
        setMsg('Local atualizado com sucesso!')
        resetForm()
        fetchLocais(false) // Refresh imediato após alteração
      } else {
        setErro(response.data.message || 'Erro ao atualizar local')
      }
    } catch (error) {
      console.error('Erro ao salvar local:', error)
      setErro('Erro ao salvar: ' + (error.response?.data?.message || error.message))
    } finally {
      setLoading(false)
    }
  }

  // Função para deletar local
  const deletarLocal = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar este local?')) return
    
    setLoading(true)
    try {
      const response = await api.delete(`/admin/locais/${id}`)
      
      if (response.data.success) {
        setMsg('Local deletado com sucesso!')
        fetchLocais(false) // Refresh imediato após alteração
      } else {
        setErro(response.data.message || 'Erro ao deletar local')
      }
    } catch (error) {
      console.error('Erro ao deletar local:', error)
      setErro('Erro ao deletar: ' + (error.response?.data?.message || error.message))
    } finally {
      setLoading(false)
    }
  }

  // Função para alternar status ativo/inativo
  const toggleStatus = async (id, novoStatus) => {
    setLoading(true)
    try {
      const response = await api.patch(`/admin/locais/${id}/status`, { ativo: novoStatus })
      
      if (response.data.success) {
        setMsg(`Local ${novoStatus ? 'ativado' : 'desativado'} com sucesso!`)
        fetchLocais(false) // Refresh imediato após alteração
      } else {
        setErro(response.data.message || 'Erro ao alterar status')
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      setErro('Erro ao alterar status: ' + (error.response?.data?.message || error.message))
    } finally {
      setLoading(false)
    }
  }

  // Função para resetar formulário
  const resetForm = () => {
    setFormData({
      nome: '',
      endereco: '',
      cidade: '',
      estado: '',
      cep: '',
      telefone: '',
      email: '',
      descricao: '',
      horarioFuncionamento: '',
      equipamentos: '',
      ativo: true
    })
    setEditingLocal(null)
    setShowForm(false)
  }

  // Função para editar local
  const editarLocal = (local) => {
    setFormData({
      nome: local.nome || '',
      endereco: local.endereco || '',
      cidade: local.cidade || '',
      estado: local.estado || '',
      cep: local.cep || '',
      telefone: local.telefone || '',
      email: local.email || '',
      descricao: local.descricao || '',
      horarioFuncionamento: local.horarioFuncionamento || '',
      equipamentos: local.equipamentos || '',
      ativo: local.ativo !== undefined ? local.ativo : true
    })
    setEditingLocal(local)
    setShowForm(true)
  }

  // Auto-refresh quando habilitado
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchLocais(false)
      }, 60000) // Atualiza a cada 60 segundos (aumentado de 30s para reduzir requisições)
      
      return () => clearInterval(interval)
    }
  }, [autoRefresh, fetchLocais])

  // Carregar locais ao montar componente e quando filtros mudarem
  useEffect(() => {
    fetchLocais()
  }, [fetchLocais])

  // Limpar mensagens após 5 segundos
  useEffect(() => {
    if (msg || erro) {
      const timer = setTimeout(() => {
        setMsg('')
        setErro('')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [msg, erro])

  // Tema dinâmico
  const theme = {
    primary: tema === 'dark' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white',
    secondary: tema === 'dark' ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-gray-500 hover:bg-gray-600 text-white',
    success: tema === 'dark' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-green-500 hover:bg-green-600 text-white',
    danger: tema === 'dark' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white',
    warning: tema === 'dark' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-yellow-500 hover:bg-yellow-600 text-white',
    card: tema === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
    text: tema === 'dark' ? 'text-white' : 'text-gray-900',
    muted: tema === 'dark' ? 'text-gray-400' : 'text-gray-600',
    input: tema === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
  }

  // Filtrar e paginar locais
  const locaisFiltrados = locais.filter(local => {
    const matchBusca = !filtros.busca || 
      local.nome?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      local.cidade?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      local.endereco?.toLowerCase().includes(filtros.busca.toLowerCase())
    
    const matchCidade = !filtros.cidade || local.cidade === filtros.cidade
    const matchEstado = !filtros.estado || local.estado === filtros.estado
    const matchAtivo = filtros.ativo === 'all' || 
      (filtros.ativo === 'true' && local.ativo) ||
      (filtros.ativo === 'false' && !local.ativo)
    
    return matchBusca && matchCidade && matchEstado && matchAtivo
  })

  const totalPaginas = Math.ceil(locaisFiltrados.length / itensPorPagina)
  const indiceInicio = (paginaAtual - 1) * itensPorPagina
  const locaisPaginados = locaisFiltrados.slice(indiceInicio, indiceInicio + itensPorPagina)

  return (
    <div className="p-6 bg-white dark:bg-gray-800 min-h-screen">
      {!isAdmin ? (
        <div className="text-center py-8">
          <h2 className="text-xl font-bold text-red-600 mb-4">🚫 Acesso Negado</h2>
          <p className="text-gray-600">Você não tem permissão para acessar esta área.</p>
        </div>
      ) : (
        <>
          {/* Cabeçalho com controles de atualização */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">🏢 Gerenciamento de Locais</h1>
            <div className="flex items-center gap-4">
              {/* Controle de auto-refresh */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Auto-refresh:</label>
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`px-3 py-1 rounded text-sm ${
                    autoRefresh 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-400 text-white'
                  }`}
                >
                  {autoRefresh ? '🔄 Ativo' : '⏸️ Inativo'}
                </button>
              </div>
              
              {/* Botão de refresh manual */}
              <button
                onClick={() => fetchLocais()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                disabled={loading}
              >
                🔄 Atualizar
              </button>
              
              {/* Indicador de última atualização */}
              <div className="text-gray-500 text-xs">
                Última atualização: {lastUpdate.toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* Mensagens */}
          {msg && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {msg}
            </div>
          )}
          {erro && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {erro}
            </div>
          )}

          {/* Filtros */}
          <div className={`${theme.card} p-4 rounded-lg border mb-6`}>
            <h3 className="text-lg font-semibold mb-4">🔍 Filtros</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Buscar por nome, cidade ou endereço..."
                value={filtros.busca}
                onChange={(e) => setFiltros({...filtros, busca: e.target.value})}
                className={`${theme.input} px-3 py-2 rounded border`}
              />
              
              <select
                value={filtros.estado}
                onChange={(e) => setFiltros({...filtros, estado: e.target.value, cidade: ''})}
                className={`${theme.input} px-3 py-2 rounded border`}
              >
                <option value="">Todos os Estados</option>
                {estados.map(estado => (
                  <option key={estado} value={estado}>{estado}</option>
                ))}
              </select>
              
              <select
                value={filtros.cidade}
                onChange={(e) => setFiltros({...filtros, cidade: e.target.value})}
                className={`${theme.input} px-3 py-2 rounded border`}
                disabled={!filtros.estado}
              >
                <option value="">Todas as Cidades</option>
                {filtros.estado && getCidadesPorEstado(filtros.estado).map(cidade => (
                  <option key={cidade} value={cidade}>{cidade}</option>
                ))}
              </select>
              
              <select
                value={filtros.ativo}
                onChange={(e) => setFiltros({...filtros, ativo: e.target.value})}
                className={`${theme.input} px-3 py-2 rounded border`}
              >
                <option value="all">Todos os Status</option>
                <option value="true">Apenas Ativos</option>
                <option value="false">Apenas Inativos</option>
              </select>
            </div>
          </div>

          {/* Lista de Locais */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Carregando locais...</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4">
                {locaisPaginados.map(local => (
                  <div key={local._id} className={`${theme.card} p-4 rounded-lg border`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{local.nome}</h3>
                          <span className={`px-2 py-1 rounded text-xs ${
                            local.ativo 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {local.ativo ? '✅ Ativo' : '❌ Inativo'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <p><strong>📍 Endereço:</strong> {local.endereco}</p>
                          <p><strong>🏙️ Cidade:</strong> {local.cidade}</p>
                          <p><strong>🗺️ Estado:</strong> {local.estado}</p>
                          <p><strong>📮 CEP:</strong> {local.cep}</p>
                          <p><strong>📞 Telefone:</strong> {local.telefone}</p>
                          <p><strong>📧 Email:</strong> {local.email}</p>
                        </div>
                        
                        {local.descricao && (
                          <p className="mt-2 text-sm"><strong>📝 Descrição:</strong> {local.descricao}</p>
                        )}
                        
                        {local.horarioFuncionamento && (
                          <p className="mt-2 text-sm"><strong>🕒 Horário:</strong> {local.horarioFuncionamento}</p>
                        )}
                        
                        {local.equipamentos && (
                          <p className="mt-2 text-sm"><strong>🏋️ Equipamentos:</strong> {local.equipamentos}</p>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-4">
                        <button
                          onClick={() => editarLocal(local)}
                          className={`${theme.primary} px-3 py-1 rounded text-sm`}
                        >
                          ✏️ Editar
                        </button>
                        
                        <button
                          onClick={() => toggleStatus(local._id, !local.ativo)}
                          className={`${local.ativo ? theme.warning : theme.success} px-3 py-1 rounded text-sm`}
                        >
                          {local.ativo ? '⏸️ Desativar' : '▶️ Ativar'}
                        </button>
                        
                        <button
                          onClick={() => deletarLocal(local._id)}
                          className={`${theme.danger} px-3 py-1 rounded text-sm`}
                        >
                          🗑️ Deletar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Paginação */}
              {totalPaginas > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <button
                    onClick={() => setPaginaAtual(Math.max(1, paginaAtual - 1))}
                    disabled={paginaAtual === 1}
                    className={`${theme.secondary} px-3 py-1 rounded disabled:opacity-50`}
                  >
                    ← Anterior
                  </button>
                  
                  <span className="px-4 py-1">
                    Página {paginaAtual} de {totalPaginas}
                  </span>
                  
                  <button
                    onClick={() => setPaginaAtual(Math.min(totalPaginas, paginaAtual + 1))}
                    disabled={paginaAtual === totalPaginas}
                    className={`${theme.secondary} px-3 py-1 rounded disabled:opacity-50`}
                  >
                    Próxima →
                  </button>
                </div>
              )}
            </>
          )}

          {/* Modal de Edição */}
          {showForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className={`${theme.card} p-6 rounded-lg border max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
                <h2 className="text-xl font-bold mb-4">✏️ Editar Local</h2>
                
                <form onSubmit={salvarLocal} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Nome *</label>
                      <input
                        type="text"
                        value={formData.nome}
                        onChange={(e) => setFormData({...formData, nome: e.target.value})}
                        className={`${theme.input} w-full px-3 py-2 rounded border`}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Telefone</label>
                      <input
                        type="text"
                        value={formData.telefone}
                        onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                        className={`${theme.input} w-full px-3 py-2 rounded border`}
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Endereço *</label>
                      <input
                        type="text"
                        value={formData.endereco}
                        onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                        className={`${theme.input} w-full px-3 py-2 rounded border`}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Estado *</label>
                      <select
                        value={formData.estado}
                        onChange={(e) => setFormData({...formData, estado: e.target.value, cidade: ''})}
                        className={`${theme.input} w-full px-3 py-2 rounded border`}
                        required
                      >
                        <option value="">Selecione o Estado</option>
                        {estados.map(estado => (
                          <option key={estado} value={estado}>{estado}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Cidade *</label>
                      <select
                        value={formData.cidade}
                        onChange={(e) => setFormData({...formData, cidade: e.target.value})}
                        className={`${theme.input} w-full px-3 py-2 rounded border`}
                        required
                        disabled={!formData.estado}
                      >
                        <option value="">Selecione a Cidade</option>
                        {formData.estado && getCidadesPorEstado(formData.estado).map(cidade => (
                          <option key={cidade} value={cidade}>{cidade}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">CEP</label>
                      <input
                        type="text"
                        value={formData.cep}
                        onChange={(e) => setFormData({...formData, cep: e.target.value})}
                        className={`${theme.input} w-full px-3 py-2 rounded border`}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className={`${theme.input} w-full px-3 py-2 rounded border`}
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Descrição</label>
                      <textarea
                        value={formData.descricao}
                        onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                        className={`${theme.input} w-full px-3 py-2 rounded border`}
                        rows="3"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Horário de Funcionamento</label>
                      <input
                        type="text"
                        value={formData.horarioFuncionamento}
                        onChange={(e) => setFormData({...formData, horarioFuncionamento: e.target.value})}
                        className={`${theme.input} w-full px-3 py-2 rounded border`}
                        placeholder="Ex: Seg-Sex 6h-22h, Sáb-Dom 8h-20h"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Equipamentos</label>
                      <input
                        type="text"
                        value={formData.equipamentos}
                        onChange={(e) => setFormData({...formData, equipamentos: e.target.value})}
                        className={`${theme.input} w-full px-3 py-2 rounded border`}
                        placeholder="Ex: Esteiras, Pesos, Piscina"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.ativo}
                          onChange={(e) => setFormData({...formData, ativo: e.target.checked})}
                          className="rounded"
                        />
                        <span className="text-sm font-medium">Local Ativo</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-4 pt-4">
                    <button
                      type="button"
                      onClick={resetForm}
                      className={`${theme.secondary} px-4 py-2 rounded-lg`}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className={`${theme.primary} px-4 py-2 rounded-lg disabled:opacity-50`}
                    >
                      {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default AdminLocais