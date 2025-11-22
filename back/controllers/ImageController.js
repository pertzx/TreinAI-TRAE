import { uploadToCloudinary } from '../config/cloudinaryConfig.js'
import redisCache from '../config/redis.js'
import ImageAsset from '../models/ImageAsset.js'
import User from '../models/User.js'
import { registerTokenUsage } from '../middlewares/tokenLimitMiddleware.js'
import OpenAI from 'openai'
import crypto from 'crypto'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const normalize = (s) => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ')

export const findImageByQuery = async (req, res) => {
  try {
    const q = normalize(req.query.query)
    if (!q) return res.status(400).json({ success: false, message: 'Query inválida' })
    const asset = await ImageAsset.findOne({ normalizedQuery: q }).lean()
    if (!asset) return res.status(404).json({ success: false, found: false })
    return res.json({ success: true, found: true, url: asset.cloudinaryUrl, publicId: asset.cloudinaryPublicId })
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Erro ao consultar imagem' })
  }
}

export const generateImage = async (req, res) => {
  try {
    const original = String(req.body.query || '')
    const q = normalize(original)
    console.log('[images/generate] start', { original, q })
    if (!q) return res.status(400).json({ success: false, message: 'Query inválida' })
    const existing = await ImageAsset.findOne({ normalizedQuery: q }).lean()
    if (existing) {
      console.log('[images/generate] cache hit', { publicId: existing.cloudinaryPublicId })
      return res.json({ success: true, url: existing.cloudinaryUrl, publicId: existing.cloudinaryPublicId, cached: true })
    }

    const email = String(req.userEmail || '').toLowerCase()
    const user = await User.findOne({ email })
    if (!user) return res.status(401).json({ success: false, message: 'Usuário não autenticado' })
    if (user?.ban?.banned) return res.status(403).json({ success: false, message: 'Usuário banido' })
    if (user?.planInfos?.status === 'inativo') return res.status(403).json({ success: false, message: 'Plano inativo' })

    console.log('[images/generate] user ok', { email, plan: user?.planInfos?.planType })

    const ai = await openai.images.generate({ model: 'gpt-image-1', prompt: original, size: '1024x1024' })
    console.log('[images/generate] openai done', { items: Array.isArray(ai?.data) ? ai.data.length : 0 })
    const b64 = ai?.data?.[0]?.b64_json
    if (!b64) return res.status(502).json({ success: false, message: 'Falha na geração de imagem' })
    const returnedCost = parseInt(
      (ai?.usage && (ai.usage.image_tokens || ai.usage.total_tokens)) ||
      (ai?.data?.[0]?.cost) ||
      (process.env.IMAGE_TOKEN_COST || '50')
    )
    console.log('[images/generate] cost', { returnedCost })

    const buffer = Buffer.from(b64, 'base64')

    const name = `${q.replace(/[^a-z0-9]+/g, '-')}-${crypto.randomUUID()}`
    const uploaded = await uploadToCloudinary(buffer, 'gptImages', 'image')
    console.log('[images/generate] cloudinary', uploaded)
    const asset = await ImageAsset.create({ originalQuery: original, normalizedQuery: q, cloudinaryUrl: uploaded.secure_url, cloudinaryPublicId: uploaded.public_id })
    console.log('[images/generate] db saved', { id: asset?._id })

    const regOk = await registerTokenUsage(email, returnedCost, req.body?.profissionalId || null)
    console.log('[images/generate] registerTokenUsage', { ok: regOk, returnedCost })
    try { if (redisCache?.isConnected) await redisCache.delete(`imggen:lock:${q}`) } catch (_) { }
    return res.json({ success: true, url: asset.cloudinaryUrl, publicId: asset.cloudinaryPublicId })
  } catch (e) {
    console.error('[images/generate] error', e?.response?.data || e?.message || e)
    try {
      const q = normalize(req.body.query || '')
      if (q && redisCache?.isConnected) await redisCache.delete(`imggen:lock:${q}`)
    } catch (_) { }
    return res.status(500).json({ success: false, message: 'Erro ao gerar imagem' })
  }
}
