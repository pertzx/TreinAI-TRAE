import User from '../models/User.js';
import { getBrazilDate } from '../helpers/getBrazilDate.js';

// Limites de tokens por plano (tokens/dia)
const TOKEN_LIMITS = {
  free: 5000,
  pro: 20000,
  max: 40000,
  coach: 200000
};

/**
 * Middleware para verificar limite de tokens por plano
 * Deve ser usado antes das rotas que consomem IA
 */
export const checkTokenLimit = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Email é obrigatório para verificação de tokens' 
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        msg: 'Usuário não encontrado' 
      });
    }

    const planType = user.planInfos?.planType || 'free';
    const dailyLimit = TOKEN_LIMITS[planType];
    
    // Obter data atual no Brasil
    const todayMillis = getBrazilDate();
    
    // Verificar se getBrazilDate retornou um valor válido
    if (!todayMillis || typeof todayMillis !== 'number' || isNaN(todayMillis)) {
      console.error('getBrazilDate retornou valor inválido:', todayMillis);
      return res.status(500).json({ 
        msg: 'Erro interno do servidor ao verificar limite de tokens',
        error: 'Data inválida'
      });
    }
    
    const today = new Date(todayMillis);
    
    // Verificar se o objeto Date foi criado corretamente
    if (isNaN(today.getTime())) {
      console.error('Não foi possível criar Date válido com millis:', todayMillis);
      return res.status(500).json({ 
        msg: 'Erro interno do servidor ao verificar limite de tokens',
        error: 'Data inválida'
      });
    }
    
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // Calcular tokens usados hoje
    const tokensUsedToday = user.stats.tokens
      .filter(token => {
        const tokenDate = new Date(token.data);
        return tokenDate >= todayStart && tokenDate < todayEnd;
      })
      .reduce((total, token) => total + token.valor, 0);

    // Verificar se excedeu o limite
    if (tokensUsedToday >= dailyLimit) {
      return res.status(429).json({
        success: false,
        msg: `Limite diário de tokens excedido. Plano ${planType.toUpperCase()}: ${dailyLimit} tokens/dia`,
        data: {
          planType,
          dailyLimit,
          tokensUsedToday,
          tokensRemaining: 0
        }
      });
    }

    // Adicionar informações ao request para uso posterior
    req.tokenInfo = {
      planType,
      dailyLimit,
      tokensUsedToday,
      tokensRemaining: dailyLimit - tokensUsedToday,
      user
    };

    next();
  } catch (error) {
    console.error('Erro no middleware de verificação de tokens:', error);
    return res.status(500).json({
      success: false,
      msg: 'Erro interno do servidor ao verificar limite de tokens'
    });
  }
};

/**
 * Função para registrar uso de tokens após chamada da IA
 * @param {string} userEmail - Email do usuário
 * @param {number} tokensUsed - Quantidade de tokens consumidos
 */
export const registerTokenUsage = async (userEmail, tokensUsed) => {
  try {
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      console.error('Usuário não encontrado para registro de tokens:', userEmail);
      return;
    }

    // Obter data atual no Brasil
    const todayMillis = getBrazilDate();
    const today = new Date(todayMillis);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Verificar se já existe um registro para hoje
    const existingTokenIndex = user.stats.tokens.findIndex(token => {
      const tokenDate = new Date(token.data);
      return tokenDate >= todayStart && tokenDate < new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    });

    if (existingTokenIndex !== -1) {
      // Atualizar registro existente
      user.stats.tokens[existingTokenIndex].valor += tokensUsed;
    } else {
      // Criar novo registro
      user.stats.tokens.push({
        valor: tokensUsed,
        data: today
      });
    }

    await user.save();
    console.log(`Tokens registrados: ${tokensUsed} para ${userEmail}`);
  } catch (error) {
    console.error('Erro ao registrar uso de tokens:', error);
  }
};

// Função para obter estatísticas de tokens
export const getTokenStats = async (userEmail) => {
  try {
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return { error: 'Usuário não encontrado' };
    }

    const planType = user.planInfos?.planType || 'free';
    const dailyLimit = TOKEN_LIMITS[planType];
    
    // Obter data atual no Brasil
    const todayMillis = getBrazilDate();
    const today = new Date(todayMillis);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // Calcular tokens usados hoje
    const tokensUsedToday = user.stats.tokens
      .filter(token => {
        const tokenDate = new Date(token.data);
        return tokenDate >= todayStart && tokenDate < todayEnd;
      })
      .reduce((total, token) => total + token.valor, 0);

    return {
      planType,
      dailyLimit,
      tokensUsedToday,
      tokensRemaining: Math.max(0, dailyLimit - tokensUsedToday),
      canUseAI: tokensUsedToday < dailyLimit
    };
  } catch (error) {
    console.error('Erro ao obter estatísticas de tokens:', error);
    return { error: 'Erro interno do servidor' };
  }
};

export default { checkTokenLimit, registerTokenUsage, getTokenStats, TOKEN_LIMITS };