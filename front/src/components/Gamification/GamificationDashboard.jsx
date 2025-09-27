import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FaTrophy, 
  FaMedal, 
  FaFire, 
  FaStar, 
  FaChartLine, 
  FaUsers,
  FaGift,
  FaCrown
} from 'react-icons/fa';
import api from '../../Api.js';

const GamificationDashboard = ({ userId }) => {
  const [gamificationData, setGamificationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchGamificationData();
  }, [userId]);

  const fetchGamificationData = async () => {
    try {
      const response = await api.get(`/gamification/user/${userId}`);
      
      // O backend retorna { success: true, data: {...} }
      setGamificationData(response.data.data);
    } catch (error) {
      console.error('Erro ao buscar dados de gamificação:', error);
    } finally {
      setLoading(false);
    }
  };

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
    stats,
    activeChallenges,
    availableChallenges
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
                className="bg-white rounded-full h-2 transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-xs text-blue-100 mt-1">
              {pointsToNextLevel} pontos para o próximo nível
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Pontos Totais</p>
              <p className="text-3xl font-bold">{totalPoints}</p>
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
              <p className="text-xs text-orange-100">Recorde: {longestStreak}</p>
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
              <p className="text-purple-100 text-sm">Badges</p>
              <p className="text-3xl font-bold">{badges?.length || 0}</p>
            </div>
            <FaMedal className="text-4xl text-purple-200" />
          </div>
        </motion.div>
      </div>

      {/* Navegação por abas */}
      <div className="bg-white rounded-xl shadow-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Visão Geral', icon: FaChartLine },
              { id: 'badges', label: 'Badges', icon: FaMedal },
              { id: 'challenges', label: 'Desafios', icon: FaTrophy },
              { id: 'ranking', label: 'Ranking', icon: FaUsers }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <OverviewTab stats={stats} />
          )}
          
          {activeTab === 'badges' && (
            <BadgesTab badges={badges} />
          )}
          
          {activeTab === 'challenges' && (
            <ChallengesTab 
              activeChallenges={activeChallenges} 
              availableChallenges={availableChallenges}
              userId={userId}
              onChallengeJoin={fetchGamificationData}
            />
          )}
          
          {activeTab === 'ranking' && (
            <RankingTab />
          )}
        </div>
      </div>
    </div>
  );
};

// Componente da aba Visão Geral
const OverviewTab = ({ stats }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="font-semibold text-gray-800 mb-2">Treinos Realizados</h3>
      <p className="text-2xl font-bold text-blue-600">{stats?.totalWorkouts || 0}</p>
    </div>
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="font-semibold text-gray-800 mb-2">Exercícios Completados</h3>
      <p className="text-2xl font-bold text-green-600">{stats?.totalExercises || 0}</p>
    </div>
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="font-semibold text-gray-800 mb-2">Tempo Total (min)</h3>
      <p className="text-2xl font-bold text-purple-600">{stats?.totalMinutes || 0}</p>
    </div>
  </div>
);

// Componente da aba Badges
const BadgesTab = ({ badges }) => {
  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'comum': return 'bg-gray-100 text-gray-800';
      case 'raro': return 'bg-blue-100 text-blue-800';
      case 'epico': return 'bg-purple-100 text-purple-800';
      case 'lendario': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {badges && badges.length > 0 ? badges.map((badge, index) => (
        <motion.div
          key={badge.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <div className="text-3xl">{badge.icon}</div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800">{badge.name}</h3>
              <p className="text-sm text-gray-600">{badge.description}</p>
              <div className="flex items-center justify-between mt-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRarityColor(badge.rarity)}`}>
                  {badge.rarity}
                </span>
                <span className="text-sm text-blue-600 font-medium">+{badge.points} pts</span>
              </div>
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
  );
};

// Componente da aba Desafios
const ChallengesTab = ({ activeChallenges, availableChallenges, userId, onChallengeJoin }) => {
  const joinChallenge = async (challengeId) => {
    try {
      await api.post(`/gamification/user/${userId}/challenges/${challengeId}/join`, {});
      onChallengeJoin();
    } catch (error) {
      console.error('Erro ao participar do desafio:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Desafios Ativos */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Desafios Ativos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeChallenges && activeChallenges.length > 0 ? activeChallenges.map((challenge, index) => (
            <div key={challenge.challengeId} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800">Desafio Ativo</h4>
              <p className="text-sm text-blue-600">Progresso: {challenge.progress}</p>
            </div>
          )) : (
            <div className="col-span-full text-center py-4">
              <p className="text-gray-500">Nenhum desafio ativo</p>
            </div>
          )}
        </div>
      </div>

      {/* Desafios Disponíveis */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Desafios Disponíveis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableChallenges && availableChallenges.length > 0 ? availableChallenges.map((challenge, index) => (
            <motion.div
              key={challenge._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800">{challenge.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{challenge.description}</p>
                  <div className="flex items-center space-x-4 mt-3">
                    <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                      {challenge.type}
                    </span>
                    <span className="text-sm text-green-600 font-medium">
                      +{challenge.rewards?.points || 0} pts
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => joinChallenge(challenge._id)}
                  className="ml-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Participar
                </button>
              </div>
            </motion.div>
          )) : (
            <div className="col-span-full text-center py-8">
              <FaGift className="mx-auto text-4xl text-gray-300 mb-4" />
              <p className="text-gray-500">Nenhum desafio disponível</p>
              <p className="text-sm text-gray-400">Novos desafios serão adicionados em breve!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Componente da aba Ranking
const RankingTab = () => {
  const [ranking, setRanking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRanking();
  }, []);

  const fetchRanking = async () => {
    try {
      const response = await api.get('/gamification/ranking');
      
      if (response.data.success) {
        setRanking(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar ranking:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando ranking...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Ranking Global</h3>
      <div className="space-y-2">
        {ranking?.rankings && ranking.rankings.length > 0 ? ranking.rankings.slice(0, 10).map((user, index) => (
          <div key={user.userId} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0">
              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                index === 0 ? 'bg-yellow-500 text-white' :
                index === 1 ? 'bg-gray-400 text-white' :
                index === 2 ? 'bg-orange-500 text-white' :
                'bg-gray-200 text-gray-700'
              }`}>
                {user.position}
              </span>
            </div>

            img

            <div className="flex-1">
              <p className="font-medium text-gray-800">{user.username}</p>
              <p className="text-sm text-gray-600">Nível {user.level}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-blue-600">{user.points?.toLocaleString() || 0} pts</p>
              <p className="text-xs text-gray-500">{user.badges || 0} badges</p>
            </div>
          </div>
        )) : (
          <div className="text-center py-8">
            <FaUsers className="mx-auto text-4xl text-gray-300 mb-4" />
            <p className="text-gray-500">Ranking ainda não disponível</p>
            <p className="text-sm text-gray-400">Complete treinos para aparecer no ranking!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GamificationDashboard;