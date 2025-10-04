import express from 'express';
import { getTokenStats } from '../middlewares/tokenLimitMiddleware.js';

const router = express.Router();

// Endpoint para consultar estatísticas de uso de tokens
router.post('/token-stats', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Email é obrigatório' 
      });
    }

    const stats = await getTokenStats(email);
    
    return res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas de tokens:', error);
    return res.status(500).json({
      success: false,
      msg: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;