import { Router } from 'express';
import { getPublicPlans } from '../controllers/PlanController.js';

const router = Router();

// Público: planos ativos para a landing.
router.get('/', getPublicPlans);

export default router;
