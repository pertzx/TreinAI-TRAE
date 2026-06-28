import express from 'express';
import { getAiBudgetStats } from '../middlewares/tokenLimitMiddleware.js';
import { verificarToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Endpoint para consultar estatísticas de uso de tokens
// Agora usa o token do cookie (req.user) em vez de email no body
router.post('/token-stats', verificarToken, async (req, res) => {
  try {
    // Usa o email do usuário autenticado pelo cookie
    const email = req.user?.email;
    
    if (!email) {
      return res.status(401).json({ 
        success: false, 
        msg: 'Usuário não autenticado' 
      });
    }

    const stats = await getAiBudgetStats(email);
    
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
