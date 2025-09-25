import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiFileText, 
  FiDownload, 
  FiShare2, 
  FiPlus,
  FiFilter,
  FiCalendar,
  FiUser,
  FiBarChart3,
  FiSettings,
  FiEye
} from 'react-icons/fi';
import api from '../../Api.js';

const ReportsDashboard = ({ professionalId }) => {
  const [reports, setReports] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reports');
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    clientId: ''
  });
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchReports();
    fetchTemplates();
  }, [professionalId, filters]);

  const fetchReports = async () => {
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await api.get(`/reports?${queryParams}`);
      
      setReports(response.data.reports);
    } catch (error) {
      console.error('Erro ao buscar relatórios:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/reports/templates');
      
      setTemplates(response.data);
    } catch (error) {
      console.error('Erro ao buscar templates:', error);
    }
  };

  const generateReport = async (reportData) => {
    try {
      const response = await api.post(`/reports/generate/${reportData.clientId}`, reportData);
      
      setReports(prev => [response.data.report, ...prev]);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
    }
  };

  const shareReport = async (reportId, shareData) => {
    try {
      await api.post(`/reports/${reportId}/share`, shareData);
      
      // Atualizar lista de relatórios
      fetchReports();
    } catch (error) {
      console.error('Erro ao compartilhar relatório:', error);
    }
  };

  const downloadReport = (report) => {
    if (report.fileUrl) {
      const link = document.createElement('a');
      link.href = report.fileUrl;
      link.download = `${report.title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'generating': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'progress': return FiBarChart3;
      case 'performance': return FiBarChart3;
      case 'body_composition': return FiUser;
      default: return FiFileText;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Relatórios Profissionais</h1>
            <p className="text-gray-600">Gere e gerencie relatórios detalhados para seus clientes</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
          >
            <FiPlus className="w-4 h-4" />
            <span>Novo Relatório</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-8 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
            activeTab === 'reports'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FiFileText className="w-4 h-4" />
          <span>Relatórios</span>
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
            activeTab === 'templates'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FiSettings className="w-4 h-4" />
          <span>Templates</span>
        </button>
      </div>

      {/* Filtros */}
      {activeTab === 'reports' && (
        <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
          <div className="flex flex-wrap gap-4">
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="border rounded-md px-3 py-2"
            >
              <option value="">Todos os tipos</option>
              <option value="progress">Progresso</option>
              <option value="performance">Performance</option>
              <option value="body_composition">Composição Corporal</option>
              <option value="nutrition">Nutrição</option>
            </select>

            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="border rounded-md px-3 py-2"
            >
              <option value="">Todos os status</option>
              <option value="completed">Concluído</option>
              <option value="generating">Gerando</option>
              <option value="failed">Falhou</option>
            </select>
          </div>
        </div>
      )}

      {/* Lista de Relatórios */}
      {activeTab === 'reports' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {reports.length > 0 ? (
            reports.map((report) => {
              const TypeIcon = getTypeIcon(report.type);
              return (
                <div key={report._id} className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <TypeIcon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{report.title}</h3>
                        <p className="text-sm text-gray-600">
                          Cliente: {report.clientId?.username || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Gerado em: {new Date(report.generatedAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(report.status)}`}>
                        {report.status === 'completed' ? 'Concluído' :
                         report.status === 'generating' ? 'Gerando' :
                         report.status === 'failed' ? 'Falhou' : report.status}
                      </span>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => {/* Implementar visualização */}}
                          className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                          title="Visualizar"
                        >
                          <FiEye className="w-4 h-4" />
                        </button>

                        {report.status === 'completed' && (
                          <button
                            onClick={() => downloadReport(report)}
                            className="p-2 text-gray-600 hover:text-green-600 transition-colors"
                            title="Download"
                          >
                            <FiDownload className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => {/* Implementar compartilhamento */}}
                          className="p-2 text-gray-600 hover:text-purple-600 transition-colors"
                          title="Compartilhar"
                        >
                          <FiShare2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <FiFileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum relatório encontrado</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 text-blue-600 hover:text-blue-700"
              >
                Criar seu primeiro relatório
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Lista de Templates */}
      {activeTab === 'templates' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {templates.map((template) => (
            <div key={template._id} className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                {template.isDefault && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    Padrão
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-4">{template.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500 capitalize">{template.type}</span>
                <button className="text-blue-600 hover:text-blue-700 text-sm">
                  Usar Template
                </button>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Modal de Criação de Relatório */}
      {showCreateModal && (
        <CreateReportModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={generateReport}
          templates={templates}
        />
      )}
    </div>
  );
};

// Componente Modal para Criar Relatório
const CreateReportModal = ({ onClose, onSubmit, templates }) => {
  const [formData, setFormData] = useState({
    title: '',
    type: 'progress',
    clientId: '',
    dateRange: {
      startDate: '',
      endDate: ''
    },
    settings: {
      includeCharts: true,
      includePhotos: false,
      includeNutrition: true,
      includeRecommendations: true,
      format: 'pdf'
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Novo Relatório</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título do Relatório
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full border rounded-md px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Relatório
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="progress">Progresso</option>
              <option value="performance">Performance</option>
              <option value="body_composition">Composição Corporal</option>
              <option value="nutrition">Nutrição</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ID do Cliente
            </label>
            <input
              type="text"
              value={formData.clientId}
              onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
              className="w-full border rounded-md px-3 py-2"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                value={formData.dateRange.startDate}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  dateRange: { ...prev.dateRange, startDate: e.target.value }
                }))}
                className="w-full border rounded-md px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Final
              </label>
              <input
                type="date"
                value={formData.dateRange.endDate}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  dateRange: { ...prev.dateRange, endDate: e.target.value }
                }))}
                className="w-full border rounded-md px-3 py-2"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Configurações
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.settings.includeCharts}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, includeCharts: e.target.checked }
                  }))}
                  className="mr-2"
                />
                Incluir gráficos
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.settings.includeNutrition}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, includeNutrition: e.target.checked }
                  }))}
                  className="mr-2"
                />
                Incluir dados nutricionais
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.settings.includeRecommendations}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, includeRecommendations: e.target.checked }
                  }))}
                  className="mr-2"
                />
                Incluir recomendações
              </label>
            </div>
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Gerar Relatório
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportsDashboard;