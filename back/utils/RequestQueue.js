/**
 * RequestQueue.js
 * Gerencia filas de promessas por chave (userId/email).
 * Garante que apenas uma tarefa seja executada por vez para cada chave.
 */
class RequestQueue {
  constructor() {
    this.queues = new Map();
  }

  /**
   * Adiciona uma tarefa à fila do usuário.
   * @param {string} key - Identificador único (userId ou email)
   * @param {Function} task - Função que retorna uma Promise
   * @returns {Promise} - Retorna a promise da tarefa
   */
  async add(key, task) {
    if (!key) {
        // Se não tem chave, executa direto (fallback)
        return task();
    }

    // Pega a promessa atual (ou cria uma resolvida)
    const previousPromise = this.queues.get(key) || Promise.resolve();

    // Cria a nova promessa que aguarda a anterior
    const currentPromise = previousPromise.then(async () => {
        try {
            await task();
        } catch (error) {
            console.error(`[RequestQueue] Erro na tarefa para ${key}:`, error);
            // Não relançamos o erro aqui para não quebrar a cadeia para os próximos,
            // mas o chamador original (middleware) já deve ter tratado sua resposta.
        }
    });

    // Atualiza a cabeça da fila
    this.queues.set(key, currentPromise);

    // Limpeza automática: se esta for a última tarefa, remove a entrada do Map
    // Usamos 'finally' para garantir que limpe mesmo com erro, mas precisamos
    // verificar se ainda somos a "cabeça" da fila.
    currentPromise.finally(() => {
        if (this.queues.get(key) === currentPromise) {
            this.queues.delete(key);
        }
    });

    return currentPromise;
  }
}

export const requestQueue = new RequestQueue();
