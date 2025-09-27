import React, { useEffect, useState } from 'react';
import api from '../../../Api';

const questions = [
  {
    id: 'nivel',
    title: 'Qual é a sua experiência quando se trata de exercícios?',
    subtitle: 'Ajuda a IA a sugerir treinos adequados ao seu nível atual.',
    type: 'single',
    options: [
      { id: 'iniciante', label: 'Iniciante' },
      { id: 'intermediario', label: 'Intermediário' },
      { id: 'avancado', label: 'Avançado' },
      { id: 'experiente', label: 'Experiente / Competitivo' }
    ],
    explain: 'Nível define intensidade, volume e complexidade dos exercícios sugeridos.'
  },
  {
    id: 'objetivo',
    title: 'Qual seu principal objetivo com os treinos?',
    subtitle: 'Escolha os objetivos que mais representam seu foco atual.',
    type: 'multi',
    options: [
      { id: 'ganho_massa', label: 'Ganho de massa (hipertrofia)' },
      { id: 'perda_gordura', label: 'Perda de gordura / definição' },
      { id: 'resistencia', label: 'Melhorar resistência cardiovascular' },
      { id: 'forca', label: 'Aumentar força' },
      { id: 'flexibilidade', label: 'Flexibilidade' },
      { id: 'reabilitacao', label: 'Reabilitação / Recuperação' }
    ],
    explain: 'O objetivo principal guia as variáveis do treino: repetições, descanso, exercícios.'
  },
  {
    id: 'frequencia',
    title: 'Com que frequência pretende treinar por semana?',
    subtitle: 'Informe uma estimativa realista para melhores recomendações.',
    type: 'single',
    options: [
      { id: '1_2', label: '1–2x por semana' },
      { id: '3_4', label: '3–4x por semana' },
      { id: '5_6', label: '5–6x por semana' },
      { id: 'diario', label: 'Diário / 7x por semana' }
    ],
    explain: 'Frequência afeta volume semanal e recuperação.'
  },
  {
    id: 'equipamentos',
    title: 'Que equipamentos você tem disponível?',
    subtitle: 'Marque tudo que você tiver (pode selecionar múltiplas).',
    type: 'multi',
    options: [
      { id: 'academia_completa', label: 'Academia completa' },
      { id: 'halteres', label: 'Halteres / Kettlebell' },
      { id: 'barra', label: 'Barra / Anilhas' },
      { id: 'elastico', label: 'Bandas elásticas' },
      { id: 'nenhum', label: 'Sem equipamento (apenas peso corporal)' },
      { id: 'outro', label: 'Outro (especificar no final)' }
    ],
    explain: 'Saber equipamentos permite adaptar exercícios reais ao seu ambiente.'
  },
  {
    id: 'limitacoes',
    title: 'Você tem lesões ou limitações físicas?',
    subtitle: 'Isso é importante para segurança — descreva brevemente se tiver.',
    type: 'text',
    explain: 'Ex.: problemas no joelho, dor lombar, cirurgias recentes, problemas de pressão.'
  },
  {
    id: 'foco_muscular',
    title: 'Em quais áreas você quer focar mais?',
    subtitle: 'Selecione todas as que se aplicam.',
    type: 'multi',
    options: [
      { id: 'peito', label: 'Peito' },
      { id: 'costas', label: 'Costas' },
      { id: 'pernas', label: 'Pernas' },
      { id: 'bracos', label: 'Bíceps / Tríceps' },
      { id: 'ombros', label: 'Ombros' },
      { id: 'abdomen', label: 'Abdômen / Core' }
    ],
    explain: 'Foco muscular orienta seleção de exercícios prioritários.'
  },
  {
    id: 'duracao_treino',
    title: 'Quanto tempo costuma ter por treino?',
    subtitle: 'Tempo médio disponível por sessão.',
    type: 'single',
    options: [
      { id: '20_30', label: '20–30 minutos' },
      { id: '30_45', label: '30–45 minutos' },
      { id: '45_60', label: '45–60 minutos' },
      { id: '60_plus', label: '60+ minutos' }
    ],
    explain: 'Duração ajuda a estruturar treinos eficientes e realistas.'
  },
  {
    id: 'motivacao',
    title: 'O que mais te motiva a treinar?',
    subtitle: 'Ajuda a IA a personalizar mensagens e adesão.',
    type: 'single',
    options: [
      { id: 'estetica', label: 'Aparência / Estética' },
      { id: 'saude', label: 'Saúde a longo prazo' },
      { id: 'performance', label: 'Desempenho esportivo' },
      { id: 'social', label: 'Social / Fazer parte de algo' },
      { id: 'habit', label: 'Criar rotina / hábito' }
    ],
    explain: 'Motivação influencia tipo de suporte e lembretes que a IA pode oferecer.'
  },
  {
    id: 'esporte',
    title: 'Você pratica algum esporte? Qual o seu objetivo neste esporte?',
    subtitle: 'Ex.: Futebol, desejo ser um atacante mais ágil e forte.',
    type: 'text',
    explain: 'Caso você queira ser o MELHOR isso ajuda muito a personalização dos treinos.'
  },
  {
    id: 'comentarios',
    title: 'Algo mais que você queira contar?',
    subtitle: 'Comentário opcional.',
    type: 'text',
    explain: 'Ex.: alergias, horas de sono, restrições alimentares, preferências.'
  }
];

const OnboardingQuestionnaireFitness = ({ user, setUser, setShowOnboard, tema = 'light' }) => {
  const [current, setCurrent] = useState(0);
  const [answersMap, setAnswersMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [startedAt, setStartedAt] = useState(new Date().toISOString());

  // Classes CSS baseadas no tema
  const getThemeClasses = () => {
    const isDark = tema === 'dark';
    
    return {
      overlay: isDark 
        ? ''/* 'inset-0 z-50 bg-black/80 flex items-center justify-center p-6' */
        : ''/* 'inset-0 z-50 bg-black/60 flex items-center justify-center p-6' */,
      
      container: isDark 
        ? 'w-full max-w-4xl bg-gray-800 text-white rounded-2xl shadow-2xl overflow-hidden'
        : 'w-full max-w-4xl bg-white text-black rounded-2xl shadow-2xl overflow-hidden',
      
      header: isDark 
        ? 'flex items-center justify-between px-6 py-4 border-b border-gray-700'
        : 'flex items-center justify-between px-6 py-4 border-b border-gray-200',
      
      title: isDark 
        ? 'text-xl font-bold text-white'
        : 'text-xl font-bold text-gray-900',
      
      subtitle: isDark 
        ? 'text-sm text-gray-300'
        : 'text-sm text-gray-600',
      
      username: isDark 
        ? 'text-sm text-gray-400'
        : 'text-sm text-gray-500',
      
      progressBar: isDark 
        ? 'w-full bg-gray-700 h-2 rounded-full overflow-hidden'
        : 'w-full bg-gray-200 h-2 rounded-full overflow-hidden',
      
      progressFill: 'h-2 bg-green-400',
      
      progressText: isDark 
        ? 'text-xs text-gray-400 mt-2'
        : 'text-xs text-gray-500 mt-2',
      
      questionTitle: isDark 
        ? 'text-2xl font-semibold text-white'
        : 'text-2xl font-semibold text-gray-900',
      
      questionSubtitle: isDark 
        ? 'text-sm text-gray-300 mt-2'
        : 'text-sm text-gray-600 mt-2',
      
      textarea: isDark 
        ? 'w-full border border-gray-600 bg-gray-700 text-white rounded-lg p-3 min-h-[120px] placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
        : 'w-full border border-gray-300 bg-white text-gray-900 rounded-lg p-3 min-h-[120px] placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent',
      
      optionButton: (isSelected) => isDark 
        ? `text-left p-4 rounded-lg border transition-colors ${
            isSelected 
              ? 'border-blue-500 bg-blue-900/50 text-white' 
              : 'border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600'
          }`
        : `text-left p-4 rounded-lg border transition-colors ${
            isSelected 
              ? 'border-blue-500 bg-blue-50 text-gray-900' 
              : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
          }`,
      
      footer: isDark 
        ? 'flex items-center justify-between px-6 py-4 border-t border-gray-700 bg-gray-800'
        : 'flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white',
      
      backButton: isDark 
        ? 'px-4 py-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200 disabled:opacity-40 hover:bg-gray-600 transition-colors'
        : 'px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 disabled:opacity-40 hover:bg-gray-50 transition-colors',
      
      nextButton: 'px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors',
      
      submitButton: 'px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50'
    };
  };

  const themeClasses = getThemeClasses();

  useEffect(() => {
    const init = {};
    questions.forEach(q => init[q.id] = q.type === 'multi' ? [] : '');
    if (user?.onboarding?.answers) {
      user.onboarding.answers.forEach(a => {
        if (a.questionId) {
          init[a.questionId] = a.responseAnswer || '';
        }
      });
    }
    setAnswersMap(init);
  }, [user]);

  const setAnswer = (qid, value) => {
    setAnswersMap(prev => ({ ...prev, [qid]: value }));
  };

  const handleOption = (qid, value, type) => {
    if (type === 'multi') {
      const prev = answersMap[qid] || [];
      const newVal = prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value];
      setAnswer(qid, newVal);
    } else {
      setAnswer(qid, value);
    }
  };

  const next = () => setCurrent(c => Math.min(c + 1, questions.length - 1));
  const prev = () => setCurrent(c => Math.max(c - 1, 0));

  const submit = async () => {
  setLoading(true);
  try {
    const now = new Date().toISOString();
    
    // Monta a string de respostas no formato:
    // "pergunta 1: resposta 1; pergunta 2: resposta 2"
    const answersString = questions.map((q, index) => {
      const ans = answersMap[q.id];
      // Para múltiplas respostas, junta com vírgula
      const formattedAnswer = Array.isArray(ans) ? ans.join(', ') : ans;
      return `Pergunta ${index + 1} (${q.title}): ${formattedAnswer}`;
    }).join('; ');
    
    console.log('=== STRING DE RESPOSTAS ===');
    console.log(answersString);
    setShowOnboard(false);
    
    const payload = {
      email: user?.email || '',
      answers: answersString,
      completed: true,
      startedAt,
      completedAt: now
    };

    const res = await api.post('/complete-onboarding', payload);
    console.log('Onboarding enviado com sucesso:', res.data);

    setUser(res.data?.user);
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};

  const q = questions[current];
  const progress = Math.round(((current + 1) / questions.length) * 100);

  return (
    <div className={themeClasses.overlay}>
      <div className={themeClasses.container}>
        <header className={themeClasses.header}>
          <div>
            <h3 className={themeClasses.title}>Questionário inicial — Treinos</h3>
            <p className={themeClasses.subtitle}>Responda rápido para personalizarmos seus treinos.</p>
          </div>
          <div className={themeClasses.username}>{user?.username}</div>
        </header>

        <div className="px-8 py-6">
          <div className="mb-4">
            <div className={themeClasses.progressBar}>
              <div style={{ width: `${progress}%` }} className={themeClasses.progressFill} />
            </div>
            <div className={themeClasses.progressText}>Pergunta {current + 1} de {questions.length}</div>
          </div>

          <div className="mb-6">
            <h4 className={themeClasses.questionTitle}>{q.title}</h4>
            {q.subtitle && <p className={themeClasses.questionSubtitle}>{q.subtitle}</p>}
          </div>

          <div className="space-y-4">
            {q.type === 'text' ? (
              <textarea
                className={themeClasses.textarea}
                value={answersMap[q.id] || ''}
                onChange={e => setAnswer(q.id, e.target.value)}
                placeholder="Escreva aqui..."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {q.options.map(opt => {
                  const isSelected = q.type === 'multi' 
                    ? answersMap[q.id]?.includes(opt.label) 
                    : answersMap[q.id] === opt.label;
                  
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleOption(q.id, opt.label, q.type)}
                      className={themeClasses.optionButton(isSelected)}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <footer className={themeClasses.footer}>
          <div className="flex items-center gap-3">
            <button 
              onClick={prev} 
              disabled={current === 0} 
              className={themeClasses.backButton}
            >
              Voltar
            </button>
            {current < questions.length - 1 ? (
              <button 
                onClick={next} 
                className={themeClasses.nextButton}
              >
                Próxima
              </button>
            ) : (
              <button 
                onClick={submit} 
                disabled={loading} 
                className={themeClasses.submitButton}
              >
                {loading ? 'Processando...' : 'Finalizar e enviar'}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};


export default OnboardingQuestionnaireFitness;
