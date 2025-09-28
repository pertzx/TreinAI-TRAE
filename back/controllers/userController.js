import User from '../models/User.js';
import mongoose from 'mongoose';

/**
 * Buscar dados básicos de usuários por IDs
 * GET /users/basic?userIds=id1,id2,id3
 */
export const getUsersBasicData = async (req, res) => {
  const { userIds } = req.query;
  
  if (!userIds) {
    return res.status(400).json({ error: 'userIds é obrigatório' });
  }

  try {
    const userIdArray = userIds.split(',').map(id => id.trim()).filter(id => id);
    
    if (userIdArray.length === 0) {
      return res.status(400).json({ error: 'Pelo menos um userId deve ser fornecido' });
    }

    // Buscar usuários por _id ou userId
    const users = await User.find({
      $or: [
        { _id: { $in: userIdArray.filter(id => mongoose.Types.ObjectId.isValid(id)) } },
        { userId: { $in: userIdArray } }
      ]
    })
    .select('_id userId username avatar email')
    .lean();

    // Mapear para formato consistente
    const usersData = users.map(user => ({
      userId: user.userId || user._id.toString(),
      _id: user._id,
      username: user.username,
      avatar: user.avatar,
      email: user.email
    }));

    return res.status(200).json(usersData);
  } catch (error) {
    console.error('getUsersBasicData error:', error);
    return res.status(500).json({ error: 'Erro no servidor ao buscar dados dos usuários' });
  }
};

/**
 * Buscar dados básicos de um usuário por ID
 * GET /users/basic/:userId
 */
export const getUserBasicData = async (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId é obrigatório' });
  }

  try {
    let user = null;
    
    // Tentar buscar por _id se for ObjectId válido
    if (mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId)
        .select('_id userId username avatar email')
        .lean();
    }
    
    // Se não encontrou, tentar buscar por userId
    if (!user) {
      user = await User.findOne({ userId: String(userId) })
        .select('_id userId username avatar email')
        .lean();
    }

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const userData = {
      userId: user.userId || user._id.toString(),
      _id: user._id,
      username: user.username,
      avatar: user.avatar,
      email: user.email
    };

    return res.status(200).json(userData);
  } catch (error) {
    console.error('getUserBasicData error:', error);
    return res.status(500).json({ error: 'Erro no servidor ao buscar dados do usuário' });
  }
};