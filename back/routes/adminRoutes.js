// routes/authRoutes.js
import { Router } from 'express';
import { verificarToken } from '../middlewares/authMiddleware.js';
import { adminRateLimit } from '../middlewares/rateLimitMiddleware.js';
import { adminSecurityHeaders } from '../middlewares/securityHeaders.js';
import { getLocaisAdmin, updateLocalStatus, deleteLocal, editLocal } from '../controllers/AdminLocalController.js';
import { adicionarRespostaSupport, alterarStatusAnuncio, alterarVisibilidadeSuporte, getAnunciosByAdmin, getSupportsByAdmin, getUsers, getAIDashboard, manageCacheRedis, getAPIPerformanceMetrics, getAPIErrorLogs, resolveAPIError, criarRanking, editarRanking, deletarRanking, getRankings, getDetailedAIAnalytics } from '../controllers/AdminController.js';
import {
  getCacheDashboard,
  performCacheMaintenance,
  getCacheMonitoring,
  configureCacheAlerts
} from '../controllers/CacheAdminController.js';
const router = Router();

// Rotas administrativas com rate limiting específico
router.post('/usuarios', adminRateLimit, adminSecurityHeaders, getUsers) // body: adminId (obrigatório)
router.get('/anuncios-by-admin', adminRateLimit, adminSecurityHeaders, getAnunciosByAdmin) // query: adminId (obrigatório)
router.post('/alterar-status-anuncio', adminRateLimit, adminSecurityHeaders, alterarStatusAnuncio) // body: adminId, anuncioId, novoStatus (obrigatórios)
router.get('/supports-by-admin', adminRateLimit, adminSecurityHeaders, getSupportsByAdmin) // query: adminId,
router.post('/alterarVisibilidade-by-admin', adminRateLimit, adminSecurityHeaders, alterarVisibilidadeSuporte) // body: adminId, supportId, boolean
router.post('/adicionarRespostaSuportAdmin', adminRateLimit, adminSecurityHeaders, adicionarRespostaSupport) // body: adminId, supportId, resposta

// Rotas administrativas de locais
router.get('/locais', adminRateLimit, adminSecurityHeaders, getLocaisAdmin) // query: adminId (obrigatório)
router.post('/local-status', adminRateLimit, adminSecurityHeaders, updateLocalStatus) // body: adminId, localId, ativo
router.post('/delete-local', adminRateLimit, adminSecurityHeaders, deleteLocal) // body: adminId, localId
router.post('/edit-local', adminRateLimit, adminSecurityHeaders, editLocal) // body: adminId, localId, dados

// Rotas administrativas do sistema AI
router.get('/ai-dashboard', adminRateLimit, adminSecurityHeaders, getAIDashboard) // query: adminId (obrigatório)
router.post('/cache-management', adminRateLimit, adminSecurityHeaders, manageCacheRedis) // body: adminId, action, pattern (opcional)
router.post('/api-performance', adminRateLimit, adminSecurityHeaders, getAPIPerformanceMetrics) // body: adminId, timeRange (opcional)
router.post('/detailed-analytics', adminRateLimit, adminSecurityHeaders, getDetailedAIAnalytics) // body: adminId, timeRange (opcional)
router.post('/error-logs', adminRateLimit, adminSecurityHeaders, getAPIErrorLogs)
router.post('/resolve-error', adminRateLimit, adminSecurityHeaders, resolveAPIError)


// Rotas administrativas avançadas do cache Redis
router.get('/cache-dashboard', verificarToken, adminRateLimit, adminSecurityHeaders, getCacheDashboard)
router.post('/cache-maintenance', verificarToken, adminRateLimit, adminSecurityHeaders, performCacheMaintenance) // body: operations[]
router.get('/cache-monitoring', verificarToken, adminRateLimit, adminSecurityHeaders, getCacheMonitoring) // query: interval
router.post('/cache-alerts', verificarToken, adminRateLimit, adminSecurityHeaders, configureCacheAlerts) // body: alerts{}

// Ranking 
router.get('/rankings', verificarToken, adminRateLimit, adminSecurityHeaders, getRankings)
router.post('/criar-ranking', verificarToken, adminRateLimit, adminSecurityHeaders, criarRanking)
router.post('/editar-ranking', verificarToken, adminRateLimit, adminSecurityHeaders, editarRanking) 
router.post('/deletar-ranking', verificarToken, adminRateLimit, adminSecurityHeaders, deletarRanking) 


export default router;
