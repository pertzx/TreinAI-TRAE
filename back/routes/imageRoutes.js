import express from 'express'
import { findImageByQuery, generateImage } from '../controllers/ImageController.js'
import { verificarToken } from '../middlewares/authMiddleware.js'
import { apiSecurityHeaders } from '../middlewares/securityHeaders.js'

const router = express.Router()

router.get('/find', apiSecurityHeaders, findImageByQuery)
const allowedCreator = process.env.IMAGE_CREATOR_EMAIL

router.post('/generate', apiSecurityHeaders, verificarToken, (req, res, next) => {
  if (!allowedCreator) return res.status(503).json({ success: false, message: 'IMAGE_CREATOR_EMAIL não configurado' })
  if (String(req.userEmail || '').toLowerCase() !== String(allowedCreator).toLowerCase()) {
    return res.status(403).json({ success: false, message: 'Apenas o proprietário pode criar imagens' })
  }
  next()
}, generateImage)

export default router
