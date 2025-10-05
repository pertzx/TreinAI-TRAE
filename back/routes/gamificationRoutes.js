import express from 'express';

import { verificarToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Middleware de autenticação para todas as rotas
router.use(verificarToken);

export default router;