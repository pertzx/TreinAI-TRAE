import express from 'express'
import { findImageByQuery, generateImage } from '../controllers/ImageController.js'
import { verificarToken } from '../middlewares/authMiddleware.js'
import { imageGenerateRateLimit, imageFindRateLimit } from '../middlewares/rateLimitMiddleware.js'
import { imageAuthGuard } from '../middlewares/imageAuthGuard.js'
import { apiSecurityHeaders } from '../middlewares/securityHeaders.js'
import { checkTokenLimit } from '../middlewares/tokenLimitMiddleware.js'
import { queueMiddleware } from '../middlewares/queueMiddleware.js'

const router = express.Router()

router.get('/find', imageFindRateLimit, apiSecurityHeaders, findImageByQuery)
router.post('/generate', imageGenerateRateLimit, apiSecurityHeaders, verificarToken, imageAuthGuard, queueMiddleware, checkTokenLimit, generateImage)

export default router
