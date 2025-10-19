/**
 * Utilitário de agendamento nativo para substituir node-cron
 * Implementação simples e eficiente usando setTimeout e setInterval
 */

class NativeCron {
  constructor() {
    this.jobs = new Map();
    this.jobCounter = 0;
  }

  /**
   * Agenda uma tarefa para execução baseada em expressão cron simplificada
   * @param {string} cronExpression - Expressão cron (formato: 'minuto hora dia mês dia_semana')
   * @param {Function} task - Função a ser executada
   * @param {Object} options - Opções de configuração
   * @returns {string} ID do job
   */
  schedule(cronExpression, task, options = {}) {
    const jobId = `job_${++this.jobCounter}`;
    
    // Parse da expressão cron
    const cronParts = this.parseCronExpression(cronExpression);
    if (!cronParts) {
      throw new Error(`Expressão cron inválida: ${cronExpression}`);
    }

    const job = {
      id: jobId,
      cronExpression,
      task,
      options: {
        scheduled: options.scheduled !== false,
        timezone: options.timezone || 'America/Sao_Paulo',
        ...options
      },
      cronParts,
      intervalId: null,
      isRunning: false
    };

    this.jobs.set(jobId, job);

    if (job.options.scheduled) {
      this.startJob(jobId);
    }

    return jobId;
  }

  /**
   * Inicia um job específico
   * @param {string} jobId - ID do job
   */
  startJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job || job.isRunning) return;

    job.isRunning = true;
    
    // Calcular próxima execução
    const nextExecution = this.getNextExecutionTime(job.cronParts);
    const delay = nextExecution - Date.now();

    if (delay > 0) {
      job.timeoutId = setTimeout(() => {
        this.executeJob(jobId);
        this.scheduleNextExecution(jobId);
      }, delay);
    } else {
      // Se o tempo já passou, executar imediatamente e agendar próximo
      this.executeJob(jobId);
      this.scheduleNextExecution(jobId);
    }
  }

  /**
   * Para um job específico
   * @param {string} jobId - ID do job
   */
  stopJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    if (job.timeoutId) {
      clearTimeout(job.timeoutId);
      job.timeoutId = null;
    }

    if (job.intervalId) {
      clearInterval(job.intervalId);
      job.intervalId = null;
    }

    job.isRunning = false;
  }

  /**
   * Remove um job completamente
   * @param {string} jobId - ID do job
   */
  destroy(jobId) {
    this.stopJob(jobId);
    this.jobs.delete(jobId);
  }

  /**
   * Para todos os jobs
   */
  stopAll() {
    for (const jobId of this.jobs.keys()) {
      this.stopJob(jobId);
    }
  }

  /**
   * Remove todos os jobs
   */
  destroyAll() {
    this.stopAll();
    this.jobs.clear();
  }

  /**
   * Executa um job
   * @param {string} jobId - ID do job
   */
  async executeJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      console.log(`[CRON] Executando job ${jobId} - ${job.cronExpression}`);
      await job.task();
      console.log(`[CRON] Job ${jobId} executado com sucesso`);
    } catch (error) {
      console.error(`[CRON] Erro ao executar job ${jobId}:`, error);
    }
  }

  /**
   * Agenda a próxima execução de um job
   * @param {string} jobId - ID do job
   */
  scheduleNextExecution(jobId) {
    const job = this.jobs.get(jobId);
    if (!job || !job.isRunning) return;

    const nextExecution = this.getNextExecutionTime(job.cronParts);
    const delay = nextExecution - Date.now();

    job.timeoutId = setTimeout(() => {
      this.executeJob(jobId);
      this.scheduleNextExecution(jobId);
    }, delay);
  }

  /**
   * Parse de expressão cron simplificada
   * @param {string} cronExpression - Expressão cron
   * @returns {Object|null} Partes da expressão cron ou null se inválida
   */
  parseCronExpression(cronExpression) {
    // Suporte para expressões comuns
    const presets = {
      '@hourly': '0 * * * *',
      '@daily': '0 0 * * *',
      '@weekly': '0 0 * * 0',
      '@monthly': '0 0 1 * *',
      '@yearly': '0 0 1 1 *'
    };

    if (presets[cronExpression]) {
      cronExpression = presets[cronExpression];
    }

    const parts = cronExpression.split(' ');
    if (parts.length !== 5) return null;

    const [minute, hour, day, month, dayOfWeek] = parts;

    return {
      minute: this.parseCronField(minute, 0, 59),
      hour: this.parseCronField(hour, 0, 23),
      day: this.parseCronField(day, 1, 31),
      month: this.parseCronField(month, 1, 12),
      dayOfWeek: this.parseCronField(dayOfWeek, 0, 6)
    };
  }

  /**
   * Parse de um campo da expressão cron
   * @param {string} field - Campo da expressão
   * @param {number} min - Valor mínimo
   * @param {number} max - Valor máximo
   * @returns {Array|string} Array de valores ou '*'
   */
  parseCronField(field, min, max) {
    if (field === '*') return '*';

    // Suporte para intervalos (*/n)
    if (field.startsWith('*/')) {
      const interval = parseInt(field.substring(2));
      const values = [];
      for (let i = min; i <= max; i += interval) {
        values.push(i);
      }
      return values;
    }

    // Suporte para listas (1,2,3)
    if (field.includes(',')) {
      return field.split(',').map(v => parseInt(v.trim()));
    }

    // Suporte para ranges (1-5)
    if (field.includes('-')) {
      const [start, end] = field.split('-').map(v => parseInt(v.trim()));
      const values = [];
      for (let i = start; i <= end; i++) {
        values.push(i);
      }
      return values;
    }

    // Valor único
    return [parseInt(field)];
  }

  /**
   * Calcula o próximo tempo de execução
   * @param {Object} cronParts - Partes da expressão cron
   * @returns {number} Timestamp da próxima execução
   */
  getNextExecutionTime(cronParts) {
    const now = new Date();
    const next = new Date(now);
    
    // Adicionar 1 minuto para evitar execução imediata
    next.setMinutes(next.getMinutes() + 1);
    next.setSeconds(0);
    next.setMilliseconds(0);

    // Encontrar próximo minuto válido
    while (!this.matchesCronParts(next, cronParts)) {
      next.setMinutes(next.getMinutes() + 1);
      
      // Evitar loop infinito
      if (next.getTime() - now.getTime() > 366 * 24 * 60 * 60 * 1000) {
        throw new Error('Não foi possível encontrar próxima execução válida');
      }
    }

    return next.getTime();
  }

  /**
   * Verifica se uma data corresponde às partes do cron
   * @param {Date} date - Data a ser verificada
   * @param {Object} cronParts - Partes da expressão cron
   * @returns {boolean} True se corresponde
   */
  matchesCronParts(date, cronParts) {
    const minute = date.getMinutes();
    const hour = date.getHours();
    const day = date.getDate();
    const month = date.getMonth() + 1; // JavaScript months are 0-based
    const dayOfWeek = date.getDay();

    return (
      this.matchesCronField(minute, cronParts.minute) &&
      this.matchesCronField(hour, cronParts.hour) &&
      this.matchesCronField(day, cronParts.day) &&
      this.matchesCronField(month, cronParts.month) &&
      this.matchesCronField(dayOfWeek, cronParts.dayOfWeek)
    );
  }

  /**
   * Verifica se um valor corresponde a um campo do cron
   * @param {number} value - Valor a ser verificado
   * @param {Array|string} cronField - Campo do cron
   * @returns {boolean} True se corresponde
   */
  matchesCronField(value, cronField) {
    if (cronField === '*') return true;
    if (Array.isArray(cronField)) return cronField.includes(value);
    return false;
  }

  /**
   * Lista todos os jobs ativos
   * @returns {Array} Lista de jobs
   */
  listJobs() {
    return Array.from(this.jobs.values()).map(job => ({
      id: job.id,
      cronExpression: job.cronExpression,
      isRunning: job.isRunning,
      options: job.options
    }));
  }
}

// Instância global
const nativeCron = new NativeCron();

/**
 * Função de compatibilidade com node-cron
 * @param {string} cronExpression - Expressão cron
 * @param {Function} task - Tarefa a ser executada
 * @param {Object} options - Opções
 * @returns {Object} Objeto com métodos de controle
 */
export const schedule = (cronExpression, task, options = {}) => {
  const jobId = nativeCron.schedule(cronExpression, task, options);
  
  return {
    start: () => nativeCron.startJob(jobId),
    stop: () => nativeCron.stopJob(jobId),
    destroy: () => nativeCron.destroy(jobId),
    getStatus: () => {
      const job = nativeCron.jobs.get(jobId);
      return job ? job.isRunning : false;
    }
  };
};

/**
 * Para todos os jobs
 */
export const stopAll = () => {
  nativeCron.stopAll();
};

/**
 * Remove todos os jobs
 */
export const destroyAll = () => {
  nativeCron.destroyAll();
};

/**
 * Lista todos os jobs
 */
export const listJobs = () => {
  return nativeCron.listJobs();
};

// Exportar como objeto para compatibilidade com node-cron
export default {
  schedule,
  stopAll,
  destroyAll,
  listJobs
};