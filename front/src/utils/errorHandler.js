/**
 * Utilitário para tratamento centralizado de erros
 */

/**
 * Mapeia códigos de erro do backend para mensagens amigáveis
 */
const ERROR_MESSAGES = {
  // Erros de autenticação
  'INVALID_CREDENTIALS': 'Email ou senha incorretos',
  'TOKEN_EXPIRED': 'Sua sessão expirou. Faça login novamente',
  'TOKEN_INVALID': 'Token de acesso inválido',
  'UNAUTHORIZED': 'Acesso não autorizado',
  'LOGIN_FAILED': 'Falha no login. Verifique suas credenciais',
  'SIGNUP_FAILED': 'Falha no cadastro. Tente novamente',
  
  // Erros de CSRF
  'CSRF_TOKEN_INVALID': 'Token de segurança inválido. Tente novamente',
  'CSRF_TOKEN_EXPIRED': 'Token de segurança expirado. Recarregue a página',
  'CSRF_MISSING': 'Token de segurança não encontrado. Recarregue a página',
  
  // Erros de rate limiting
  'RATE_LIMIT_EXCEEDED': 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente',
  'TOO_MANY_REQUESTS': 'Limite de requisições excedido. Tente novamente em alguns minutos',
  'LOGIN_ATTEMPTS_EXCEEDED': 'Muitas tentativas de login. Aguarde 15 minutos',
  
  // Erros de validação
  'VALIDATION_ERROR': 'Dados inválidos fornecidos',
  'REQUIRED_FIELD': 'Campo obrigatório não preenchido',
  'INVALID_EMAIL': 'Formato de email inválido',
  'WEAK_PASSWORD': 'Senha deve ter pelo menos 8 caracteres, incluindo letras e números',
  'PASSWORD_MISMATCH': 'As senhas não conferem',
  'EMAIL_ALREADY_EXISTS': 'Este email já está cadastrado',
  
  // Erros de servidor
  'INTERNAL_SERVER_ERROR': 'Erro interno do servidor. Nossa equipe foi notificada',
  'SERVICE_UNAVAILABLE': 'Serviço temporariamente indisponível. Tente novamente em alguns minutos',
  'NETWORK_ERROR': 'Erro de conexão. Verifique sua conexão com a internet',
  'TIMEOUT_ERROR': 'Tempo limite excedido. Verifique sua conexão',
  'DATABASE_ERROR': 'Erro no banco de dados. Tente novamente',
  
  // Erros de usuário
  'USER_NOT_FOUND': 'Usuário não encontrado',
  'USER_ALREADY_EXISTS': 'Este email já está cadastrado',
  'ACCOUNT_SUSPENDED': 'Conta suspensa. Entre em contato com o suporte',
  'ACCOUNT_NOT_VERIFIED': 'Conta não verificada. Verifique seu email',
  'SUBSCRIPTION_EXPIRED': 'Sua assinatura expirou. Renove para continuar',
  
  // Erros de pagamento
  'PAYMENT_FAILED': 'Falha no pagamento. Verifique seus dados',
  'CARD_DECLINED': 'Cartão recusado. Tente outro método de pagamento',
  'INSUFFICIENT_FUNDS': 'Saldo insuficiente',
  
  // Erro padrão
  'UNKNOWN_ERROR': 'Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte'
};

/**
 * Contextos específicos para diferentes operações
 */
const CONTEXT_MESSAGES = {
  login: {
    network: 'Não foi possível conectar ao servidor. Verifique sua internet e tente fazer login novamente',
    timeout: 'Login demorou muito para responder. Tente novamente',
    server: 'Erro no servidor durante o login. Tente novamente em alguns minutos'
  },
  signup: {
    network: 'Não foi possível conectar ao servidor. Verifique sua internet e tente se cadastrar novamente',
    timeout: 'Cadastro demorou muito para responder. Tente novamente',
    server: 'Erro no servidor durante o cadastro. Tente novamente em alguns minutos'
  },
  dashboard: {
    network: 'Não foi possível carregar o dashboard. Verifique sua conexão',
    timeout: 'Dashboard demorou muito para carregar. Recarregue a página',
    server: 'Erro ao carregar dados do dashboard'
  },
  api: {
    network: 'Erro de conexão com a API. Verifique sua internet',
    timeout: 'Requisição demorou muito para responder',
    server: 'Erro interno da API'
  }
};

/**
 * Extrai mensagem de erro amigável de uma resposta de erro
 * @param {Error} error - Objeto de erro do axios ou similar
 * @param {string} context - Contexto da operação (login, signup, dashboard, etc.)
 * @returns {string} Mensagem de erro amigável
 */
export const getErrorMessage = (error, context = 'api') => {
  // Erro de rede
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return CONTEXT_MESSAGES[context]?.timeout || ERROR_MESSAGES.TIMEOUT_ERROR;
    }
    return CONTEXT_MESSAGES[context]?.network || ERROR_MESSAGES.NETWORK_ERROR;
  }

  const { status, data } = error.response;
  
  // Verifica se há código de erro específico
  if (data?.code && ERROR_MESSAGES[data.code]) {
    return ERROR_MESSAGES[data.code];
  }
  
  // Processa array de erros de validação
  if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
    // Retorna as mensagens de erro formatadas
    const errorMessages = data.errors.map(err => {
      // Se o erro tem um código conhecido, usa a mensagem amigável
      if (err.code && ERROR_MESSAGES[err.code]) {
        return ERROR_MESSAGES[err.code];
      }
      return err.message || err.msg || 'Erro de validação';
    }).join('; ');
    return errorMessages;
  }
  
  // Verifica se há mensagem de erro do servidor
  if (data?.message) {
    return data.message;
  }
  
  if (data?.msg) {
    return data.msg;
  }
  
  if (data?.error) {
    return data.error;
  }
  
  // Mapeia por status HTTP com contexto
  switch (status) {
    case 400:
      return 'Dados inválidos fornecidos. Verifique as informações e tente novamente';
    case 401:
      return context === 'login' ? 'Email ou senha incorretos' : ERROR_MESSAGES.UNAUTHORIZED;
    case 403:
      return 'Acesso negado. Você não tem permissão para esta operação';
    case 404:
      return 'Recurso não encontrado. A página ou dados solicitados não existem';
    case 409:
      return 'Conflito de dados. Este recurso já existe';
    case 422:
      return 'Dados inválidos. Verifique as informações fornecidas';
    case 429:
      return ERROR_MESSAGES.RATE_LIMIT_EXCEEDED;
    case 500:
      return CONTEXT_MESSAGES[context]?.server || ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
    case 502:
      return 'Servidor temporariamente indisponível. Tente novamente';
    case 503:
      return ERROR_MESSAGES.SERVICE_UNAVAILABLE;
    case 504:
      return 'Tempo limite do servidor excedido. Tente novamente';
    default:
      return ERROR_MESSAGES.UNKNOWN_ERROR;
  }
};

/**
 * Manipula erros de forma consistente
 * @param {Error} error - Objeto de erro
 * @param {Function} showError - Função para exibir erro (toast)
 * @param {string} context - Contexto da operação
 * @param {Function} onError - Callback opcional para tratamento adicional
 */
export const handleError = (error, showError, context = 'api', onError) => {
  const message = getErrorMessage(error, context);
  
  if (showError) {
    showError(message);
  }
  
  if (onError) {
    onError(error, message);
  }
  
  // Log estruturado do erro para debugging
  console.error(`[${context.toUpperCase()}] Error handled:`, {
    message,
    context,
    status: error.response?.status,
    code: error.response?.data?.code,
    data: error.response?.data,
    url: error.config?.url,
    method: error.config?.method,
    timestamp: new Date().toISOString(),
    originalError: error
  });
  
  return message;
};

/**
 * Limpa mensagens de erro após um tempo
 * @param {Function} setError - Função para limpar erro
 * @param {number} delay - Delay em ms (padrão: 5000)
 */
export const clearErrorAfterDelay = (setError, delay = 5000) => {
  setTimeout(() => {
    setError(null);
  }, delay);
};

/**
 * Verifica se um erro é relacionado à autenticação
 * @param {Error} error - Objeto de erro
 * @returns {boolean}
 */
export const isAuthError = (error) => {
  const status = error.response?.status;
  const code = error.response?.data?.code;
  
  return status === 401 || 
         code === 'TOKEN_EXPIRED' || 
         code === 'TOKEN_INVALID' || 
         code === 'UNAUTHORIZED' ||
         code === 'LOGIN_FAILED';
};

/**
 * Verifica se um erro é relacionado ao CSRF
 * @param {Error} error - Objeto de erro
 * @returns {boolean}
 */
export const isCSRFError = (error) => {
  const status = error.response?.status;
  const code = error.response?.data?.code;
  
  return status === 403 && 
         (code === 'CSRF_TOKEN_INVALID' || 
          code === 'CSRF_TOKEN_EXPIRED' ||
          code === 'CSRF_MISSING');
};

/**
 * Verifica se um erro é temporário e pode ser tentado novamente
 * @param {Error} error - Objeto de erro
 * @returns {boolean}
 */
export const isRetryableError = (error) => {
  const status = error.response?.status;
  const code = error.response?.data?.code;
  
  // Erros de rede são sempre retryable
  if (!error.response) {
    return true;
  }
  
  // Status codes que indicam problemas temporários
  const retryableStatuses = [408, 429, 500, 502, 503, 504];
  
  // Códigos específicos que são retryable
  const retryableCodes = [
    'TIMEOUT_ERROR',
    'NETWORK_ERROR', 
    'SERVICE_UNAVAILABLE',
    'INTERNAL_SERVER_ERROR',
    'RATE_LIMIT_EXCEEDED'
  ];
  
  return retryableStatuses.includes(status) || retryableCodes.includes(code);
};

/**
 * Obtém o delay recomendado para retry baseado no tipo de erro
 * @param {Error} error - Objeto de erro
 * @param {number} attempt - Número da tentativa (começando em 1)
 * @returns {number} Delay em milissegundos
 */
export const getRetryDelay = (error, attempt = 1) => {
  const status = error.response?.status;
  const code = error.response?.data?.code;
  
  // Rate limiting - delay maior
  if (status === 429 || code === 'RATE_LIMIT_EXCEEDED') {
    return Math.min(30000, 5000 * attempt); // 5s, 10s, 15s, max 30s
  }
  
  // Erros de servidor - backoff exponencial
  if (status >= 500) {
    return Math.min(10000, 1000 * Math.pow(2, attempt - 1)); // 1s, 2s, 4s, 8s, max 10s
  }
  
  // Erros de rede - backoff linear
  if (!error.response) {
    return Math.min(5000, 1000 * attempt); // 1s, 2s, 3s, 4s, max 5s
  }
  
  // Default
  return 1000 * attempt;
};