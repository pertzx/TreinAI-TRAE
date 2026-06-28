/**
 * Middleware de Autorização
 *
 * Verifica se o usuário tem permissão para acessar recursos de outros usuários
 * Usado em conjunto com autenticação (verificarToken)
 *
 * IMPORTANTE: verificarToken define apenas `req.userEmail` (o token carrega o email).
 * Por isso, aqui resolvemos o usuário autenticado a partir do email antes de
 * qualquer verificação. Nunca confie em ids vindos do body/query para identificar
 * QUEM está logado — esses valores são controláveis pelo cliente.
 */

import mongoose from 'mongoose';
import Profissional from '../models/Profissional.js';
import Chat from '../models/Chat.js';
import User from '../models/User.js';

/**
 * Resolve o usuário autenticado a partir do email do token (req.userEmail).
 * Cacheia o resultado em req.user para os controllers e middlewares seguintes.
 * Retorna null se não for possível resolver.
 */
const resolveAuthUser = async (req) => {
  if (req.user && (req.user.id || req.user._id)) return req.user;

  const email = req.userEmail || req.user?.email;
  if (!email) return null;

  const user = await User.findOne({ email }).select('_id email isAdmin').lean();
  if (!user) return null;

  req.user = {
    id: String(user._id),
    _id: user._id,
    email: user.email,
    isAdmin: !!user.isAdmin,
  };
  return req.user;
};

/**
 * Extrai o ChatId enviado pelo cliente, tolerando maiúsculas/minúsculas e
 * as três origens possíveis (body, query, params).
 */
const extractChatId = (req) =>
  req.body?.ChatId || req.body?.chatId ||
  req.query?.ChatId || req.query?.chatId ||
  req.params?.ChatId || req.params?.chatId ||
  null;

/**
 * Verifica se o usuário está acessando seus próprios dados
 * Use para rotas como: /perfil, /meus-treinos, /pegarChats
 */
export const isSelf = async (req, res, next) => {
  try {
    const user = await resolveAuthUser(req);
    if (!user) {
      return res.status(401).json({ msg: 'Usuário não autenticado', code: 'NOT_AUTHENTICATED' });
    }

    const targetUserId = req.params.userId || req.body.userId || req.query.userId;

    // Sem target explícito: assume o próprio usuário.
    if (!targetUserId) {
      req.targetUserId = user.id;
      req.targetUser = user;
      return next();
    }

    if (String(targetUserId) !== user.id) {
      return res.status(403).json({
        msg: 'Você só pode acessar seus próprios dados',
        code: 'NOT_SELF',
      });
    }

    req.targetUserId = String(targetUserId);
    next();
  } catch (error) {
    console.error('[isSelf] Erro:', error);
    res.status(500).json({ msg: 'Erro na verificação de autorização' });
  }
};

/**
 * Verifica se o profissional pode acessar dados de um aluno
 * Use para rotas como: /aluno/:alunoId/dados, /aluno/:alunoId/treinos
 */
export const canAccessAluno = async (req, res, next) => {
  try {
    const user = await resolveAuthUser(req);
    if (!user) {
      return res.status(401).json({ msg: 'Usuário não autenticado', code: 'NOT_AUTHENTICATED' });
    }

    const alunoId = req.params.alunoId || req.params.userId || req.body.alunoId || req.body.userId;

    if (!alunoId) {
      return res.status(400).json({ msg: 'ID do aluno é obrigatório' });
    }

    // Buscar profissional pelo userId do usuário logado
    const profissional = await Profissional.findOne({ userId: user.id });

    if (!profissional) {
      return res.status(403).json({
        msg: 'Apenas profissionais podem acessar dados de alunos',
        code: 'NOT_PROFESSIONAL',
      });
    }

    // O schema real é `alunos: [{ userId, aceito, ... }]`
    const vinculo = profissional.alunos?.find(a => String(a.userId) === String(alunoId));

    if (!vinculo) {
      return res.status(403).json({
        msg: 'Você não tem permissão para acessar os dados deste aluno. Adicione-o à sua lista de alunos primeiro.',
        code: 'ALUNO_NOT_AUTHORIZED',
      });
    }

    req.alunoId = String(alunoId);
    req.profissional = profissional;
    req.profissionalId = profissional.profissionalId || profissional._id;
    req.alunoAceito = !!vinculo.aceito;

    next();
  } catch (error) {
    console.error('[canAccessAluno] Erro:', error);
    res.status(500).json({ msg: 'Erro na verificação de autorização' });
  }
};

/**
 * Verifica se o usuário é membro de um chat
 * Use para rotas como: /pegarChat, /enviar-mensagem, /buscar-historico
 */
export const isChatParticipant = async (req, res, next) => {
  try {
    const user = await resolveAuthUser(req);
    if (!user) {
      return res.status(401).json({ msg: 'Usuário não autenticado', code: 'NOT_AUTHENTICATED' });
    }

    const chatId = extractChatId(req);

    if (!chatId) {
      return res.status(400).json({ msg: 'ID do chat é obrigatório', code: 'CHAT_ID_REQUIRED' });
    }

    // Chats são identificados pelo campo `ChatId` (uuid). Como fallback,
    // aceitamos o _id do Mongo caso o valor enviado seja um ObjectId válido.
    let chat = await Chat.findOne({ ChatId: String(chatId) });
    if (!chat && mongoose.Types.ObjectId.isValid(chatId)) {
      chat = await Chat.findById(chatId);
    }

    if (!chat) {
      return res.status(404).json({ msg: 'Chat não encontrado', code: 'CHAT_NOT_FOUND' });
    }

    // Participantes ficam em `membros: [{ userId, ... }]`, onde userId é o _id (string).
    const isMember = chat.membros?.some(m => String(m.userId) === user.id);

    if (!isMember) {
      return res.status(403).json({
        msg: 'Você não tem acesso a este chat',
        code: 'NOT_CHAT_PARTICIPANT',
      });
    }

    req.chat = chat;
    req.chatId = String(chatId);

    next();
  } catch (error) {
    console.error('[isChatParticipant] Erro:', error);
    res.status(500).json({ msg: 'Erro na verificação de autorização' });
  }
};

/**
 * Verifica se é admin
 * Use para rotas administrativas
 */
export const isAdmin = async (req, res, next) => {
  try {
    const auth = await resolveAuthUser(req);
    if (!auth) {
      return res.status(401).json({ msg: 'Usuário não autenticado', code: 'NOT_AUTHENTICATED' });
    }

    // A flag isAdmin não vem no JWT — consultar sempre o banco para esta decisão sensível.
    const dbUser = auth.id
      ? await User.findById(auth.id).select('isAdmin').lean()
      : await User.findOne({ email: auth.email }).select('isAdmin').lean();

    if (!dbUser || !dbUser.isAdmin) {
      return res.status(403).json({
        msg: 'Acesso restrito a administradores',
        code: 'NOT_ADMIN',
      });
    }

    req.isAdmin = true;
    next();
  } catch (error) {
    console.error('[isAdmin] Erro:', error);
    res.status(500).json({ msg: 'Erro na verificação de autorização' });
  }
};

/**
 * Middlewares de Autorização Exportados
 *
 * Exemplo de uso:
 * router.get('/meus-dados', verificarToken, isSelf, getMeusDados);
 * router.get('/aluno/:alunoId/dados', verificarToken, canAccessAluno, getDadosAluno);
 *
 * Importe os middlewares de autenticação do authMiddleware.js:
 * import { verificarToken, authenticateToken } from './authMiddleware.js';
 */
