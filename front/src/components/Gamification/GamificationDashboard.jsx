import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FaTrophy,
  FaMedal,
  FaFire,
  FaStar,
  FaChartLine,
  FaUsers,
  FaCrown
} from 'react-icons/fa';
import api from '../../Api.js';
import { buildImageUrl } from '../../utils/imageUtils.js';

const GamificationDashboard = ({ userId }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [gamificationData, setGamificationData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGamificationData();
  }, [userId]);

  const fetchGamificationData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/gamification/user/${userId}`);
      if (response.data.success) {
        setGamificationData(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar dados de gamificação:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: FaChartLine },
    { id: 'badges', label: 'Badges', icon: FaMedal },
    { id: 'ranking', label: 'Ranking', icon: FaTrophy }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!gamificationData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Erro ao carregar dados de gamificação</p>
      </div>
    );
  }

  const {
    totalPoints,
    currentLevel,
    pointsToNextLevel,
    currentStreak,
    longestStreak,
    badges,
    stats
  } = gamificationData;

  const progressPercentage = ((totalPoints % 100) / 100) * 100;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header com estatísticas principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Nível Atual</p>
              <p className="text-3xl font-bold">{currentLevel}</p>
            </div>
            <FaCrown className="text-4xl text-blue-200" />
          </div>
          <div className="mt-4">
            <div className="bg-blue-400 rounded-full h-2">
              <div 
                className="bg-white rounded-full h-2 transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <p className="text-blue-100 text-xs mt-2">{pointsToNextLevel} pontos para o próximo nível</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-green-500 to-teal-600 rounded-xl p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Total de Pontos</p>
              <p className="text-3xl font-bold">{totalPoints.toLocaleString()}</p>
            </div>
            <FaStar className="text-4xl text-green-200" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-orange-500 to-red-600 rounded-xl p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Sequência Atual</p>
              <p className="text-3xl font-bold">{currentStreak}</p>
              <p className="text-orange-100 text-xs">dias consecutivos</p>
            </div>
            <FaFire className="text-4xl text-orange-200" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Badges Conquistadas</p>
              <p className="text-3xl font-bold">{badges?.length || 0}</p>
            </div>
            <FaMedal className="text-4xl text-purple-200" />
          </div>
        </motion.div>
      </div>

      {/* Navegação por abas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <OverviewTab 
              stats={stats}
              currentStreak={currentStreak}
              longestStreak={longestStreak}
              badges={badges}
            />
          )}

          {activeTab === 'badges' && (
            <BadgesTab badges={badges} userId={userId} />
          )}

          {activeTab === 'ranking' && (
            <RankingTab userId={userId} />
          )}
        </div>
      </div>
    </div>
  );
};

// Componente da aba Visão Geral
const OverviewTab = ({ stats, currentStreak, longestStreak, badges }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-4">Estatísticas de Treino</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-blue-600">Total de Treinos:</span>
              <span className="font-semibold text-blue-800">{stats?.totalWorkouts || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-600">Total de Exercícios:</span>
              <span className="font-semibold text-blue-800">{stats?.totalExercises || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-600">Minutos Treinados:</span>
              <span className="font-semibold text-blue-800">{stats?.totalMinutes || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-4">Consistência</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-green-600">Sequência Atual:</span>
              <span className="font-semibold text-green-800">{currentStreak} dias</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-600">Maior Sequência:</span>
              <span className="font-semibold text-green-800">{longestStreak} dias</span>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-purple-800 mb-4">Conquistas</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-purple-600">Badges Conquistadas:</span>
              <span className="font-semibold text-purple-800">{badges?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-600">Badges Disponíveis:</span>
              <span className="font-semibold text-purple-800">12</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente da aba Badges
const BadgesTab = ({ badges, userId }) => {
  const [availableBadges, setAvailableBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailableBadges();
  }, [userId]);

  const fetchAvailableBadges = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/gamification/user/${userId}/badges`);
      if (response.data.success) {
        setAvailableBadges(response.data.data.availableBadges || []);
      }
    } catch (error) {
      console.error('Erro ao buscar badges disponíveis:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity) => {
    const colors = {
      comum: 'bg-gray-100 text-gray-800 border-gray-300',
      raro: 'bg-blue-100 text-blue-800 border-blue-300',
      epico: 'bg-purple-100 text-purple-800 border-purple-300',
      lendario: 'bg-yellow-100 text-yellow-800 border-yellow-300'
    };
    return colors[rarity] || colors.comum;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Badges Conquistadas */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Badges Conquistadas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges && badges.length > 0 ? badges.map((badge, index) => (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`border-2 rounded-lg p-4 ${getRarityColor(badge.rarity)}`}
            >
              <div className="text-center">
                <div className="text-3xl mb-2">{badge.icon}</div>
                <h4 className="font-semibold">{badge.name}</h4>
                <p className="text-sm mt-1">{badge.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs px-2 py-1 rounded bg-white bg-opacity-50">
                    {badge.category}
                  </span>
                  <span className="text-xs font-medium">+{badge.points} pts</span>
                </div>
              </div>
            </motion.div>
          )) : (
            <div className="col-span-full text-center py-8">
              <FaMedal className="mx-auto text-4xl text-gray-300 mb-4" />
              <p className="text-gray-500">Nenhuma badge conquistada ainda</p>
              <p className="text-sm text-gray-400">Complete treinos para desbloquear badges!</p>
            </div>
          )}
        </div>
      </div>

      {/* Badges Disponíveis */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Badges Disponíveis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableBadges.length > 0 ? availableBadges.map((badge, index) => (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50 opacity-75"
            >
              <div className="text-center">
                <div className="text-3xl mb-2 grayscale">{badge.icon}</div>
                <h4 className="font-semibold text-gray-600">{badge.name}</h4>
                <p className="text-sm text-gray-500 mt-1">{badge.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-600">
                    {badge.category}
                  </span>
                  <span className="text-xs font-medium text-gray-600">+{badge.points} pts</span>
                </div>
                {badge.requirements && (
                  <p className="text-xs text-gray-400 mt-2">
                    {badge.requirements.description}
                  </p>
                )}
              </div>
            </motion.div>
          )) : (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-500">Carregando badges disponíveis...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};



// Componente da aba Ranking
const RankingTab = ({ userId }) => {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('overall');

  const categories = [
    { id: 'overall', label: 'Geral', icon: FaTrophy },
    { id: 'points', label: 'Pontos', icon: FaStar },
    { id: 'consistency', label: 'Consistência', icon: FaFire },
    { id: 'workouts', label: 'Treinos', icon: FaUsers }
  ];

  useEffect(() => {
    fetchRankings();
  }, [selectedCategory]);

  const fetchRankings = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/gamification/ranking-category?category=${selectedCategory}`);
      if (response.data.success) {
        setRankings(response.data.data.rankings || []);
      }
    } catch (error) {
      console.error('Erro ao buscar ranking:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPositionColor = (position) => {
    if (position === 1) return 'text-yellow-600 bg-yellow-50';
    if (position === 2) return 'text-gray-600 bg-gray-50';
    if (position === 3) return 'text-orange-600 bg-orange-50';
    return 'text-gray-800 bg-white';
  };

  const getPositionIcon = (position) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return position;
  };

  return (
    <div className="space-y-6">
      {/* Seletor de categoria */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{category.label}</span>
            </button>
          );
        })}
      </div>

      {/* Lista de ranking */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-2">
          {rankings.length > 0 ? rankings.map((user, index) => (
            <motion.div
              key={user.userId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                user.userId === userId ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
              } ${getPositionColor(user.position)}`}
            >
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 font-bold">
                  {getPositionIcon(user.position)}
                </div>
                <div className="flex items-center space-x-3">
                  {user.avatar ? (
                    <img
                      src={buildImageUrl(user.avatar)}
                      alt={user.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <FaUsers className="text-gray-600" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{user.username}</p>
                    <p className="text-sm text-gray-500">Nível {user.level}</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">{user.points.toLocaleString()} pts</p>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>{user.badges} badges</span>
                  <span>{user.workouts} treinos</span>
                  <span>{user.currentStreak} dias</span>
                </div>
              </div>
            </motion.div>
          )) : (
            <div className="text-center py-8">
              <FaTrophy className="mx-auto text-4xl text-gray-300 mb-4" />
              <p className="text-gray-500">Nenhum usuário no ranking ainda</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GamificationDashboard;