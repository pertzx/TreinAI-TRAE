import express from 'express';
import { trackVisit, getInteractionStats } from '../controllers/analytics.js';
import { verificarToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Registro de visita diária única (público — sem login).
router.post('/track-visit', trackVisit);

// Série de impressões/cliques de um alvo (anúncio/profissional/local) — autenticado.
router.post('/interaction-stats', verificarToken, getInteractionStats);

export default router;
