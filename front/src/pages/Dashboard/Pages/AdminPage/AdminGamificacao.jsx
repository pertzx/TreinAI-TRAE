import React, { useEffect, useState } from 'react'
import api from '../../../../Api'

const AdminGamificacao = ({ tema, user }) => {
  // Validação de segurança - apenas admins podem acessar
  const isAdmin = !!(user && user.role === 'admin')
  
  // Estados principais
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  
  // Estados para desafios
  const [desafios, setDesafios] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingDesafio, setEditingDesafio] = useState(null)
  
  // Estados para formulário de desafio
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    tipo: 'completar_treinos',
    requisitos: {
      quantidade: 1,
      periodo: 'semanal'
    },
    recompensas: {
      pontos: 100,
      badge: '',
      descricao: ''
    },
    dataInicio: '',
    dataFim: '',
    ativo: true
  })

  // Estados para filtros
  const [filtros, setFiltros] = useState({
    tipo: 'todos',
    status: 'todos',
    busca: ''
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

  // Tipos de desafios disponíveis
  const tiposDesafio = [
    { value: 'completar_treinos', label: '🏋️ Completar Treinos', icon: '🏋️' },
    { value: 'usar_nutri_ai', label: '🥗 Usar NutriAI', icon: '🥗' },
    { value: 'sequencia_dias', label: '📅 Sequência de Dias', icon: '📅' },
    { value: 'meta_calorias', label: '🔥 Meta de Calorias', icon: '🔥' },
    { value: 'compartilhar_progresso', label: '📱 Compartilhar Progresso', icon: '📱' },
    { value: 'avaliar_app', label: '⭐ Avaliar App', icon: '⭐' }
  ]

  // Buscar desafios
  const fetchDesafios = async () => {
    try {
      setLoading(true)
      const res = await api.get('/gamification/admin/challenges')
      if (res.data?.challenges) {
        setDesafios(res.data.challenges)
      }
      if (res.data?.erro) {
        setErro(res.data.erro)
      }
    } catch (error) {
      setErro('Erro ao buscar desafios: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Salvar desafio (criar ou editar)
  const salvarDesafio = async () => {
    try {
      setLoading(true)
      
      const payload = {
        ...formData,
        adminId: user._id
      }

      const res = editingDesafio 
        ? await api.put(`/gamification/admin/challenges/${editingDesafio._id}`, payload)
        : await api.post('/gamification/admin/challenges', payload)

      if (res.data?.success) {
        setMsg(editingDesafio ? 'Desafio atualizado com sucesso' : 'Desafio criado com sucesso')
        setShowForm(false)
        setEditingDesafio(null)
        resetForm()
        fetchDesafios()
      } else {
        setErro(res.data?.erro || 'Erro ao salvar desafio')
      }
    } catch (error) {
      setErro('Erro ao salvar desafio: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Deletar desafio
  const deletarDesafio = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar este desafio?')) return

    try {
      setLoading(true)
      const res = await api.delete(`/gamification/admin/challenges/${id}`, {
        data: { adminId: user._id }
      })
      if (res.data?.success) {
        setMsg('Desafio deletado com sucesso')
        fetchDesafios()
      } else {
        setErro(res.data?.erro || 'Erro ao deletar desafio')
      }
    } catch (error) {
      setErro('Erro ao deletar desafio: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Alternar status do desafio
  const toggleStatus = async (id, novoStatus) => {
    try {
      setLoading(true)
      const res = await api.patch(`/gamification/admin/challenges/${id}/status`, { 
        ativo: novoStatus,
        adminId: user._id 
      })
      if (res.data?.success) {
        setMsg(`Desafio ${novoStatus ? 'ativado' : 'desativado'} com sucesso`)
        fetchDesafios()
      } else {
        setErro(res.data?.erro || 'Erro ao alterar status')
      }
    } catch (error) {
      setErro('Erro ao alterar status: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Resetar formulário
  const resetForm = () => {
    setFormData({
      titulo: '',
      descricao: '',
      tipo: 'completar_treinos',
      requisitos: {
        quantidade: 1,
        periodo: 'semanal'
      },
      recompensas: {
        pontos: 100,
        badge: '',
        descricao: ''
      },
      dataInicio: '',
      dataFim: '',
      ativo: true
    })
  }

  // Editar desafio
  const editarDesafio = (desafio) => {
    setEditingDesafio(desafio)
    setFormData({
      titulo: desafio.titulo || '',
      descricao: desafio.descricao || '',
      tipo: desafio.tipo || 'completar_treinos',
      requisitos: desafio.requisitos || { quantidade: 1, periodo: 'semanal' },
      recompensas: desafio.recompensas || { pontos: 100, badge: '', descricao: '' },
      dataInicio: desafio.dataInicio ? desafio.dataInicio.split('T')[0] : '',
      dataFim: desafio.dataFim ? desafio.dataFim.split('T')[0] : '',
      ativo: desafio.ativo !== false
    })
    setShowForm(true)
  }

  // Filtrar desafios
  const desafiosFiltrados = desafios.filter(desafio => {
    const matchTipo = filtros.tipo === 'todos' || desafio.tipo === filtros.tipo
    const matchStatus = filtros.status === 'todos' || 
      (filtros.status === 'ativo' && desafio.ativo) ||
      (filtros.status === 'inativo' && !desafio.ativo)
    const matchBusca = !filtros.busca || 
      desafio.titulo?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      desafio.descricao?.toLowerCase().includes(filtros.busca.toLowerCase())
    
    return matchTipo && matchStatus && matchBusca
  })

  useEffect(() => {
    if (isAdmin) {
      fetchDesafios()
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
        Acesso negado: somente administradores podem gerenciar gamificação.
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

      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">🎮 Gerenciamento de Gamificação</h2>
        <button
          onClick={() => {
            setShowForm(true)
            setEditingDesafio(null)
            resetForm()
          }}
          className={`px-4 py-2 rounded-lg ${theme.button}`}
        >
          ➕ Novo Desafio
        </button>
      </div>

      {/* Filtros */}
      <div className={`${theme.card} border rounded-lg p-4 mb-6`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={`block text-sm font-medium ${theme.text} mb-2`}>
              Buscar
            </label>
            <input
              type="text"
              value={filtros.busca}
              onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
              placeholder="Título ou descrição..."
              className={`w-full px-3 py-2 border rounded-lg ${theme.input}`}
            />
          </div>
          
          <div>
            <label className={`block text-sm font-medium ${theme.text} mb-2`}>
              Tipo
            </label>
            <select
              value={filtros.tipo}
              onChange={(e) => setFiltros(prev => ({ ...prev, tipo: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg ${theme.input}`}
            >
              <option value="todos">Todos os tipos</option>
              {tiposDesafio.map(tipo => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className={`block text-sm font-medium ${theme.text} mb-2`}>
              Status
            </label>
            <select
              value={filtros.status}
              onChange={(e) => setFiltros(prev => ({ ...prev, status: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg ${theme.input}`}
            >
              <option value="todos">Todos</option>
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Desafios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {loading && desafios.length === 0 ? (
          <div className={`${theme.card} border rounded-lg p-4 col-span-full text-center`}>
            Carregando desafios...
          </div>
        ) : desafiosFiltrados.length === 0 ? (
          <div className={`${theme.card} border rounded-lg p-4 col-span-full text-center`}>
            Nenhum desafio encontrado
          </div>
        ) : (
          desafiosFiltrados.map(desafio => {
            const tipoInfo = tiposDesafio.find(t => t.value === desafio.tipo) || tiposDesafio[0]
            return (
              <div key={desafio._id} className={`${theme.card} border rounded-lg p-4`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{tipoInfo.icon}</span>
                    <div>
                      <h3 className="font-semibold">{desafio.titulo}</h3>
                      <p className={`text-sm ${theme.muted}`}>{tipoInfo.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      desafio.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {desafio.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>

                <p className={`text-sm ${theme.muted} mb-3`}>
                  {desafio.descricao}
                </p>

                <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                  <div>
                    <p className={theme.muted}>Requisitos:</p>
                    <p>{desafio.requisitos?.quantidade} {desafio.requisitos?.periodo}</p>
                  </div>
                  <div>
                    <p className={theme.muted}>Recompensa:</p>
                    <p>{desafio.recompensas?.pontos} pontos</p>
                  </div>
                </div>

                {(desafio.dataInicio || desafio.dataFim) && (
                  <div className="text-sm mb-3">
                    <p className={theme.muted}>Período:</p>
                    <p>
                      {desafio.dataInicio && new Date(desafio.dataInicio).toLocaleDateString('pt-BR')}
                      {desafio.dataInicio && desafio.dataFim && ' - '}
                      {desafio.dataFim && new Date(desafio.dataFim).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}

                <div className="flex space-x-2">
                  <button
                    onClick={() => editarDesafio(desafio)}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => toggleStatus(desafio._id, !desafio.ativo)}
                    className={`px-3 py-1 rounded text-sm ${
                      desafio.ativo 
                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {desafio.ativo ? '⏸️ Desativar' : '▶️ Ativar'}
                  </button>
                  <button
                    onClick={() => deletarDesafio(desafio._id)}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    🗑️ Deletar
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal de Formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${theme.card} border rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {editingDesafio ? 'Editar Desafio' : 'Novo Desafio'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingDesafio(null)
                  resetForm()
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${theme.text} mb-2`}>
                  Título *
                </label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg ${theme.input}`}
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${theme.text} mb-2`}>
                  Descrição *
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg ${theme.input}`}
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${theme.text} mb-2`}>
                  Tipo de Desafio *
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg ${theme.input}`}
                >
                  {tiposDesafio.map(tipo => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${theme.text} mb-2`}>
                    Quantidade
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.requisitos.quantidade}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      requisitos: { ...prev.requisitos, quantidade: parseInt(e.target.value) }
                    }))}
                    className={`w-full px-3 py-2 border rounded-lg ${theme.input}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme.text} mb-2`}>
                    Período
                  </label>
                  <select
                    value={formData.requisitos.periodo}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      requisitos: { ...prev.requisitos, periodo: e.target.value }
                    }))}
                    className={`w-full px-3 py-2 border rounded-lg ${theme.input}`}
                  >
                    <option value="diario">Diário</option>
                    <option value="semanal">Semanal</option>
                    <option value="mensal">Mensal</option>
                    <option value="unico">Único</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${theme.text} mb-2`}>
                    Pontos de Recompensa
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.recompensas.pontos}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      recompensas: { ...prev.recompensas, pontos: parseInt(e.target.value) }
                    }))}
                    className={`w-full px-3 py-2 border rounded-lg ${theme.input}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme.text} mb-2`}>
                    Badge (emoji)
                  </label>
                  <input
                    type="text"
                    value={formData.recompensas.badge}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      recompensas: { ...prev.recompensas, badge: e.target.value }
                    }))}
                    placeholder="🏆"
                    className={`w-full px-3 py-2 border rounded-lg ${theme.input}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium ${theme.text} mb-2`}>
                  Descrição da Recompensa
                </label>
                <input
                  type="text"
                  value={formData.recompensas.descricao}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    recompensas: { ...prev.recompensas, descricao: e.target.value }
                  }))}
                  className={`w-full px-3 py-2 border rounded-lg ${theme.input}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${theme.text} mb-2`}>
                    Data de Início
                  </label>
                  <input
                    type="date"
                    value={formData.dataInicio}
                    onChange={(e) => setFormData(prev => ({ ...prev, dataInicio: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg ${theme.input}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme.text} mb-2`}>
                    Data de Fim
                  </label>
                  <input
                    type="date"
                    value={formData.dataFim}
                    onChange={(e) => setFormData(prev => ({ ...prev, dataFim: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg ${theme.input}`}
                  />
                </div>
              </div>

              <div>
                <label className={`flex items-center space-x-2 ${theme.text}`}>
                  <input
                    type="checkbox"
                    checked={formData.ativo}
                    onChange={(e) => setFormData(prev => ({ ...prev, ativo: e.target.checked }))}
                    className="rounded"
                  />
                  <span>Desafio ativo</span>
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={salvarDesafio}
                  disabled={loading || !formData.titulo || !formData.descricao}
                  className={`flex-1 px-4 py-2 rounded-lg ${theme.button} disabled:opacity-50`}
                >
                  {loading ? 'Salvando...' : (editingDesafio ? 'Atualizar' : 'Criar')} Desafio
                </button>
                <button
                  onClick={() => {
                    setShowForm(false)
                    setEditingDesafio(null)
                    resetForm()
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminGamificacao