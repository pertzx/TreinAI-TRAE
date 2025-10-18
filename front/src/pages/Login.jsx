import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { useCSRF } from "../hooks/useCSRF";
import LoadingSpinner, { ButtonSpinner } from '../components/LoadingSpinner';
import { handleError, clearErrorAfterDelay, isAuthError } from '../utils/errorHandler';
import { useToast } from '../components/Toast';
import { authCookies } from '../utils/cookieUtils';
import api from '../Api.js';

function Login({ plano }) {
  const [mode, setMode] = useState("login"); // login ou signup
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const navigate = useNavigate();
  const { csrfToken, loading: csrfLoading, getValidToken, clearToken } = useCSRF();
  const { showError, showSuccess } = useToast();

  // Verificar se usuário já está autenticado
  useEffect(() => {
    const token = authCookies.getToken();
    if (token) {
      setIsAuthenticated(true);
      navigate("/dashboard");
    }
  }, [navigate]);

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // limpar estados anteriores
    setMsg(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const data = Object.fromEntries(form.entries());

    // Validação básica
    if (!data.email || !data.password) {
      showError("Preencha e-mail e senha.");
      setLoading(false);
      return;
    }

    if (mode === "signup") {
      if (data.password !== data.confirm) {
        showError("As senhas não conferem.");
        setLoading(false);
        return;
      }

      if (!agreedToTerms) {
        showError("Você deve concordar com a Política de Privacidade e Termos de Uso para criar uma conta.");
        setLoading(false);
        return;
      }
    }

    // Verificar se CSRF token está disponível
    if (csrfLoading) {
      showError("Aguarde, carregando token de segurança...");
      setLoading(false);
      return;
    }

    try {
      // Garantir que temos um token válido antes de fazer a requisição
      const validToken = await getValidToken();

      if (!validToken) {
        showError("Erro ao obter token de segurança. Recarregue a página.");
        setLoading(false);
        return;
      }

      const credentials = {
        email: data.email,
        password: data.password,
        name: data.name // Para signup
      };

      let response;

      if (mode === "login") {
        // Fazer requisição de login diretamente
        const { identificador, systemInfo, location } = await buildIdentifier({ geolocationTimeout: 20000 });

        response = await api.post('/login', {
          email: data.email,
          password: data.password,
          identificador,
          systemInfo,
          location
        });
      } else {
        // Fazer requisição de signup diretamente
        response = await api.post('/signup', {
          username: data.name,
          email: data.email,
          password: data.password
        });
      }

      console.log(response)

      if (response.status === 200 || response.data.msg === "Usuario criado com sucesso!") {
        // Armazenar token JWT em cookie seguro
        console.log('🔑 Token recebido do servidor:', response.data.token);
        authCookies.setToken(response.data.token);

        // Debug: verificar se o cookie foi definido
        setTimeout(() => {
          const savedToken = authCookies.getToken();
          console.log('🍪 Token salvo no cookie:', savedToken);
          if (savedToken) {
            console.log('✅ Cookie definido com sucesso!');
          } else {
            console.error('❌ Falha ao definir cookie!');
          }
        }, 100);

        showSuccess(response.data.message || `${mode === 'login' ? 'Login' : 'Cadastro'} realizado com sucesso!`);
        setIsAuthenticated(true);
        navigate("/dashboard");
      } else {
        showError(response.data.message || 'Erro na autenticação');
      }

      setLoading(false);
    } catch (err) {
      // Usar o sistema centralizado de tratamento de erros
      const errorMessage = handleError(err);
      showError(errorMessage);

      // Se for erro de autenticação, limpar tokens
      if (isAuthError(err)) {
        // Remover apenas tokens CSRF, JWT agora é gerenciado por cookies httpOnly
        clearToken();
      }

      setLoading(false);
    }
  };

  // Uso: const id = await buildIdentifier({ geolocationTimeout:20000 });
  async function buildIdentifier({ geolocationTimeout = 20000 } = {}) {
    const sanitize = s => String(s || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/[^A-Za-z0-9 .,_\-;:()]/g, '')
      .trim()
      .slice(0, 256);

    // --- Extrai apenas o trecho (<system-information>) do User-Agent ---
    function extractSystemInfo() {
      const ua = navigator.userAgent || 'unknown';
      const match = ua.match(/\(([^)]+)\)/);
      const systemInfo = match ? match[1] : ua;
      return sanitize(systemInfo);
    }

    // --- Obter localização (coordenadas lat/lon) ---
    async function getLocation(timeout) {
      const geoPromise = new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject('no-geo');
        const t = setTimeout(() => reject('timeout'), timeout);
        navigator.geolocation.getCurrentPosition(
          pos => { clearTimeout(t); resolve(pos); },
          err => { clearTimeout(t); reject(err); },
          { enableHighAccuracy: false, timeout }
        );
      });

      try {
        const pos = await geoPromise;
        return {
          lat: parseFloat(pos.coords.latitude.toFixed(6)),
          lon: parseFloat(pos.coords.longitude.toFixed(6))
        };
      } catch {
        return {
          lat: null,
          lon: null,
        };
      }
    }

    // --- Execução ---
    const [systemInfo, location] = await Promise.all([
      extractSystemInfo(),
      getLocation(geolocationTimeout)
    ]);

    return { identificador: `(${systemInfo})+(${location.lat}_${location.lon})`, systemInfo, location };
  }


  return (
    <div className="min-h-screen bg-[#10151e] flex items-center justify-center px-4">
      <div
        className="w-full max-w-md bg-[#1a1f2b] text-slate-200 rounded-2xl shadow-xl border border-slate-800 p-6 md:p-8 relative transition-all duration-300"
      >
        {window.history.state && window.history.state.idx > 0 && (
          <div
            onClick={() => {
              navigate(-1);
            }}
            className="absolute left-4 top-4 text-slate-400 hover:text-white text-sm flex items-center gap-1"
          >
            ← Voltar
          </div>
        )}

        <div className="flex items-center gap-2 mb-10 mt-6 select-none">
          <Logo scale={1} />
          <div onClick={() => {
            buildIdentifier().then(identifier => console.log(identifier))
            console.log(isWithinRadius(-3.399342, -44.364647, -3.3977973, -44.3628696, 0.4))
          }}>
            <h1 className="text-lg font-semibold leading-tight">TreinAI</h1>
            <p className="text-xs text-slate-400">Seu coach digital pessoal</p>
          </div>
        </div>

        <div className="grid grid-cols-2 mb-6 rounded-lg overflow-hidden border border-slate-800">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`py-2.5 text-sm font-medium transition ${mode === "login"
              ? "bg-blue-600 text-white"
              : "bg-transparent text-slate-300 hover:bg-white/5"
              }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`py-2.5 text-sm font-medium transition ${mode === "signup"
              ? "bg-blue-600 text-white"
              : "bg-transparent text-slate-300 hover:bg-white/5"
              }`}
          >
            Criar conta
          </button>
        </div>

        {/* Mensagens de erro / sucesso: garantir que msg seja string */}
        {/* {error && msg ? (
          <div className="text-yellow-300 text-sm mb-4">{String(msg)}</div>
        ) : error && !msg ? (
          <p className="text-red-500 text-sm mb-4">
            Erro ao {mode === "login" ? "entrar" : "criar conta"}. Verifique os
            dados e tente novamente.
          </p>
        ) : (
          // se não houver erro, mostrar espaço em branco (ou uma instrução)
          <div className="h-4 mb-4" />
        )} */}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label htmlFor="name" className="block text-sm mb-1 text-slate-300">
                Nome
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Seu nome"
                className="w-full rounded-lg bg-[#0f1420] border border-slate-700 text-slate-200 px-3 py-2 focus:ring-2 focus:ring-blue-600"
                autoComplete="name"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm mb-1 text-slate-300">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="voce@email.com"
              className="w-full rounded-lg bg-[#0f1420] border border-slate-700 text-slate-200 px-3 py-2 focus:ring-2 focus:ring-blue-600"
              autoComplete="email"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm mb-1 text-slate-300">
                Senha
              </label>
              {mode === "login" && (
                <a href="/recuperar" className="text-xs text-slate-400 hover:text-slate-200">
                  Esqueci minha senha
                </a>
              )}
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="w-full rounded-lg bg-[#0f1420] border border-slate-700 text-slate-200 px-3 py-2 focus:ring-2 focus:ring-blue-600"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </div>

          {mode === "signup" && (
            <div>
              <label htmlFor="confirm" className="block text-sm mb-1 text-slate-300">
                Confirmar senha
              </label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                required
                placeholder="••••••••"
                className="w-full rounded-lg bg-[#0f1420] border border-slate-700 text-slate-200 px-3 py-2 focus:ring-2 focus:ring-blue-600"
                autoComplete="new-password"
              />
            </div>
          )}

          {mode === "signup" && (
            <div className="flex items-start gap-3 p-4 bg-slate-800/30 rounded-lg border border-slate-700">
              <input
                id="terms-agreement"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-2 focus:ring-blue-600 focus:ring-offset-0 focus:ring-offset-slate-800"
                required
                aria-describedby="terms-description"
              />
              <div className="flex-1">
                <label htmlFor="terms-agreement" className="text-sm text-slate-300 leading-relaxed cursor-pointer">
                  Li e concordo com a{" "}
                  <a
                    href="/politica-de-privacidade"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:ring-offset-slate-800 rounded"
                    aria-label="Abrir Política de Privacidade em nova aba"
                  >
                    Política de Privacidade
                  </a>{" "}
                  e os{" "}
                  <a
                    href="/termos"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:ring-offset-slate-800 rounded"
                    aria-label="Abrir Termos de Uso em nova aba"
                  >
                    Termos de Uso
                  </a>{" "}
                  da plataforma.
                </label>
                <div id="terms-description" className="sr-only">
                  Campo obrigatório para criar uma conta. Você deve concordar com nossa Política de Privacidade e Termos de Uso.
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || csrfLoading || (mode === "signup" && !agreedToTerms)}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <ButtonSpinner />
                {mode === "login" ? "Entrando..." : "Criando conta..."}
              </>
            ) : (
              mode === "login" ? "Entrar" : "Criar conta"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-400">
            {mode === "login" ? "Não tem uma conta?" : "Já tem uma conta?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              {mode === "login" ? "Criar conta" : "Entrar"}
            </button>
          </p>
        </div>

        {plano && plano !== 'free' && (
          <div className="mt-4 p-3 bg-blue-600/20 border border-blue-600/30 rounded-lg">
            <p className="text-xs text-blue-300 text-center">
              Você selecionou o plano: <strong className="capitalize">{plano}</strong>
            </p>
          </div>
        )}

        {/* Loading overlay */}
        {(loading || csrfLoading) && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl">
            <LoadingSpinner />
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
