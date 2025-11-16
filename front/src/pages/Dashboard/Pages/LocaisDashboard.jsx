import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaSearch,
  FaFilter,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaToggleOn,
  FaToggleOff,
  FaSpinner,
  FaTimes,
  FaCheck,
  FaExclamationTriangle
} from 'react-icons/fa';
import { MdLocationOn, MdDateRange, MdVisibility } from 'react-icons/md';
import api from '../../../Api';
import locationsRaw from '../../../data/locations.json';
import { useToast } from '../../../components/Toast';
import { buildImageUrl } from '../../../utils/imageUtils';

const LocaisDashboard = ({ tema, user }) => {
  // Estados principais
  const [locais, setLocais] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLocal, setSelectedLocal] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  // Estados para paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 10;

  // Estados para filtros
  const [filtros, setFiltros] = useState({
    busca: '',
    status: 'all', // all, ativo, inativo
    ordenacao: 'recente' // recente, antigo, nome
  });

  // Estados para formulário de criação
  const [formData, setFormData] = useState({
    localName: '',
    localDescricao: '',
    localType: 'academia',
    country: 'Brazil',
    countryCode: 'BR',
    state: '',
    city: '',
    image: null
  });

  // Estados para formulário de edição
  const [editFormData, setEditFormData] = useState({
    localName: '',
    localDescricao: '',
    link: '',
    country: 'Brazil',
    countryCode: 'BR',
    state: '',
    city: '',
    image: null
  });

  const { showSuccess, showError, showWarning } = useToast();

  // Tema dinâmico
  const theme = {
    light: {
      bg: 'bg-gray-50',
      cardBg: 'bg-white',
      text: 'text-gray-900',
      textSecondary: 'text-gray-600',
      border: 'border-gray-200',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
      buttonSecondary: 'bg-gray-200 hover:bg-gray-300 text-gray-700',
      buttonDanger: 'bg-red-600 hover:bg-red-700 text-white',
      input: 'bg-white border-gray-300 text-gray-900',
      shadow: 'shadow-lg'
    },
    dark: {
      bg: 'bg-gray-900',
      cardBg: 'bg-gray-800',
      text: 'text-white',
      textSecondary: 'text-gray-300',
      border: 'border-gray-700',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
      buttonSecondary: 'bg-gray-700 hover:bg-gray-600 text-gray-300',
      buttonDanger: 'bg-red-600 hover:bg-red-700 text-white',
      input: 'bg-gray-700 border-gray-600 text-white',
      shadow: 'shadow-xl'
    }
  };

  const currentTheme = theme[tema] || theme.light;

  const countries = useMemo(() => (locationsRaw?.countries || []), []);
  const statesCreate = useMemo(() => {
    if (!formData.country) return [];
    const byCountry = locationsRaw?.byCountry?.[formData.country];
    return byCountry?.states || [];
  }, [formData.country]);
  const citiesCreate = useMemo(() => {
    if (!formData.country || !formData.state) return [];
    const byCountry = locationsRaw?.byCountry?.[formData.country];
    const byState = byCountry?.citiesByState?.[formData.state];
    return byState || [];
  }, [formData.country, formData.state]);
  const statesEdit = useMemo(() => {
    if (!editFormData.country) return [];
    const byCountry = locationsRaw?.byCountry?.[editFormData.country];
    return byCountry?.states || [];
  }, [editFormData.country]);
  const citiesEdit = useMemo(() => {
    if (!editFormData.country || !editFormData.state) return [];
    const byCountry = locationsRaw?.byCountry?.[editFormData.country];
    const byState = byCountry?.citiesByState?.[editFormData.state];
    return byState || [];
  }, [editFormData.country, editFormData.state]);

  // Função para carregar locais
  const carregarLocais = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setErro('');

    try {
      const params = {
        userId: user._id
      }

      console.log(params)

      const response = await api.get('/meus-locais', { params });

      console.log(response)
      if (response.data.success) {
        setLocais(response.data.data.locais || []);
      } else {
        setErro(response.data.message || 'Erro ao carregar locais');
        showError('Erro ao carregar locais');
      }
    } catch (error) {
      console.error('Erro ao carregar locais:', error);
      setErro('Erro ao carregar locais');
      showError('Erro ao carregar locais');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [showError]);

  // Função para criar local
  const criarLocal = async (e) => {
    e.preventDefault();
    setActionLoading(prev => ({ ...prev, create: true }));

    try {
      if (!formData.link || !/^https?:\/\//.test(formData.link)) {
        showError('Informe um link válido (http:// ou https://)');
        return;
      }
      if (!formData.localDescricao || String(formData.localDescricao).trim().length < 10) {
        showError('A descrição deve ter pelo menos 10 caracteres');
        return;
      }
      const submitData = new FormData();

      // Adicionar campos de texto
      Object.keys(formData).forEach(key => {
        if (key !== 'image' && key !== 'countryCode' && formData[key]) {
          submitData.append(key, formData[key]);
        }
      });

      // Garantir envio do usuário proprietário
      submitData.append('userId', user._id);

      // Adicionar imagem se existir
      if (formData.image) {
        submitData.append('image', formData.image);
      }

      submitData.append('countryCode', formData.countryCode || '');

      const response = await api.post('/criar-local-direto', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        const paymentUrl = response?.data?.payment?.url;
        const localIdCreated = response?.data?.local?.localId || response?.data?.local?.id;
        if (paymentUrl) {
          try {
            sessionStorage.setItem('pendingLocalPayment', JSON.stringify({ localId: localIdCreated, sessionId: response?.data?.payment?.sessionId }));
          } catch (_) {}
          window.location.assign(paymentUrl);
          return;
        }
        showSuccess('Local criado com sucesso!');
        setShowCreateForm(false);
        resetFormData();
        carregarLocais(false);
      } else {
        showError(response.data.message || 'Erro ao criar local');
      }
    } catch (error) {
      console.error('Erro ao criar local:', error);
      showError('Erro ao criar local');
    } finally {
      setActionLoading(prev => ({ ...prev, create: false }));
    }
  };

  // Função para editar local
  const editarLocal = async (e) => {
    e.preventDefault();
    if (!selectedLocal) return;

    setActionLoading(prev => ({ ...prev, edit: true }));

    try {
      if (editFormData.link && !/^https?:\/\//.test(editFormData.link)) {
        showError('Informe um link válido (http:// ou https://)');
        return;
      }
      if (editFormData.localDescricao && String(editFormData.localDescricao).trim().length < 10) {
        showError('A descrição deve ter pelo menos 10 caracteres');
        return;
      }
      const submitData = new FormData();

      // Adicionar campos de texto
      Object.keys(editFormData).forEach(key => {
        if (key !== 'image' && editFormData[key]) {
          submitData.append(key, editFormData[key]);
        }
      });

      // Garantir envio do identificador do local
      submitData.append('localId', selectedLocal.localId || selectedLocal._id);

      // Adicionar imagem se existir
      if (editFormData.image) {
        submitData.append('image', editFormData.image);
      }

      const response = await api.post('/editar-local', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        showSuccess('Local editado com sucesso!');
        setShowEditModal(false);
        setSelectedLocal(null);
        carregarLocais(false);
      } else {
        showError(response.data.message || 'Erro ao editar local');
      }
    } catch (error) {
      console.error('Erro ao editar local:', error);
      showError('Erro ao editar local');
    } finally {
      setActionLoading(prev => ({ ...prev, edit: false }));
    }
  };

  // Função para deletar local
  const deletarLocal = async (localId) => {
    if (!window.confirm('Tem certeza que deseja deletar este local? Esta ação não pode ser desfeita.')) {
      return;
    }

    setActionLoading(prev => ({ ...prev, [`delete_${localId}`]: true }));
    const previousLocais = locais;
    setLocais(prev => prev.filter((l) => String(l._id) !== String(localId) && String(l.localId) !== String(localId)));

    try {
      const response = await api.post('/deletar-local', { localId, userId: user._id });

      if (response.data.success) {
        showSuccess('Local deletado com sucesso!');
        carregarLocais(false);
      } else {
        showError(response.data.message || response.data.msg || 'Erro ao deletar local');
        setLocais(previousLocais);
      }
    } catch (error) {
      console.error('Erro ao deletar local:', error);
      const msg = error?.response?.data?.message || error?.response?.data?.msg || 'Erro ao deletar local';
      showError(msg);
      setLocais(previousLocais);
    } finally {
      setActionLoading(prev => ({ ...prev, [`delete_${localId}`]: false }));
    }
  };

  // Função para resetar formulário
  const resetFormData = () => {
    setFormData({
      localName: '',
      localDescricao: '',
      link: '',
      localType: 'academia',
      country: 'Brazil',
      countryCode: 'BR',
      state: '',
      city: '',
      image: null
    });
  };

  // Função para abrir modal de edição
  const abrirModalEdicao = (local) => {
    setSelectedLocal(local);
    const countryName = local.country === 'Brasil' ? 'Brazil' : (local.country || 'Brazil');
    const countryObj = (locationsRaw?.countries || []).find((c) => c.name === countryName);
    const code = countryObj?.code || (local.countryCode || '');
    setEditFormData({
      localName: local.localName || '',
      localDescricao: local.localDescricao || '',
      link: local.link || '',
      country: countryName,
      countryCode: code,
      state: local.state || '',
      city: local.city || '',
      image: null
    });
    setShowEditModal(true);
  };

  // Função para abrir modal de detalhes
  const abrirModalDetalhes = (local) => {
    setSelectedLocal(local);
    setShowDetailsModal(true);
  };

  // Função para formatar data
  const formatarData = (data) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Função para filtrar locais
  const aplicarFiltros = (novosFiltros) => {
    setFiltros(prev => ({ ...prev, ...novosFiltros }));
    setPaginaAtual(1);
  };

  // Filtrar locais no frontend
  const locaisFiltrados = useMemo(() => {
    return locais.filter(local => {
      const matchBusca = !filtros.busca || 
        local.localName?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
        local.localDescricao?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
        local.city?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
        local.state?.toLowerCase().includes(filtros.busca.toLowerCase());
      
      const matchStatus = filtros.status === 'all' || !filtros.status || local.status === filtros.status;
      
      return matchBusca && matchStatus;
    });
  }, [locais, filtros]);

  // Aplicar ordenação
  const locaisOrdenados = useMemo(() => {
    const locaisParaOrdenar = [...locaisFiltrados];
    
    switch (filtros.ordenacao) {
      case 'nome':
        return locaisParaOrdenar.sort((a, b) => a.localName?.localeCompare(b.localName));
      case 'antigo':
        return locaisParaOrdenar.sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm));
      case 'recente':
      default:
        return locaisParaOrdenar.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
    }
  }, [locaisFiltrados, filtros.ordenacao]);

  // Calcular paginação
  const totalItensCalculado = locaisOrdenados.length;
  const totalPaginasCalculado = Math.ceil(totalItensCalculado / itensPorPagina);
  const indiceInicio = (paginaAtual - 1) * itensPorPagina;
  const locaisPaginados = locaisOrdenados.slice(indiceInicio, indiceInicio + itensPorPagina);

  // Efeito para carregar locais
  useEffect(() => {
    carregarLocais();
  }, [carregarLocais]);

  // Efeito para resetar página quando filtros mudarem
  useEffect(() => {
    setPaginaAtual(1);
  }, [filtros.busca, filtros.status, filtros.ordenacao]);

  return (
    <div className={`min-h-screen ${currentTheme.bg} p-6`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className={`${currentTheme.cardBg} rounded-lg ${currentTheme.shadow} p-6 mb-6`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className={`text-3xl font-bold ${currentTheme.text} mb-2`}>
                Gerenciamento de Locais
              </h1>
              <p className={currentTheme.textSecondary}>
                Gerencie seus locais de treino de forma completa
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateForm(true)}
              className={`${currentTheme.button} px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors`}
            >
              <FaPlus />
              Novo Local
            </motion.button>
          </div>
        </div>

        {/* Filtros */}
        <div className={`${currentTheme.cardBg} rounded-lg ${currentTheme.shadow} p-6 mb-6`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Busca */}
            <div className="relative">
              <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${currentTheme.textSecondary}`} />
              <input
                type="text"
                placeholder="Buscar por nome..."
                value={filtros.busca}
                onChange={(e) => aplicarFiltros({ busca: e.target.value })}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border ${currentTheme.input} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            </div>

            {/* Status */}
            <select
              value={filtros.status}
              onChange={(e) => aplicarFiltros({ status: e.target.value })}
              className={`px-4 py-2 rounded-lg border ${currentTheme.input} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            >
              <option value="all">Todos os Status</option>
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
            </select>

            {/* Ordenação */}
            <select
              value={filtros.ordenacao}
              onChange={(e) => aplicarFiltros({ ordenacao: e.target.value })}
              className={`px-4 py-2 rounded-lg border ${currentTheme.input} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            >
              <option value="recente">Mais Recentes</option>
              <option value="antigo">Mais Antigos</option>
              <option value="nome">Nome A-Z</option>
            </select>
          </div>
        </div>

        {/* Lista de Locais */}
        <div className={`overflow-x-auto ${currentTheme.cardBg} rounded-lg ${currentTheme.shadow} overflow-hidden`}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <FaSpinner className={`animate-spin text-4xl ${currentTheme.textSecondary}`} />
            </div>
          ) : erro ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <FaExclamationTriangle className={`text-4xl ${currentTheme.textSecondary} mb-4 mx-auto`} />
                <p className={currentTheme.textSecondary}>{erro}</p>
              </div>
            </div>
          ) : locaisFiltrados.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <FaMapMarkerAlt className={`text-4xl ${currentTheme.textSecondary} mb-4 mx-auto`} />
                <p className={currentTheme.textSecondary}>Nenhum local encontrado</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCreateForm(true)}
                  className={`${currentTheme.button} px-4 py-2 rounded-lg mt-4 transition-colors`}
                >
                  Criar Primeiro Local
                </motion.button>
              </div>
            </div>
          ) : (
            <>
              {/* Tabela */}
              <div className="">
                <table className="w-full">
                  <thead className={`${currentTheme.bg} border-b ${currentTheme.border}`}>
                    <tr>
                      <th className={`px-6 py-4 text-left text-sm font-medium ${currentTheme.textSecondary} uppercase tracking-wider`}>
                        Local
                      </th>
                      <th className={`px-6 py-4 text-left text-sm font-medium ${currentTheme.textSecondary} uppercase tracking-wider`}>
                        Endereço
                      </th>
                      <th className={`px-6 py-4 text-left text-sm font-medium ${currentTheme.textSecondary} uppercase tracking-wider`}>
                        Status
                      </th>
                      <th className={`px-6 py-4 text-left text-sm font-medium ${currentTheme.textSecondary} uppercase tracking-wider`}>
                        Data de Criação
                      </th>
                      <th className={`px-6 py-4 text-left text-sm font-medium ${currentTheme.textSecondary} uppercase tracking-wider`}>
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`${currentTheme.cardBg} divide-y ${currentTheme.border}`}>
                    {locaisPaginados.map((local) => (
                      <motion.tr
                        key={local._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="hover:bg-opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {local.imageUrl && (
                              <img
                                src={buildImageUrl(local.imageUrl)}
                                alt={local.localName}
                                className="h-12 w-12 rounded-lg object-cover mr-4"
                              />
                            )}
                            <div>
                              <div className={`text-sm font-medium ${currentTheme.text}`}>
                                {local.localName}
                              </div>
                              <div className={`text-sm ${currentTheme.textSecondary}`}>
                                {local.localType}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm ${currentTheme.text}`}>
                            {local.city}, {local.state}
                          </div>
                          <div className={`text-sm ${currentTheme.textSecondary}`}>
                            {local.country}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${local.status == 'ativo'
                              ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                              : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                            }`}>
                            {local.status == 'ativo' ? (
                              <>
                                <FaToggleOn className="mr-1" />
                                Ativo
                              </>
                            ) : (
                              <>
                                <FaToggleOff className="mr-1" />
                                Inativo
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm ${currentTheme.text} flex items-center`}>
                            <FaCalendarAlt className="mr-2" />
                            {formatarData(local.criadoEm)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => abrirModalDetalhes(local)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Visualizar Detalhes"
                            >
                              <FaEye />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => abrirModalEdicao(local)}
                              className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                              title="Editar Local"
                            >
                              <FaEdit />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => deletarLocal(local._id)}
                              disabled={actionLoading[`delete_${local._id}`]}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                              title="Deletar Local"
                            >
                              {actionLoading[`delete_${local._id}`] ? (
                                <FaSpinner className="animate-spin" />
                              ) : (
                                <FaTrash />
                              )}
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {totalPaginasCalculado > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className={`text-sm ${currentTheme.textSecondary}`}>
                      Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a {Math.min(paginaAtual * itensPorPagina, totalItensCalculado)} de {totalItensCalculado} locais
                    </div>
                    <div className="flex items-center space-x-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setPaginaAtual(prev => Math.max(prev - 1, 1))}
                        disabled={paginaAtual === 1}
                        className={`px-3 py-1 rounded ${currentTheme.buttonSecondary} disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        Anterior
                      </motion.button>
                      <span className={`px-3 py-1 ${currentTheme.text}`}>
                        {paginaAtual} de {totalPaginasCalculado}
                      </span>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setPaginaAtual(prev => Math.min(prev + 1, totalPaginasCalculado))}
                        disabled={paginaAtual === totalPaginasCalculado}
                        className={`px-3 py-1 rounded ${currentTheme.buttonSecondary} disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        Próxima
                      </motion.button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal de Criação */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${currentTheme.cardBg} rounded-lg ${currentTheme.shadow} w-full max-w-2xl max-h-[90vh] overflow-y-auto`}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className={`text-2xl font-bold ${currentTheme.text}`}>
                    Criar Novo Local
                  </h2>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowCreateForm(false)}
                    className={`${currentTheme.textSecondary} hover:${currentTheme.text}`}
                  >
                    <FaTimes size={24} />
                  </motion.button>
                </div>

                <form onSubmit={criarLocal} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium ${currentTheme.text} mb-2`}>
                        Nome do Local *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.localName}
                        onChange={(e) => setFormData(prev => ({ ...prev, localName: e.target.value }))}
                        className={`w-full px-3 py-2 rounded-lg border ${currentTheme.input} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        placeholder="Ex: Academia Central"
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${currentTheme.text} mb-2`}>
                        Tipo de Local *
                      </label>
                      <select
                        required
                        value={formData.localType}
                        onChange={(e) => setFormData(prev => ({ ...prev, localType: e.target.value }))}
                        className={`w-full px-3 py-2 rounded-lg border ${currentTheme.input} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      >
                        <option value="academia">Academia</option>
                        <option value="consultorio-do-nutricionista">Consultório do Nutricionista</option>
                        <option value="clinica-de-fisioterapia">Clínica de Fisioterapia</option>
                        <option value="loja">Loja</option>
                        <option value="outro">Outro</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${currentTheme.text} mb-2`}>
                      Website ou Link *
                    </label>
                    <input
                      type="url"
                      required
                      value={formData.link}
                      onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-lg border ${currentTheme.input} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      placeholder="https://www.seusite.com.br"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${currentTheme.text} mb-2`}>
                      Descrição
                    </label>
                    <textarea
                      value={formData.localDescricao}
                      onChange={(e) => setFormData(prev => ({ ...prev, localDescricao: e.target.value }))}
                      rows={3}
                      className={`w-full px-3 py-2 rounded-lg border ${currentTheme.input} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      placeholder="Descreva o local..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={`block text-sm font-medium ${currentTheme.text} mb-2`}>País *</label>
                      <select
                        required
                        value={formData.country}
                        onChange={(e) => {
                          const name = e.target.value;
                          const countryObj = (locationsRaw?.countries || []).find((c) => (c.name === name));
                          const code = countryObj?.code || '';
                          setFormData(prev => ({ ...prev, country: name, countryCode: code, state: '', city: '' }));
                        }}
                        className={`w-full px-3 py-2 rounded-lg border ${currentTheme.input} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      >
                        {countries.map((country) => (
                          <option key={country.code} value={country.name}>{country.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${currentTheme.text} mb-2`}>Estado *</label>
                      <select
                        required
                        value={formData.state}
                        onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value, city: '' }))}
                        className={`w-full px-3 py-2 rounded-lg border ${currentTheme.input} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      >
                        <option value="">Selecione</option>
                        {statesCreate.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${currentTheme.text} mb-2`}>Cidade *</label>
                      <select
                        required
                        value={formData.city}
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                        className={`w-full px-3 py-2 rounded-lg border ${currentTheme.input} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      >
                        <option value="">Selecione</option>
                        {citiesCreate.map((ct) => (
                          <option key={ct} value={ct}>{ct}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  

                  <div>
                    <label className={`block text-sm font-medium ${currentTheme.text} mb-2`}>
                      Imagem do Local
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.files[0] }))}
                      className={`w-full px-3 py-2 rounded-lg border ${currentTheme.input} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-4 pt-6">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className={`px-6 py-2 rounded-lg ${currentTheme.buttonSecondary} transition-colors`}
                    >
                      Cancelar
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="submit"
                      disabled={actionLoading.create}
                      className={`px-6 py-2 rounded-lg ${currentTheme.button} transition-colors disabled:opacity-50 flex items-center gap-2`}
                    >
                      {actionLoading.create ? (
                        <>
                          <FaSpinner className="animate-spin" />
                          Criando...
                        </>
                      ) : (
                        <>
                          <FaCheck />
                          Criar Local
                        </>
                      )}
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Edição */}
      <AnimatePresence>
        {showEditModal && selectedLocal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${currentTheme.cardBg} rounded-lg ${currentTheme.shadow} w-full max-w-2xl max-h-[90vh] overflow-y-auto`}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className={`text-2xl font-bold ${currentTheme.text}`}>
                    Editar Local
                  </h2>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowEditModal(false)}
                    className={`${currentTheme.textSecondary} hover:${currentTheme.text}`}
                  >
                    <FaTimes size={24} />
                  </motion.button>
                </div>

                <form onSubmit={editarLocal} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium ${currentTheme.text} mb-2`}>
                        Nome do Local *
                      </label>
                      <input
                        type="text"
                        required
                        value={editFormData.localName}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, localName: e.target.value }))}
                        className={`w-full px-3 py-2 rounded-lg border ${currentTheme.input} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${currentTheme.text} mb-2`}>
                        Tipo de Local
                      </label>
                      <input
                        type="text"
                        value={selectedLocal.localType}
                        disabled
                        className={`w-full px-3 py-2 rounded-lg border ${currentTheme.input} bg-gray-100 dark:bg-gray-700 cursor-not-allowed`}
                      />
                      <p className={`text-xs ${currentTheme.textSecondary} mt-1`}>
                        O tipo do local não pode ser alterado
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${currentTheme.text} mb-2`}>
                      Website ou Link
                    </label>
                    <input
                      type="url"
                      value={editFormData.link}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, link: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-lg border ${currentTheme.input} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${currentTheme.text} mb-2`}>
                      Descrição
                    </label>
                    <textarea
                      value={editFormData.localDescricao}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, localDescricao: e.target.value }))}
                      rows={3}
                      className={`w-full px-3 py-2 rounded-lg border ${currentTheme.input} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={`block text-sm font-medium ${currentTheme.text} mb-2`}>País *</label>
                      <select
                        required
                        value={editFormData.country}
                        onChange={(e) => {
                          const name = e.target.value;
                          const countryObj = (locationsRaw?.countries || []).find((c) => (c.name === name));
                          const code = countryObj?.code || '';
                          setEditFormData(prev => ({ ...prev, country: name, countryCode: code, state: '', city: '' }));
                        }}
                        className={`w-full px-3 py-2 rounded-lg border ${currentTheme.input} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      >
                        {countries.map((country) => (
                          <option key={country.code} value={country.name}>{country.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${currentTheme.text} mb-2`}>Estado *</label>
                      <select
                        required
                        value={editFormData.state}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, state: e.target.value, city: '' }))}
                        className={`w-full px-3 py-2 rounded-lg border ${currentTheme.input} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      >
                        <option value="">Selecione</option>
                        {statesEdit.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${currentTheme.text} mb-2`}>Cidade *</label>
                      <select
                        required
                        value={editFormData.city}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, city: e.target.value }))}
                        className={`w-full px-3 py-2 rounded-lg border ${currentTheme.input} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      >
                        <option value="">Selecione</option>
                        {citiesEdit.map((ct) => (
                          <option key={ct} value={ct}>{ct}</option>
                        ))}
                      </select>
                    </div>
                  </div>



                  <div>
                    <label className={`block text-sm font-medium ${currentTheme.text} mb-2`}>
                      Nova Imagem do Local
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setEditFormData(prev => ({ ...prev, image: e.target.files[0] }))}
                      className={`w-full px-3 py-2 rounded-lg border ${currentTheme.input} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                    {selectedLocal.imageUrl && (
                      <div className="mt-2">
                        <p className={`text-sm ${currentTheme.textSecondary} mb-2`}>Imagem atual:</p>
                        <img
                          src={buildImageUrl(selectedLocal.imageUrl)}
                          alt={selectedLocal.localName}
                          className="h-20 w-20 rounded-lg object-cover"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end space-x-4 pt-6">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className={`px-6 py-2 rounded-lg ${currentTheme.buttonSecondary} transition-colors`}
                    >
                      Cancelar
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="submit"
                      disabled={actionLoading.edit}
                      className={`px-6 py-2 rounded-lg ${currentTheme.button} transition-colors disabled:opacity-50 flex items-center gap-2`}
                    >
                      {actionLoading.edit ? (
                        <>
                          <FaSpinner className="animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <FaCheck />
                          Salvar Alterações
                        </>
                      )}
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Detalhes */}
      <AnimatePresence>
        {showDetailsModal && selectedLocal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${currentTheme.cardBg} rounded-lg ${currentTheme.shadow} w-full max-w-2xl max-h-[90vh] overflow-y-auto`}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className={`text-2xl font-bold ${currentTheme.text}`}>
                    Detalhes do Local
                  </h2>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowDetailsModal(false)}
                    className={`${currentTheme.textSecondary} hover:${currentTheme.text}`}
                  >
                    <FaTimes size={24} />
                  </motion.button>
                </div>

                <div className="space-y-6">
                  {/* Imagem */}
                  {selectedLocal.imageUrl && (
                    <div>
                      <img
                        src={buildImageUrl(selectedLocal.imageUrl)}
                        alt={selectedLocal.localName}
                        className="w-full h-48 rounded-lg object-cover"
                      />
                    </div>
                  )}

                  {/* Informações básicas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className={`text-lg font-semibold ${currentTheme.text} mb-2`}>
                        Informações Básicas
                      </h3>
                      <div className="space-y-2">
                        <p className={currentTheme.textSecondary}>
                          <strong>Nome:</strong> {selectedLocal.localName}
                        </p>
                        <p className={currentTheme.textSecondary}>
                          <strong>Tipo:</strong> {selectedLocal.localType}
                        </p>
                        <p className={currentTheme.textSecondary}>
                          <strong>Status:</strong>
                          <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs ${selectedLocal.ativo
                              ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                              : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                            }`}>
                            {selectedLocal.status == 'ativo' ? 'Ativo' : 'Inativo'}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className={`text-lg font-semibold ${currentTheme.text} mb-2`}>
                        Localização
                      </h3>
                      <div className="space-y-2">
                        <p className={currentTheme.textSecondary}>
                          <strong>Cidade:</strong> {selectedLocal.city}
                        </p>
                        <p className={currentTheme.textSecondary}>
                          <strong>Estado:</strong> {selectedLocal.state}
                        </p>
                        <p className={currentTheme.textSecondary}>
                          <strong>País:</strong> {selectedLocal.country}
                        </p>
                        {selectedLocal.lat && selectedLocal.lng && (
                          <p className={currentTheme.textSecondary}>
                            <strong>Coordenadas:</strong> {selectedLocal.lat}, {selectedLocal.lng}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Descrição */}
                  {selectedLocal.localDescricao && (
                    <div>
                      <h3 className={`text-lg font-semibold ${currentTheme.text} mb-2`}>
                        Descrição
                      </h3>
                      <p className={currentTheme.textSecondary}>
                        {selectedLocal.localDescricao}
                      </p>
                    </div>
                  )}

                  {/* Datas */}
                  <div>
                    <h3 className={`text-lg font-semibold ${currentTheme.text} mb-2`}>
                      Informações de Data
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <p className={currentTheme.textSecondary}>
                        <strong>Criado em:</strong> {formatarData(selectedLocal.criadoEm)}
                      </p>
                      {selectedLocal.atualizadoEm && (
                        <p className={currentTheme.textSecondary}>
                          <strong>Atualizado em:</strong> {formatarData(selectedLocal.atualizadoEm)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Avaliações */}
                  {selectedLocal.avaliacoes && selectedLocal.avaliacoes.length > 0 && (
                    <div>
                      <h3 className={`text-lg font-semibold ${currentTheme.text} mb-2`}>
                        Avaliações
                      </h3>
                      <p className={currentTheme.textSecondary}>
                        <strong>Total de avaliações:</strong> {selectedLocal.avaliacoes.length}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end pt-6">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowDetailsModal(false)}
                    className={`px-6 py-2 rounded-lg ${currentTheme.button} transition-colors`}
                  >
                    Fechar
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LocaisDashboard;
