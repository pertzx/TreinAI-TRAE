import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiTrendingUp, 
  FiTarget, 
  FiActivity, 
  FiCalendar,
  FiBarChart3,
  FiPieChart,
  FiUser,
  FiHeart
} from 'react-icons/fi';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import api from '../../Api.js';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const AnalyticsDashboard = ({ userId }) => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAnalyticsData();
  }, [userId]);

  const fetchAnalyticsData = async () => {
    try {
      const response = await api.get(`/analytics/dashboard/${userId}`);
      
      if (response.status === 200) {
        setAnalyticsData(response.data);
      }
    } catch (error) {
      console.error('Erro ao buscar dados de analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const recordWorkoutMetrics = async (metrics) => {
    try {
      await api.post(`/analytics/workout-metrics/${userId}`, metrics);
      fetchAnalyticsData(); // Atualizar dados
    } catch (error) {
      console.error('Erro ao registrar métricas de treino:', error);
    }
  };

  const recordBodyMetrics = async (metrics) => {
    try {
      await api.post(`/analytics/body-metrics/${userId}`, metrics);
      fetchAnalyticsData(); // Atualizar dados
    } catch (error) {
      console.error('Erro ao registrar métricas corporais:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Nenhum dado de analytics disponível</p>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: FiBarChart3 },
    { id: 'performance', label: 'Performance', icon: FiTrendingUp },
    { id: 'body', label: 'Corpo', icon: FiUser },
    { id: 'goals', label: 'Metas', icon: FiTarget }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Avançados</h1>
        <p className="text-gray-600">Acompanhe seu progresso e performance detalhadamente</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-8 bg-gray-100 p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total de Treinos</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analyticsData.statistics?.totalWorkouts || 0}
                  </p>
                </div>
                <FiActivity className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Tempo Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round((analyticsData.statistics?.totalDuration || 0) / 60)}h
                  </p>
                </div>
                <FiCalendar className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Calorias Queimadas</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analyticsData.statistics?.totalCaloriesBurned || 0}
                  </p>
                </div>
                <FiTrendingUp className="w-8 h-8 text-red-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Frequência Semanal</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analyticsData.statistics?.weeklyFrequency || 0}
                  </p>
                </div>
                <FiHeart className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-4">Progresso Semanal</h3>
              {/* Implementar gráfico de linha aqui */}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-4">Distribuição de Treinos</h3>
              {/* Implementar gráfico de pizza aqui */}
            </div>
          </div>
        </motion.div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">Métricas de Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {analyticsData.statistics?.averageIntensity || 0}%
                </p>
                <p className="text-sm text-gray-600">Intensidade Média</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {analyticsData.statistics?.personalRecords || 0}
                </p>
                <p className="text-sm text-gray-600">Recordes Pessoais</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {analyticsData.statistics?.consistencyScore || 0}%
                </p>
                <p className="text-sm text-gray-600">Score de Consistência</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Body Tab */}
      {activeTab === 'body' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">Métricas Corporais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {analyticsData.bodyMetrics?.[0]?.weight || 0}kg
                </p>
                <p className="text-sm text-gray-600">Peso Atual</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {analyticsData.bodyMetrics?.[0]?.bodyFat || 0}%
                </p>
                <p className="text-sm text-gray-600">Gordura Corporal</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {analyticsData.bodyMetrics?.[0]?.muscleMass || 0}kg
                </p>
                <p className="text-sm text-gray-600">Massa Muscular</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {analyticsData.statistics?.currentBMI || 0}
                </p>
                <p className="text-sm text-gray-600">IMC</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Goals Tab */}
      {activeTab === 'goals' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">Metas e Objetivos</h3>
            {analyticsData.goals?.length > 0 ? (
              <div className="space-y-4">
                {analyticsData.goals.map((goal, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">{goal.title}</h4>
                      <span className={`px-2 py-1 rounded text-xs ${
                        goal.status === 'completed' ? 'bg-green-100 text-green-800' :
                        goal.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {goal.status === 'completed' ? 'Concluída' :
                         goal.status === 'in_progress' ? 'Em Progresso' : 'Pendente'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{goal.description}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(goal.currentValue / goal.targetValue) * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{goal.currentValue} / {goal.targetValue} {goal.unit}</span>
                      <span>{Math.round((goal.currentValue / goal.targetValue) * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-8">Nenhuma meta definida ainda</p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;