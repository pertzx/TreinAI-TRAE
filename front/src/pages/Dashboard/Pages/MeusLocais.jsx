import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaMapMarkerAlt, 
  FaEdit, 
  FaTrash, 
  FaEye, 
  FaEyeSlash, 
  FaStar,
  FaChartLine,
  FaPlus,
  FaFilter,
  FaSearch,
  FaSpinner
} from 'react-icons/fa';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/Toast';
import api from '../../../Api';

const MeusLocais = ({ tema }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // Estados principais
  const [locais, setLocais] = useState([]);
  const [estatisticas, setEstatisticas] = useState({});
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    busca: '',
    status: 'todos',
    tipo: 'todos'
  });

  // Estados para edição
  const [editandoLocal, setEditandoLocal] = useState(null);
  const [formData, setFormData] = useState({});

  const theme = {
    light: {
      bg: 'bg-white',
      text: 'text-gray-900',
      card: 'bg-gray-50',
      border: 'border-gray-200',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
      buttonSecondary: 'bg-gray-500 hover:bg-gray-600 text-white',
      buttonDanger: 'bg-red-500 hover:bg-red-600 text-white',
      input: 'bg-white border-gray-300 text-gray-900',
      muted: 'text-gray-600',
      success: 'text-green-600',
      warning: 'text-yellow-600',
      danger: 'text-red-600'
    },
    dark: {
      bg: 'bg-gray-900',
      text: 'text-white',
      card: 'bg-gray-800',
      border: 'border-gray-700',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
      buttonSecondary: 'bg-gray-600 hover:bg-gray-700 text-white',
      buttonDanger: 'bg-red-600 hover:bg-red-700 text-white',
      input: 'bg-gray-800 border-gray-600 text-white',
      muted: 'text-gray-400',
      success: 'text-green-400',
      warning: 'text-yellow-400',
      danger: 'text-red-400'
    }
  };

  const currentTheme = theme[tema] || theme.light;

  // Carregar locais do usuário
  const carregarLocais = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/meus-locais?userId=${user.id}`);
      
      if (response.data.success) {
        setLocais(response.data.data.locais);
        setEstatisticas(response.data.data.estatisticas);
      } else {
        showToast('Erro ao carregar locais', 'error');
      }
    } catch (error) {
      console.error('Erro ao carregar locais:', error);
      showToast('Erro ao carregar locais', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Editar local
  const editarLocal = async (localId, dadosAtualizados) => {
    try {
      const response = await api.post('/editar-local', {
        localId,
        ...dadosAtualizados
      });

      if (response.data.success) {
        showToast('Local atualizado com sucesso!', 'success');
        carregarLocais();
        setEditandoLocal(null);
      } else {
        showToast(response.data.msg || 'Erro ao atualizar local', 'error');
      }
    } catch (error) {
      console.error('Erro ao editar local:', error);
      showToast(error.response?.data?.msg || 'Erro ao atualizar local', 'error');
    }
  };

  // Deletar local
  const deletarLocal = async (localId) => {
    if (!window.confirm('Tem certeza que deseja deletar este local?')) {
      return;
    }

    try {
      const response = await api.delete(`/deletar-local-por-id/${localId}`, {
        data: { userId: user.id }
      });

      if (response.data.success) {
        showToast('Local deletado com sucesso!', 'success');
        carregarLocais();
      } else {
        showToast(response.data.message || 'Erro ao deletar local', 'error');
      }
    } catch (error) {
      console.error('Erro ao deletar local:', error);
      showToast(error.response?.data?.message || 'Erro ao deletar local', 'error');
    }
  };

  // Filtrar locais
  const locaisFiltrados = locais.filter(local => {
    const matchBusca = !filtros.busca || 
      local.localName.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      local.localDescricao.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      local.city.toLowerCase().includes(filtros.busca.toLowerCase());
    
    const matchStatus = filtros.status === 'todos' || local.status === filtros.status;
    const matchTipo = filtros.tipo === 'todos' || local.localType === filtros.tipo;
    
    return matchBusca && matchStatus && matchTipo;
  });

  // Calcular média de avaliações
  const calcularMediaAvaliacoes = (avaliacoes) => {
    if (!avaliacoes || avaliacoes.length === 0) return 0;
    const avaliacoesAceitas = avaliacoes.filter(av => av.aceito);
    if (avaliacoesAceitas.length === 0) return 0;
    return avaliacoesAceitas.reduce((acc, av) => acc + av.estrelas, 0) / avaliacoesAceitas.length;
  };

  // Renderizar estrelas
  const renderEstrelas = (media) => {
    const estrelas = [];
    for (let i = 1; i <= 5; i++) {
      estrelas.push(
        <FaStar 
          key={i} 
          className={i <= media ? 'text-yellow-400' : 'text-gray-300'} 
        />
      );
    }
    return estrelas;
  };

  useEffect(() => {
    if (user?.id) {
      carregarLocais();
    }
  }, [user]);

  if (loading) {
    return (
      <div className={`min-h-screen ${currentTheme.bg} ${currentTheme.text} flex items-center justify-center`}>
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl mb-4 mx-auto" />
          <p>Carregando seus locais...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${currentTheme.bg} ${currentTheme.text} p-6`}>
      {/* Header com estatísticas */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-6">Meus Locais</h1>
        
        {/* Cards de estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <motion.div 
            className={`${currentTheme.card} ${currentTheme.border} border rounded-lg p-4`}
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`${currentTheme.muted} text-sm`}>Total de Locais</p>
                <p className="text-2xl font-bold">{estatisticas.total || 0}</p>
              </div>
              <FaMapMarkerAlt className="text-blue-500 text-2xl" />
            </div>
          </motion.div>

          <motion.div 
            className={`${currentTheme.card} ${currentTheme.border} border rounded-lg p-4`}
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`${currentTheme.muted} text-sm`}>Locais Ativos</p>
                <p className={`text-2xl font-bold ${currentTheme.success}`}>{estatisticas.ativos || 0}</p>
              </div>
              <FaEye className="text-green-500 text-2xl" />
            </div>
          </motion.div>

          <motion.div 
            className={`${currentTheme.card} ${currentTheme.border} border rounded-lg p-4`}
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`${currentTheme.muted} text-sm`}>Total Impressões</p>
                <p className="text-2xl font-bold">{estatisticas.totalImpressoes || 0}</p>
              </div>
              <FaChartLine className="text-purple-500 text-2xl" />
            </div>
          </motion.div>

          <motion.div 
            className={`${currentTheme.card} ${currentTheme.border} border rounded-lg p-4`}
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`${currentTheme.muted} text-sm`}>Média Avaliações</p>
                <p className="text-2xl font-bold">{estatisticas.mediaAvaliacoes?.toFixed(1) || '0.0'}</p>
              </div>
              <FaStar className="text-yellow-500 text-2xl" />
            </div>
          </motion.div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar locais..."
                value={filtros.busca}
                onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
                className={`${currentTheme.input} w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            </div>
          </div>
          
          <select
            value={filtros.status}
            onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
            className={`${currentTheme.input} px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500`}
          >
            <option value="todos">Todos os Status</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
          </select>

          <select
            value={filtros.tipo}
            onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
            className={`${currentTheme.input} px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500`}
          >
            <option value="todos">Todos os Tipos</option>
            <option value="academia">Academia</option>
            <option value="clinica-de-fisioterapia">Clínica de Fisioterapia</option>
            <option value="consultorio-de-nutricionista">Consultório de Nutricionista</option>
            <option value="loja">Loja</option>
            <option value="outros">Outros</option>
          </select>
        </div>
      </div>

      {/* Lista de locais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence>
          {locaisFiltrados.map((local) => (
            <motion.div
              key={local._id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`${currentTheme.card} ${currentTheme.border} border rounded-lg p-6 hover:shadow-lg transition-shadow`}
            >
              {/* Header do card */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-1">{local.localName}</h3>
                  <p className={`${currentTheme.muted} text-sm mb-2`}>
                    {local.city}, {local.state} - {local.country}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      local.status === 'ativo' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {local.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-xs font-medium">
                      {local.localType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditandoLocal(local);
                      setFormData({
                        localName: local.localName,
                        localDescricao: local.localDescricao,
                        link: local.link,
                        country: local.country,
                        state: local.state,
                        city: local.city
                      });
                    }}
                    className={`${currentTheme.button} p-2 rounded-lg transition-colors`}
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => deletarLocal(local._id)}
                    className={`${currentTheme.buttonDanger} p-2 rounded-lg transition-colors`}
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>

              {/* Descrição */}
              <p className={`${currentTheme.muted} text-sm mb-4 line-clamp-3`}>
                {local.localDescricao}
              </p>

              {/* Estatísticas do local */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-lg font-semibold">{local.estatisticas?.impressoes || 0}</p>
                  <p className={`${currentTheme.muted} text-xs`}>Impressões</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">{local.estatisticas?.cliques || 0}</p>
                  <p className={`${currentTheme.muted} text-xs`}>Cliques</p>
                </div>
              </div>

              {/* Avaliações */}
              {local.avaliacoes && local.avaliacoes.length > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {renderEstrelas(calcularMediaAvaliacoes(local.avaliacoes))}
                    <span className={`${currentTheme.muted} text-sm ml-2`}>
                      ({local.avaliacoes.filter(av => av.aceito).length} avaliações)
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Modal de edição */}
      <AnimatePresence>
        {editandoLocal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setEditandoLocal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${currentTheme.bg} ${currentTheme.border} border rounded-lg p-6 w-full max-w-md`}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold mb-4">Editar Local</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome do Local</label>
                  <input
                    type="text"
                    value={formData.localName || ''}
                    onChange={(e) => setFormData({ ...formData, localName: e.target.value })}
                    className={`${currentTheme.input} w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Descrição</label>
                  <textarea
                    value={formData.localDescricao || ''}
                    onChange={(e) => setFormData({ ...formData, localDescricao: e.target.value })}
                    rows={3}
                    className={`${currentTheme.input} w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Link/Website</label>
                  <input
                    type="url"
                    value={formData.link || ''}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    className={`${currentTheme.input} w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500`}
                  />
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Nota:</strong> O tipo de local não pode ser alterado após a criação devido às diferenças de preço.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    editarLocal(editandoLocal._id, formData);
                  }}
                  className={`${currentTheme.button} flex-1 py-2 rounded-lg transition-colors`}
                >
                  Salvar Alterações
                </button>
                <button
                  onClick={() => setEditandoLocal(null)}
                  className={`${currentTheme.buttonSecondary} flex-1 py-2 rounded-lg transition-colors`}
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mensagem quando não há locais */}
      {locaisFiltrados.length === 0 && !loading && (
        <div className="text-center py-12">
          <FaMapMarkerAlt className="text-6xl text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Nenhum local encontrado</h3>
          <p className={`${currentTheme.muted} mb-4`}>
            {locais.length === 0 
              ? 'Você ainda não criou nenhum local. Que tal criar o primeiro?'
              : 'Nenhum local corresponde aos filtros aplicados.'
            }
          </p>
          {locais.length === 0 && (
            <button
              onClick={() => window.location.href = '/dashboard/criar-local'}
              className={`${currentTheme.button} px-6 py-3 rounded-lg inline-flex items-center gap-2`}
            >
              <FaPlus />
              Criar Primeiro Local
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MeusLocais;