import React, { useState, useEffect, useMemo } from 'react'
import api from '../../../../Api'
import { useToast } from '../../../../components/Toast'

export default function AdminRankings({ tema, user }) {

  // Toast
  const { showError, showSuccess } = useToast()

  // Estados principais
  const [rankings, setRankings] = useState([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState({})
  const [expanded, setExpanded] = useState(false)

  // Estados de paginação
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Estados de filtros e busca
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState('startDate')
  const [sortDir, setSortDir] = useState('desc')

  // Estados do modal
  const [showModal, setShowModal] = useState(false)
  const [editingRanking, setEditingRanking] = useState(null)
  const [formData, setFormData] = useState({
    rankingName: '',
    startDate: '',
    endDate: ''
  })

  // Tema dinâmico
  const theme = useMemo(() => ({
    bg: tema === 'light' ? 'bg-white' : 'bg-gray-800',
    cardBg: tema === 'light' ? 'bg-gray-50' : 'bg-gray-700',
    text: tema === 'light' ? 'text-gray-900' : 'text-white',
    muted: tema === 'light' ? 'text-gray-600' : 'text-gray-300',
    border: tema === 'light' ? 'border-gray-200' : 'border-gray-600',
    input: tema === 'light' ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'
  }), [tema])

  // Buscar rankings
  const fetchRankings = async (options = {}) => {
    try {
      setLoading(true)

      console.log('adminId: ', user?._id)
      const response = await api.get('/admin/rankings', {
        params: {
          adminId: user?._id,
          page: options.page || page,
        }
      })

      if (response.data.success) {
        setRankings(response.data.rankings || [])
        // Como o backend não retorna total/totalPages, vamos calcular baseado no retorno
        const rankingsCount = response.data.rankings?.length || 0
        setTotal(rankingsCount)
        setTotalPages(rankingsCount < 30 ? page : page + 1) // Assumindo 30 por página
      } else {
        showError(response.data.msg || 'Erro ao carregar rankings')
      }
    } catch (error) {
      console.error('Erro ao buscar rankings:', error)
      showError('Erro ao carregar rankings')
    } finally {
      setLoading(false)
    }
  }

  // Criar ranking
  const criarRanking = async () => {
    try {
      setActionLoading(prev => ({ ...prev, create: true }))

      const response = await api.post('/admin/criar-ranking', {
        adminId: user?._id,
        rankingName: formData.rankingName,
        startDate: formData.startDate,
        endDate: formData.endDate
      })

      if (response.data.success) {
        showSuccess('Ranking criado com sucesso!')
        setShowModal(false)
        resetForm()
        fetchRankings()
      } else {
        showError(response.data.msg || 'Erro ao criar ranking')
      }
    } catch (error) {
      console.error('Erro ao criar ranking:', error)
      showError(error.response?.data?.msg || 'Erro ao criar ranking')
    } finally {
      setActionLoading(prev => ({ ...prev, create: false }))
    }
  }

  // Editar ranking
  const editarRanking = async () => {
    try {
      setActionLoading(prev => ({ ...prev, edit: true }))

      const response = await api.post('/admin/editar-ranking', {
        adminId: user?._id,
        rankingId: editingRanking._id,
        rankingName: formData.rankingName,
        startDate: formData.startDate,
        endDate: formData.endDate
      })

      if (response.data.success) {
        showSuccess('Ranking editado com sucesso!')
        setShowModal(false)
        setEditingRanking(null)
        resetForm()
        fetchRankings()
      } else {
        showError(response.data.msg || 'Erro ao editar ranking')
      }
    } catch (error) {
      console.error('Erro ao editar ranking:', error)
      toast.error(error.response?.data?.msg || 'Erro ao editar ranking')
    } finally {
      setActionLoading(prev => ({ ...prev, edit: false }))
    }
  }

  // Deletar ranking
  const deletarRanking = async (rankingId) => {
    if (!window.confirm('Tem certeza que deseja deletar este ranking?')) return

    try {
      const adminId = localStorage.getItem('userId')
      setActionLoading(prev => ({ ...prev, [rankingId]: true }))

      const response = await api.post('/admin/deletar-ranking', {
        adminId: user?._id,
        rankingId
      })

      if (response.data.success) {
        showSuccess('Ranking deletado com sucesso!')
        fetchRankings()
      } else {
        showError(response.data.msg || 'Erro ao deletar ranking')
      }
    } catch (error) {
      console.error('Erro ao deletar ranking:', error)
      toast.error(error.response?.data?.msg || 'Erro ao deletar ranking')
    } finally {
      setActionLoading(prev => ({ ...prev, [rankingId]: false }))
    }
  }

  // Funções auxiliares
  const resetForm = () => {
    setFormData({
      rankingName: '',
      startDate: '',
      endDate: ''
    })
  }

  const openCreateModal = () => {
    resetForm()
    setEditingRanking(null)
    setShowModal(true)
  }

  const openEditModal = (ranking) => {
    setFormData({
      rankingName: ranking.rankingName || '',
      startDate: ranking.startDate ? new Date(ranking.startDate).toISOString().split('T')[0] : '',
      endDate: ranking.endDate ? new Date(ranking.endDate).toISOString().split('T')[0] : ''
    })
    setEditingRanking(ranking)
    setShowModal(true)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const isRankingActive = (ranking) => {
    const now = new Date()
    const endDate = new Date(ranking.endDate)
    return endDate > now
  }

  // Filtrar rankings
  const filteredRankings = useMemo(() => {
    let filtered = [...rankings]

    if (searchTerm) {
      filtered = filtered.filter(ranking =>
        ranking.rankingName?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Ordenação
    filtered.sort((a, b) => {
      const aValue = a[sortField] || ''
      const bValue = b[sortField] || ''

      if (sortDir === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }, [rankings, searchTerm, sortField, sortDir])

  // Effects
  useEffect(() => {
    if (expanded) {
      fetchRankings()
    }
  }, [expanded, page, actionLoading])

  return (
    <div className={`p-4 rounded-lg ${theme.bg} ${theme.text}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Gerenciar Rankings</h2>
        <button
          onClick={() => setExpanded(!expanded)}
          className={`px-4 py-2 rounded-md border ${theme.border} hover:bg-opacity-80 transition-colors`}
        >
          {expanded ? 'Recolher' : 'Expandir'}
        </button>
      </div>

      {expanded && (
        <div className="space-y-4">
          {/* Controles superiores */}
          <div className="flex flex-wrap items-center gap-4 p-4 rounded-lg border">
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Criar Ranking
            </button>

            <input
              type="text"
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`px-3 py-2 rounded-md border ${theme.input}`}
            />

            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className={`px-2 py-1 rounded-md ${theme.input}`}
            >
              <option value="startDate">Data de Início</option>
              <option value="endDate">Data de Fim</option>
              <option value="rankingName">Nome</option>
            </select>

            <select
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value)}
              className={`px-2 py-1 rounded-md ${theme.input}`}
            >
              <option value="desc">Decrescente</option>
              <option value="asc">Crescente</option>
            </select>
          </div>

          {/* Loading */}
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Carregando rankings...</p>
            </div>
          )}

          {/* Lista de rankings */}
          {!loading && (
            <div className="space-y-3">
              {filteredRankings.length === 0 ? (
                <div className={`text-center py-8 ${theme.cardBg} rounded-lg`}>
                  <p className={theme.muted}>Nenhum ranking encontrado</p>
                  <button
                    onClick={openCreateModal}
                    className="mt-2 text-blue-600 hover:text-blue-700 underline"
                  >
                    Criar primeiro ranking
                  </button>
                </div>
              ) : (
                filteredRankings.map((ranking) => (
                  <div
                    key={ranking._id}
                    className={`p-4 rounded-lg border ${theme.cardBg} ${theme.border} ${isRankingActive(ranking) ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{ranking.rankingName}</h3>
                        <div className="mt-2 space-y-1 text-sm">
                          <p>
                            <span className="font-medium">Data de Início:</span> {formatDate(ranking.startDate)}
                          </p>
                          <p>
                            <span className="font-medium">Data de Fim:</span> {formatDate(ranking.endDate)}
                          </p>
                          <p>
                            <span className="font-medium">Status:</span>{' '}
                            <span className={`px-2 py-1 rounded-full text-xs ${isRankingActive(ranking)
                              ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                              : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                              }`}>
                              {isRankingActive(ranking) ? 'Ativo' : 'Finalizado'}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => openEditModal(ranking)}
                          disabled={!!actionLoading[ranking._id]}
                          className="px-3 py-1 text-sm border rounded-md hover:bg-opacity-80 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => deletarRanking(ranking._id)}
                          disabled={!!actionLoading[ranking._id]}
                          className="px-3 py-1 text-sm border border-red-500 text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          {actionLoading[ranking._id] ? 'Deletando...' : 'Deletar'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Paginação */}
          {!loading && filteredRankings.length > 0 && (
            <div className="flex items-center justify-between flex-wrap mt-4">
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(1)}
                  className="px-3 py-1 rounded-md border disabled:opacity-50"
                >
                  Primeiro
                </button>
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1 rounded-md border disabled:opacity-50"
                >
                  Anterior
                </button>
                <span className="px-3">{page} / {totalPages}</span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1 rounded-md border disabled:opacity-50"
                >
                  Próximo
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(totalPages)}
                  className="px-3 py-1 rounded-md border disabled:opacity-50"
                >
                  Último
                </button>
              </div>
              <div className="text-sm text-gray-600">Total: {total}</div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Criar/Editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={`max-w-md w-full p-6 rounded-lg ${theme.bg} ${theme.text}`}>
            <h3 className="text-lg font-semibold mb-4">
              {editingRanking ? 'Editar Ranking' : 'Criar Ranking'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome do Ranking</label>
                <input
                  type="text"
                  value={formData.rankingName}
                  onChange={(e) => setFormData(prev => ({ ...prev, rankingName: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-md border ${theme.input}`}
                  placeholder="Digite o nome do ranking"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Data de Início</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-md border ${theme.input}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Data de Fim</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-md border ${theme.input}`}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={editingRanking ? editarRanking : criarRanking}
                disabled={actionLoading.create || actionLoading.edit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading.create || actionLoading.edit
                  ? (editingRanking ? 'Editando...' : 'Criando...')
                  : (editingRanking ? 'Editar' : 'Criar')
                }
              </button>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingRanking(null)
                  resetForm()
                }}
                className="px-4 py-2 border rounded-md hover:bg-opacity-80 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
