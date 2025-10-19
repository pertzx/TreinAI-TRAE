import nativeCron from '../utils/nativeCron.js';
import LocalToken from '../models/LocalToken.js';

// Função para limpar tokens expirados
const cleanupExpiredTokens = async () => {
  try {
    console.log('Iniciando limpeza de tokens expirados...');
    
    const result = await LocalToken.cleanExpiredTokens();
    
    if (result.deletedCount > 0) {
      console.log(`✅ Limpeza concluída: ${result.deletedCount} tokens expirados removidos`);
    } else {
      console.log('✅ Limpeza concluída: nenhum token expirado encontrado');
    }
    
    // Log estatísticas atuais
    const activeTokens = await LocalToken.countDocuments({ status: 'active' });
    const usedTokens = await LocalToken.countDocuments({ status: 'used' });
    
    console.log(`📊 Estatísticas atuais: ${activeTokens} tokens ativos, ${usedTokens} tokens usados`);
    
  } catch (error) {
    console.error('❌ Erro na limpeza de tokens expirados:', error);
  }
};

// Configurar cron job para executar a cada 6 horas
const startTokenCleanupJob = () => {
  // Executar a cada 6 horas (0 */6 * * *)
  const job = nativeCron.schedule('0 */6 * * *', cleanupExpiredTokens, {
    scheduled: true,
    timezone: 'America/Sao_Paulo'
  });
  
  console.log('🕒 Job de limpeza de tokens configurado para executar a cada 6 horas');
  
  // Executar uma limpeza inicial após 1 minuto
  setTimeout(cleanupExpiredTokens, 60000);
  
  return job;
};

// Função para executar limpeza manual (útil para testes)
const runManualCleanup = async () => {
  console.log('🧹 Executando limpeza manual de tokens...');
  await cleanupExpiredTokens();
};

export {
  startTokenCleanupJob,
  runManualCleanup,
  cleanupExpiredTokens
};