import express from 'express';
import {
  generateReport,
  getReports,
  getReport,
  shareReport,
  createReportTemplate,
  getReportTemplates
} from '../controllers/reportController.js';
import { verificarToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Middleware de autenticação para todas as rotas
router.use(verificarToken);

// Rotas de relatórios
router.post('/generate/:clientId', generateReport);
router.get('/', getReports);
router.get('/:reportId', getReport);
router.post('/:reportId/share', shareReport);

// Rotas de templates
router.post('/templates', createReportTemplate);
router.get('/templates', getReportTemplates);

export default router;