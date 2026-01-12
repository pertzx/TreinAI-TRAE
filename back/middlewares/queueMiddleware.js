import { requestQueue } from '../utils/RequestQueue.js';

/**
 * Middleware para enfileirar requisições por usuário.
 * Garante execução sequencial (FIFO) para evitar condições de corrida e gasto duplo de tokens.
 */
export const queueMiddleware = async (req, res, next) => {
  // Identificação do usuário (mesma lógica do checkTokenLimit)
  // Tenta pegar email do body, userEmail injetado, user.email do token ou IP como fallback
  const key = req.body?.email || req.userEmail || req.user?.email || req.ip;

  // Enfileira a execução do "resto" da requisição
  // O requestQueue.add vai aguardar as anteriores terminarem antes de rodar o callback.
  requestQueue.add(key, () => {
    return new Promise((resolve) => {
      // Quando a resposta terminar (sucesso ou erro), resolvemos a promessa,
      // liberando a fila para o próximo request deste usuário.
      
      // Timeout de segurança: se o controller travar, libera a fila após 5 minutos
      const timeout = setTimeout(() => {
        console.warn(`[QueueMiddleware] Timeout forçado para ${key} na rota ${req.originalUrl}`);
        resolve();
      }, 5 * 60 * 1000);

      const onFinish = () => {
        clearTimeout(timeout);
        resolve();
      };

      res.on('finish', onFinish);
      res.on('close', onFinish);

      // Continua para o próximo middleware/controller
      next();
    });
  });
};
