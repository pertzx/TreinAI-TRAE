import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../Api';
import { LuBrain, LuSearch, LuTrendingUp, LuDownload, LuDumbbell, LuClock, LuTarget, LuUser } from 'react-icons/lu';

const AIWorkoutGenerator = ({ user, tema }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [workoutGoal, setWorkoutGoal] = useState('');
  const [fitnessLevel, setFitnessLevel] = useState('');
  const [duration, setDuration] = useState('45');
  const [equipment, setEquipment] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [generatedWorkout, setGeneratedWorkout] = useState(null);
  const [fitnessTrends, setFitnessTrends] = useState([]);
  const [error, setError] = useState('');

  const workoutGoals = [
    'Perda de peso',
    'Ganho de massa muscular',
    'Definição muscular',
    'Resistência cardiovascular',
    'Força e potência',
    'Flexibilidade',
    'Reabilitação',
    'Condicionamento geral'
  ];

  const fitnessLevels = [
    'Iniciante',
    'Intermediário',
    'Avançado',
    'Atleta'
  ];

  const equipmentOptions = [
    'Peso corporal',
    'Halteres',
    'Barras',
    'Kettlebells',
    'Elásticos',
    'TRX',
    'Máquinas',
    'Bola suíça',
    'Medicine ball',
    'Corda naval'
  ];

  // Classes do tema
  const themeClasses = tema === 'dark' ? {
    bg: 'bg-gray-900 text-white',
    cardBg: 'bg-gray-800',
    inputBg: 'bg-gray-700 text-white border-gray-600',
    buttonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
    buttonSecondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    border: 'border-gray-700',
    text: 'text-white',
    textSecondary: 'text-gray-300'
  } : {
    bg: 'bg-white text-gray-900',
    cardBg: 'bg-white',
    inputBg: 'bg-white text-gray-900 border-gray-300',
    buttonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
    buttonSecondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900',
    border: 'border-gray-300',
    text: 'text-gray-900',
    textSecondary: 'text-gray-600'
  };

  useEffect(() => {
    fetchFitnessTrends();
  }, []);

  const fetchFitnessTrends = async () => {
    try {
      const response = await api.get('/api/web-search/fitness-trends');
      if (response.data.success) {
        setFitnessTrends(response.data.trends || []);
      }
    } catch (error) {
      console.error('Erro ao buscar tendências:', error);
    }
  };

  const handleGenerateWorkout = async () => {
    if (!workoutGoal) {
      setError('Por favor, selecione um objetivo para o treino');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/web-search/generate-workout', {
        objetivo: workoutGoal,
        grupoMuscular: '',
        duracao: parseInt(duration),
        equipamentos: equipment,
        dificuldade: fitnessLevel.toLowerCase()
      });

      if (response.data.success) {
        setGeneratedWorkout(response.data.workout);
      } else {
        setError('Erro ao gerar treino. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao gerar treino:', error);
      setError('Erro ao conectar com o servidor. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchExercises = async () => {
    if (!searchQuery.trim()) {
      setError('Digite algo para buscar exercícios');
      return;
    }

    setSearchLoading(true);
    setError('');

    try {
      const response = await api.post('/api/web-search/search-exercises', {
        query: searchQuery,
        muscleGroup: '',
        equipment: equipment.join(','),
        difficulty: fitnessLevel.toLowerCase()
      });

      if (response.data.success) {
        setSearchResults(response.data.data || []);
      } else {
        setError('Nenhum exercício encontrado para sua busca');
      }
    } catch (error) {
      console.error('Erro ao buscar exercícios:', error);
      setError('Erro ao buscar exercícios. Tente novamente.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleEquipmentToggle = (eq) => {
    setEquipment(prev => 
      prev.includes(eq) 
        ? prev.filter(item => item !== eq)
        : [...prev, eq]
    );
  };

  const downloadWorkout = () => {
    if (!generatedWorkout) return;

    const workoutText = `
TREINO GERADO POR IA - TreinAI

Objetivo: ${workoutGoal}
Nível: ${fitnessLevel}
Duração: ${duration} minutos
Equipamentos: ${equipment.join(', ') || 'Nenhum especificado'}

${generatedWorkout.exercicios?.map((exercise, index) => `
${index + 1}. ${exercise.nome}
   - Séries: ${exercise.series}
   - Repetições: ${exercise.repeticoes}
   - Descanso: ${exercise.descanso}s
   - Instruções: ${exercise.instrucoes?.join(', ') || 'N/A'}
`).join('\n') || ''}

Observações:
${generatedWorkout.observacoes || 'Nenhuma observação adicional'}

Gerado em: ${new Date().toLocaleString()}
    `.trim();

    const blob = new Blob([workoutText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `treino-ia-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`p-6 min-h-screen ${themeClasses.bg}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-4xl font-bold ${themeClasses.text} flex items-center gap-3 mb-2`}>
            <LuBrain className="text-blue-500" />
            Gerador de Treinos com IA
          </h1>
          <p className={themeClasses.textSecondary}>
            Crie treinos personalizados usando inteligência artificial e busca web
          </p>
        </div>

        {/* Tendências de Fitness */}
        {fitnessTrends.length > 0 && (
          <div className={`${themeClasses.cardBg} ${themeClasses.border} border rounded-xl p-6 mb-8`}>
            <h2 className={`text-xl font-semibold ${themeClasses.text} flex items-center gap-2 mb-4`}>
              <LuTrendingUp className="text-green-500" />
              Tendências de Fitness
            </h2>
            <div className="flex flex-wrap gap-2">
              {fitnessTrends.slice(0, 10).map((trend, index) => (
                <button
                  key={index}
                  onClick={() => setSearchQuery(trend)}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm hover:bg-blue-200 transition-colors"
                >
                  {trend}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configurações do Treino */}
          <div className={`${themeClasses.cardBg} ${themeClasses.border} border rounded-xl p-6`}>
            <h2 className={`text-xl font-semibold ${themeClasses.text} flex items-center gap-2 mb-6`}>
              <LuTarget className="text-orange-500" />
              Configurações do Treino
            </h2>

            <div className="space-y-4">
              {/* Objetivo */}
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                  Objetivo do Treino *
                </label>
                <select
                  value={workoutGoal}
                  onChange={(e) => setWorkoutGoal(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${themeClasses.inputBg} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                >
                  <option value="">Selecione um objetivo</option>
                  {workoutGoals.map((goal) => (
                    <option key={goal} value={goal} className="text-gray-900">{goal}</option>
                  ))}
                </select>
              </div>

              {/* Nível */}
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                  Nível de Condicionamento
                </label>
                <select
                  value={fitnessLevel}
                  onChange={(e) => setFitnessLevel(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${themeClasses.inputBg} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                >
                  <option value="">Selecione seu nível</option>
                  {fitnessLevels.map((level) => (
                    <option key={level} value={level} className="text-gray-900">{level}</option>
                  ))}
                </select>
              </div>

              {/* Duração */}
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                  Duração (minutos)
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  min="15"
                  max="120"
                  className={`w-full px-3 py-2 rounded-lg border ${themeClasses.inputBg} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
              </div>

              {/* Equipamentos */}
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                  Equipamentos Disponíveis
                </label>
                <div className="flex flex-wrap gap-2">
                  {equipmentOptions.map((eq) => (
                    <button
                      key={eq}
                      onClick={() => handleEquipmentToggle(eq)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        equipment.includes(eq)
                          ? 'bg-blue-500 text-white'
                          : `${themeClasses.buttonSecondary}`
                      }`}
                    >
                      {eq}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botão Gerar */}
              <button
                onClick={handleGenerateWorkout}
                disabled={loading}
                className={`w-full py-3 px-4 rounded-lg font-semibold ${themeClasses.buttonPrimary} disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Gerando Treino...
                  </>
                ) : (
                  <>
                    <LuBrain />
                    Gerar Treino com IA
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Busca de Exercícios */}
          <div className={`${themeClasses.cardBg} ${themeClasses.border} border rounded-xl p-6`}>
            <h2 className={`text-xl font-semibold ${themeClasses.text} flex items-center gap-2 mb-6`}>
              <LuSearch className="text-purple-500" />
              Buscar Exercícios Específicos
            </h2>

            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ex: exercícios para peito, treino de pernas..."
                  className={`w-full px-3 py-2 rounded-lg border ${themeClasses.inputBg} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchExercises()}
                />
              </div>

              <button
                onClick={handleSearchExercises}
                disabled={searchLoading}
                className={`w-full py-2 px-4 rounded-lg font-semibold ${themeClasses.buttonSecondary} disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
              >
                {searchLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    Buscando...
                  </>
                ) : (
                  <>
                    <LuSearch />
                    Buscar Exercícios
                  </>
                )}
              </button>

              {/* Resultados da Busca */}
              {searchResults.length > 0 && (
                <div className="mt-4">
                  <h3 className={`text-sm font-medium ${themeClasses.text} mb-2`}>
                    Exercícios Encontrados ({searchResults.length})
                  </h3>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {searchResults.slice(0, 10).map((exercise, index) => (
                      <div key={index} className={`p-3 rounded-lg ${themeClasses.border} border`}>
                        <h4 className={`font-medium ${themeClasses.text}`}>{exercise.name}</h4>
                        <p className={`text-sm ${themeClasses.textSecondary}`}>
                          {exercise.muscle_group} • {exercise.difficulty || 'N/A'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Treino Gerado */}
        {generatedWorkout && (
          <div className={`${themeClasses.cardBg} ${themeClasses.border} border rounded-xl p-6 mt-8`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-2xl font-bold ${themeClasses.text} flex items-center gap-2`}>
                <LuDumbbell className="text-green-500" />
                Seu Treino Personalizado
              </h2>
              <button
                onClick={downloadWorkout}
                className={`px-4 py-2 rounded-lg ${themeClasses.buttonPrimary} flex items-center gap-2`}
              >
                <LuDownload />
                Download
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className={`p-4 rounded-lg ${themeClasses.border} border`}>
                <div className="flex items-center gap-2 mb-2">
                  <LuTarget className="text-blue-500" />
                  <span className={`font-medium ${themeClasses.text}`}>Objetivo</span>
                </div>
                <p className={themeClasses.textSecondary}>{workoutGoal}</p>
              </div>
              <div className={`p-4 rounded-lg ${themeClasses.border} border`}>
                <div className="flex items-center gap-2 mb-2">
                  <LuClock className="text-orange-500" />
                  <span className={`font-medium ${themeClasses.text}`}>Duração</span>
                </div>
                <p className={themeClasses.textSecondary}>{duration} minutos</p>
              </div>
              <div className={`p-4 rounded-lg ${themeClasses.border} border`}>
                <div className="flex items-center gap-2 mb-2">
                  <LuUser className="text-purple-500" />
                  <span className={`font-medium ${themeClasses.text}`}>Nível</span>
                </div>
                <p className={themeClasses.textSecondary}>{fitnessLevel}</p>
              </div>
            </div>

            {generatedWorkout.exercicios && generatedWorkout.exercicios.length > 0 && (
              <div>
                <h3 className={`text-lg font-semibold ${themeClasses.text} mb-4`}>Exercícios</h3>
                <div className="space-y-4">
                  {generatedWorkout.exercicios.map((exercise, index) => (
                    <div key={index} className={`p-4 rounded-lg ${themeClasses.border} border`}>
                      <div className="flex items-start justify-between mb-2">
                        <h4 className={`font-medium ${themeClasses.text}`}>
                          {index + 1}. {exercise.nome}
                        </h4>
                        <div className="text-right">
                          <div className={`text-sm ${themeClasses.textSecondary}`}>
                            {exercise.series} séries × {exercise.repeticoes} reps
                          </div>
                          <div className={`text-sm ${themeClasses.textSecondary}`}>
                            Descanso: {exercise.descanso}s
                          </div>
                        </div>
                      </div>
                      {exercise.instrucoes && exercise.instrucoes.length > 0 && (
                        <div className={`text-sm ${themeClasses.textSecondary} mt-2`}>
                          <strong>Instruções:</strong> {exercise.instrucoes.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {generatedWorkout.observacoes && (
              <div className="mt-6">
                <h3 className={`text-lg font-semibold ${themeClasses.text} mb-2`}>Observações</h3>
                <p className={themeClasses.textSecondary}>{generatedWorkout.observacoes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIWorkoutGenerator;