import express from 'express';
import { getUsersBasicData, getUserBasicData } from '../controllers/userController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

const router = express.Router();

/**
 * Dados básicos de usuários para o chat (username/avatar/online).
 * Exige login e NÃO expõe email (evita vazamento de PII / enumeração).
 * O nome do path é mantido por compat com o front, mas agora é autenticado.
 */
router.get('/users/basic-no-auth', authenticateToken, async (req, res) => {
  try {
    const { userIds } = req.query;
    if (!userIds) {
      return res.status(400).json({ error: 'userIds é obrigatório' });
    }

    const userIdArray = String(userIds).split(',').map(id => id.trim()).filter(Boolean);
    if (userIdArray.length === 0) {
      return res.status(400).json({ error: 'Pelo menos um userId deve ser fornecido' });
    }

    const users = await User.find({
      $or: [
        { userId: { $in: userIdArray } },
        { _id: { $in: userIdArray.filter(id => mongoose.Types.ObjectId.isValid(id)) } }
      ]
    }, '_id userId username avatar isOnline lastActive').lean();

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
