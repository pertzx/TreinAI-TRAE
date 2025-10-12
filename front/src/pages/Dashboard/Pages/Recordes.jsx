import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../../Api.js';
import LoadingSpinner from '../../../components/LoadingSpinner.jsx';
import { useToast } from '../../../components/Toast.jsx';
import { buildImageUrl } from '../../../utils/imageUtils.js';
import locationsData from '../../../data/locations.json';
import {
  FaTrophy,
  FaMedal,
  FaFire,
  FaDumbbell,
  FaClock,
  FaChartLine,
  FaUsers,
  FaStar,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaSync,
  FaExclamationTriangle,
  FaWifi,
  FaFilter,
  FaSearch,
  FaTimes,
  FaChevronDown,
  FaChevronUp
} from 'react-icons/fa';

const Recordes = ({ user, tema }) => {
  // Estados principais
  const [rankings, setRankings] = useState([]);
  const [userGamification, setUserGamification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('geral');
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Estados para paginação
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  // Debounce para busca
  const [searchDebounce, setSearchDebounce] = useState(null);

  // Estados para filtros
  const [filters, setFilters] = useState({
    status: '', // all, active, finished, upcoming
    sortBy: 'points', // points, workouts, duration, streak, name, participants, startDate, endDate
    period: 'all', // all, week, month, quarter, year
    searchTerm: '',
    // Filtros hierárquicos de localização
    selectedCountry: '',
    selectedState: '',
    selectedCity: ''
  });

  const [filteredRankings, setFilteredRankings] = useState([]);

  // Hook para toasts
  const { showError, showSuccess, showInfo } = useToast();

  // Configuração de tema com memoização
  const theme = useMemo(() => ({
    background: tema === 'dark' ? 'bg-gray-900' : 'bg-gray-50',
    card: tema === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
    cardHover: tema === 'dark' ? 'hover:bg-gray-750' : 'hover:bg-gray-50',
    text: tema === 'dark' ? 'text-white' : 'text-gray-900',
    textSecondary: tema === 'dark' ? 'text-gray-300' : 'text-gray-600',
    textMuted: tema === 'dark' ? 'text-gray-400' : 'text-gray-500',
    border: tema === 'dark' ? 'border-gray-700' : 'border-gray-200',
    button: tema === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600',
    buttonSecondary: tema === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300',
    accent: tema === 'dark' ? 'text-blue-400' : 'text-blue-600',
    success: tema === 'dark' ? 'text-green-400' : 'text-green-600',
    warning: tema === 'dark' ? 'text-yellow-400' : 'text-yellow-600',
    danger: tema === 'dark' ? 'text-red-400' : 'text-red-600',
    skeleton: tema === 'dark' ? 'bg-gray-700' : 'bg-gray-200',
    input: tema === 'dark' ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'
  }), [tema]);

  // Monitor de conexão
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (error && error.includes('conexão')) {
        refreshData();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setError('Sem conexão com a internet');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [error]);

  // Função para buscar rankings com retry automático
  const fetchRankings = useCallback(async (attempt = 1, customPage = null, customFilters = null) => {
    try {
      const currentPage = customPage || pagination.page;
      const currentFilters = customFilters || filters;
      
      // Mapear filtros para parâmetros da API
      const apiParams = {
        page: currentPage,
        limit: pagination.limit,
        sortBy: currentFilters.sortBy === 'points' ? 'startDate' : currentFilters.sortBy, // Mapear sortBy conforme disponível na API
        order: 'desc' // Sempre desc por padrão, pode ser customizado
      };

      // Adicionar filtro de status se não for 'all'
      if (currentFilters.status && currentFilters.status !== 'all') {
        apiParams.status = currentFilters.status;
      }

      const response = await api.get('/gamification/rankings', {
        params: apiParams,
        timeout: 10000 // 10 segundos de timeout
      });

      console.log('resposta da API na função fetchRankings:', response.data);

      if (response.data?.success) {
        const { rankings: rankingsData, pagination: paginationData } = response.data.data;
        console.log('rankingsData:', rankingsData);

        setRankings(rankingsData || []);
        setFilteredRankings(rankingsData || []); // Atualizar também filteredRankings
        setPagination(prev => ({
          ...prev,
          page: paginationData.page,
          total: paginationData.total,
          pages: paginationData.pages
        }));
        setRetryCount(0); // Reset retry count on success
      } else {
        throw new Error(response.data?.msg || 'Erro ao buscar rankings');
      }
    } catch (error) {
      console.error(`Erro ao buscar rankings (tentativa ${attempt}):`, error);

      // Retry automático até 3 tentativas
      if (attempt < 3 && isOnline) {
        setTimeout(() => {
          fetchRankings(attempt + 1, customPage, customFilters);
        }, 2000 * attempt); // Delay progressivo
        return;
      }

      const errorMessage = error.code === 'NETWORK_ERROR' || !isOnline
        ? 'Erro de conexão. Verifique sua internet.'
        : 'Erro ao carregar rankings';

      setError(errorMessage);
      setRetryCount(attempt);

      if (attempt === 1) { // Só mostra toast no primeiro erro
        showError(errorMessage);
      }
    }
  }, [showError, isOnline, pagination.page, pagination.limit, filters]);

  // Função para buscar dados de gamificação do usuário com retry automático
  const fetchUserGamification = useCallback(async (attempt = 1) => {
    try {
      const response = await api.get('/gamification/user-gamification', {
        params: {
          userId: user?._id
        },
        timeout: 10000 // 10 segundos de timeout
      });

      console.log('resposta da API na função fetchUserGamification:', response.data);

      if (response.data?.success) {
        setUserGamification(response.data.data);
        setRetryCount(0); // Reset retry count on success
      } else {
        // Se usuário não tem dados de gamificação ainda, não é erro
        if (response.status !== 404) {
          throw new Error(response.data?.msg || 'Erro ao buscar dados do usuário');
        }
      }
    } catch (error) {
      console.error(`Erro ao buscar dados do usuário (tentativa ${attempt}):`, error);

      // Não fazer retry para 404 (usuário sem dados de gamificação)
      if (error.response?.status === 404) {
        return;
      }

      // Retry automático até 3 tentativas
      if (attempt < 3 && isOnline) {
        setTimeout(() => {
          fetchUserGamification(attempt + 1);
        }, 2000 * attempt); // Delay progressivo
        return;
      }

      const errorMessage = error.code === 'NETWORK_ERROR' || !isOnline
        ? 'Erro de conexão. Verifique sua internet.'
        : 'Erro ao carregar seus dados';

      setError(errorMessage);
      setRetryCount(attempt);

      if (attempt === 1) { // Só mostra toast no primeiro erro
        showError(errorMessage);
      }
    }
  }, [user, showError, isOnline]);

  // Funções de controle de paginação
  const handlePageChange = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages && newPage !== pagination.page) {
      setPagination(prev => ({ ...prev, page: newPage }));
      fetchRankings(1, newPage, filters);
    }
  }, [pagination.page, pagination.pages, fetchRankings, filters]);

  const handleLimitChange = useCallback((newLimit) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
    fetchRankings(1, 1, { ...filters });
  }, [fetchRankings, filters]);

  // Função para aplicar filtros
  const applyFilters = useCallback((newFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset para primeira página
    fetchRankings(1, 1, newFilters);
  }, [fetchRankings]);

  // Função para atualizar dados com debounce
  const refreshData = useCallback(async () => {
    if (refreshing) return; // Previne múltiplas chamadas

    setRefreshing(true);
    setError(null);
    setRetryCount(0);

    try {
      await Promise.all([fetchRankings(), fetchUserGamification()]);
      showSuccess('Dados atualizados com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchRankings, fetchUserGamification, showSuccess, refreshing]);

  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        await Promise.all([fetchRankings(), fetchUserGamification()]);
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadData();
    }
  }, [user, fetchRankings, fetchUserGamification]);

  // Função para formatar duração
  const formatDuration = (seconds) => {
    if (!seconds) return '0seg';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}min`);
    if (secs) parts.push(`${secs}seg`);

    return parts.join('/') || '0seg';
  };

  // Função para obter posição do usuário no ranking
  const getUserPosition = (ranking) => {
    if (!ranking?.competitors || !user) return null;

    const userIndex = ranking.competitors.findIndex(
      competitor => competitor.userId === (user._id || user.userId)
    );

    return userIndex !== -1 ? userIndex + 1 : null;
  };

  // Componente de skeleton loading
  const SkeletonCard = () => (
    <div className={`${theme.card} p-6 rounded-xl border animate-pulse`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <div className={`h-4 ${theme.skeleton} rounded mb-2`}></div>
          <div className={`h-6 ${theme.skeleton} rounded w-3/4 mb-2`}></div>
          <div className={`h-3 ${theme.skeleton} rounded w-1/2`}></div>
        </div>
        <div className={`w-12 h-12 ${theme.skeleton} rounded-full`}></div>
      </div>
      <div className="space-y-2">
        <div className={`h-3 ${theme.skeleton} rounded w-1/4 mb-3`}></div>
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 ${theme.skeleton} rounded-full`}></div>
              <div>
                <div className={`h-4 ${theme.skeleton} rounded w-20 mb-1`}></div>
                <div className={`h-3 ${theme.skeleton} rounded w-16`}></div>
              </div>
            </div>
            <div className="text-right">
              <div className={`h-4 ${theme.skeleton} rounded w-12 mb-1`}></div>
              <div className={`h-3 ${theme.skeleton} rounded w-16`}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Componente de skeleton para estatísticas
  const SkeletonStat = () => (
    <div className={`${theme.card} p-6 rounded-xl border animate-pulse`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className={`h-3 ${theme.skeleton} rounded w-20 mb-2`}></div>
          <div className={`h-8 ${theme.skeleton} rounded w-16 mb-1`}></div>
          <div className={`h-3 ${theme.skeleton} rounded w-24`}></div>
        </div>
        <div className={`w-12 h-12 ${theme.skeleton} rounded-lg`}></div>
      </div>
    </div>
  );

  // Componente de estatística melhorado com animações
  const StatCard = ({ icon: Icon, title, value, subtitle, color = 'blue', trend, isLoading = false }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [animatedValue, setAnimatedValue] = useState(0);

    useEffect(() => {
      setIsVisible(true);
      if (typeof value === 'number' && !isLoading) {
        const duration = 1000;
        const steps = 60;
        const increment = value / steps;
        let current = 0;

        const timer = setInterval(() => {
          current += increment;
          if (current >= value) {
            setAnimatedValue(value);
            clearInterval(timer);
          } else {
            setAnimatedValue(Math.floor(current));
          }
        }, duration / steps);

        return () => clearInterval(timer);
      }
    }, [value, isLoading]);

    if (isLoading) {
      return (
        <div className={`${theme.card} p-4 sm:p-6 rounded-xl border transition-all duration-300 ${theme.cardHover} shadow-sm hover:shadow-md animate-pulse`}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            </div>
            <div className={`w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full`}></div>
          </div>
        </div>
      );
    }

    return (
      <div className={`${theme.card} p-4 sm:p-6 rounded-xl border transition-all duration-500 ${theme.cardHover} shadow-sm hover:shadow-lg transform hover:scale-105 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className={`${theme.textSecondary} text-sm font-medium mb-1`}>{title}</p>
            <div className="flex items-baseline gap-2">
              <p className={`${theme.text} text-xl sm:text-2xl font-bold transition-all duration-300`}>
                {typeof value === 'number' ? animatedValue.toLocaleString() : value}
              </p>
              {trend && (
                <span className={`text-xs px-2 py-1 rounded-full ${trend > 0 ? 'bg-green-100 text-green-600 dark:bg-green-900/30' :
                  trend < 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/30' :
                    'bg-gray-100 text-gray-600 dark:bg-gray-900/30'
                  } transition-all duration-300`}>
                  {trend > 0 ? '+' : ''}{trend}%
                </span>
              )}
            </div>
            {subtitle && (
              <p className={`${theme.textMuted} text-xs mt-1 transition-all duration-300`}>{subtitle}</p>
            )}
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 bg-${color}-100 dark:bg-${color}-900/30 shadow-${color}-200 shadow-lg`}>
            <Icon className={`w-6 h-6 text-${color}-600 dark:text-${color}-400`} />
          </div>
        </div>
      </div>
    );
  };

  // Componente de filtros avançados melhorado
  const FilterPanel = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeFiltersCount, setActiveFiltersCount] = useState(0);

    useEffect(() => {
      const count = Object.entries(filters).filter(([key, value]) => {
        if (key === 'searchTerm') return value.length > 0;
        if (key === 'selectedCountry' || key === 'selectedState' || key === 'selectedCity') return value !== '';
        return value !== 'all' && value !== '';
      }).length;
      setActiveFiltersCount(count);
    }, [filters]);

    const resetFilters = () => {
      const newFilters = {
        status: 'all',
        sortBy: 'points',
        period: 'all',
        searchTerm: '',
        selectedCountry: '',
        selectedState: '',
        selectedCity: ''
      };
      setFilters(newFilters);
      applyFilters(newFilters); // Aplicar filtros via API
    };

    return (
      <div className={`${theme.card} rounded-xl border transition-all duration-300 ${theme.cardHover} shadow-sm hover:shadow-md mb-6`}>
        {/* Header do painel de filtros */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`flex items-center gap-2 ${theme.text} hover:${theme.accent} transition-all duration-200 font-medium`}
              >
                <FaFilter className="w-4 h-4" />
                <span className="hidden sm:inline">Filtros Avançados</span>
                <span className="sm:hidden">Filtros</span>
                {activeFiltersCount > 0 && (
                  <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                    {activeFiltersCount}
                  </span>
                )}
                <FaChevronDown className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 && (
                <button
                  onClick={resetFilters}
                  className={`px-3 py-1 text-xs ${theme.textMuted} hover:${theme.text} border border-gray-300 dark:border-gray-600 rounded-full transition-all duration-200 hover:scale-105`}
                >
                  Limpar
                </button>
              )}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`p-2 ${theme.textMuted} hover:${theme.text} transition-all duration-200 hover:scale-110`}
              >
                {isExpanded ? <FaChevronUp className="w-4 h-4" /> : <FaChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Conteúdo dos filtros com animação */}
        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-96 opacity-100 overflow-y-auto' : 'max-h-0 opacity-0'
          }`}>
          <div className="p-4">
            {/* Barra de busca sempre visível quando expandido */}
            <div className="mb-4">
              <div className="relative">
                <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme.textMuted} w-4 h-4`} />
                <input
                  type="text"
                  placeholder="Buscar rankings ou usuários..."
                  value={filters.searchTerm}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setFilters(prev => ({ ...prev, searchTerm: newValue }));
                    
                    // Limpar timeout anterior
                    if (searchDebounce) {
                      clearTimeout(searchDebounce);
                    }
                    
                    // Criar novo timeout para debounce
                    const newTimeout = setTimeout(() => {
                      const newFilters = { ...filters, searchTerm: newValue };
                      applyFilters(newFilters);
                    }, 500); // 500ms de delay
                    
                    setSearchDebounce(newTimeout);
                  }}
                  className={`w-full pl-10 pr-4 py-2 ${theme.input} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200`}
                />
                {filters.searchTerm && (
                  <button
                    onClick={() => {
                      const newFilters = { ...filters, searchTerm: '' };
                      setFilters(newFilters);
                      applyFilters(newFilters); // Aplicar filtros via API
                    }}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${theme.textMuted} hover:${theme.text} transition-all duration-200 hover:scale-110`}
                  >
                    <FaTimes className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Grid de filtros responsivo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {/* Filtro por Status */}
              <div className="space-y-2">
                <label className={`${theme.textSecondary} text-sm font-medium block`}>
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => {
                    const newFilters = { ...filters, status: e.target.value };
                    setFilters(newFilters);
                    applyFilters(newFilters); // Aplicar filtros via API
                  }}
                  className={`w-full px-3 py-2 ${theme.input} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-300`}
                >
                  <option value="all">Todos</option>
                  <option value="active">Ativos</option>
                  <option value="finished">Finalizados</option>
                  <option value="upcoming">Em breve</option>
                </select>
              </div>

              {/* Filtro por Período */}
              <div className="space-y-2">
                <label className={`${theme.textSecondary} text-sm font-medium block`}>
                  Período
                </label>
                <select
                  value={filters.period}
                  onChange={(e) => {
                    const newFilters = { ...filters, period: e.target.value };
                    setFilters(newFilters);
                    applyFilters(newFilters); // Aplicar filtros via API
                  }}
                  className={`w-full px-3 py-2 ${theme.input} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-300`}
                >
                  <option value="all">Todos</option>
                  <option value="week">Última semana</option>
                  <option value="month">Último mês</option>
                  <option value="quarter">Último trimestre</option>
                  <option value="year">Último ano</option>
                </select>
              </div>

              {/* Filtros Hierárquicos de Localização */}
              <div className="space-y-3 border-t pt-4">
                <label className={`${theme.textSecondary} text-sm font-medium block`}>
                  Filtro Hierárquico por Localização
                </label>
                
                {/* País */}
                <div className="space-y-2">
                  <label className={`${theme.textMuted} text-xs font-medium block`}>
                    País
                  </label>
                  <select
                    value={filters.selectedCountry}
                    onChange={(e) => {
                      const country = e.target.value;
                      setFilters(prev => ({ 
                        ...prev, 
                        selectedCountry: country,
                        selectedState: '', // Limpar estado quando país muda
                        selectedCity: ''   // Limpar cidade quando país muda
                      }));
                    }}
                    className={`w-full px-3 py-2 ${theme.input} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-300`}
                  >
                    <option value="">Todos os países</option>
                    {locationsData.countries.map(country => (
                      <option key={country.code} value={country.name}>{country.name}</option>
                    ))}
                  </select>
                </div>

                {/* Estado */}
                {filters.selectedCountry && (
                  <div className="space-y-2">
                    <label className={`${theme.textMuted} text-xs font-medium block`}>
                      Estado
                    </label>
                    <select
                      value={filters.selectedState}
                      onChange={(e) => {
                        const state = e.target.value;
                        setFilters(prev => ({ 
                          ...prev, 
                          selectedState: state,
                          selectedCity: '' // Limpar cidade quando estado muda
                        }));
                      }}
                      className={`w-full px-3 py-2 ${theme.input} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-300`}
                    >
                      <option value="">Todo o {filters.selectedCountry}</option>
                      {locationsData.byCountry[filters.selectedCountry]?.states?.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Cidade */}
                {filters.selectedCountry && filters.selectedState && (
                  <div className="space-y-2">
                    <label className={`${theme.textMuted} text-xs font-medium block`}>
                      Cidade
                    </label>
                    <select
                      value={filters.selectedCity}
                      onChange={(e) => {
                        setFilters(prev => ({ 
                          ...prev, 
                          selectedCity: e.target.value
                        }));
                      }}
                      className={`w-full px-3 py-2 ${theme.input} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-300`}
                    >
                      <option value="">Todo o estado de {filters.selectedState}</option>
                      {locationsData.byCountry[filters.selectedCountry]?.citiesByState?.[filters.selectedState]?.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Ordenação */}
              <div className="space-y-2">
                <label className={`${theme.textSecondary} text-sm font-medium block`}>
                  Ordenar por
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => {
                    const newFilters = { ...filters, sortBy: e.target.value };
                    setFilters(newFilters);
                    applyFilters(newFilters); // Aplicar filtros via API
                  }}
                  className={`w-full px-3 py-2 ${theme.input} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-300`}
                >
                  <option value="points">Pontos</option>
                  <option value="workouts">Treinos</option>
                  <option value="exercises">Exercícios</option>
                  <option value="sets">Séries</option>
                  <option value="duration">Tempo Total</option>
                  <option value="name">Nome</option>
                  <option value="participants">Participantes</option>
                  <option value="startDate">Data de Início</option>
                  <option value="endDate">Data de Fim</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Componente de ranking melhorado com animações
  const RankingCard = ({ ranking, index }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const userPosition = getUserPosition(ranking);
    const isActive = new Date() >= new Date(ranking.startDate) && new Date() <= new Date(ranking.endDate);
    const isFinished = new Date() > new Date(ranking.endDate);
    const isUpcoming = new Date() < new Date(ranking.startDate);

    // Animação de entrada
    useEffect(() => {
      const timer = setTimeout(() => setIsVisible(true), index * 100);
      return () => clearTimeout(timer);
    }, [index]);

    // Determinar status e cor
    const getStatusInfo = () => {
      if (isActive) return { text: 'Ativo', color: 'green', bgColor: 'bg-green-100 dark:bg-green-900/30', pulse: true };
      if (isFinished) return { text: 'Finalizado', color: 'gray', bgColor: 'bg-gray-100 dark:bg-gray-900/30', pulse: false };
      if (isUpcoming) return { text: 'Em breve', color: 'blue', bgColor: 'bg-blue-100 dark:bg-blue-900/30', pulse: false };
      return { text: 'Indefinido', color: 'gray', bgColor: 'bg-gray-100 dark:bg-gray-900/30', pulse: false };
    };

    const statusInfo = getStatusInfo();
    const totalCompetitors = ranking.competitors?.length || 0;
    const topCompetitors = ranking.competitors?.slice(0, isExpanded ? ranking.competitors.length : 5) || [];

    return (
      <div className={`${theme.card} rounded-xl border transition-all duration-500 ${theme.cardHover} shadow-sm hover:shadow-lg transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        } hover:scale-[1.02] group`}>
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className={`${theme.text} text-lg font-semibold group-hover:${theme.accent} transition-colors duration-200`}>
                  {ranking.rankingName}
                </h3>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusInfo.bgColor} text-${statusInfo.color}-600 dark:text-${statusInfo.color}-400 transition-all duration-200 ${statusInfo.pulse ? 'animate-pulse' : ''
                  }`}>
                  {statusInfo.text}
                </span>
              </div>

              <div className="flex items-center gap-4 text-sm mb-3 flex-wrap">
                <span className={`${theme.textSecondary} flex items-center gap-1 hover:${theme.text} transition-colors duration-200`}>
                  <FaCalendarAlt className="w-3 h-3" />
                  {new Date(ranking.startDate).toLocaleDateString('pt-BR')} - {new Date(ranking.endDate).toLocaleDateString('pt-BR')}
                </span>
                <span className={`${theme.textSecondary} flex items-center gap-1 hover:${theme.text} transition-colors duration-200`}>
                  <FaUsers className="w-3 h-3" />
                  {totalCompetitors} competidores
                </span>
              </div>

              {/* Filtros hierárquicos de localização aplicados */}
              {(filters.selectedCountry || filters.selectedState || filters.selectedCity) && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {filters.selectedCountry && (
                    <span className={`px-2 py-1 text-xs ${theme.textMuted} bg-blue-100 dark:bg-blue-900/30 rounded-full animate-fadeIn`}>
                      País: {filters.selectedCountry}
                    </span>
                  )}
                  {filters.selectedState && (
                    <span className={`px-2 py-1 text-xs ${theme.textMuted} bg-green-100 dark:bg-green-900/30 rounded-full animate-fadeIn`}>
                      Estado: {filters.selectedState}
                    </span>
                  )}
                  {filters.selectedCity && (
                    <span className={`px-2 py-1 text-xs ${theme.textMuted} bg-purple-100 dark:bg-purple-900/30 rounded-full animate-fadeIn`}>
                      Cidade: {filters.selectedCity}
                    </span>
                  )}
                  {ranking.originalCompetitorsCount && ranking.originalCompetitorsCount > totalCompetitors && (
                    <span className={`px-2 py-1 text-xs ${theme.textMuted} bg-yellow-100 dark:bg-yellow-900/30 rounded-full animate-bounce`}>
                      {ranking.originalCompetitorsCount - totalCompetitors} competidores filtrados
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Posição do usuário com animação */}
            {userPosition && (
              <div className="text-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-300 hover:scale-110 hover:rotate-12 ${userPosition === 1 ? 'bg-gradient-to-br from-yellow-100 to-yellow-200 text-yellow-600 dark:from-yellow-900/30 dark:to-yellow-800/30 shadow-yellow-200 shadow-lg animate-pulse' :
                  userPosition === 2 ? 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 dark:from-gray-900/30 dark:to-gray-800/30 shadow-gray-200 shadow-lg' :
                    userPosition === 3 ? 'bg-gradient-to-br from-orange-100 to-orange-200 text-orange-600 dark:from-orange-900/30 dark:to-orange-800/30 shadow-orange-200 shadow-lg' :
                      'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600 dark:from-blue-900/30 dark:to-blue-800/30 shadow-blue-200 shadow-lg'
                  }`}>
                  {userPosition <= 3 ? (
                    userPosition === 1 ? '🥇' : userPosition === 2 ? '🥈' : '🥉'
                  ) : (
                    userPosition
                  )}
                </div>
                <p className={`${theme.textMuted} text-xs mt-1 font-medium`}>Sua posição</p>
              </div>
            )}
          </div>

          {/* Top competidores com animações */}
          {topCompetitors.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <h4 className={`${theme.textSecondary} text-sm font-medium flex items-center gap-2`}>
                  <FaTrophy className="w-4 h-4" />
                  Top {Math.min(isExpanded ? totalCompetitors : 5, totalCompetitors)} Competidores
                </h4>
                <div className="flex items-center gap-2">
                  {totalCompetitors > 5 && (
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className={`px-2 py-1 text-xs ${theme.textMuted} hover:${theme.text} border border-gray-300 dark:border-gray-600 rounded-full transition-all duration-200 hover:scale-105 flex items-center gap-1`}
                    >
                      {isExpanded ? 'Ver menos' : `Ver todos (${totalCompetitors})`}
                      <FaChevronDown className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>
              </div>

              <div className={`space-y-1 transition-all duration-500 overflow-hidden ${isExpanded ? 'max-h-96 overflow-y-auto' : 'max-h-48'
                }`}>
                {topCompetitors.map((competitor, idx) => {
                  let isCurrentUser = false;

                  if (competitor?.location?.country === user?.perfil?.country && competitor?.location?.state === user?.perfil?.state && competitor?.location?.city === user?.perfil?.city && competitor?.avatar === user?.avatar && competitor?.username === user?.username) isCurrentUser = true;

                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between py-3 px-4 rounded-lg transition-all duration-300 hover:scale-[1.02] ${isCurrentUser ? 'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800 shadow-sm' :
                        'hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:shadow-sm'
                        }`}
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        {/* Posição com medalhas para top 3 */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 hover:scale-110 ${idx === 0 ? 'bg-gradient-to-br from-yellow-100 to-yellow-200 text-yellow-600 dark:from-yellow-900/30 dark:to-yellow-800/30 shadow-md' :
                          idx === 1 ? 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 dark:from-gray-900/30 dark:to-gray-800/30 shadow-md' :
                            idx === 2 ? 'bg-gradient-to-br from-orange-100 to-orange-200 text-orange-600 dark:from-orange-900/30 dark:to-orange-800/30 shadow-md' :
                              'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600 dark:from-blue-900/30 dark:to-blue-800/30 shadow-md'
                          }`}>
                          {idx < 3 ? (
                            idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'
                          ) : (
                            idx + 1
                          )}
                        </div>

                        {/* Avatar do competidor */}
                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700 flex-shrink-0">
                          {competitor.avatar ? (
                            <img
                              src={buildImageUrl(competitor.avatar)}
                              alt={`Avatar de ${competitor.username}`}
                              className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            className={`w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm ${competitor.avatar ? 'hidden' : 'flex'}`}
                            style={{ display: competitor.avatar ? 'none' : 'flex' }}
                          >
                            {competitor.username?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        </div>

                        <div>
                          <p className={`${isCurrentUser ? theme.accent : theme.text} font-medium text-sm flex items-center gap-2`}>
                            {competitor.username}
                            {isCurrentUser && (
                              <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                                Você
                              </span>
                            )}
                          </p>

                          {/* Localização do competidor */}
                          {competitor.location && (
                            <p className={`${theme.textMuted} text-xs flex items-center gap-1 mt-1`}>
                              <FaMapMarkerAlt className="w-3 h-3" />
                              {competitor.location.country}, {competitor.location.city}, {competitor.location.state}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className={`${theme.text} font-bold text-sm`}>
                          {competitor.points?.toLocaleString() || 0} pts
                        </p>
                        <div className="flex items-center gap-3 text-xs mt-1">
                          <span className={`${theme.textMuted} flex items-center gap-1 hover:${theme.text} transition-colors duration-200`}>
                            <FaDumbbell className="w-3 h-3" />
                            {competitor.workouts || 0}
                          </span>
                          <span className={`${theme.textMuted} flex items-center gap-1 hover:${theme.text} transition-colors duration-200`}>
                            <FaClock className="w-3 h-3" />
                            {formatDuration(competitor.duration)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Estatísticas do ranking com animações */}
          {totalCompetitors > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="group cursor-pointer">
                  <div className="transition-all duration-300 group-hover:scale-110">
                    <p className={`${theme.text} text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent`}>
                      {ranking.competitors.reduce((sum, c) => sum + (c.points || 0), 0).toLocaleString()}
                    </p>
                    <p className={`${theme.textMuted} text-xs group-hover:${theme.text} transition-colors duration-200`}>Total de Pontos</p>
                  </div>
                </div>
                <div className="group cursor-pointer">
                  <div className="transition-all duration-300 group-hover:scale-110">
                    <p className={`${theme.text} text-lg font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent`}>
                      {ranking.competitors.reduce((sum, c) => sum + (c.workouts || 0), 0)}
                    </p>
                    <p className={`${theme.textMuted} text-xs group-hover:${theme.text} transition-colors duration-200`}>Total de Treinos</p>
                  </div>
                </div>
                <div className="group cursor-pointer">
                  <div className="transition-all duration-300 group-hover:scale-110">
                    <p className={`${theme.text} text-lg font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent`}>
                      {formatDuration(ranking.competitors.reduce((sum, c) => sum + (c.duration || 0), 0))}
                    </p>
                    <p className={`${theme.textMuted} text-xs group-hover:${theme.text} transition-colors duration-200`}>Tempo Total</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

// Loading state melhorado
if (loading) {
  return (
    <div className={`min-h-screen ${theme.background} p-6`}>
      <div className="max-w-7xl mx-auto">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className={`h-8 ${theme.skeleton} rounded w-64 mb-2 animate-pulse`}></div>
            <div className={`h-4 ${theme.skeleton} rounded w-96 animate-pulse`}></div>
          </div>
          <div className={`h-10 w-32 ${theme.skeleton} rounded-lg animate-pulse`}></div>
        </div>

        {/* Tabs skeleton */}
        <div className="flex space-x-1 mb-8">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-10 w-32 ${theme.skeleton} rounded-lg animate-pulse`}></div>
          ))}
        </div>

        {/* Content skeleton */}
        <div className="space-y-8">
          <div>
            <div className={`h-6 ${theme.skeleton} rounded w-48 mb-4 animate-pulse`}></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <SkeletonStat key={i} />
              ))}
            </div>
          </div>

          <div>
            <div className={`h-6 ${theme.skeleton} rounded w-48 mb-4 animate-pulse`}></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2].map(i => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

return (
  <div className={`min-h-screen ${theme.background} p-6`}>
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className={`${theme.text} text-3xl font-bold flex items-center gap-3`}>
            <FaTrophy className={`${theme.accent} transition-all duration-300 hover:scale-110`} />
            Recordes & Rankings
          </h1>
          <p className={`${theme.textSecondary} mt-2`}>
            Acompanhe seu desempenho e compete com outros atletas
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Indicador de conexão */}
          {!isOnline && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-600 dark:bg-red-900/30 rounded-lg text-sm">
              <FaWifi className="w-4 h-4" />
              Offline
            </div>
          )}

          <button
            onClick={refreshData}
            disabled={refreshing}
            className={`${theme.button} text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 disabled:opacity-50 hover:scale-105 active:scale-95`}
          >
            <FaSync className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto p-2 gap-2 space-x-1 mb-8">
        {[
          { id: 'geral', label: 'Visão Geral', icon: FaChartLine },
          { id: 'rankings', label: 'Rankings', icon: FaTrophy },
          { id: 'estatisticas', label: 'Minhas Estatísticas', icon: FaStar }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${activeTab === tab.id
              ? `${theme.button} text-white shadow-lg`
              : `${theme.buttonSecondary} ${theme.text} hover:shadow-md`
              }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Enhanced Error state */}
      {error && (
        <div className={`${theme.card} border-l-4 border-red-500 p-6 rounded-xl mb-6 shadow-lg`}>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <FaExclamationTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div className="flex-1">
              <h3 className={`${theme.text} font-semibold mb-2`}>Ops! Algo deu errado</h3>
              <p className={`${theme.textSecondary} mb-4`}>{error}</p>

              {retryCount > 0 && (
                <p className={`${theme.textMuted} text-sm mb-4`}>
                  Tentativas realizadas: {retryCount}/3
                </p>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={refreshData}
                  disabled={refreshing}
                  className={`${theme.button} text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 disabled:opacity-50 hover:scale-105 active:scale-95`}
                >
                  <FaSync className={refreshing ? 'animate-spin' : ''} />
                  {refreshing ? 'Tentando...' : 'Tentar Novamente'}
                </button>

                {!isOnline && (
                  <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                    <FaWifi className="w-4 h-4" />
                    Verifique sua conexão com a internet
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content based on active tab */}
      {activeTab === 'geral' && (
        <div className="space-y-8">
          {/* Estatísticas pessoais resumidas */}
          {userGamification && (
            <div>
              <h2 className={`${theme.text} text-xl font-semibold mb-4 flex items-center gap-2`}>
                <FaChartLine className={theme.accent} />
                Seu Desempenho
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={FaFire}
                  title="Streak Atual"
                  value={userGamification.streak || 0}
                  subtitle="dias consecutivos"
                  color="orange"
                />
                <StatCard
                  icon={FaStar}
                  title="Pontos Totais"
                  value={userGamification.points || 0}
                  subtitle="pontos acumulados"
                  color="yellow"
                />
                <StatCard
                  icon={FaDumbbell}
                  title="Treinos"
                  value={userGamification.workouts || 0}
                  subtitle="treinos completados"
                  color="blue"
                />
                <StatCard
                  icon={FaClock}
                  title="Tempo Total"
                  value={formatDuration(userGamification.duration)}
                  subtitle="tempo treinando"
                  color="green"
                />
              </div>
            </div>
          )}

          {/* Rankings ativos */}
          <div>
            <h2 className={`${theme.text} text-xl font-semibold mb-4 flex items-center gap-2`}>
              <FaTrophy className={theme.accent} />
              Rankings Ativos
            </h2>
            {filteredRankings.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredRankings.filter(ranking => {
                  const now = new Date();
                  return new Date(ranking.startDate) <= now && new Date(ranking.endDate) >= now;
                }).map((ranking, index) => (
                  <RankingCard key={ranking._id} ranking={ranking} index={index} />
                ))}
              </div>
            ) : (
              <div className={`${theme.card} p-8 rounded-xl border text-center transition-all duration-300 hover:shadow-md`}>
                <FaTrophy className={`${theme.textMuted} w-12 h-12 mx-auto mb-4 transition-all duration-300 hover:scale-110`} />
                <p className={`${theme.textSecondary} text-lg font-medium`}>Nenhum ranking ativo no momento</p>
                <p className={`${theme.textMuted} text-sm mt-2`}>
                  Novos rankings serão criados em breve. Continue treinando!
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'rankings' && (
        <div>
          <h2 className={`${theme.text} text-xl font-semibold mb-6 flex items-center gap-2`}>
            <FaTrophy className={theme.accent} />
            Todos os Rankings
          </h2>

          <FilterPanel />

          {filteredRankings.length > 0 ? (
            <div className="space-y-6">
              {filteredRankings.map((ranking, index) => (
                <RankingCard key={ranking._id} ranking={ranking} index={index} />
              ))}
              
              {/* Componente de Paginação */}
              {pagination.pages > 1 && (
                <div className={`${theme.card} p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4`}>
                  {/* Informações da paginação */}
                  <div className={`${theme.textSecondary} text-sm`}>
                    Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} rankings
                  </div>
                  
                  {/* Controles de paginação */}
                  <div className="flex items-center gap-2">
                    {/* Botão página anterior */}
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className={`px-3 py-2 rounded-lg border transition-all duration-200 ${
                        pagination.page === 1
                          ? `${theme.textMuted} cursor-not-allowed opacity-50`
                          : `${theme.text} ${theme.buttonSecondary} hover:scale-105`
                      }`}
                    >
                      <FaChevronUp className="rotate-[-90deg]" />
                    </button>
                    
                    {/* Números das páginas */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                        let pageNum;
                        if (pagination.pages <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.page <= 3) {
                          pageNum = i + 1;
                        } else if (pagination.page >= pagination.pages - 2) {
                          pageNum = pagination.pages - 4 + i;
                        } else {
                          pageNum = pagination.page - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-3 py-2 rounded-lg border transition-all duration-200 ${
                              pageNum === pagination.page
                                ? `${theme.button} text-white`
                                : `${theme.text} ${theme.buttonSecondary} hover:scale-105`
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    {/* Botão próxima página */}
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.pages}
                      className={`px-3 py-2 rounded-lg border transition-all duration-200 ${
                        pagination.page === pagination.pages
                          ? `${theme.textMuted} cursor-not-allowed opacity-50`
                          : `${theme.text} ${theme.buttonSecondary} hover:scale-105`
                      }`}
                    >
                      <FaChevronUp className="rotate-90" />
                    </button>
                  </div>
                  
                  {/* Seletor de itens por página */}
                  <div className="flex items-center gap-2">
                    <span className={`${theme.textSecondary} text-sm`}>Por página:</span>
                    <select
                      value={pagination.limit}
                      onChange={(e) => handleLimitChange(parseInt(e.target.value))}
                      className={`${theme.input} px-3 py-1 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={`${theme.card} p-8 rounded-xl border text-center transition-all duration-300 hover:shadow-md`}>
              <FaTrophy className={`${theme.textMuted} w-12 h-12 mx-auto mb-4 transition-all duration-300 hover:scale-110`} />
              <p className={`${theme.textSecondary} text-lg font-medium`}>Nenhum ranking encontrado</p>
              <p className={`${theme.textMuted} text-sm mt-2`}>
                Os rankings aparecerão aqui quando estiverem disponíveis
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'estatisticas' && (
        <div className="space-y-8">
          {userGamification ? (
            <>
              {/* Estatísticas detalhadas */}
              <div>
                <h2 className={`${theme.text} text-xl font-semibold mb-6 flex items-center gap-2`}>
                  <FaStar className={theme.accent} />
                  Suas Estatísticas Detalhadas
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <StatCard
                    icon={FaFire}
                    title="Streak Atual"
                    value={userGamification.streak || 0}
                    subtitle="dias consecutivos de treino"
                    color="orange"
                  />
                  <StatCard
                    icon={FaStar}
                    title="Pontos Totais"
                    value={userGamification.points || 0}
                    subtitle="pontos acumulados"
                    color="yellow"
                  />
                  <StatCard
                    icon={FaDumbbell}
                    title="Treinos Completados"
                    value={userGamification.workouts || 0}
                    subtitle="treinos finalizados"
                    color="blue"
                  />
                  <StatCard
                    icon={FaClock}
                    title="Tempo Total"
                    value={formatDuration(userGamification.duration)}
                    subtitle="tempo total treinando"
                    color="green"
                  />
                  <StatCard
                    icon={FaDumbbell}
                    title="Exercícios"
                    value={userGamification.exercises || 0}
                    subtitle="exercícios realizados"
                    color="purple"
                  />
                  <StatCard
                    icon={FaMedal}
                    title="Séries"
                    value={userGamification.sets || 0}
                    subtitle="séries completadas"
                    color="indigo"
                  />
                </div>
              </div>

              {/* Localização */}
              {userGamification.location && (
                <div className={`${theme.card} p-6 rounded-xl border transition-all duration-300 hover:shadow-md`}>
                  <h3 className={`${theme.text} text-lg font-semibold mb-4 flex items-center gap-2`}>
                    <FaMapMarkerAlt className={theme.accent} />
                    Sua Localização
                  </h3>
                  <p className={`${theme.textSecondary}`}>
                    {userGamification.location.city}, {userGamification.location.state}, {userGamification.location.country}
                  </p>
                </div>
              )}

              {/* Histórico de treinos */}
              {userGamification.lastWorkoutDate && userGamification.lastWorkoutDate.length > 0 && (
                <div className={`${theme.card} p-6 rounded-xl border transition-all duration-300 hover:shadow-md`}>
                  <h3 className={`${theme.text} text-lg font-semibold mb-4 flex items-center gap-2`}>
                    <FaCalendarAlt className={theme.accent} />
                    Últimos Treinos
                  </h3>
                  <div className="space-y-2">
                    {userGamification.lastWorkoutDate.slice(-5).reverse().map((date, index) => (
                      <div key={index} className="flex items-center justify-between py-2 transition-all duration-200 hover:bg-opacity-50 rounded-lg px-2">
                        <span className={theme.textSecondary}>
                          {new Date(date).toLocaleDateString('pt-BR', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                        <FaFire className={`${theme.success} transition-all duration-300 hover:scale-110`} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className={`${theme.card} p-8 rounded-xl border text-center transition-all duration-300 hover:shadow-md`}>
              <FaStar className={`${theme.textMuted} w-12 h-12 mx-auto mb-4 transition-all duration-300 hover:scale-110`} />
              <p className={`${theme.textSecondary} text-lg font-medium`}>Ainda não há estatísticas</p>
              <p className={`${theme.textMuted} text-sm mt-2`}>
                Complete seu primeiro treino para começar a acumular estatísticas!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
);
};

export default Recordes;