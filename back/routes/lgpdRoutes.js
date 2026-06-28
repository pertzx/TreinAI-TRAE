import express from 'express';
import { verificarToken } from '../middlewares/authMiddleware.js';
import User from '../models/User.js';
import Chat from '../models/Chat.js';
import { logAudit } from '../helpers/auditLog.js';

const router = express.Router();

/**
 * Exportação de dados pessoais (LGPD art. 18, V — portabilidade).
 *
 * Retorna um JSON estruturado com os dados do PRÓPRIO usuário autenticado.
 * A identidade vem sempre do token (req.user / req.userEmail) — nunca do body —
 * para impedir que alguém exporte dados de terceiros.
 */
router.post('/export-data', verificarToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const email = req.userEmail || req.user?.email;

    const user = userId
      ? await User.findById(userId).select('-password').lean()
      : await User.findOne({ email }).select('-password').lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }

    // Categorias selecionadas no front; por padrão exporta tudo.
    const sel = req.body?.selectedCategories || {};
    const want = (key) => sel[key] === undefined ? true : !!sel[key];

    const data = {
      _meta: {
        geradoEm: new Date().toISOString(),
        formato: 'JSON',
        base_legal: 'LGPD art. 18, V (portabilidade de dados)',
        titular: { id: String(user._id), email: user.email },
      },
    };

    if (want('profile')) {
      data.perfil = {
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        isCoach: user.isCoach,
        planInfos: user.planInfos,
        preferences: user.preferences,
        perfil: user.perfil,
        onboarding: user.onboarding,
        coachId: user.coachId,
        coachsId: user.coachsId,
        criadoEm: user.createdAt,
        atualizadoEm: user.updatedAt,
      };
    }

    if (want('workouts')) {
      data.treinos = user.meusTreinos || [];
    }

    if (want('progress')) {
      data.progresso = {
        pesoAtual: user.perfil?.pesoAtual || [],
        altura: user.perfil?.altura || [],
        objetivo: user.perfil?.objetivo || null,
        nivelExperiencia: user.perfil?.nivelExperiencia || null,
      };
    }

    if (want('history')) {
      data.historicoTreinos = user.historico || [];
      data.nutriInfos = user.nutriInfos || null;
    }

    if (want('tokens')) {
      data.usoDeTokens = user.stats?.tokens || [];
      data.plano = user.planInfos || null;
    }

    if (want('chats')) {
      // Conversas em que o usuário é membro.
      const chats = await Chat.find({ 'membros.userId': String(user._id) })
        .select('ChatName ChatId membros mensagens criadoEm')
        .lean();
      data.conversas = chats || [];
    }

    await logAudit({
      req,
      action: 'lgpd.export',
      details: { categorias: Object.keys(data).filter(k => k !== '_meta') },
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error('[LGPD export-data] Erro:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao exportar dados',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export default router;
