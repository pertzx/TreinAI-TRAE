import User from '../models/User.js';
import Profissional from '../models/Profissional.js';
import { getBrazilDate } from '../helpers/getBrazilDate.js';
import { sendNotificationEmail } from '../utils/sendEmail.js';

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
    const bodyEmail = req.body?.email;
    const email = bodyEmail || req.userEmail;
    const { profissionalId } = req.body;
    let targetUser, planType;
    
    // Se profissionalId for fornecido, verificar tokens do usuário do profissional
    if (profissionalId) {
      // 1. Buscar o profissional pelo profissionalId (UUID string)
      const profissional = await Profissional.findOne({ profissionalId: profissionalId });

      if (!profissional) {
        return res.status(404).json({ 
          success: false, 
          message: 'Profissional não encontrado' 
        });
      }

      // 2. Buscar o usuário associado usando o userId do profissional
      targetUser = await User.findById(profissional.userId);

      if (!targetUser) {
        return res.status(404).json({ 
          success: false, 
          message: 'Usuário associado ao profissional não encontrado' 
        });
      }

      // 3. Verificar se o plano Coach está ativo
      if (targetUser.planInfos?.planType !== 'coach' || targetUser.planInfos?.status !== 'ativo') {
        return res.status(403).json({ 
          success: false, 
          message: 'Plano Coach inativo' 
        });
      }

      planType = 'coach';
    } else {
      // Verificação padrão por email para usuários
      if (!email) {
        return res.status(400).json({ 
          success: false, 
          msg: 'Email é obrigatório para verificação de tokens' 
        });
      }

      targetUser = await User.findOne({ email });
      if (!targetUser) {
        return res.status(404).json({ 
          success: false, 
          msg: 'Usuário não encontrado' 
        });
      }

      planType = targetUser.planInfos?.planType || 'free';
    }

    // Inicializar stats se não existir
    if (!targetUser.stats) {
      targetUser.stats = { tokens: [] };
      await targetUser.save();
    }
    if (!targetUser.stats.tokens) {
      targetUser.stats.tokens = [];
      await targetUser.save();
    }

    const dailyLimit = TOKEN_LIMITS[planType];
    
    // Obter data atual no Brasil
    const todayMillis = getBrazilDate();
    const today = new Date(todayMillis);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // Calcular tokens usados hoje
    const tokensUsedToday = targetUser.stats.tokens
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
      targetUser,
      profissionalId
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

// Função para registrar uso de tokens
export const registerTokenUsage = async (email, tokens, profissionalId = null) => {
  try {
    let targetUser;

    // Se profissionalId for fornecido, buscar o usuário do profissional
    if (profissionalId) {
      // 1. Buscar o profissional pelo profissionalId (UUID string)
      const profissional = await Profissional.findOne({ profissionalId: profissionalId });

      if (!profissional) {
        console.error('Profissional não encontrado:', profissionalId);
        return false;
      }

      // 2. Buscar o usuário associado
      targetUser = await User.findById(profissional.userId);

      if (!targetUser) {
        console.error('Usuário associado ao profissional não encontrado');
        return false;
      }

      if (targetUser.planInfos?.planType !== 'coach' || targetUser.planInfos?.status !== 'ativo') {
        console.error('Plano Coach inativo');
        return false;
      }
    } else {
      // Lógica original para usuários
      targetUser = await User.findOne({ email });
      if (!targetUser) {
        console.error('Usuário não encontrado:', email);
        return false;
      }
    }

    // Inicializar stats se não existir
    if (!targetUser.stats) {
      targetUser.stats = { tokens: [] };
    }
    if (!targetUser.stats.tokens) {
      targetUser.stats.tokens = [];
    }

    // Obter data atual no formato YYYY-MM-DD
    const today = new Date(getBrazilDate()).toISOString().split('T')[0];

    // Verificar se já existe um registro para hoje
    const existingTokenRecord = targetUser.stats.tokens.find(token => 
      token.data && token.data.toISOString().split('T')[0] === today
    );

    if (existingTokenRecord) {
      // Se existe registro para hoje, adicionar ao valor existente
      existingTokenRecord.valor += tokens;
    } else {
      // Se não existe, criar novo registro
      const tokenUsage = {
        valor: tokens,
        data: new Date(getBrazilDate())
      };
      targetUser.stats.tokens.push(tokenUsage);
    }

    await targetUser.save();

    console.log(`Tokens registrados: ${tokens} para ${profissionalId ? 'profissional' : 'usuário'} ${profissionalId || email}`);
    return true;
  } catch (error) {
    console.error('Erro ao registrar uso de tokens:', error);
    return false;
  }
};

// Função para obter estatísticas de tokens
export const getTokenStats = async (userEmail, profissionalId = null) => {
  try {
    let targetUser;
    let planType;

    // Se profissionalId for fornecido, obter stats do usuário do profissional
    if (profissionalId) {
      // 1. Buscar o profissional pelo profissionalId (UUID string)
      const profissional = await Profissional.findOne({ profissionalId: profissionalId });

      if (!profissional) {
        return { error: 'Profissional não encontrado' };
      }

      // 2. Buscar o usuário associado usando o userId do profissional
      targetUser = await User.findById(profissional.userId);

      if (!targetUser) {
        return { error: 'Usuário associado ao profissional não encontrado' };
      }

      if (targetUser.planInfos?.planType !== 'coach' || targetUser.planInfos?.status !== 'ativo') {
        return { error: 'Plano Coach inativo' };
      }

      planType = 'coach';
    } else {
      // Lógica original para usuários
      targetUser = await User.findOne({ email: userEmail });
      if (!targetUser) {
        return { error: 'Usuário não encontrado' };
      }

      planType = targetUser.planInfos?.planType || 'free';
    }

    // Inicializar stats se não existir
    if (!targetUser.stats) {
      targetUser.stats = { tokens: [] };
    }
    if (!targetUser.stats.tokens) {
      targetUser.stats.tokens = [];
    }

    const dailyLimit = TOKEN_LIMITS[planType];
    
    // Obter data atual no Brasil
    const todayMillis = getBrazilDate();
    const today = new Date(todayMillis);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // Calcular tokens usados hoje
    const tokensUsedToday = (targetUser.stats?.tokens || [])
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
      canUseAI: tokensUsedToday < dailyLimit,
      isProfessional: !!profissionalId
    };
  } catch (error) {
    console.error('Erro ao obter estatísticas de tokens:', error);
    return { error: 'Erro interno do servidor' };
  }
};

export default { checkTokenLimit, registerTokenUsage, getTokenStats, TOKEN_LIMITS };