import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaStar, 
  FaUser, 
  FaCalendarAlt, 
  FaComment,
  FaThumbsUp,
  FaFlag,
  FaSpinner,
  FaExclamationTriangle,
  FaCheckCircle
} from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import api from '../Api';

const AvaliacaoLocal = ({ localId, tema, onAvaliacaoEnviada }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // Estados principais
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [estatisticas, setEstatisticas] = useState({});
  const [loading, setLoading] = useState(true);
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);
  
  // Estados do formulário
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [novaAvaliacao, setNovaAvaliacao] = useState({
    estrelas: 0,
    comentario: '',
    nomeAvaliador: user?.name || ''
  });

  // Estados de paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const theme = {
    light: {
      bg: 'bg-white',
      text: 'text-gray-900',
      card: 'bg-gray-50',
      border: 'border-gray-200',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
      buttonSecondary: 'bg-gray-500 hover:bg-gray-600 text-white',
      buttonSuccess: 'bg-green-600 hover:bg-green-700 text-white',
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
      buttonSecondary: 'bg-gray-600 hover:bg-gray-700 text-white',
      buttonSuccess: 'bg-green-600 hover:bg-green-700 text-white',
      input: 'bg-gray-800 border-gray-600 text-white',
      muted: 'text-gray-400',
      star: 'text-yellow-400',
      starEmpty: 'text-gray-600'
    }
  };

  const currentTheme = theme[tema] || theme.light;

  // Carregar avaliações
  const carregarAvaliacoes = async (pagina = 1) => {
    try {
      setLoading(true);
      const response = await api.get(`/avaliacoes-local/${localId}?page=${pagina}&limit=10`);
      
      if (response.data.success) {
        setAvaliacoes(response.data.data.avaliacoes);
        setEstatisticas(response.data.data.estatisticas);
        setPaginaAtual(response.data.data.paginacao.paginaAtual);
        setTotalPaginas(response.data.data.paginacao.totalPaginas);
      }
    } catch (error) {
      console.error('Erro ao carregar avaliações:', error);
      showToast('Erro ao carregar avaliações', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Enviar nova avaliação
  const enviarAvaliacao = async () => {
    if (!user) {
      showToast('Você precisa estar logado para avaliar', 'error');
      return;
    }

    if (novaAvaliacao.estrelas === 0) {
      showToast('Selecione uma classificação', 'error');
      return;
    }

    try {
      setEnviandoAvaliacao(true);
      const response = await api.post('/avaliar-local', {
        localId,
        userId: user.id,
        estrelas: novaAvaliacao.estrelas,
        comentario: novaAvaliacao.comentario.trim(),
        nomeAvaliador: novaAvaliacao.nomeAvaliador.trim() || user.name
      });

      if (response.data.success) {
        showToast('Avaliação enviada com sucesso! Ela será analisada antes de ser publicada.', 'success');
        setMostrarFormulario(false);
        setNovaAvaliacao({
          estrelas: 0,
          comentario: '',
          nomeAvaliador: user?.name || ''
        });
        
        if (onAvaliacaoEnviada) {
          onAvaliacaoEnviada();
        }
      } else {
        showToast(response.data.message || 'Erro ao enviar avaliação', 'error');
      }
    } catch (error) {
      console.error('Erro ao enviar avaliação:', error);
      showToast(error.response?.data?.message || 'Erro ao enviar avaliação', 'error');
    } finally {
      setEnviandoAvaliacao(false);
    }
  };

  // Renderizar estrelas para seleção
  const renderEstrelasSelecionaveis = () => {
    return Array.from({ length: 5 }, (_, index) => (
      <motion.button
        key={index}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setNovaAvaliacao({ ...novaAvaliacao, estrelas: index + 1 })}
        className={`text-2xl transition-colors ${
          index < novaAvaliacao.estrelas ? currentTheme.star : currentTheme.starEmpty
        }`}
      >
        <FaStar />
      </motion.button>
    ));
  };

  // Renderizar estrelas para exibição
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
      year: 'numeric'
    });
  };

  useEffect(() => {
    if (localId) {
      carregarAvaliacoes();
    }
  }, [localId]);

  return (
    <div className={`${currentTheme.bg} ${currentTheme.text} p-6 rounded-lg`}>
      {/* Header com estatísticas */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold">Avaliações</h3>
          {user && (
            <button
              onClick={() => setMostrarFormulario(!mostrarFormulario)}
              className={`${currentTheme.button} px-4 py-2 rounded-lg transition-colors`}
            >
              {mostrarFormulario ? 'Cancelar' : 'Avaliar Local'}
            </button>
          )}
        </div>

        {/* Estatísticas das avaliações */}
        {estatisticas.total > 0 && (
          <div className={`${currentTheme.card} ${currentTheme.border} border rounded-lg p-4 mb-6`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-3xl font-bold">{estatisticas.mediaEstrelas?.toFixed(1)}</span>
                  <div className="flex">
                    {renderEstrelas(Math.round(estatisticas.mediaEstrelas))}
                  </div>
                </div>
                <p className={`${currentTheme.muted} text-sm`}>
                  Baseado em {estatisticas.total} avaliações
                </p>
              </div>

              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map(estrela => (
                  <div key={estrela} className="flex items-center gap-2">
                    <span className="text-sm w-8">{estrela}★</span>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-yellow-400 h-2 rounded-full transition-all"
                        style={{
                          width: `${estatisticas.total > 0 
                            ? (estatisticas.distribuicaoEstrelas?.[estrela] || 0) / estatisticas.total * 100 
                            : 0}%`
                        }}
                      />
                    </div>
                    <span className="text-sm w-8 text-right">
                      {estatisticas.distribuicaoEstrelas?.[estrela] || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Formulário de nova avaliação */}
      <AnimatePresence>
        {mostrarFormulario && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`${currentTheme.card} ${currentTheme.border} border rounded-lg p-4 mb-6`}
          >
            <h4 className="text-lg font-semibold mb-4">Deixe sua avaliação</h4>
            
            <div className="space-y-4">
              {/* Seleção de estrelas */}
              <div>
                <label className="block text-sm font-medium mb-2">Classificação</label>
                <div className="flex gap-1">
                  {renderEstrelasSelecionaveis()}
                </div>
                {novaAvaliacao.estrelas > 0 && (
                  <p className={`${currentTheme.muted} text-sm mt-1`}>
                    {novaAvaliacao.estrelas} de 5 estrelas
                  </p>
                )}
              </div>

              {/* Nome do avaliador */}
              <div>
                <label className="block text-sm font-medium mb-1">Nome (opcional)</label>
                <input
                  type="text"
                  value={novaAvaliacao.nomeAvaliador}
                  onChange={(e) => setNovaAvaliacao({ 
                    ...novaAvaliacao, 
                    nomeAvaliador: e.target.value.substring(0, 100) 
                  })}
                  placeholder="Como você gostaria de aparecer na avaliação?"
                  className={`${currentTheme.input} w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500`}
                />
              </div>

              {/* Comentário */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Comentário (opcional)
                </label>
                <textarea
                  value={novaAvaliacao.comentario}
                  onChange={(e) => setNovaAvaliacao({ 
                    ...novaAvaliacao, 
                    comentario: e.target.value.substring(0, 500) 
                  })}
                  placeholder="Conte sobre sua experiência com este local..."
                  rows={4}
                  className={`${currentTheme.input} w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500`}
                />
                <p className={`${currentTheme.muted} text-xs mt-1`}>
                  {novaAvaliacao.comentario.length}/500 caracteres
                </p>
              </div>

              {/* Botões */}
              <div className="flex gap-3">
                <button
                  onClick={enviarAvaliacao}
                  disabled={enviandoAvaliacao || novaAvaliacao.estrelas === 0}
                  className={`${currentTheme.buttonSuccess} flex-1 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                >
                  {enviandoAvaliacao ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <FaCheckCircle />
                      Enviar Avaliação
                    </>
                  )}
                </button>
                <button
                  onClick={() => setMostrarFormulario(false)}
                  className={`${currentTheme.buttonSecondary} px-6 py-2 rounded-lg transition-colors`}
                >
                  Cancelar
                </button>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-2">
                <FaExclamationTriangle className="text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium">Moderação de Conteúdo</p>
                  <p>Sua avaliação será analisada antes de ser publicada para garantir a qualidade e veracidade das informações.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de avaliações */}
      {loading ? (
        <div className="text-center py-8">
          <FaSpinner className="animate-spin text-2xl mx-auto mb-2" />
          <p>Carregando avaliações...</p>
        </div>
      ) : avaliacoes.length > 0 ? (
        <div className="space-y-4">
          {avaliacoes.map((avaliacao, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`${currentTheme.card} ${currentTheme.border} border rounded-lg p-4`}
            >
              {/* Header da avaliação */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {avaliacao.nomeAvaliador?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="font-medium">{avaliacao.nomeAvaliador || 'Usuário Anônimo'}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {renderEstrelas(avaliacao.estrelas)}
                      </div>
                      <span className={`${currentTheme.muted} text-sm flex items-center gap-1`}>
                        <FaCalendarAlt className="text-xs" />
                        {formatarData(avaliacao.dataAvaliacao)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comentário */}
              {avaliacao.comentario && (
                <div className="mb-3">
                  <p className="text-sm leading-relaxed">{avaliacao.comentario}</p>
                </div>
              )}
            </motion.div>
          ))}

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => carregarAvaliacoes(paginaAtual - 1)}
                disabled={paginaAtual === 1}
                className={`${currentTheme.buttonSecondary} px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Anterior
              </button>
              
              <span className={`${currentTheme.muted} px-4 py-2`}>
                Página {paginaAtual} de {totalPaginas}
              </span>
              
              <button
                onClick={() => carregarAvaliacoes(paginaAtual + 1)}
                disabled={paginaAtual === totalPaginas}
                className={`${currentTheme.buttonSecondary} px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Próxima
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <FaComment className="text-4xl text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-semibold mb-2">Nenhuma avaliação ainda</h4>
          <p className={`${currentTheme.muted} mb-4`}>
            Seja o primeiro a avaliar este local!
          </p>
          {user && !mostrarFormulario && (
            <button
              onClick={() => setMostrarFormulario(true)}
              className={`${currentTheme.button} px-6 py-3 rounded-lg`}
            >
              Deixar Primeira Avaliação
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AvaliacaoLocal;