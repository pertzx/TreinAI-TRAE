import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaDownload,
  FaFileExport,
  FaUser,
  FaHistory,
  FaChartBar,
  FaComments,
  FaCalendarAlt,
  FaCheck,
  FaCoins,
  FaExclamationTriangle,
  FaSpinner,
  FaInfoCircle,
  FaListUl
} from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import api from '../Api.js';

const LgpdDataExport = () => {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [selectedData, setSelectedData] = useState({
    profile: true,
    workouts: true,
    progress: true,
    chats: true,
    tokens: true,
    history: true
  });

  // Aguardar autenticação carregar
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <FaSpinner className="text-blue-400 text-6xl mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-bold text-white mb-2">Carregando...</h2>
          <p className="text-slate-400">Verificando sua autenticação</p>
        </div>
      </div>
    );
  }

  const dataCategories = [
    { 
      key: 'profile', 
      label: 'Dados do Perfil', 
      icon: FaUser, 
      color: 'blue',
      description: 'Nome, e-mail, data de nascimento, dados físicos (peso, altura), objetivos e preferências.'
    },
    { 
      key: 'workouts', 
      label: 'Histórico de Treinos', 
      icon: FaHistory, 
      color: 'green',
      description: 'Todos os treinos criados, realizados, séries, repetições, pesos utilizados.'
    },
    { 
      key: 'progress', 
      label: 'Dados de Progresso', 
      icon: FaChartBar, 
      color: 'purple',
      description: 'Evolução de peso, medidas corporais, fotos de progresso (se autorizado), metas alcançadas.'
    },
    { 
      key: 'chats', 
      label: 'Conversas com IA', 
      icon: FaComments, 
      color: 'orange',
      description: 'Histórico completo de conversas com o NutriAI e TreinoAI, incluindo recomendações.'
    },
    { 
      key: 'tokens', 
      label: 'Uso de Tokens', 
      icon: FaCoins, 
      color: 'yellow',
      description: 'Histórico de consumo de tokens da IA, limites, plano atual, transações.'
    },
    { 
      key: 'history', 
      label: 'Log de Atividades', 
      icon: FaCalendarAlt, 
      color: 'pink',
      description: 'Registro de logins, ações importantes na conta, mudanças de configurações.'
    }
  ];

  const handleToggleCategory = (key) => {
    setSelectedData(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSelectAll = () => {
    const allSelected = Object.values(selectedData).every(v => v);
    const newValue = !allSelected;
    
    setSelectedData({
      profile: newValue,
      workouts: newValue,
      progress: newValue,
      chats: newValue,
      tokens: newValue,
      history: newValue
    });
  };

  const handleExport = async () => {
    const selectedCount = Object.values(selectedData).filter(Boolean).length;
    
    if (selectedCount === 0) {
      toast.error('Selecione pelo menos uma categoria de dados para exportar');
      return;
    }

    setIsExporting(true);

    try {
      // Chama a API (cookie httpOnly + CSRF são tratados pelo cliente `api`)
      const response = await api.post('/lgpd/export-data', {
        selectedCategories: selectedData
      });

      if (response.data.success) {
        // Gera o arquivo localmente a partir do JSON retornado e baixa via Blob
        const blob = new Blob(
          [JSON.stringify(response.data.data, null, 2)],
          { type: 'application/json' }
        );
        const downloadUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `meus-dados-treinai-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);

        toast.success(
          <div>
            <strong>Exportação concluída!</strong>
            <br />
            Seus dados foram exportados com sucesso. O download deve começar automaticamente.
          </div>,
          { autoClose: 6000 }
        );
      } else {
        throw new Error(response.data.message || 'Erro ao exportar dados');
      }
    } catch (error) {
      console.error('Erro na exportação:', error);
      toast.error(
        error.response?.data?.message || 
        'Erro ao exportar dados. Tente novamente ou entre em contato com o suporte.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  // Aguardar autenticação carregar
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <FaSpinner className="text-blue-400 text-6xl mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-bold text-white mb-2">Carregando...</h2>
          <p className="text-slate-400">Verificando sua autenticação</p>
        </div>
      </div>
    );
  }

  // Se não está autenticado, mostrar erro
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <FaExclamationTriangle className="text-yellow-400 text-6xl mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Acesso Negado</h2>
          <p className="text-slate-400 mb-6">Você precisa estar logado para acessar esta página.</p>
          <NavLink 
            to="/login" 
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200"
          >
            Fazer Login
          </NavLink>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-white/5 border-b border-white/10 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="bg-blue-500/20 p-3 rounded-xl">
              <FaFileExport className="text-blue-400 text-2xl" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Exportar Meus Dados</h1>
              <p className="text-slate-400 mt-1">Faça o download de todas as suas informações pessoais</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Info Alert */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 mb-8"
        >
          <div className="flex items-start gap-4">
            <div className="bg-blue-500/20 p-3 rounded-xl flex-shrink-0">
              <FaInfoCircle className="text-blue-400 text-xl" />
            </div>
            <div>
              <h3 className="text-blue-400 font-bold text-lg mb-2">Seu Direito à Portabilidade (LGPD)</h3>
              <p className="text-slate-300 leading-relaxed">
                Conforme o artigo 18, V da LGPD, você tem o direito de solicitar seus dados pessoais 
                em formato estruturado, de uso comum e legível por máquina. Esta funcionalidade permite 
                que você faça o download de todas as suas informações pessoais de forma simples e segura.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Data Categories Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 rounded-2xl p-8 border border-white/10 mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <FaListUl className="text-blue-400" />
              Selecione os Dados para Exportar
            </h2>
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              {Object.values(selectedData).every(v => v) ? 'Desmarcar Todos' : 'Selecionar Todos'}
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {dataCategories.map((category) => {
              const Icon = category.icon;
              const isSelected = selectedData[category.key];
              
              return (
                <motion.div
                  key={category.key}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleToggleCategory(category.key)}
                  className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    isSelected 
                      ? `bg-${category.color}-500/20 border-${category.color}-500/50` 
                      : 'bg-white/5 border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${isSelected ? `bg-${category.color}-500/30` : 'bg-white/10'}`}>
                      <Icon className={`text-xl ${isSelected ? `text-${category.color}-400` : 'text-slate-400'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                          {category.label}
                        </h3>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected 
                            ? `bg-${category.color}-500 border-${category.color}-500` 
                            : 'border-slate-500'
                        }`}>
                          {isSelected && <FaCheck className="text-white text-xs" />}
                        </div>
                      </div>
                      <p className="text-slate-400 text-sm leading-relaxed">{category.description}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Export Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl p-8 border border-blue-500/30"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white mb-2">Pronto para Exportar?</h3>
              <p className="text-slate-300">
                Seus dados serão exportados em formato <strong>JSON</strong> (formato estruturado e legível por máquina, 
                conforme exigido pela LGPD). O arquivo será gerado de forma segura e o download começará automaticamente.
              </p>
            </div>
            <motion.button
              onClick={handleExport}
              disabled={isExporting || Object.values(selectedData).filter(Boolean).length === 0}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 ${
                isExporting || Object.values(selectedData).filter(Boolean).length === 0
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-500/25'
              }`}
            >
              {isExporting ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Gerando Exportação...
                </>
              ) : (
                <>
                  <FaDownload />
                  Exportar Meus Dados
                </>
              )}
            </motion.button>
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-start gap-3">
              <FaInfoCircle className="text-blue-400 mt-1 flex-shrink-0" />
              <div className="text-sm text-slate-400">
                <strong className="text-slate-300">Tempo de processamento:</strong> A geração do arquivo pode levar
                de alguns segundos até alguns minutos, dependendo da quantidade de dados selecionados.
                Não feche esta página durante o processo. O download é feito diretamente no seu dispositivo.
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LgpdDataExport;
