import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaStar, 
  FaUser, 
  FaCalendarAlt, 
  FaComment,
  FaCheck,
  FaTimes,
  FaSpinner,
  FaExclamationTriangle,
  FaMapMarkerAlt,
  FaFilter,
  FaSearch,
  FaEye
} from 'react-icons/fa';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/Toast';
import api from '../../../../Api';

const AdminAvaliacoes = ({ tema }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // Estados principais
  const [avaliacoesPendentes, setAvaliacoesPendentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState({});
  
  // Estados de paginação e filtros
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [filtros, setFiltros] = useState({
    busca: '',
    estrelas: 'todas'
  });

  // Estados do modal de detalhes
  const [avaliacaoSelecionada, setAvaliacaoSelecionada] = useState(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');

  const theme = {
    light: {
      bg: 'bg-white',
      text: 'text-gray-900',
      card: 'bg-gray-50',
      border: 'border-gray-200',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
      buttonSuccess: 'bg-green-600 hover:bg-green-700 text-white',
      buttonDanger: 'bg-red-600 hover:bg-red-700 text-white',
      buttonSecondary: 'bg-gray-500 hover:bg-gray-600 text-white',
      input: 'bg-white border-gray-300 text-gray-900',
      muted: 'text-gray-600',
      star: 'text-yellow-400',
      starEmpty: 'text-gray-300'
    },
    dark: {
      bg: 'bg-gray-900',
      text: 'text-white',
      card: 'bg-gray-800',
      border: 'border-gray-700',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
      buttonSuccess: 'bg-green-600 hover:bg-green-700 text-white',
      buttonDanger: 'bg-red-600 hover:bg-red-700 text-white',
      buttonSecondary: 'bg-gray-600 hover:bg-gray-700 text-white',
      input: 'bg-gray-800 border-gray-600 text-white',
      muted: 'text-gray-400',
      star: 'text-yellow-400',
      starEmpty: 'text-gray-600'
    }
  };

  const currentTheme = theme[tema] || theme.light;

  // Carregar avaliações pendentes
  const carregarAvaliacoesPendentes = async (pagina = 1) => {
    try {
      setLoading(true);
      const response = await api.get(`/avaliacoes-pendentes?page=${pagina}&limit=20`);
      
      if (response.data.success) {
        setAvaliacoesPendentes(response.data.data.avaliacoes);
        setPaginaAtual(response.data.data.paginacao.paginaAtual);
        setTotalPaginas(response.data.data.paginacao.totalPaginas);
      }
    } catch (error) {
      console.error('Erro ao carregar avaliações pendentes:', error);
      showToast('Erro ao carregar avaliações pendentes', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Moderar avaliação
  const moderarAvaliacao = async (localId, avaliacaoId, aceitar, motivo = '') => {
    try {
      setProcessando({ ...processando, [avaliacaoId]: true });
      
      const response = await api.post('/moderar-avaliacao', {
        localId,
        avaliacaoId,
        aceitar,
        moderadorId: user.id,
        motivoRejeicao: motivo
      });

      if (response.data.success) {
        showToast(
          `Avaliação ${aceitar ? 'aceita' : 'rejeitada'} com sucesso!`, 
          'success'
        );
        
        // Remover da lista
        setAvaliacoesPendentes(prev => 
          prev.filter(av => av._id !== avaliacaoId)
        );
        
        setAvaliacaoSelecionada(null);
        setMotivoRejeicao('');
      } else {
        showToast(response.data.message || 'Erro ao moderar avaliação', 'error');
      }
    } catch (error) {
      console.error('Erro ao moderar avaliação:', error);
      showToast(error.response?.data?.message || 'Erro ao moderar avaliação', 'error');
    } finally {
      setProcessando({ ...processando, [avaliacaoId]: false });
    }
  };

  // Renderizar estrelas
  const renderEstrelas = (quantidade) => {
    return Array.from({ length: 5 }, (_, index) => (
      <FaStar
        key={index}
        className={`${index < quantidade ? currentTheme.star : currentTheme.starEmpty}`}
      />
    ));
  };

  // Formatar data
  const formatarData = (data) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filtrar avaliações
  const avaliacoesFiltradas = avaliacoesPendentes.filter(avaliacao => {
    const matchBusca = !filtros.busca || 
      avaliacao.localName.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      avaliacao.nomeAvaliador.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      avaliacao.comentario.toLowerCase().includes(filtros.busca.toLowerCase());
    
    const matchEstrelas = filtros.estrelas === 'todas' || 
      avaliacao.estrelas === parseInt(filtros.estrelas);
    
    return matchBusca && matchEstrelas;
  });

  useEffect(() => {
    carregarAvaliacoesPendentes();
  }, []);

  return (
    <div className={`min-h-screen ${currentTheme.bg} ${currentTheme.text} p-6`}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Moderação de Avaliações</h1>
        <p className={`${currentTheme.muted}`}>
          Analise e modere as avaliações enviadas pelos usuários
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por local, avaliador ou comentário..."
              value={filtros.busca}
              onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
              className={`${currentTheme.input} w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
          </div>
        </div>
        
        <select
          value={filtros.estrelas}
          onChange={(e) => setFiltros({ ...filtros, estrelas: e.target.value })}
          className={`${currentTheme.input} px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500`}
        >
          <option value="todas">Todas as Estrelas</option>
          <option value="5">5 Estrelas</option>
          <option value="4">4 Estrelas</option>
          <option value="3">3 Estrelas</option>
          <option value="2">2 Estrelas</option>
          <option value="1">1 Estrela</option>
        </select>
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`${currentTheme.card} ${currentTheme.border} border rounded-lg p-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`${currentTheme.muted} text-sm`}>Total Pendentes</p>
              <p className="text-2xl font-bold">{avaliacoesPendentes.length}</p>
            </div>
            <FaExclamationTriangle className="text-yellow-500 text-2xl" />
          </div>
        </div>

        <div className={`${currentTheme.card} ${currentTheme.border} border rounded-lg p-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`${currentTheme.muted} text-sm`}>Filtradas</p>
              <p className="text-2xl font-bold">{avaliacoesFiltradas.length}</p>
            </div>
            <FaFilter className="text-blue-500 text-2xl" />
          </div>
        </div>

        <div className={`${currentTheme.card} ${currentTheme.border} border rounded-lg p-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`${currentTheme.muted} text-sm`}>Média Estrelas</p>
              <p className="text-2xl font-bold">
                {avaliacoesPendentes.length > 0 
                  ? (avaliacoesPendentes.reduce((acc, av) => acc + av.estrelas, 0) / avaliacoesPendentes.length).toFixed(1)
                  : '0.0'
                }
              </p>
            </div>
            <FaStar className="text-yellow-500 text-2xl" />
          </div>
        </div>
      </div>

      {/* Lista de avaliações */}
      {loading ? (
        <div className="text-center py-12">
          <FaSpinner className="animate-spin text-4xl mb-4 mx-auto" />
          <p>Carregando avaliações pendentes...</p>
        </div>
      ) : avaliacoesFiltradas.length > 0 ? (
        <div className="space-y-4">
          {avaliacoesFiltradas.map((avaliacao) => (
            <motion.div
              key={avaliacao._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${currentTheme.card} ${currentTheme.border} border rounded-lg p-6`}
            >
              {/* Header da avaliação */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {avaliacao.nomeAvaliador?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="font-medium">{avaliacao.nomeAvaliador || 'Usuário Anônimo'}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {renderEstrelas(avaliacao.estrelas)}
                        </div>
                        <span className={`${currentTheme.muted} text-sm`}>
                          {formatarData(avaliacao.dataAvaliacao)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Informações do local */}
                  <div className="flex items-center gap-2 mb-3">
                    <FaMapMarkerAlt className="text-blue-500" />
                    <span className="font-medium">{avaliacao.localName}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${currentTheme.muted} bg-gray-200 dark:bg-gray-700`}>
                      {avaliacao.localType?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>

                  {/* Comentário */}
                  {avaliacao.comentario && (
                    <div className="mb-4">
                      <p className="text-sm leading-relaxed bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                        "{avaliacao.comentario}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Ações */}
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => setAvaliacaoSelecionada(avaliacao)}
                    className={`${currentTheme.button} p-2 rounded-lg transition-colors`}
                    title="Ver detalhes"
                  >
                    <FaEye />
                  </button>
                  
                  <button
                    onClick={() => moderarAvaliacao(avaliacao.localId, avaliacao._id, true)}
                    disabled={processando[avaliacao._id]}
                    className={`${currentTheme.buttonSuccess} p-2 rounded-lg transition-colors disabled:opacity-50`}
                    title="Aceitar avaliação"
                  >
                    {processando[avaliacao._id] ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                  </button>
                  
                  <button
                    onClick={() => {
                      setAvaliacaoSelecionada(avaliacao);
                      setMotivoRejeicao('');
                    }}
                    disabled={processando[avaliacao._id]}
                    className={`${currentTheme.buttonDanger} p-2 rounded-lg transition-colors disabled:opacity-50`}
                    title="Rejeitar avaliação"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => carregarAvaliacoesPendentes(paginaAtual - 1)}
                disabled={paginaAtual === 1}
                className={`${currentTheme.buttonSecondary} px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Anterior
              </button>
              
              <span className={`${currentTheme.muted} px-4 py-2`}>
                Página {paginaAtual} de {totalPaginas}
              </span>
              
              <button
                onClick={() => carregarAvaliacoesPendentes(paginaAtual + 1)}
                disabled={paginaAtual === totalPaginas}
                className={`${currentTheme.buttonSecondary} px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Próxima
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <FaComment className="text-6xl text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Nenhuma avaliação pendente</h3>
          <p className={`${currentTheme.muted}`}>
            {avaliacoesPendentes.length === 0 
              ? 'Todas as avaliações foram moderadas!'
              : 'Nenhuma avaliação corresponde aos filtros aplicados.'
            }
          </p>
        </div>
      )}

      {/* Modal de detalhes/rejeição */}
      <AnimatePresence>
        {avaliacaoSelecionada && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => {
              setAvaliacaoSelecionada(null);
              setMotivoRejeicao('');
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${currentTheme.bg} ${currentTheme.border} border rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto`}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold mb-4">Detalhes da Avaliação</h3>
              
              {/* Informações da avaliação */}
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Local</label>
                    <p className={`${currentTheme.card} p-2 rounded`}>{avaliacaoSelecionada.localName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Tipo</label>
                    <p className={`${currentTheme.card} p-2 rounded`}>
                      {avaliacaoSelecionada.localType?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Avaliador</label>
                    <p className={`${currentTheme.card} p-2 rounded`}>
                      {avaliacaoSelecionada.nomeAvaliador || 'Usuário Anônimo'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Data</label>
                    <p className={`${currentTheme.card} p-2 rounded`}>
                      {formatarData(avaliacaoSelecionada.dataAvaliacao)}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Classificação</label>
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {renderEstrelas(avaliacaoSelecionada.estrelas)}
                    </div>
                    <span>({avaliacaoSelecionada.estrelas} de 5 estrelas)</span>
                  </div>
                </div>

                {avaliacaoSelecionada.comentario && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Comentário</label>
                    <div className={`${currentTheme.card} p-3 rounded`}>
                      <p className="leading-relaxed">"{avaliacaoSelecionada.comentario}"</p>
                    </div>
                  </div>
                )}

                {/* Campo para motivo de rejeição */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Motivo da Rejeição (opcional)
                  </label>
                  <textarea
                    value={motivoRejeicao}
                    onChange={(e) => setMotivoRejeicao(e.target.value.substring(0, 200))}
                    placeholder="Descreva o motivo da rejeição (opcional)..."
                    rows={3}
                    className={`${currentTheme.input} w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500`}
                  />
                  <p className={`${currentTheme.muted} text-xs mt-1`}>
                    {motivoRejeicao.length}/200 caracteres
                  </p>
                </div>
              </div>

              {/* Ações */}
              <div className="flex gap-3">
                <button
                  onClick={() => moderarAvaliacao(
                    avaliacaoSelecionada.localId, 
                    avaliacaoSelecionada._id, 
                    true
                  )}
                  disabled={processando[avaliacaoSelecionada._id]}
                  className={`${currentTheme.buttonSuccess} flex-1 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}
                >
                  {processando[avaliacaoSelecionada._id] ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaCheck />
                  )}
                  Aceitar Avaliação
                </button>
                
                <button
                  onClick={() => moderarAvaliacao(
                    avaliacaoSelecionada.localId, 
                    avaliacaoSelecionada._id, 
                    false, 
                    motivoRejeicao
                  )}
                  disabled={processando[avaliacaoSelecionada._id]}
                  className={`${currentTheme.buttonDanger} flex-1 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}
                >
                  {processando[avaliacaoSelecionada._id] ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaTimes />
                  )}
                  Rejeitar Avaliação
                </button>
                
                <button
                  onClick={() => {
                    setAvaliacaoSelecionada(null);
                    setMotivoRejeicao('');
                  }}
                  className={`${currentTheme.buttonSecondary} px-6 py-2 rounded-lg transition-colors`}
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminAvaliacoes;