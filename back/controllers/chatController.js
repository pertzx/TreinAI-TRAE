import Chat from "../models/Chat.js";
import { v4 as uuidv4 } from 'uuid'
import User from "../models/User.js";
import { getBrazilDate } from "../helpers/getBrazilDate.js";
import { chatWebSocketServer } from '../index.js';
import mongoose from "mongoose";

// * pegar todos os chats do usuário (query: ?userId=xxx)
// GET /pegarChats
// * pegar um chat específico; se não existir criar (retorna sempre userIds: [])
// POST /pegarChat
// enviar mensagem para um chat (POST /enviar-mensagem)
// deletar mensagem de um chat (POST /deletar-mensagem)
// se body.userId for enviado, valida que só o autor pode deletar
// adicionarUsuario (POST /adicionar-usuario-chat)
// removerUsuario (POST /remover-usuario-chat)
// se após remoção não sobrar membros, remove o chat completo

export const atualizarStatusDigitando = async (req, res) => {
  const { ChatId, userId, isTyping, username } = req.body;
  if (!ChatId || !userId) return res.status(400).json({ error: 'ChatId e userId são obrigatórios' });

  try {
    const chat = await Chat.findOne({ ChatId });
    if (!chat) return res.status(404).json({ error: 'Chat não encontrado' });

    // Limpar status antigos (mais de 10 segundos)
    const tenSecondsAgo = new Date(Date.now() - 10000);
    chat.typingStatus = (chat.typingStatus || []).filter(t => t.startedAt > tenSecondsAgo);

    if (isTyping) {
      // Adicionar ou atualizar
      const index = chat.typingStatus.findIndex(t => String(t.userId) === String(userId));
      if (index !== -1) {
        chat.typingStatus[index].startedAt = getBrazilDate();
      } else {
        chat.typingStatus.push({ userId, username, startedAt: getBrazilDate() });
      }
    } else {
      // Remover
      chat.typingStatus = chat.typingStatus.filter(t => String(t.userId) !== String(userId));
    }

    await chat.save();

    // Notificar via WebSocket se disponível
    if (chatWebSocketServer && typeof chatWebSocketServer.broadcastToChat === 'function') {
      chatWebSocketServer.broadcastToChat(ChatId, {
        type: 'typing_status',
        chatId: ChatId,
        typingStatus: chat.typingStatus
      });
    }

    return res.status(200).json({ success: true, typingStatus: chat.typingStatus });
  } catch (error) {
    console.error('atualizarStatusDigitando error:', error);
    return res.status(500).json({ error: 'Erro no servidor' });
  }
};

// * Iniciar chat por userId - busca usuário e cria chat 1:1
// POST /iniciar-chat-por-userid
export const iniciarChatPorUserId = async (req, res) => {
  const { userId, targetUserId } = req.body;
  
  if (!userId || !targetUserId) {
    return res.status(400).json({ error: 'userId e targetUserId são obrigatórios' });
  }

  if (String(userId) === String(targetUserId)) {
    return res.status(400).json({ error: 'Não é possível iniciar chat consigo mesmo' });
  }

  try {
    // Verificar se o usuário alvo existe
    const targetUser = await User.findById(targetUserId).select('username').lean();
    if (!targetUser) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar se o usuário atual existe
    const currentUser = await User.findById(userId).select('username').lean();
    if (!currentUser) {
      return res.status(404).json({ error: 'Usuário atual não encontrado' });
    }

    const uid = String(userId);
    const tid = String(targetUserId);
    const sortedPair = [uid, tid].sort();
    const pairId = sortedPair.join(':');

    // Verificar se já existe um chat entre esses usuários
    let chat = await Chat.findOne({ pairId }).lean();
    if (chat) {
      const userIds = (chat.membros || []).map(m => String(m.userId));
      return res.status(200).json({ 
        chat, 
        userIds, 
        message: 'Chat já existe entre esses usuários' 
      });
    }

    // Criar novo chat 1:1
    const setOnInsert = {
      ChatId: uuidv4(),
      pairId,
      ChatName: `${currentUser.username} & ${targetUser.username}`,
      ChatDesc: 'Conversa privada',
      criadoEm: typeof getBrazilDate === 'function' ? getBrazilDate() : new Date(),
      membros: [
        { 
          userId: uid, 
          username: currentUser.username, 
          membroDesde: typeof getBrazilDate === 'function' ? getBrazilDate() : new Date() 
        },
        { 
          userId: tid, 
          username: targetUser.username, 
          membroDesde: typeof getBrazilDate === 'function' ? getBrazilDate() : new Date() 
        }
      ]
    };

    const newChat = await Chat.findOneAndUpdate(
      { pairId },
      { $setOnInsert: setOnInsert },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    if (!newChat) {
      return res.status(500).json({ error: 'Erro ao criar chat' });
    }

    return res.status(201).json({ 
      chat: newChat, 
      userIds: (newChat.membros || []).map(m => String(m.userId)),
      message: 'Chat criado com sucesso'
    });

  } catch (error) {
    console.error('iniciarChatPorUserId error:', error);
    return res.status(500).json({ error: 'Erro no servidor ao iniciar chat' });
  }
};

// * pegar todos os chats do usuário (query: ?userId=xxx)
// GET /pegarChats
export const pegarChats = async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ msg: '!userId' });

  try {
    const chats = await Chat.find({ 'membros.userId': String(userId) })
      .select('ChatName ChatId ChatDesc criadoEm membros mensagens pairId typingStatus')
      .sort({ criadoEm: -1 })
      .lean();

    // Buscar status online de todos os membros envolvidos nos chats
    const allMemberIds = [...new Set(chats.flatMap(c => c.membros.map(m => m.userId)))];
    const onlineUsers = await User.find({ 
      _id: { $in: allMemberIds.filter(id => mongoose.Types.ObjectId.isValid(id)) } 
    }).select('_id isOnline lastActive').lean();

    const onlineStatusMap = {};
    onlineUsers.forEach(u => {
      // Considerar online se isOnline é true E lastActive foi há menos de 1 minuto
      const oneMinuteAgo = new Date(Date.now() - 60000);
      onlineStatusMap[String(u._id)] = u.isOnline && u.lastActive > oneMinuteAgo;
    });

    const chatsShort = chats.map(c => {
      // Limpar status de digitação antigos no retorno
      const tenSecondsAgo = new Date(Date.now() - 10000);
      const activeTyping = (c.typingStatus || []).filter(t => t.startedAt > tenSecondsAgo);

      return {
        ChatId: c.ChatId,
        ChatName: c.ChatName,
        ChatDesc: c.ChatDesc,
        criadoEm: c.criadoEm,
        membros: c.membros.map(m => ({
          ...m,
          isOnline: onlineStatusMap[String(m.userId)] || false
        })),
        userIds: (c.membros || []).map(m => String(m.userId)),
        lastMessage: c.mensagens && c.mensagens.length ? c.mensagens[c.mensagens.length - 1] : null,
        messagesCount: c.mensagens ? c.mensagens.length : 0,
        pairId: c.pairId,
        isIndividualChat: !!c.pairId,
        typingStatus: activeTyping
      };
    });

    return res.status(200).json(chatsShort);
  } catch (error) {
    console.error('pegarChats error:', error);
    return res.status(500).json({ error: 'Erro no servidor ao buscar chats' });
  }
};

// * pegar um chat específico; se não existir criar (retorna sempre userIds: [])
// POST /pegarChat
export const pegarChat = async (req, res) => {
  // espera param: req.params.ChatId  (string do seu model)
  const { ChatId } = req.query || {};
  const {
    userId,
    otherUserId,
    memberIds, // array de userIds para busca exata de grupo
    membros,   // array para criação: [{ userId, username }, ...]
    ChatName,
    ChatDesc,
    creatorId,
    creatorUsername
  } = req.body || {};

  try {
    // 1) Buscar por ChatId (campo do documento)
    if (ChatId) {
      const chat = await Chat.findOne({ ChatId: String(ChatId) }).lean();
      if (!chat) return res.status(404).json({ error: 'Chat não encontrado' });

      // Buscar status online dos membros
      const memberIds = (chat.membros || []).map(m => m.userId);
      const onlineUsers = await User.find({ 
        _id: { $in: memberIds.filter(id => mongoose.Types.ObjectId.isValid(id)) } 
      }).select('_id isOnline lastActive').lean();

      const onlineStatusMap = {};
      onlineUsers.forEach(u => {
        const oneMinuteAgo = new Date(Date.now() - 60000);
        onlineStatusMap[String(u._id)] = u.isOnline && u.lastActive > oneMinuteAgo;
      });

      // Limpar status de digitação antigos
      const tenSecondsAgo = new Date(Date.now() - 10000);
      const activeTyping = (chat.typingStatus || []).filter(t => t.startedAt > tenSecondsAgo);

      const userIds = (chat.membros || []).map(m => String(m.userId));
      const chatWithFlags = {
        ...chat,
        isIndividualChat: !!chat.pairId,
        membros: chat.membros.map(m => ({
          ...m,
          isOnline: onlineStatusMap[String(m.userId)] || false
        })),
        typingStatus: activeTyping
      };
      return res.status(200).json({ chat: chatWithFlags, userIds });
    }

    // 2) Buscar por memberIds (array) - procura EXATAMENTE esse conjunto de userIds
    if (Array.isArray(memberIds) && memberIds.length > 0) {
      const uniqueMemberIds = [...new Set(memberIds.map(String))];

      const existing = await Chat.findOne({
        'membros.userId': { $all: uniqueMemberIds },
        $expr: { $eq: [{ $size: '$membros' }, uniqueMemberIds.length] }
      }).lean();

      if (existing) {
        const userIds = (existing.membros || []).map(m => String(m.userId));
        return res.status(200).json({ chat: existing, userIds });
      }

      // se não existir e vierem dados completos para criar, cria o grupo
      if (Array.isArray(membros) && membros.length > 0) {
        const membersToCreate = membros
          .map(m => ({ userId: String(m.userId), username: m.username || 'Usuário' }))
          .filter((v, i, a) => a.findIndex(x => x.userId === v.userId) === i);

        const createdUserIds = membersToCreate.map(m => m.userId);
        const mismatch = uniqueMemberIds.some(id => !createdUserIds.includes(id)) ||
          createdUserIds.length !== uniqueMemberIds.length;

        if (mismatch) {
          return res.status(400).json({
            error: 'Para criar grupo com memberIds, envie também `membros` com os mesmos userIds.'
          });
        }

        const newChat = new Chat({
          ChatName: ChatName || 'Grupo',
          ChatDesc: ChatDesc || 'Chat criado automaticamente',
          membros: membersToCreate
        });
        await newChat.save();
        return res.status(201).json({ chat: newChat, userIds: membersToCreate.map(m => m.userId) });
      }

      // não existe e sem dados para criar
      return res.status(404).json({ error: 'Chat com esses memberIds não encontrado' });
    }

    // 3) Buscar por par userId + otherUserId (1:1) - garante operação atômica com upsert
    if (userId && otherUserId) {
      const uid = String(userId);
      const oid = String(otherUserId);
      const sortedPair = [uid, oid].sort();
      const pairId = sortedPair.join(':');

      // tenta encontrar chat pelo pairId (1:1)
      let chat = await Chat.findOne({ pairId }).lean();
      if (chat) {
        const userIds = (chat.membros || []).map(m => String(m.userId));
        return res.status(200).json({ chat, userIds });
      }

      // não encontrou: criar atomically com findOneAndUpdate/upsert usando pairId
      // resolve usernames (opcional)
      let otherUser = null;
      try { otherUser = await User.findById(oid).select('username').lean(); } catch (e) { otherUser = null; }
      let creatorUser = null;
      try { creatorUser = await User.findById(uid).select('username').lean(); } catch (e) { creatorUser = null; }

      const otherUsernameSafe = (otherUser && otherUser.username) ? otherUser.username : 'Contato';
      const creatorUsernameSafe = (creatorUser && creatorUser.username) ? creatorUser.username : (creatorUsername || 'Usuário');

      const setOnInsert = {
        ChatId: uuidv4(),
        pairId,
        ChatName: ChatName || `${creatorUsernameSafe} & ${otherUsernameSafe}`,
        ChatDesc: ChatDesc || 'Conversa privada',
        criadoEm: typeof getBrazilDate === 'function' ? getBrazilDate() : new Date(),
        membros: [
          { userId: uid, username: creatorUsernameSafe, membroDesde: typeof getBrazilDate === 'function' ? getBrazilDate() : new Date() },
          { userId: oid, username: otherUsernameSafe, membroDesde: typeof getBrazilDate === 'function' ? getBrazilDate() : new Date() }
        ]
      };

      // upsert por pairId (simples — sem $expr)
      const chatCreatedOrFound = await Chat.findOneAndUpdate(
        { pairId },
        { $setOnInsert: setOnInsert },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ).lean();

      if (!chatCreatedOrFound) return res.status(500).json({ error: 'Erro criando/obtendo chat 1:1' });

      return res.status(200).json({ chat: chatCreatedOrFound, userIds: (chatCreatedOrFound.membros || []).map(m => String(m.userId)) });
    }


    // 4) Criar chat com ChatName + creatorId (ou com membros)
    if (ChatName && (creatorId || (Array.isArray(membros) && membros.length > 0))) {
      const membersToUse = (Array.isArray(membros) && membros.length > 0)
        ? membros.map(m => ({ userId: String(m.userId), username: m.username || 'Usuário' }))
        : [{ userId: String(creatorId), username: creatorUsername || 'Criador' }];

      const dedup = membersToUse.filter((v, i, a) => a.findIndex(x => x.userId === v.userId) === i);

      const newChat = new Chat({
        ChatName,
        ChatDesc: ChatDesc || '',
        membros: dedup
      });

      await newChat.save();
      return res.status(201).json({ chat: newChat, userIds: newChat.membros.map(m => String(m.userId)) });
    }

    // parâmetros insuficientes
    return res.status(400).json({
      error: 'Parâmetros insuficientes. Envie ChatId (param) OU memberIds (array) OU (userId + otherUserId) OU (ChatName + creatorId / membros).'
    });
  } catch (error) {
    console.error('pegarChat error:', error);
    return res.status(500).json({ error: 'Erro no servidor ao obter/criar chat' });
  }
};

// enviar mensagem (POST /enviar-mensagem)
// body: { ChatId?, userId, conteudo, otherUserId? }
export const enviarMensagem = async (req, res) => {
  const { ChatId, userId, conteudo, otherUserId } = req.body || {};
  if (!userId || !conteudo) return res.status(400).json({ error: 'userId e conteudo são obrigatórios' });

  const mensagemObj = {
    userId: String(userId),
    mensagemId: uuidv4(),
    conteudo: String(conteudo),
    vistos: [{
      userId: String(userId),
      vistoEm: typeof getBrazilDate === 'function' ? getBrazilDate() : new Date()
    }],
    publicadoEm: typeof getBrazilDate === 'function' ? getBrazilDate() : new Date()
  };

  try {
    // 1) Se ChatId informado: só push
    if (ChatId) {
      const updated = await Chat.findOneAndUpdate(
        { ChatId: String(ChatId) },
        { $push: { mensagens: mensagemObj } },
        { new: true }
      ).lean();
      if (!updated) return res.status(404).json({ error: 'Chat não encontrado' });
      
      // Notificar via WebSocket sobre nova mensagem
      try {
        chatWebSocketServer.notifyNewMessage(String(ChatId), mensagemObj, String(userId));
        
        // Notificar membros do chat sobre atualização
        const membros = updated.membros || [];
        membros.forEach(membro => {
          if (String(membro.userId) !== String(userId)) {
            chatWebSocketServer.notifyChatUpdate(String(membro.userId), updated);
          }
        });
      } catch (wsError) {
        console.warn('Erro ao enviar notificação WebSocket:', wsError);
      }
      
      return res.status(201).json({ mensagem: mensagemObj, mensagens: updated.mensagens, chat: updated });
    }

    // 2) Se otherUserId informado: 1:1 por pairId (atômico)
    if (otherUserId) {
      const uid = String(userId);
      const oid = String(otherUserId);
      const pairId = [uid, oid].sort().join(':');

      // resolve usernames (opcional)
      let otherUser = null;
      try { otherUser = await User.findById(oid).select('username').lean(); } catch (e) { otherUser = null; }
      let creatorUser = null;
      try { creatorUser = await User.findById(uid).select('username').lean(); } catch (e) { creatorUser = null; }

      const otherUsernameSafe = (otherUser && otherUser.username) ? otherUser.username : 'Contato';
      const creatorUsernameSafe = (creatorUser && creatorUser.username) ? creatorUser.username : (creatorUsername || 'Usuário');

      // setOnInsert para criar chat caso não exista
      const setOnInsert = {
        ChatId: uuidv4(),
        pairId,
        ChatName: `${creatorUsernameSafe} & ${otherUsernameSafe}`,
        ChatDesc: 'Conversa privada',
        criadoEm: typeof getBrazilDate === 'function' ? getBrazilDate() : new Date(),
        membros: [
          { userId: uid, username: creatorUsernameSafe, membroDesde: typeof getBrazilDate === 'function' ? getBrazilDate() : new Date() },
          { userId: oid, username: otherUsernameSafe, membroDesde: typeof getBrazilDate === 'function' ? getBrazilDate() : new Date() }
        ]
      };

      // operação atômica: upsert + $push
      const updated = await Chat.findOneAndUpdate(
        { pairId },
        { $setOnInsert: setOnInsert, $push: { mensagens: mensagemObj } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ).lean();

      // Notificar via WebSocket sobre nova mensagem
      try {
        chatWebSocketServer.notifyNewMessage(String(updated.ChatId), mensagemObj, String(userId));
        
        // Notificar o outro usuário sobre atualização do chat
        chatWebSocketServer.notifyChatUpdate(String(otherUserId), updated);
      } catch (wsError) {
        console.warn('Erro ao enviar notificação WebSocket:', wsError);
      }

      return res.status(201).json({ mensagem: mensagemObj, mensagens: updated.mensagens, chat: updated });
    }

    // caso sem ChatId e sem otherUserId
    return res.status(400).json({ error: 'Envie ChatId ou otherUserId' });
  } catch (err) {
    // se falhar por duplicata de índice (raro), podemos tentar recuperar e reenviar a mensagem num segundo passo
    console.error('enviarMensagem error:', err);
    return res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
};

// deletar mensagem de um chat (POST /deletar-mensagem)
// se body.userId for enviado, valida que só o autor pode deletar
export const deletarMensagem = async (req, res) => {
  const { ChatId, mensagemId } = req.query || {};
  const { userId } = req.body || {}; // opcional: autor da requisição

  if (!ChatId) return res.status(400).json({ error: 'ChatId (param) é obrigatório' });
  if (!mensagemId) return res.status(400).json({ error: 'mensagemId (param) é obrigatório' });

  try {
    // busca chat e mensagem
    const chat = await Chat.findOne({ ChatId: String(ChatId) }).select('ChatId mensagens membros').lean();
    if (!chat) return res.status(404).json({ error: 'Chat não encontrado' });

    const msg = (chat.mensagens || []).find(m => String(m.mensagemId) === String(mensagemId));
    if (!msg) return res.status(404).json({ error: 'Mensagem não encontrada' });

    // se mandaram userId no body, só permite deletar se for o autor
    if (userId && String(msg.userId) !== String(userId)) {
      return res.status(403).json({ error: 'Apenas o autor da mensagem pode deletá-la' });
    }

    // remove a mensagem
    const updated = await Chat.findOneAndUpdate(
      { ChatId: String(ChatId) },
      { $pull: { mensagens: { mensagemId: String(mensagemId) } } },
      { new: true }
    ).select('ChatId mensagens membros').lean();

    try {
      chatWebSocketServer.notifyMessageDelete(String(ChatId), String(mensagemId), String(userId || msg.userId));
      const membros = updated?.membros || [];
      membros.forEach(membro => {
        chatWebSocketServer.notifyChatUpdate(String(membro.userId), updated);
      });
    } catch (wsError) {
      console.warn('Erro ao enviar notificação WebSocket:', wsError);
    }

    return res.status(200).json({ msg: 'Mensagem deletada', mensagens: updated ? updated.mensagens : [] });
  } catch (error) {
    console.error('deletarMensagem error:', error);
    return res.status(500).json({ error: 'Erro ao deletar mensagem' });
  }
};

// adicionarUsuario (POST /adicionar-usuario-chat)
export const adicionarUsuario = async (req, res) => {
  const { ChatId } = req.query || {};
  const { userId, username } = req.body || {};

  if (!ChatId) return res.status(400).json({ error: 'ChatId (param) é obrigatório' });
  if (!userId || !username) return res.status(400).json({ error: 'userId e username são obrigatórios' });

  try {
    // busca chat
    const chat = await Chat.findOne({ ChatId: String(ChatId) }).select('ChatId membros').lean();
    if (!chat) return res.status(404).json({ error: 'Chat não encontrado' });

    const exists = (chat.membros || []).some(m => String(m.userId) === String(userId));
    if (exists) {
      return res.status(409).json({ error: 'Usuário já é membro do chat', membros: chat.membros });
    }

    const membroObj = {
      userId: String(userId),
      username: String(username),
      membroDesde: typeof getBrazilDate === 'function' ? getBrazilDate() : new Date()
    };

    const updated = await Chat.findOneAndUpdate(
      { ChatId: String(ChatId) },
      { $push: { membros: membroObj } },
      { new: true, runValidators: true }
    ).select('ChatId membros').lean();

    return res.status(201).json({ msg: 'Usuário adicionado', membros: updated.membros });
  } catch (error) {
    console.error('adicionarUsuario error:', error);
    return res.status(500).json({ error: 'Erro ao adicionar usuário' });
  }
};

// removerUsuario (POST /remover-usuario-chat)
// se após remoção não sobrar membros, remove o chat completo
export const removerUsuario = async (req, res) => {
  const { ChatId, userId: userIdParam } = req.query || {};
  // opcional: enviar no body quem está removendo para checar permissões (não implementado aqui)
  if (!ChatId) return res.status(400).json({ error: 'ChatId (param) é obrigatório' });
  if (!userIdParam) return res.status(400).json({ error: 'userId (param) é obrigatório' });

  try {
    const chat = await Chat.findOne({ ChatId: String(ChatId) }).select('ChatId membros').lean();
    if (!chat) return res.status(404).json({ error: 'Chat não encontrado' });

    const exists = (chat.membros || []).some(m => String(m.userId) === String(userIdParam));
    if (!exists) {
      return res.status(404).json({ error: 'Usuário não é membro deste chat', membros: chat.membros });
    }

    // remove o membro
    const updated = await Chat.findOneAndUpdate(
      { ChatId: String(ChatId) },
      { $pull: { membros: { userId: String(userIdParam) } } },
      { new: true }
    ).select('ChatId membros').lean();

    // se atualizado for nulo (improvável) ou membros vazio -> deletar chat
    const membrosAfter = updated ? (updated.membros || []) : [];
    if (membrosAfter.length === 0) {
      // deleta o chat
      await Chat.deleteOne({ ChatId: String(ChatId) });
      return res.status(200).json({ msg: 'Usuário removido. Chat sem membros, chat deletado.' });
    }

    return res.status(200).json({ msg: 'Usuário removido', membros: membrosAfter });
  } catch (error) {
    console.error('removerUsuario error:', error);
    return res.status(500).json({ error: 'Erro ao remover usuário' });
  }
};

/**
 * Marca VÁRIAS mensagens como vistas por um userId (bulk)
 * body: { ChatId, mensagemIds: [..], userId }
 *
 * Usa arrayFilters para aplicar o $addToSet em cada elemento cujo mensagemId esteja no array.
 */
export const marcarMensagensVistas = async (req, res) => {
  const { ChatId, mensagemIds, userId } = req.body || {};

  if (!ChatId || !Array.isArray(mensagemIds) || mensagemIds.length === 0 || !userId) {
    return res.status(400).json({ error: 'ChatId, mensagemIds (array) e userId são obrigatórios' });
  }

  try {
    // Atualiza todos os elementos do array mensagens cujo mensagemId esteja em mensagemIds
    // Garante que cada usuário só pode marcar uma mensagem como vista uma única vez
    const vistoObj = {
      userId: String(userId),
      vistoEm: typeof getBrazilDate === 'function' ? getBrazilDate() : new Date()
    };
    
    const updateResult = await Chat.updateOne(
      { ChatId: String(ChatId) },
      { $addToSet: { 'mensagens.$[elem].vistos': vistoObj } },
      {
        arrayFilters: [{ 
          'elem.mensagemId': { $in: mensagemIds.map(String) },
          'elem.vistos.userId': { $ne: String(userId) }
        }],
        // new não se aplica a updateOne; iremos buscar o documento atualizado depois
      }
    );

    // buscar chat atualizado (apenas mensagens afetadas)
    const chat = await Chat.findOne({ ChatId: String(ChatId) }).lean();
    if (!chat) return res.status(404).json({ error: 'Chat não encontrado' });

    // Broadcast WebSocket para outros usuários no chat
    if (chatWebSocketServer && updateResult.modifiedCount > 0) {
      chatWebSocketServer.broadcastToChat(ChatId, {
        type: 'messages_seen',
        chatId: ChatId,
        mensagemIds: mensagemIds,
        userId: String(userId),
        vistoEm: typeof getBrazilDate === 'function' ? getBrazilDate() : new Date(),
        timestamp: new Date().toISOString()
      }, String(userId));
    }

    // extrair mensagens atualizadas e retornar
    const updatedMsgs = (chat.mensagens || []).filter(m => mensagemIds.map(String).includes(String(m.mensagemId)));
    return res.status(200).json({ success: true, updatedCount: updatedMsgs.length, mensagens: updatedMsgs });
  } catch (err) {
    console.error('marcarMensagensVistas error:', err);
    return res.status(500).json({ error: 'Erro no servidor ao marcar mensagens vistas' });
  }
};

// Editar mensagem
export const editarMensagem = async (req, res) => {
  const { ChatId, mensagemId } = req.query || {};
  const { userId, novoConteudo } = req.body || {};

  if (!ChatId || !mensagemId) {
    return res.status(400).json({ error: 'ChatId e mensagemId são obrigatórios' });
  }
  if (!userId || !novoConteudo) {
    return res.status(400).json({ error: 'userId e novoConteudo são obrigatórios' });
  }

  try {
    const chat = await Chat.findOne({ ChatId: String(ChatId) }).lean();
    if (!chat) return res.status(404).json({ error: 'Chat não encontrado' });

    const mensagem = chat.mensagens.find(m => String(m.mensagemId) === String(mensagemId));
    if (!mensagem) return res.status(404).json({ error: 'Mensagem não encontrada' });

    // Verificar se o usuário é o autor da mensagem
    if (String(mensagem.userId) !== String(userId)) {
      return res.status(403).json({ error: 'Apenas o autor pode editar a mensagem' });
    }

    const conteudoAnterior = String(mensagem.conteudo || '');
    const editadoEm = typeof getBrazilDate === 'function' ? getBrazilDate() : new Date();

    const updated = await Chat.findOneAndUpdate(
      { ChatId: String(ChatId), 'mensagens.mensagemId': String(mensagemId) },
      { 
        $set: { 
          'mensagens.$.conteudo': String(novoConteudo),
          'mensagens.$.editado': true,
          'mensagens.$.editadoEm': editadoEm
        },
        $push: {
          'mensagens.$.historicoEdicoes': { conteudo: conteudoAnterior, editadoEm, userId: String(userId) }
        }
      },
      { new: true }
    ).lean();

    const mensagemEditada = updated.mensagens.find(m => String(m.mensagemId) === String(mensagemId));

    try {
      chatWebSocketServer.notifyMessageUpdate(String(ChatId), mensagemEditada, String(userId));
      const membros = updated?.membros || [];
      membros.forEach(membro => {
        chatWebSocketServer.notifyChatUpdate(String(membro.userId), updated);
      });
    } catch (wsError) {
      console.warn('Erro ao enviar notificação WebSocket:', wsError);
    }

    return res.status(200).json({ success: true, mensagem: mensagemEditada });
  } catch (error) {
    console.error('editarMensagem error:', error);
    return res.status(500).json({ error: 'Erro ao editar mensagem' });
  }
};

export const deletarChat = async (req, res) => {
  const { ChatId } = req.query || {};
  const { userId } = req.body || {};

  if (!ChatId) return res.status(400).json({ error: 'ChatId é obrigatório' });
  if (!userId) return res.status(400).json({ error: 'userId é obrigatório' });

  try {
    const chat = await Chat.findOne({ ChatId: String(ChatId) }).select('ChatId membros').lean();
    if (!chat) return res.status(404).json({ error: 'Chat não encontrado' });

    const isMember = Array.isArray(chat.membros) && chat.membros.some(m => String(m.userId) === String(userId));
    if (!isMember) return res.status(403).json({ error: 'Sem permissão para deletar este chat' });

    await Chat.deleteOne({ ChatId: String(ChatId) });

    try {
      (chat.membros || []).forEach(m => {
        chatWebSocketServer.notifyChatDeleted(String(m.userId), String(ChatId));
      });
    } catch (wsError) {
      console.warn('Erro ao enviar notificação WebSocket:', wsError);
    }

    return res.status(200).json({ success: true, msg: 'Chat deletado' });
  } catch (error) {
    console.error('deletarChat error:', error);
    return res.status(500).json({ error: 'Erro ao deletar chat' });
  }
};

export const exportarHistoricoChat = async (req, res) => {
  const { ChatId } = req.query || {};
  const { limit = 5000, antes } = req.query || {};

  if (!ChatId) return res.status(400).json({ error: 'ChatId é obrigatório' });

  try {
    const chat = await Chat.findOne({ ChatId: String(ChatId) }).lean();
    if (!chat) return res.status(404).json({ error: 'Chat não encontrado' });

    const membros = Array.isArray(chat.membros) ? chat.membros : [];
    const byUserId = Object.fromEntries(
      membros.map(m => [String(m.userId), { userId: String(m.userId), username: String(m.username || 'Usuário') }])
    );

    let mensagens = Array.isArray(chat.mensagens) ? chat.mensagens : [];
    if (antes) {
      const antesDate = new Date(antes);
      mensagens = mensagens.filter(m => new Date(m.publicadoEm) < antesDate);
    }

    mensagens.sort((a, b) => new Date(a.publicadoEm) - new Date(b.publicadoEm));

    const limitNum = Math.min(parseInt(limit) || 5000, 20000);
    mensagens = mensagens.slice(Math.max(0, mensagens.length - limitNum));

    return res.status(200).json({
      success: true,
      exportedAt: new Date().toISOString(),
      chat: {
        ChatId: String(chat.ChatId),
        ChatName: chat.ChatName,
        ChatDesc: chat.ChatDesc,
        criadoEm: chat.criadoEm,
        membros
      },
      mensagens: mensagens.map(m => ({
        mensagemId: m.mensagemId,
        userId: m.userId,
        sender: byUserId[String(m.userId)] || { userId: String(m.userId), username: 'Usuário' },
        conteudo: m.conteudo,
        publicadoEm: m.publicadoEm,
        editado: !!m.editado,
        editadoEm: m.editadoEm,
        historicoEdicoes: Array.isArray(m.historicoEdicoes) ? m.historicoEdicoes : []
      }))
    });
  } catch (error) {
    console.error('exportarHistoricoChat error:', error);
    return res.status(500).json({ error: 'Erro ao exportar histórico' });
  }
};

// Responder mensagem
export const responderMensagem = async (req, res) => {
  const { ChatId, otherUserId } = req.query || {};
  const { userId, conteudo, respondendoA, creatorUsername } = req.body || {};

  if (!conteudo) return res.status(400).json({ error: 'conteudo é obrigatório' });
  if (!userId) return res.status(400).json({ error: 'userId é obrigatório' });
  if (!respondendoA || !respondendoA.mensagemId) {
    return res.status(400).json({ error: 'respondendoA com mensagemId é obrigatório' });
  }

  const mensagemObj = {
    userId: String(userId),
    mensagemId: uuidv4(),
    conteudo: String(conteudo),
    tipo: 'texto',
    respondendoA: {
      mensagemId: String(respondendoA.mensagemId),
      conteudo: String(respondendoA.conteudo || ''),
      userId: String(respondendoA.userId || '')
    },
    vistos: [{
      userId: String(userId),
      vistoEm: typeof getBrazilDate === 'function' ? getBrazilDate() : new Date()
    }],
    publicadoEm: typeof getBrazilDate === 'function' ? getBrazilDate() : new Date()
  };

  try {
    if (ChatId) {
      const updated = await Chat.findOneAndUpdate(
        { ChatId: String(ChatId) },
        { $push: { mensagens: mensagemObj } },
        { new: true }
      ).lean();
      if (!updated) return res.status(404).json({ error: 'Chat não encontrado' });
      return res.status(201).json({ mensagem: mensagemObj, mensagens: updated.mensagens, chat: updated });
    }

    if (otherUserId) {
      const uid = String(userId);
      const oid = String(otherUserId);
      const pairId = [uid, oid].sort().join(':');

      let otherUser = null;
      try { otherUser = await User.findById(oid).select('username').lean(); } catch (e) { otherUser = null; }
      let creatorUser = null;
      try { creatorUser = await User.findById(uid).select('username').lean(); } catch (e) { creatorUser = null; }

      const otherUsernameSafe = (otherUser && otherUser.username) ? otherUser.username : 'Contato';
      const creatorUsernameSafe = (creatorUser && creatorUser.username) ? creatorUser.username : (creatorUsername || 'Usuário');

      const setOnInsert = {
        ChatId: uuidv4(),
        pairId,
        ChatName: `${creatorUsernameSafe} & ${otherUsernameSafe}`,
        ChatDesc: 'Conversa privada',
        criadoEm: typeof getBrazilDate === 'function' ? getBrazilDate() : new Date(),
        membros: [
          { userId: uid, username: creatorUsernameSafe, membroDesde: typeof getBrazilDate === 'function' ? getBrazilDate() : new Date() },
          { userId: oid, username: otherUsernameSafe, membroDesde: typeof getBrazilDate === 'function' ? getBrazilDate() : new Date() }
        ]
      };

      const updated = await Chat.findOneAndUpdate(
        { pairId },
        { $setOnInsert: setOnInsert, $push: { mensagens: mensagemObj } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ).lean();

      return res.status(201).json({ mensagem: mensagemObj, mensagens: updated.mensagens, chat: updated });
    }

    return res.status(400).json({ error: 'Envie ChatId ou otherUserId' });
  } catch (err) {
    console.error('responderMensagem error:', err);
    return res.status(500).json({ error: 'Erro ao responder mensagem' });
  }
};

// Marcar mensagens como vistas (versão melhorada)
export const marcarMensagensVistasV2 = async (req, res) => {
  const { ChatId, mensagemIds, userId } = req.body || {};

  if (!ChatId || !Array.isArray(mensagemIds) || mensagemIds.length === 0 || !userId) {
    return res.status(400).json({ error: 'ChatId, mensagemIds (array) e userId são obrigatórios' });
  }

  try {
    const vistoObj = {
      userId: String(userId),
      vistoEm: typeof getBrazilDate === 'function' ? getBrazilDate() : new Date()
    };

    const updateResult = await Chat.updateOne(
      { ChatId: String(ChatId) },
      { $addToSet: { 'mensagens.$[elem].vistos': vistoObj } },
      {
        arrayFilters: [{ 
          'elem.mensagemId': { $in: mensagemIds.map(String) },
          'elem.vistos.userId': { $ne: String(userId) }
        }]
      }
    );

    const chat = await Chat.findOne({ ChatId: String(ChatId) }).lean();
    if (!chat) return res.status(404).json({ error: 'Chat não encontrado' });

    const updatedMsgs = (chat.mensagens || []).filter(m => mensagemIds.map(String).includes(String(m.mensagemId)));
    
    // Broadcast WebSocket para outros usuários no chat
    if (chatWebSocketServer && updateResult.modifiedCount > 0) {
      chatWebSocketServer.broadcastToChat(ChatId, {
        type: 'messages_seen',
        chatId: ChatId,
        mensagemIds: mensagemIds,
        userId: String(userId),
        vistoEm: typeof getBrazilDate === 'function' ? getBrazilDate() : new Date(),
        timestamp: new Date().toISOString()
      }, String(userId));
    }
    
    return res.status(200).json({ success: true, updatedCount: updatedMsgs.length, mensagens: updatedMsgs });
  } catch (err) {
    console.error('marcarMensagensVistasV2 error:', err);
    return res.status(500).json({ error: 'Erro no servidor ao marcar mensagens vistas' });
  }
};

// Configurar chat (arquivar, fixar, notificações)
export const configurarChat = async (req, res) => {
  const { ChatId } = req.query || {};
  const { configuracoes } = req.body || {};

  if (!ChatId) return res.status(400).json({ error: 'ChatId é obrigatório' });
  if (!configuracoes) return res.status(400).json({ error: 'configuracoes é obrigatório' });

  try {
    const updateObj = {};
    if (typeof configuracoes.notificacoes === 'boolean') {
      updateObj['configuracoes.notificacoes'] = configuracoes.notificacoes;
    }
    if (typeof configuracoes.arquivado === 'boolean') {
      updateObj['configuracoes.arquivado'] = configuracoes.arquivado;
    }
    if (typeof configuracoes.fixado === 'boolean') {
      updateObj['configuracoes.fixado'] = configuracoes.fixado;
    }

    const updated = await Chat.findOneAndUpdate(
      { ChatId: String(ChatId) },
      { $set: updateObj },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ error: 'Chat não encontrado' });

    return res.status(200).json({ success: true, configuracoes: updated.configuracoes });
  } catch (error) {
    console.error('configurarChat error:', error);
    return res.status(500).json({ error: 'Erro ao configurar chat' });
  }
};

// Buscar histórico de mensagens com paginação
export const buscarHistorico = async (req, res) => {
  const { ChatId } = req.query || {};
  const { page = 1, limit = 50, antes } = req.query || {};

  if (!ChatId) return res.status(400).json({ error: 'ChatId é obrigatório' });

  try {
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 50, 100); // máximo 100 mensagens por vez
    const skip = (pageNum - 1) * limitNum;

    let query = { ChatId: String(ChatId) };
    
    const chat = await Chat.findOne(query).lean();
    if (!chat) return res.status(404).json({ error: 'Chat não encontrado' });

    let mensagens = chat.mensagens || [];
    
    // Filtrar mensagens antes de uma data específica se fornecida
    if (antes) {
      const antesDate = new Date(antes);
      mensagens = mensagens.filter(m => new Date(m.publicadoEm) < antesDate);
    }

    // Ordenar por data (mais recentes primeiro) e paginar
    mensagens.sort((a, b) => new Date(b.publicadoEm) - new Date(a.publicadoEm));
    const totalMensagens = mensagens.length;
    const mensagensPaginadas = mensagens.slice(skip, skip + limitNum);

    return res.status(200).json({
      success: true,
      mensagens: mensagensPaginadas,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalMensagens,
        pages: Math.ceil(totalMensagens / limitNum),
        hasNext: skip + limitNum < totalMensagens,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    console.error('buscarHistorico error:', error);
    return res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
};
