import { Router } from 'express';
import { getPublicMilestones } from '../controllers/MilestoneController.js';

const router = Router();

// Público: gatilhos de conquista ativos.
router.get('/', getPublicMilestones);

export default router;
