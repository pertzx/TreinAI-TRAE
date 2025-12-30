import express from 'express';
import { getUsersBasicData, getUserBasicData } from '../controllers/userController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

const router = express.Router();

// Rota de teste sem autenticação
router.get('/users/test', (req, res) => {
  res.json({ message: 'Rota de usuários funcionando!', timestamp: new Date() });
});

// Rota de debug para listar usuários
router.get('/users/debug', async (req, res) => {
  try {
    const users = await User.find({}).select('_id userId username avatar email').limit(5).lean();
    res.json({ users, count: users.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rota de teste para buscar dados básicos sem autenticação (apenas para debug)
router.get('/users/basic-debug', async (req, res) => {
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
});

// Rota temporária para testar busca de usuários sem autenticação
router.get('/users/basic-no-auth', async (req, res) => {
  try {
    const { userIds } = req.query;
    
    if (!userIds) {
      return res.status(400).json({ error: 'userIds é obrigatório' });
    }

    const userIdArray = userIds.split(',').map(id => id.trim());
    
    // Buscar por userId ou _id
    const users = await User.find({
      $or: [
        { userId: { $in: userIdArray } },
        { _id: { $in: userIdArray.filter(id => mongoose.Types.ObjectId.isValid(id)) } }
      ]
    }, '_id userId username avatar email isOnline lastActive').lean();

    const oneMinuteAgo = new Date(Date.now() - 60000);
    const usersWithStatus = users.map(u => ({
      ...u,
      isOnline: u.isOnline && u.lastActive > oneMinuteAgo
    }));

    res.json(usersWithStatus);
  } catch (error) {
    console.error('Erro ao buscar dados básicos de usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar dados básicos de múltiplos usuários
router.get('/users/basic', authenticateToken, getUsersBasicData);

// Buscar dados básicos de um usuário específico
router.get('/users/basic/:userId', authenticateToken, getUserBasicData);

export default router;