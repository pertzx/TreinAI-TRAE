// routes/authRoutes.js
import { Router } from 'express';
import { verificarToken } from '../middlewares/authMiddleware.js';
import { isAdmin } from '../middlewares/authorizationMiddleware.js';
import { adminRateLimit } from '../middlewares/rateLimitMiddleware.js';
import { adminSecurityHeaders } from '../middlewares/securityHeaders.js';
import { getLocaisAdmin, updateLocalStatus, deleteLocal, editLocal } from '../controllers/AdminLocalController.js';
import { adicionarRespostaSupport, alterarStatusAnuncio, alterarVisibilidadeSuporte, getAnunciosByAdmin, getSupportsByAdmin, getUsers, getAIDashboard, manageCacheRedis, getAPIPerformanceMetrics, getAPIErrorLogs, resolveAPIError, criarRanking, editarRanking, deletarRanking, getRankings, getDetailedAIAnalytics, getGlobalSettings, updateGlobalSettings, grantFounderTrial } from '../controllers/AdminController.js';
import {
  getCacheDashboard,
  performCacheMaintenance,
  getCacheMonitoring,
  configureCacheAlerts
} from '../controllers/CacheAdminController.js';
import { getAdminPlans, updatePlan, createPlan, deletePlan } from '../controllers/PlanController.js';
import { getAdminMilestones, createMilestone, updateMilestone, deleteMilestone } from '../controllers/MilestoneController.js';
import { banUser, unbanUser, setUserPlan, resetAiUsage, deleteUser, getAuditLogs } from '../controllers/AdminUserController.js';
const router = Router();

// TODAS as rotas admin exigem token válido + papel de admin (role==='admin').
// Isso substitui a confiança no `adminId` vindo do body/query (escalonamento).
router.use(verificarToken, isAdmin);

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

// Analytics / desempenho do SaaS
import { getAdminAnalytics } from '../controllers/analytics.js';
router.post('/analytics', adminRateLimit, adminSecurityHeaders, getAdminAnalytics) // body: adminId, days?

// Configurações globais (modelo de custo de IA)
router.post('/global-settings', adminRateLimit, adminSecurityHeaders, getGlobalSettings) // body: adminId
router.post('/update-global-settings', adminRateLimit, adminSecurityHeaders, updateGlobalSettings) // body: adminId + campos

// Planos comerciais (landing + edição)
router.post('/plans', adminRateLimit, adminSecurityHeaders, getAdminPlans) // body: adminId
router.post('/update-plan', adminRateLimit, adminSecurityHeaders, updatePlan) // body: adminId, key, ...campos
router.post('/create-plan', adminRateLimit, adminSecurityHeaders, createPlan) // body: adminId, key, name, ...
router.post('/delete-plan', adminRateLimit, adminSecurityHeaders, deletePlan) // body: adminId, key

// Trial "Profissional Fundador"
router.post('/grant-trial', adminRateLimit, adminSecurityHeaders, grantFounderTrial) // body: adminId, userId, days?, aiBudgetBRL?

// Conquistas / marcos configuráveis
router.post('/milestones', adminRateLimit, adminSecurityHeaders, getAdminMilestones) // body: adminId
router.post('/create-milestone', adminRateLimit, adminSecurityHeaders, createMilestone) // body: adminId, key, type, title, ...
router.post('/update-milestone', adminRateLimit, adminSecurityHeaders, updateMilestone) // body: adminId, key, ...campos
router.post('/delete-milestone', adminRateLimit, adminSecurityHeaders, deleteMilestone) // body: adminId, key

// Gestão de usuários (admin)
router.post('/ban-user', adminRateLimit, adminSecurityHeaders, banUser) // body: userId, motivo
router.post('/unban-user', adminRateLimit, adminSecurityHeaders, unbanUser) // body: userId
router.post('/set-plan', adminRateLimit, adminSecurityHeaders, setUserPlan) // body: userId, planType, status?, aiBudgetBRL?
router.post('/reset-ai-usage', adminRateLimit, adminSecurityHeaders, resetAiUsage) // body: userId
router.post('/delete-user', adminRateLimit, adminSecurityHeaders, deleteUser) // body: userId
router.post('/audit-logs', adminRateLimit, adminSecurityHeaders, getAuditLogs) // body: page, limit, action?, email?

// Ranking
router.get('/rankings', verificarToken, adminRateLimit, adminSecurityHeaders, getRankings)
router.post('/criar-ranking', verificarToken, adminRateLimit, adminSecurityHeaders, criarRanking)
router.post('/editar-ranking', verificarToken, adminRateLimit, adminSecurityHeaders, editarRanking) 
router.post('/deletar-ranking', verificarToken, adminRateLimit, adminSecurityHeaders, deletarRanking) 


export default router;
