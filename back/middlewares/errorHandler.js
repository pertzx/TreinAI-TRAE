import multer from 'multer';

/**
 * Middleware centralizado para tratamento de erros
 * Especialmente otimizado para erros de upload e processamento
 */

/**
 * Mapeia códigos de erro para mensagens amigáveis
 */
const ERROR_MESSAGES = {
  // Erros do Multer
  'LIMIT_FILE_SIZE': 'Arquivo muito grande. Verifique o tamanho máximo permitido.',
  'LIMIT_FILE_COUNT': 'Muitos arquivos enviados. Envie apenas um arquivo por vez.',
  'LIMIT_FIELD_COUNT': 'Muitos campos no formulário.',
  'LIMIT_FIELD_KEY': 'Nome do campo muito longo.',
  'LIMIT_FIELD_VALUE': 'Valor do campo muito longo.',
  'LIMIT_PART_COUNT': 'Muitas partes no formulário.',
  'LIMIT_UNEXPECTED_FILE': 'Tipo de arquivo não permitido ou campo inesperado.',
  
  // Erros de processamento
  'PROCESSING_ERROR': 'Erro no processamento do arquivo.',
  'INVALID_FILE_SIGNATURE': 'Arquivo corrompido ou tipo não corresponde ao conteúdo.',
  'FILE_TOO_SMALL': 'Arquivo muito pequeno ou corrompido.',
  'VALIDATION_ERROR': 'Erro na validação do arquivo.',
  
  // Erros de armazenamento
  'CLOUDINARY_ERROR': 'Erro no serviço de armazenamento de arquivos.',
  'STORAGE_ERROR': 'Erro ao salvar o arquivo.',
  'DISK_SPACE_ERROR': 'Espaço em disco insuficiente.',
  
  // Erros de rede
  'NETWORK_ERROR': 'Erro de conexão. Tente novamente.',
  'TIMEOUT_ERROR': 'Tempo limite excedido. Tente novamente.',
  
  // Erros de autenticação/autorização
  'UNAUTHORIZED': 'Acesso não autorizado.',
  'FORBIDDEN': 'Operação não permitida.',
  'TOKEN_EXPIRED': 'Token de acesso expirado.',
  
  // Erros de validação
  'INVALID_INPUT': 'Dados de entrada inválidos.',
  'MISSING_REQUIRED_FIELD': 'Campo obrigatório não informado.',
  'INVALID_FORMAT': 'Formato de dados inválido.',
  
  // Erros de banco de dados
  'DATABASE_ERROR': 'Erro interno do servidor. Tente novamente.',
  'DUPLICATE_ENTRY': 'Registro já existe.',
  'NOT_FOUND': 'Recurso não encontrado.',
  
  // Erros gerais
  'INTERNAL_SERVER_ERROR': 'Erro interno do servidor.',
  'SERVICE_UNAVAILABLE': 'Serviço temporariamente indisponível.'
};

/**
 * Determina o código de status HTTP baseado no tipo de erro
 * @param {Error} error - Objeto de erro
 * @returns {number} - Código de status HTTP
 */
const getStatusCode = (error) => {
  // Se já tem status definido, usar
  if (error.status) return error.status;
  if (error.statusCode) return error.statusCode;
  
  // Mapear baseado no código do erro
  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      return 413; // Payload Too Large
    case 'LIMIT_UNEXPECTED_FILE':
    case 'INVALID_FILE_SIGNATURE':
    case 'FILE_TOO_SMALL':
    case 'VALIDATION_ERROR':
    case 'INVALID_INPUT':
    case 'MISSING_REQUIRED_FIELD':
    case 'INVALID_FORMAT':
      return 400; // Bad Request
    case 'UNAUTHORIZED':
    case 'TOKEN_EXPIRED':
      return 401; // Unauthorized
    case 'FORBIDDEN':
      return 403; // Forbidden
    case 'NOT_FOUND':
      return 404; // Not Found
    case 'DUPLICATE_ENTRY':
      return 409; // Conflict
    case 'TIMEOUT_ERROR':
      return 408; // Request Timeout
    case 'DISK_SPACE_ERROR':
      return 507; // Insufficient Storage
    case 'SERVICE_UNAVAILABLE':
      return 503; // Service Unavailable
    default:
      return 500; // Internal Server Error
  }
};

/**
 * Gera uma mensagem de erro amigável
 * @param {Error} error - Objeto de erro
 * @returns {string} - Mensagem amigável
 */
const getFriendlyMessage = (error) => {
  // Se é erro do Multer, usar mensagem específica
  if (error instanceof multer.MulterError) {
    return ERROR_MESSAGES[error.code] || error.message || 'Erro no upload do arquivo.';
  }
  
  // Se tem código conhecido, usar mensagem mapeada
  if (error.code && ERROR_MESSAGES[error.code]) {
    return ERROR_MESSAGES[error.code];
  }
  
  // Se tem mensagem personalizada, usar
  if (error.message && !error.message.includes('Error:')) {
    return error.message;
  }
  
  // Mensagem padrão baseada no status
  const status = getStatusCode(error);
  if (status >= 400 && status < 500) {
    return 'Erro na solicitação. Verifique os dados enviados.';
  } else if (status >= 500) {
    return 'Erro interno do servidor. Tente novamente mais tarde.';
  }
  
  return 'Erro desconhecido.';
};

/**
 * Determina se o erro deve ser logado como crítico
 * @param {Error} error - Objeto de erro
 * @returns {boolean} - True se for crítico
 */
const isCriticalError = (error) => {
  const status = getStatusCode(error);
  const criticalCodes = [
    'DATABASE_ERROR',
    'CLOUDINARY_ERROR',
    'STORAGE_ERROR',
    'DISK_SPACE_ERROR',
    'INTERNAL_SERVER_ERROR'
  ];
  
  return status >= 500 || criticalCodes.includes(error.code);
};

/**
 * Middleware principal de tratamento de erros
 */
export const errorHandler = (error, req, res, next) => {
  const timestamp = new Date().toISOString();
  const requestId = req.headers['x-request-id'] || req.id || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  
  // Informações do contexto
  const context = {
    timestamp,
    requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    userAgent,
    ip,
    userId: req.user?.id || 'anonymous'
  };
  
  // Determinar severidade e status
  const status = getStatusCode(error);
  const message = getFriendlyMessage(error);
  const critical = isCriticalError(error);
  
  // Log do erro
  const logData = {
    ...context,
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack,
      status
    }
  };
  
  if (critical) {
    console.error('[CRITICAL ERROR]', JSON.stringify(logData, null, 2));
  } else if (status >= 400 && status < 500) {
    console.warn('[CLIENT ERROR]', JSON.stringify(logData, null, 2));
  } else {
    console.error('[SERVER ERROR]', JSON.stringify(logData, null, 2));
  }
  
  // Resposta para o cliente
  const response = {
    success: false,
    error: {
      message,
      code: error.code || 'UNKNOWN_ERROR',
      timestamp,
      requestId
    }
  };
  
  // Em desenvolvimento, incluir mais detalhes
  if (process.env.NODE_ENV === 'development') {
    response.error.details = {
      originalMessage: error.message,
      stack: error.stack,
      context
    };
  }
  
  // Headers de segurança
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  });
  
  res.status(status).json(response);
};

/**
 * Middleware para capturar erros assíncronos
 * Wrapper para funções async que automaticamente passa erros para o errorHandler
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Middleware para tratar rotas não encontradas
 */
export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Rota não encontrada: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  error.code = 'NOT_FOUND';
  next(error);
};

/**
 * Middleware para validar se a resposta foi enviada
 * Evita o erro "Cannot set headers after they are sent"
 */
export const responseValidator = (req, res, next) => {
  const originalSend = res.send;
  const originalJson = res.json;
  
  res.send = function(data) {
    if (res.headersSent) {
      console.warn('[RESPONSE WARNING] Tentativa de enviar resposta após headers enviados:', {
        method: req.method,
        url: req.originalUrl,
        data: typeof data === 'string' ? data.substring(0, 100) : JSON.stringify(data).substring(0, 100)
      });
      return res;
    }
    return originalSend.call(this, data);
  };
  
  res.json = function(data) {
    if (res.headersSent) {
      console.warn('[RESPONSE WARNING] Tentativa de enviar JSON após headers enviados:', {
        method: req.method,
        url: req.originalUrl,
        data: JSON.stringify(data).substring(0, 100)
      });
      return res;
    }
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Cria um erro personalizado com código e status
 * @param {string} message - Mensagem do erro
 * @param {string} code - Código do erro
 * @param {number} status - Status HTTP
 * @returns {Error} - Erro personalizado
 */
export const createError = (message, code = 'CUSTOM_ERROR', status = 500) => {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
};

export default {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  responseValidator,
  createError,
  ERROR_MESSAGES
};