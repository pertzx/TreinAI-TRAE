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
  
  // Erros de CSRF
  'CSRF_TOKEN_INVALID': 'Token de segurança inválido. Tente novamente',
  'CSRF_TOKEN_EXPIRED': 'Token de segurança expirado. Recarregue a página',
  
  // Erros de rate limiting
  'RATE_LIMIT_EXCEEDED': 'Muitas tentativas. Aguarde alguns minutos',
  'TOO_MANY_REQUESTS': 'Limite de requisições excedido',
  
  // Erros de validação
  'VALIDATION_ERROR': 'Dados inválidos fornecidos',
  'REQUIRED_FIELD': 'Campo obrigatório não preenchido',
  'INVALID_EMAIL': 'Email inválido',
  'WEAK_PASSWORD': 'Senha muito fraca',
  
  // Erros de servidor
  'INTERNAL_SERVER_ERROR': 'Erro interno do servidor. Tente novamente',
  'SERVICE_UNAVAILABLE': 'Serviço temporariamente indisponível',
  'NETWORK_ERROR': 'Erro de conexão. Verifique sua internet',
  
  // Erros de usuário
  'USER_NOT_FOUND': 'Usuário não encontrado',
  'USER_ALREADY_EXISTS': 'Este email já está cadastrado',
  'ACCOUNT_SUSPENDED': 'Conta suspensa. Entre em contato com o suporte',
  
  // Erro padrão
  'UNKNOWN_ERROR': 'Ocorreu um erro inesperado. Tente novamente'
};

/**
 * Extrai mensagem de erro amigável de uma resposta de erro
 * @param {Error} error - Objeto de erro do axios ou similar
 * @returns {string} Mensagem de erro amigável
 */
export const getErrorMessage = (error) => {
  // Erro de rede
  if (!error.response) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }

  const { status, data } = error.response;
  
  // Verifica se há código de erro específico
  if (data?.code && ERROR_MESSAGES[data.code]) {
    return ERROR_MESSAGES[data.code];
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
  
  // Mapeia por status HTTP
  switch (status) {
    case 400:
      return 'Dados inválidos fornecidos';
    case 401:
      return ERROR_MESSAGES.UNAUTHORIZED;
    case 403:
      return 'Acesso negado';
    case 404:
      return 'Recurso não encontrado';
    case 429:
      return ERROR_MESSAGES.RATE_LIMIT_EXCEEDED;
    case 500:
      return ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
    case 503:
      return ERROR_MESSAGES.SERVICE_UNAVAILABLE;
    default:
      return ERROR_MESSAGES.UNKNOWN_ERROR;
  }
};

/**
 * Manipula erros de forma consistente
 * @param {Error} error - Objeto de erro
 * @param {Function} setError - Função para definir estado de erro
 * @param {Function} onError - Callback opcional para tratamento adicional
 */
export const handleError = (error, setError, onError) => {
  const message = getErrorMessage(error);
  
  if (setError) {
    setError(message);
  }
  
  if (onError) {
    onError(error, message);
  }
  
  // Log do erro para debugging
  console.error('Error handled:', {
    message,
    status: error.response?.status,
    data: error.response?.data,
    originalError: error
  });
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
         code === 'UNAUTHORIZED';
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
         (code === 'CSRF_TOKEN_INVALID' || code === 'CSRF_TOKEN_EXPIRED');
};