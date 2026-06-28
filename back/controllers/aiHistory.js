/**
 * Persistência do histórico de conversas com a IA (NutriAI / TreinoAI).
 * A identidade vem sempre do token (req.user / req.userEmail).
 */
import AiConversation from '../models/AiConversation.js';
import User from '../models/User.js';

const ASSISTANTS = ['nutri', 'treino'];
const MAX_MESSAGES = 200; // mantém as últimas N mensagens por conversa

const resolveUserId = async (req) => {
  if (req.user?.id) return req.user.id;
  const u = await User.findOne({ email: req.userEmail }).select('_id').lean();
  return u ? String(u._id) : null;
};

/** GET /ai/history?assistant=nutri — retorna as mensagens da conversa. */
export const getAiHistory = async (req, res) => {
  try {
    const assistant = String(req.query.assistant || '');
    if (!ASSISTANTS.includes(assistant)) {
      return res.status(400).json({ success: false, msg: 'Parâmetro "assistant" inválido (use nutri|treino).' });
    }
    const userId = await resolveUserId(req);
    if (!userId) return res.status(401).json({ success: false, msg: 'Usuário não autenticado.' });

    const conv = await AiConversation.findOne({ userId, assistant }).lean();
    return res.json({ success: true, messages: conv?.messages || [] });
  } catch (error) {
    console.error('[getAiHistory] Erro:', error);
    return res.status(500).json({ success: false, msg: 'Erro ao buscar histórico de IA.' });
  }
};

/** POST /ai/history/append { assistant, role, content } — adiciona uma mensagem. */
export const appendAiHistory = async (req, res) => {
  try {
    const { assistant, role, content } = req.body;
    if (!ASSISTANTS.includes(assistant)) {
      return res.status(400).json({ success: false, msg: 'Campo "assistant" inválido.' });
    }
    if (!['user', 'assistant'].includes(role)) {
      return res.status(400).json({ success: false, msg: 'Campo "role" inválido.' });
    }
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ success: false, msg: 'Campo "content" é obrigatório.' });
    }

    const userId = await resolveUserId(req);
    if (!userId) return res.status(401).json({ success: false, msg: 'Usuário não autenticado.' });

    const conv = await AiConversation.findOneAndUpdate(
      { userId, assistant },
      { $push: { messages: { $each: [{ role, content }], $slice: -MAX_MESSAGES } } },
      { new: true, upsert: true }
    ).lean();

    return res.json({ success: true, total: conv?.messages?.length || 0 });
  } catch (error) {
    console.error('[appendAiHistory] Erro:', error);
    return res.status(500).json({ success: false, msg: 'Erro ao salvar mensagem no histórico.' });
  }
};

/** POST /ai/history/clear { assistant } — limpa a conversa. */
export const clearAiHistory = async (req, res) => {
  try {
    const { assistant } = req.body;
    if (!ASSISTANTS.includes(assistant)) {
      return res.status(400).json({ success: false, msg: 'Campo "assistant" inválido.' });
    }
    const userId = await resolveUserId(req);
    if (!userId) return res.status(401).json({ success: false, msg: 'Usuário não autenticado.' });

    await AiConversation.findOneAndUpdate(
      { userId, assistant },
      { $set: { messages: [] } },
      { upsert: true }
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('[clearAiHistory] Erro:', error);
    return res.status(500).json({ success: false, msg: 'Erro ao limpar histórico de IA.' });
  }
};
