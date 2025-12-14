import { useEffect, useState, useRef, useMemo } from "react";
import { renderToStaticMarkup } from 'react-dom/server';
import { motion, AnimatePresence } from "framer-motion";
import BuscarImagem from "../../../components/BuscarImagens";
import { FaLocationArrow } from "react-icons/fa";
import AdBanner from "./AdBanner";
import { useNavigate } from "react-router-dom";
import api from "../../../Api";
import SummaryOverlay from "./SummaryOverlay";
import { getBrazilDate } from "../../../../helpers/getBrazilDate.js";
import AdTreinAI from "./AdTreinAI.jsx";
import { useToast } from "../../../components/Toast.jsx";

/* Fallback simples */
const exerciciosMock = [
  { nome: "Supino Reto", instrucoes: "Deite no banco...", series: "3x12 - Desc 60s", imagem: "Supino Reto", pse: 7 },
  { nome: "Agachamento Livre", instrucoes: "Mantenha as costas...", series: "4x10 - Desc 90s", imagem: "Agachamento Livre", pse: 8 },
  { nome: "Remada Curvada", instrucoes: "Puxe em direção ao abdômen.", series: "3x12 - Desc 60s", imagem: "Remada Curvada", pse: 5 },
];

const ChatTreino = ({ tema = "dark", user }) => {
  const isDark = tema === "dark";
  const navigate = useNavigate();

  // Função para interpretar markdown básico (**texto** -> negrito)
  const parseMarkdown = (text) => {
    if (typeof text !== 'string') return text;

    // Regex para encontrar **texto** e converter em negrito
    // Suporta múltiplas ocorrências e trata casos onde ** não é fechado
    const parts = [];
    let lastIndex = 0;
    let inBold = false;
    let boldStart = -1;

    for (let i = 0; i < text.length - 1; i++) {
      if (text[i] === '*' && text[i + 1] === '*') {
        if (!inBold) {
          // Início do negrito
          if (i > lastIndex) {
            parts.push(text.slice(lastIndex, i));
          }
          boldStart = i + 2;
          inBold = true;
          i++; // Pula o próximo *
        } else {
          // Fim do negrito
          const boldText = text.slice(boldStart, i);
          parts.push(<strong key={`bold-${parts.length}`}>{boldText}</strong>);
          lastIndex = i + 2;
          inBold = false;
          i++; // Pula o próximo *
        }
      }
    }

    // Se ainda está em negrito (** não foi fechado), adiciona o resto como negrito
    if (inBold && boldStart !== -1) {
      const boldText = text.slice(boldStart);
      parts.push(<strong key={`bold-${parts.length}`}>{boldText}</strong>);
    } else {
      // Adiciona o resto do texto normal
      if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
      }
    }

    // Se não há partes JSX, retorna o texto original
    if (parts.length === 0) return text;
    if (parts.length === 1 && typeof parts[0] === 'string') return parts[0];

    // Retorna um span com as partes formatadas
    return <span key={`parsed-${getBrazilDate()}`}>{parts}</span>;
  };

  // treinos (fallback)
  const treinosDisponiveis =
    user?.meusTreinos && user.meusTreinos.length
      ? user.meusTreinos
      : [
        {
          treinoName: "Treino Demo",
          descricao: 'Esse é um treino de demonstração, para criar seus treinos clique em "Gerenciar treinos"',
          exercicios: exerciciosMock,
        },
      ];

  // pure helper: compute next treino index given treinos and histórico
  const computeNextIndex = (treinos, userHistorico) => {
    const idxOrdem1 = treinos.findIndex(t => Number(t.ordem) === 1);
    const fallbackIndex = idxOrdem1 !== -1 ? idxOrdem1 : 0;
    if (!Array.isArray(userHistorico) || userHistorico.length === 0) return fallbackIndex;

    // normaliza e ordena histórico por data
    const copy = [...userHistorico]
      .map(r => ({
        r,
        time: new Date(r.dataExecucao || r.createdAt || r.data || r.date || 0).getTime()
      }))
      .sort((a, b) => a.time - b.time);

    const ultimo = copy.length ? copy[copy.length - 1].r : null;
    if (!ultimo) return fallbackIndex;

    const ultimoTreinoId =
      ultimo?.treinoId || ultimo?.treino?.treinoId || ultimo?.treino?._id || ultimo?._id || null;

    // acha índice do treino no array atual
    const idx = treinos.findIndex(t =>
      String(t.treinoId || t._id || "").toLowerCase() === String(ultimoTreinoId || "").toLowerCase()
    );

    // helper local: é o mesmo dia?
    const sameDay = (() => {
      const d1 = new Date(ultimo.dataExecucao || ultimo.createdAt || ultimo.data || ultimo.date || 0);
      const d2 = new Date();
      return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
      );
    })();

    // ⚠️ Se o último treino foi HOJE, não avança de índice.
    if (sameDay) {
      if (idx !== -1) return idx;

      // fallback por ordem, se não achou por id
      const ultimoOrdem = Number(ultimo?.ordem || 0);
      const idxByOrder = treinos.findIndex(t => Number(t.ordem) === ultimoOrdem);
      return idxByOrder !== -1 ? idxByOrder : fallbackIndex;
    }

    // Caso normal (não foi hoje): avança para o próximo
    if (idx === -1) {
      const ultimoOrdem = Number(ultimo?.ordem || 0);
      const idxByOrder = treinos.findIndex(t => Number(t.ordem) === ultimoOrdem);
      return idxByOrder !== -1 ? (idxByOrder + 1) % treinos.length : fallbackIndex;
    }

    return (idx + 1) % treinos.length;
  };

  // estado
  const [mensagens, setMensagens] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [treinoIniciado, setTreinoIniciado] = useState(false);
  const [treinoIndex, setTreinoIndex] = useState(() => computeNextIndex(treinosDisponiveis, user?.historico || []));
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [exercicioExibido, setExercicioExibido] = useState(false);
  const [duracaoTotal, setDuracaoTotal] = useState(0);
  const mensagensEndRef = useRef(null);
  const mensagensContainerRef = useRef(null);
  const isAtBottomRef = useRef(true);

  // typing control
  const typingRef = useRef(null); // guarda id do placeholder atual

  // set control
  const [setsRequired, setSetsRequired] = useState(3);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [setStarted, setSetStarted] = useState(false);
  const [setStartAt, setSetStartAt] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const elapsedIntervalRef = useRef(null);
  const [setTimingsByExercise, setSetTimingsByExercise] = useState([]);
  const [exerciseComplete, setExerciseComplete] = useState(false);

  // summary
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [lastRegistro, setLastRegistro] = useState(null);

  // finalização do treino
  const [treinoFinalizado, setTreinoFinalizado] = useState(false);
  const [finalizandoTreino, setFinalizandoTreino] = useState(false);

  // anúncios visualizados
  const [anunciosJaVistos, setAnunciosJaVistos] = useState([]);

  // toast
  const { showError } = useToast();

  // Função para verificar se o usuário está no final do chat
  const checkIfAtBottom = () => {
    if (mensagensContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = mensagensContainerRef.current;
      const threshold = 100; // 100px de tolerância
      isAtBottomRef.current = scrollTop + clientHeight >= scrollHeight - threshold;
    }
  };

  // Função para rolar suavemente para o final
  const scrollToBottom = () => {
    if (mensagensContainerRef.current) {
      mensagensContainerRef.current.scrollTop = mensagensContainerRef.current.scrollHeight;
    }
  };

  // scroll otimizado - só rola se o usuário estava no final
  useEffect(() => {
    if (isAtBottomRef.current && mensagens.length > 0) {
      // Pequeno delay para garantir que o DOM foi atualizado
      setTimeout(() => {
        scrollToBottom();
      }, 50);
    }
  }, [mensagens]);

  // Listener para detectar quando o usuário rola manualmente
  useEffect(() => {
    const container = mensagensContainerRef.current;
    if (container) {
      const handleScroll = () => {
        checkIfAtBottom();
      };
      
      container.addEventListener('scroll', handleScroll);
      
      // Verificar posição inicial
      checkIfAtBottom();
      
      return () => {
        container.removeEventListener('scroll', handleScroll);
      };
    }
  }, []);



  useEffect(() => {
    return () => {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    };
  }, []);

  // recompute treino index when histórico / treinos mudarem
  useEffect(() => {
    const idx = computeNextIndex(treinosDisponiveis, user?.historico || []);
    setTreinoIndex(idx);
    setSetTimingsByExercise([]);
    setIndiceAtual(0);
  }, [user?.historico, user?.meusTreinos]); // eslint-disable-line

  // helper isSameDay (local timezone)
  const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    const a = new Date(d1);
    const b = new Date(d2);
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  };

  // função para resetar o treino após finalização
  const resetarTreino = () => {
    setTreinoFinalizado(false);
    setFinalizandoTreino(false);
    setTreinoIniciado(false);
    setIndiceAtual(0);
    setCurrentSetIndex(0);
    setExerciseComplete(false);
    setSetStarted(false);
    setElapsedSeconds(0);
    setSetTimingsByExercise([]);
    setSummaryOpen(false);
    setLastRegistro(null);
    setMensagens([]);
    setHistorico([]);
    setExercicioExibido(false);
    setAnunciosJaVistos([]); // Resetar anúncios visualizados

    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
  };

  // registrar histórico
  const registrarTreinoHistorico = async (registroLocal) => {
    if (!registroLocal) return;
    if (registroLocal.treinoName === "Treino Demo" || registroLocal.descricao === 'Esse é um treino de demonstração, para criar seus treinos clique em "Gerenciar treinos"') {
      return;
    }
    try {
      // Registrar no histórico
      await api.post("/publicar-no-historico", {
        email: user.email,
        treino: registroLocal,
      });

      adicionarMensagem("✅ Treino registrado no seu histórico!", "bot");

      // Finalizar treino gamificação
      const gmSubmit = await api.post("/gamification/finalizar-treino", {
        user,
        payloadTreino: registroLocal,
      });

      if (gmSubmit.reponse.data.success == true) {
        adicionarMensagem((
          <div className="bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-5 shadow-lg ring-1 ring-emerald-200 dark:ring-emerald-500/30 space-y-3 text-gray-800 dark:text-gray-100">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎉</span>
              <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                Você ganhou <span className="text-emerald-600 dark:text-emerald-400 font-bold">{gmSubmit.reponse.data.pointsEarned}</span> pontos!
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-blue-500">💎</span>
                <p>Total de pontos: <span className="font-semibold">{gmSubmit.reponse.data.totalPoints}</span></p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-orange-500">🔥</span>
                <p>Seu streak: <span className="font-semibold">{gmSubmit.reponse.data.streak}</span></p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-purple-500">🏋️</span>
                <p>Exercícios completados: <span className="font-semibold">{gmSubmit.reponse.data.exercisesCompleted}</span></p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-green-500">✅</span>
                <p>Séries completadas: <span className="font-semibold">{gmSubmit.reponse.data.setsCompleted}</span></p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-cyan-500">⏱️</span>
                <p>Duração do treino: <span className="font-semibold">{formatSeconds(gmSubmit.reponse.data.duration)}</span></p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-yellow-500">🏆</span>
                <p>Posição no ranking: <span className="font-bold text-yellow-600 dark:text-yellow-400">#{gmSubmit.reponse.data.rankingPosition}</span></p>
              </div>
            </div>
          </div>
        ), "bot");
      } else {
        adicionarMensagem("❌ Não foi possível finalizar o treino.", "bot");
      }
    } catch (err) {
      console.error("Erro ao registrar treino:", err);
      adicionarMensagem("❌ Não foi possível registrar o treino no histórico.", "bot");
    }
  };

  const adicionarMensagem = (conteudo, tipo) => {
    // Aplica formatação de markdown apenas para mensagens da IA
    const conteudoFormatado = tipo === 'bot' && typeof conteudo === 'string'
      ? parseMarkdown(conteudo)
      : conteudo;

    setMensagens(prev => [...prev, { id: getBrazilDate() + Math.random(), conteudo: conteudoFormatado, tipo }]);
    const role = tipo === 'bot' ? 'ia' : 'user';
    let contentString = "";
    if (typeof conteudo === "string") contentString = conteudo;
    else contentString = renderToStaticMarkup(conteudo);
    setHistorico(prev => [...prev, { role, content: contentString }]);
  };

  // derive treinoAtual
  const treinoAtual = treinosDisponiveis[treinoIndex] || treinosDisponiveis[0];

  /* ====== Aqui: encontre todos os registros do mesmo treino e conte quantos foram hoje ====== */
  const { ultimoRegistroDoMesmoTreino, jaFezHoje, jaFezHojeCount } = useMemo(() => {
    const hist = Array.isArray(user?.historico) ? user.historico : [];
    if (!hist.length || !treinoAtual) return { ultimoRegistroDoMesmoTreino: null, jaFezHoje: false, jaFezHojeCount: 0 };

    const normalize = (v) => String(v ?? "").trim().toLowerCase();
    const treinoIdKey = normalize(treinoAtual.treinoId || treinoAtual._id || treinoAtual.id || "");
    const treinoNameKey = normalize(treinoAtual.treinoName || treinoAtual.name || treinoAtual.title || "");

    const matchesTreino = (r) => {
      if (!r) return false;
      const rId = normalize(r.treinoId || r.treino?._id || r.treino?.treinoId || r._id || "");
      let rName = normalize(r.treinoName || r.treino?.treinoName || r.treino?.name || r.treino || "");
      if (!rName && r.treino && typeof r.treino === "object" && (r.treino.treinoName || r.treino.name)) {
        rName = normalize(r.treino.treinoName || r.treino.name);
      }

      if (treinoIdKey && rId && treinoIdKey === rId) return true;
      if (treinoNameKey && rName && treinoNameKey === rName) return true;
      if (treinoNameKey && rName && rName.includes(treinoNameKey)) return true;
      return false;
    };

    // filter + map with time, then sort by time asc
    const matches = hist
      .map(r => ({ r, time: new Date(r.dataExecucao || r.createdAt || r.data || r.date || 0).getTime() }))
      .filter(obj => matchesTreino(obj.r))
      .sort((a, b) => a.time - b.time);

    const lastMatch = matches.length ? matches[matches.length - 1].r : null;

    // count how many of these matches are today
    const todayCount = matches.reduce((acc, obj) => {
      const r = obj.r;
      const dateField = r.dataExecucao || r.createdAt || r.data || r.date || null;
      if (!dateField) return acc;
      return isSameDay(dateField, new Date()) ? acc + 1 : acc;
    }, 0);

    if (todayCount > 0) {
      console.log('ja fez hoje, quantidade: ', todayCount)
    } else {
      console.log('Ainda não fez hoje, contagem: ', todayCount)
    }
    return { ultimoRegistroDoMesmoTreino: lastMatch, jaFezHoje: todayCount > 0, jaFezHojeCount: todayCount };
  }, [user?.historico, treinoAtual]);

  // inicia treino
  const iniciarTreino = () => {
    const nextIndex = computeNextIndex(treinosDisponiveis, user?.historico || []);
    setTreinoIndex(nextIndex);
    setSetTimingsByExercise([]);
    setIndiceAtual(0);
    setTreinoIniciado(true);

    const treinoName = (treinosDisponiveis[nextIndex]?.treinoName) || treinoAtual?.treinoName || "treino";
    adicionarMensagem(`Vamos começar o ${treinoName}! 💪 Primeiro exercício chegando...`, "bot");

    setTimeout(() => exibirExercicio(0, nextIndex), 700);
  };

  const parseSetsCount = (series) => {
    if (typeof series === "number") return Math.max(1, series);
    if (!series) return 3;
    const str = String(series).trim();
    const m = str.match(/^(\d+)\s*[xX]/);
    if (m) return parseInt(m[1], 10);
    const n = parseInt(str, 10);
    return Number.isNaN(n) ? 3 : Math.max(1, n);
  };

  // exibe exercício
  const exibirExercicio = (exerciseIndex, treinoIdx = treinoIndex) => {
    const treino = treinosDisponiveis[treinoIdx] || treinosDisponiveis[0];
    const exercicios = treino.exercicios && treino.exercicios.length ? treino.exercicios : exerciciosMock;
    const ex = exercicios[exerciseIndex];
    if (!ex) { adicionarMensagem("Nenhum exercício encontrado.", "bot"); return; }

    const setsNumber = parseSetsCount(ex.series);
    if (elapsedIntervalRef.current) { clearInterval(elapsedIntervalRef.current); elapsedIntervalRef.current = null; }
    setSetStarted(false); setSetStartAt(null); setElapsedSeconds(0);

    setSetTimingsByExercise(prev => {
      const copy = Array.isArray(prev) ? prev.map(arr => (Array.isArray(arr) ? [...arr] : [])) : [];
      if (!Array.isArray(copy[exerciseIndex])) copy[exerciseIndex] = [];
      return copy;
    });

    const existingForExercise = (setTimingsByExercise[exerciseIndex] && Array.isArray(setTimingsByExercise[exerciseIndex])) ? setTimingsByExercise[exerciseIndex] : [];
    const doneCount = existingForExercise.length;

    setSetsRequired(setsNumber);
    setCurrentSetIndex(doneCount);
    setExerciseComplete(doneCount >= setsNumber);

    adicionarMensagem(
      <>
        <div className="w-full flex flex-col gap-6 items-start">
          <div className="w-full">
            <div className={`relative overflow-hidden rounded-3xl shadow-2xl ring-1 ring-black/5 transition-transform duration-500 transform hover:-translate-y-1 ${isDark ? "bg-gradient-to-br from-gray-800 via-gray-900 to-black" : "bg-gradient-to-br from-white to-gray-50"}`}>
              <div className="absolute inset-0 pointer-events-none">
                <div className={`w-full h-full ${isDark ? "bg-gradient-to-t from-black/40 via-transparent to-transparent" : "bg-gradient-to-t from-white/60 via-transparent to-transparent"}`} />
              </div>
              <div className="relative">
                <BuscarImagem imgType={'gif'} chatTreino={true} email={user?.email} query={ex.imagem || ex.nome} className="w-full h-[240px] md:h-[320px] object-cover transition-transform duration-600 transform hover:scale-105" alt={`Imagem do exercício ${ex.nome}`} />
                <div className="absolute left-4 bottom-4 flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-black/60 text-white text-xs md:text-sm rounded-full px-3 py-1 backdrop-blur-sm shadow">
                    <span className="font-semibold">{ex.nome}</span>
                    <span className="ml-2 text-xs opacity-80">• {exerciseIndex + 1}/{exercicios.length}</span>
                  </div>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="md:w-1/2 w-full flex flex-col justify-between">
            <div>
              <h3 className={`text-base md:text-xl font-bold leading-tight ${isDark ? "text-white" : "text-gray-900"}`}>{ex.nome}</h3>
              <p className={`mt-2 text-xs md:text-sm leading-relaxed ${isDark ? "text-gray-300" : "text-gray-700"}`}>{ex.instrucoes}</p>
              <div className={`mt-4 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${isDark ? "bg-gray-800/60" : "bg-gray-100"}`}>
                <div>{typeof ex.pse !== "undefined" && <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>PSE: <strong>{ex.pse}/10</strong></p>}</div>
              </div>

              <div className="mt-4 flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-sm">
                  {Array.from({ length: setsNumber }).map((_, i) => {
                    const done = i < doneCount;
                    const inProgress = i === currentSetIndex && setStarted && !done;
                    const durationLabel = done ? ` • ${formatSeconds(existingForExercise[i]?.durationSeconds || 0)}` : "";
                    return (
                      <div key={i} className={`px-3 py-1 rounded-full text-xs font-medium ${done ? "bg-green-600 text-white" : inProgress ? "bg-yellow-500 text-black" : isDark ? "bg-gray-700 text-gray-200" : "bg-gray-200 text-gray-800"}`}>
                        {`Set ${i + 1}${durationLabel}`}
                      </div>
                    );
                  })}
                </div>
              </div>

              {existingForExercise.length > 0 && (
                <div className="mt-3 text-xs text-gray-400">
                  {existingForExercise.map((t, idx) => (
                    <div key={idx}>
                      Set {t.setNumber}: {formatSeconds(t.durationSeconds)} — {new Date(t.startedAt).toLocaleTimeString()} → {new Date(t.endedAt).toLocaleTimeString()}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 text-xs md:text-sm text-gray-400">
              <p className="mb-2">PSE — Percepção Subjetiva de Esforço ...</p>
              <p>Dica: execute cada repetição com controle — concentre-se na técnica.</p>
            </div>
          </div>
        </div>
      </>,
      "bot"
    );

    setIndiceAtual(exerciseIndex);
    setExercicioExibido(true);
  };

  // Typing dots component
  const TypingDots = () => (
    <div className={`flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
      <div className="mr-2 text-xs opacity-90">IA está digitando</div>
      <div className="flex items-center gap-1">
        {[0, 1, 2].map(i => (
          <motion.span key={i}
            initial={{ y: 0, opacity: 0.6 }}
            animate={{ y: [0, -5, 0], opacity: [0.6, 1, 0.6] }}
            transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.12 }}
            className={`block w-1.5 h-1.5 rounded-full ${isDark ? 'bg-gray-400' : 'bg-gray-500'}`}
          />
        ))}
      </div>
    </div>
  );

  // start/end sets
  const handleStartSet = () => {
    if (setStarted) return;
    if (exerciseComplete) return;
    const now = getBrazilDate();
    setSetStartAt(now);
    setSetStarted(true);
    setElapsedSeconds(0);
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    elapsedIntervalRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((getBrazilDate() - now) / 1000));
    }, 250);
    adicionarMensagem(`Set ${currentSetIndex + 1} iniciado. Boa! 🔥`, "bot");
  };

  const handleEndSet = async () => {
    if (!setStarted || exerciseComplete) return;
    const end = getBrazilDate();
    const startedAt = setStartAt || end;
    const durationSeconds = Math.max(0, Math.round((end - startedAt) / 1000));
    const timing = {
      setNumber: ((setTimingsByExercise[indiceAtual] && setTimingsByExercise[indiceAtual].length) || 0) + 1,
      startedAt,
      endedAt: end,
      durationSeconds,
    };
    if (elapsedIntervalRef.current) { clearInterval(elapsedIntervalRef.current); elapsedIntervalRef.current = null; }
    setSetStarted(false); setSetStartAt(null); setElapsedSeconds(0);

    const prevForExercise = (setTimingsByExercise[indiceAtual] && Array.isArray(setTimingsByExercise[indiceAtual])) ? setTimingsByExercise[indiceAtual] : [];
    const updatedLen = prevForExercise.length + 1;

    setSetTimingsByExercise(prev => {
      const copy = prev.map(arr => (Array.isArray(arr) ? [...arr] : []));
      if (!Array.isArray(copy[indiceAtual])) copy[indiceAtual] = [];
      copy[indiceAtual] = [...(copy[indiceAtual] || []), timing];
      return copy;
    });

    // Buscar anúncio para exibir após finalizar o set
    let anuncioComponent = <AdTreinAI tema={tema} user={user} />;
    try {
      const response = await api.post(`/anuncios?quantidade=${1}&country=${user?.perfil?.country}&state=${user?.perfil?.state}&city=${user?.perfil?.city}`, {
        anunciosVisualizados: anunciosJaVistos // array de anúncios que já vi
      });

      console.log('payload: ', { quantidade: 1, country: user?.perfil?.country, state: user?.perfil?.state, city: user?.perfil?.city, anuncios: anunciosJaVistos })
      console.log(response)

      if (response.data && response.data.success && response.data.anuncios && response.data.anuncios.length > 0) {
        const anuncioData = response.data.anuncios[0];

        // Armazenar o _id do anúncio visualizado para evitar repetição
        if (anuncioData._id && !anunciosJaVistos.includes(anuncioData._id)) {
          setAnunciosJaVistos(prev => [...prev, anuncioData._id]);
        }

        anuncioComponent = <AdTreinAI tema={tema} user={user} anuncioData={anuncioData} />;
      }
    } catch (error) {
      console.error('Erro ao buscar anúncio:', error);
      // Usar componente padrão em caso de erro
    }

    if (updatedLen >= setsRequired) {
      setCurrentSetIndex(setsRequired);
      setExerciseComplete(true);
      adicionarMensagem(`Set ${timing.setNumber} finalizado — último set concluído ✅`, "bot");
      adicionarMensagem(anuncioComponent, "bot");
    } else {
      setCurrentSetIndex(updatedLen);
      adicionarMensagem(`Set ${timing.setNumber} finalizado — descanse e quando pronto comece o próximo.`, "bot");
      adicionarMensagem(anuncioComponent, "bot");
    }
  };

  // próximo exercício
  const handleProximo = () => {
    // Verificar se o treino já foi finalizado ou está sendo finalizado
    if (treinoFinalizado || finalizandoTreino) {
      return;
    }

    const treino = treinosDisponiveis[treinoIndex] || treinosDisponiveis[0];
    const exercicios = treino.exercicios || [];
    if (!exerciseComplete) {
      adicionarMensagem("Você precisa terminar todos os sets antes de avançar. Finalize os sets.", "bot");
      return;
    }

    if (indiceAtual < exercicios.length - 1) {
      const next = indiceAtual + 1;
      setExercicioExibido(false);
      adicionarMensagem("Excelente! Próximo exercício chegando...", "bot");
      setTimeout(() => exibirExercicio(next), 700);
    } else {
      // Finalizar treino - definir estado de loading
      setFinalizandoTreino(true);

      try {
        // finalizou treino -> monta registro
        const perExercise = (treino.exercicios || []).map((ex, idx) => {
          const arr = setTimingsByExercise[idx] || [];
          const sum = arr.reduce((s, t) => s + (t.durationSeconds || 0), 0);
          return { nome: ex.nome, sum, sets: arr };
        });
        const total = perExercise.reduce((s, e) => s + e.sum, 0);
        setDuracaoTotal(total);

        const detalhes = (
          <div className="text-left">
            <div className="font-semibold mb-2">🎉 Parabéns! Você finalizou o treino.</div>
            <div className="mb-2">Tempo total: <strong>{formatSeconds(total)}</strong></div>
            <div className="text-xs">
              {perExercise.map((p, i) => (
                <div key={i} className="mb-1">
                  <div className="font-medium">{p.nome} — {formatSeconds(p.sum)}</div>
                  <div className="text-xs">{p.sets.map((s, j) => <div key={j}>Set {s.setNumber}: {formatSeconds(s.durationSeconds)}</div>)}</div>
                </div>
              ))}
            </div>
          </div>
        );
        adicionarMensagem(detalhes, "bot");
        setExercicioExibido(false);

        const registro = {
          treinoId: treino.treinoId || treino._id || `treino-${treinoIndex}`,
          treinoName: treino.treinoName || `Treino ${treinoIndex}`,
          dataExecucao: new Date(),
          duracao: total,
          exerciciosFeitos: perExercise.map((p, idx) => ({
            exercicioId: treino.exercicios[idx]?.id || `ex-${idx}`,
            nome: p.nome,
            seriesConcluidas: (p.sets || []).length,
            tempoTotalExercicio: p.sum,
            sets: p.sets,
          })),
        };

        registrarTreinoHistorico(registro);
        setLastRegistro(registro);
        setSummaryOpen(true);
        setTreinoFinalizado(true);

        // Aguardar um pouco antes de resetar o estado de loading
        setTimeout(() => {
          setFinalizandoTreino(false);
        }, 1000);

      } catch (error) {
        console.error("Erro ao finalizar treino:", error);
        setFinalizandoTreino(false);
        showError("Erro ao finalizar treino. Tente novamente.");
      }
    }
  };

  // enviar mensagem pra IA com placeholder de "digitando"
  const handleEnviarMensagem = async () => {
    if (!inputValue.trim()) return;
    const text = inputValue.trim();
    adicionarMensagem(text, "user");
    setInputValue("");

    // cria placeholder de "digitando"
    const typingId = `typing-${getBrazilDate()}-${Math.random()}`;
    typingRef.current = typingId;
    setMensagens(prev => [...prev, { id: typingId, conteudo: <TypingDots />, tipo: 'bot', _typing: true }]);

    try {
      const res = await api.post('/conversar', { email: user.email, input: text, historico, treino: treinoAtual });
      const data = await res.data;
      // remove placeholder
      setMensagens(prev => prev.filter(m => m.id !== typingId));
      typingRef.current = null;

      if (res.status !== 200 || data?.success === false) {
        showError(data?.msg ? data?.msg : 'Erro ao enviar mensagem.')
      }

      if (data?.res) {
        adicionarMensagem(data.res, "bot");
      } else if (data?.message) {
        adicionarMensagem(data.message, "bot");
      } else {
        adicionarMensagem("Sem resposta da IA.", "bot");
      }
    } catch (err) {
      console.error("Erro ao conversar com a IA:", err);
      // remove placeholder
      setMensagens(prev => prev.filter(m => m.id !== typingId));
      typingRef.current = null;
      adicionarMensagem("Ocorreu um erro ao tentar enviar a mensagem. 😅", "bot");
      showError(err?.response?.data?.msg ? err?.response?.data?.msg : 'Erro ao enviar mensagem.')
    }
  };

  function formatSeconds(s) {
    if (!s && s !== 0) return "00:00";
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  // progresso
  const totalExercicios = treinoAtual?.exercicios?.length || exerciciosMock.length;
  const progresso = ((indiceAtual + (exerciseComplete ? 1 : 0)) / totalExercicios) * 100;
  const currentEx = treinoAtual?.exercicios?.[indiceAtual] || exerciciosMock[0];

  // RENDER
  return (
    <div className={`flex w-full flex-col rounded-2xl shadow-md transition-colors duration-300 p-4 ${isDark ? "bg-gray-900 text-white" : "bg-white text-black"}`}>
      {/* Antes de iniciar: se jaFezHoje === true mostra tela informativa */}
      {!treinoIniciado && jaFezHoje ? (
        <div className="flex flex-col items-center justify-center text-center p-6 gap-4">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-400 text-black text-sm font-semibold">Já feito hoje</div>
          <h2 className="text-2xl font-bold">Você já realizou este treino hoje</h2>

          {typeof jaFezHojeCount === "number" && jaFezHojeCount > 0 && (
            <div className="text-sm text-gray-400">Você já fez este treino <strong>{jaFezHojeCount}x</strong> hoje.</div>
          )}

          {ultimoRegistroDoMesmoTreino && (
            <div className="text-sm text-gray-400">
              Última execução: {new Date(ultimoRegistroDoMesmoTreino.dataExecucao || ultimoRegistroDoMesmoTreino.createdAt || ultimoRegistroDoMesmoTreino.data).toLocaleString()}
              <div>Tempo: {formatSeconds(ultimoRegistroDoMesmoTreino.duracao || 0)}</div>
            </div>
          )}

          <div className="flex gap-3 mt-4 flex-col sm:flex-row">
            <button
              onClick={() => { setLastRegistro(ultimoRegistroDoMesmoTreino); setSummaryOpen(true); }}
              className="px-6 py-3 rounded-2xl bg-gray-200 text-black hover:bg-gray-300 w-full sm:w-auto"
            >
              Ver resumo
            </button>
            <button
              onClick={() => navigate('/dashboard/meus-treinos')}
              className="px-6 py-3 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 w-full sm:w-auto"
            >
              Meus treinos
            </button>
          </div>
        </div>
      ) : null}

      {/* Se não iniciou e não fez hoje -> tela normal de iniciar */}
      {!treinoIniciado && !jaFezHoje && (
        <div className="min-h-[400px] sm:min-h-[480px] md:min-h-[600px] flex flex-col items-center justify-center text-center p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">{treinoAtual?.treinoName}</h2>
          {treinoAtual?.descricao && <p className="text-sm text-gray-500 mb-4">{treinoAtual.descricao}</p>}
          <p className="mb-4 text-sm">Próximo treino determinado pelo seu histórico.</p>
          <button onClick={iniciarTreino} className="bg-blue-600 hover:bg-blue-700 mb-2 text-white font-semibold px-6 py-3 rounded-2xl shadow-md transition-all">Iniciar Treino</button>
          <button onClick={() => navigate('/dashboard/meus-treinos')} className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-3 rounded-2xl shadow-md transition-all">Gerenciar Treinos</button>
        </div>
      )}

      {/* Se já iniciou, mostra o fluxo do treino */}
      {treinoIniciado && !treinoFinalizado && (
        <>
          {/* header + progresso */}
          <div className="mb-3 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold truncate">{treinoAtual?.treinoName}</h3>
                {treinoAtual?.criadoEm && <p className="text-sm text-gray-500">Criado em: {new Date(treinoAtual.criadoEm).toLocaleString()}</p>}
              </div>
            </div>

            <div className="w-full">
              <div className="w-full h-3 rounded-full bg-gray-300 overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${progresso}%` }} transition={{ duration: 0.45 }} className="h-3 bg-blue-600" />
              </div>
              <p className="text-xs mt-1">{Math.round(progresso)}% concluído</p>
            </div>
          </div>

          {/* mensagens (chat + exibição) */}
          <div ref={mensagensContainerRef} className="flex flex-col gap-3 max-h-[80vh] overflow-y-auto mb-4 px-1">
            <AnimatePresence>
              {mensagens.map((msg) => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.25 }} className={`p-2 sm:p-3 rounded-2xl shadow-md ${msg.tipo === "bot" ? (isDark ? "bg-gray-800 text-gray-100 rounded-bl-none self-start" : "bg-gray-100 text-black rounded-bl-none self-start") : "bg-blue-600 text-white rounded-br-none self-end"} max-w-[90%] sm:max-w-[85%] md:max-w-[80%] text-xs sm:text-sm`}>
                  {msg.conteudo}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={mensagensEndRef} />
          </div>

          {/* controles específicos do exercício */}
          <div className="p-2 sm:p-3 rounded-xl mb-2 bg-gray-50/5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
              <div className="text-sm font-medium truncate flex-1">{currentEx.nome}</div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className={`px-2 sm:px-3 py-1 rounded-full text-xs ${isDark ? "bg-gray-700 text-gray-100" : "bg-gray-200 text-gray-800"}`}>Sets: {setsRequired}</div>
                <div className="text-xs sm:text-sm text-gray-400">Set atual: {Math.min(currentSetIndex + 1, setsRequired)}</div>
                <div className="text-xs sm:text-sm">Timer: <strong>{formatSeconds(elapsedSeconds)}</strong></div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="flex gap-2 flex-1">
                <button onClick={handleStartSet} className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 rounded-xl text-xs ${isDark ? "bg-green-600 hover:bg-green-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"} ${setStarted ? "opacity-70 pointer-events-none" : ""}`}>Iniciar set</button>
                <button onClick={handleEndSet} className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 rounded-xl text-xs ${isDark ? "bg-yellow-500 hover:bg-yellow-600 text-black" : "bg-yellow-500 hover:bg-yellow-600 text-black"} ${!setStarted ? "opacity-60 pointer-events-none" : ""}`}>Terminar set</button>
              </div>

              <button onClick={handleProximo} disabled={finalizandoTreino} className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs ${exerciseComplete && !finalizandoTreino ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-400 text-white opacity-60 pointer-events-none"}`}>{finalizandoTreino ? "Finalizando..." : (indiceAtual < totalExercicios - 1 ? "Próximo Exercício" : "Finalizar Treino")}</button>
            </div>

            {(setTimingsByExercise[indiceAtual] && setTimingsByExercise[indiceAtual].length > 0) && (
              <div className="mt-3 text-xs text-gray-400">
                {setTimingsByExercise[indiceAtual].map((t, i) => (
                  <div key={i}>Set {t.setNumber}: {formatSeconds(t.durationSeconds)}</div>
                ))}
              </div>
            )}
          </div>

          {/* campo e botões */}
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <input type="text" placeholder="Pergunte alguma coisa" value={inputValue} onChange={(e) => setInputValue(e.target.value)} className={`flex-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border outline-none text-xs sm:text-sm ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-100 border-gray-300 text-black"}`} />
            <button onClick={handleEnviarMensagem} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 sm:py-2 rounded-xl transition-colors flex items-center justify-center min-h-[36px]"><FaLocationArrow className="text-xs sm:text-sm" /></button>
          </div>
        </>
      )}

      {/* Feedback visual após finalização */}
      {treinoFinalizado && !summaryOpen && (
        <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-6">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold mb-2 text-green-600">Treino Finalizado!</h2>
          <p className="text-gray-600 mb-6">Parabéns! Você completou seu treino com sucesso.</p>
          <div className="flex gap-3 flex-col sm:flex-row">
            <button
              onClick={() => setSummaryOpen(true)}
              className="px-6 py-3 rounded-2xl bg-blue-600 text-white hover:bg-blue-700"
            >
              Ver Resumo
            </button>
            <button
              onClick={resetarTreino}
              className="px-6 py-3 rounded-2xl bg-gray-200 text-black hover:bg-gray-300"
            >
              Novo Treino
            </button>
          </div>
        </div>
      )}

      {user && user.planInfos && user.planInfos.planType && user.planInfos.planType === "free" && <AdBanner tema={tema} user={user} showPlaceholder={true} className="rounded-2xl mt-5 h-1/5" />}

      <SummaryOverlay
        open={summaryOpen}
        tema={tema}
        onClose={() => {
          setSummaryOpen(false);
          window.location.reload();
          resetarTreino();
        }}
        registro={lastRegistro}
        onSave={registrarTreinoHistorico}
        userHistorico={user?.historico || []}
      />
    </div>
  );
};

export default ChatTreino;
