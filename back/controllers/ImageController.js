import redisCache from '../config/redis.js'
import ImageAsset from '../models/ImageAsset.js'
import User from '../models/User.js'
import { registerTokenUsage } from '../middlewares/tokenLimitMiddleware.js'
import OpenAI from 'openai'
import crypto from 'crypto'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const normalize = (s) => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ')

const PROMPT_SUFFIX = ': Realistico, Demonstrativo com destaque no musculo'

const buildAssetUrl = (asset) => {
  if (!asset) return null
  if (asset.inlineBase64) return `data:${asset.inlineMimeType || 'image/png'};base64,${asset.inlineBase64}`
  if (asset.cloudinaryUrl) return asset.cloudinaryUrl
  return null
}

const nowIsoSafe = () => new Date()

const computeRetryAfterMs = (asset, now) => {
  const until = asset?.lockUntil ? new Date(asset.lockUntil).getTime() : null
  if (!until || Number.isNaN(until)) return 2000
  const ms = until - now.getTime()
  return Math.max(500, Math.min(15000, ms))
}

export const findImageByQuery = async (req, res) => {
  try {
    const q = normalize(req.query.query)
    if (!q) return res.status(400).json({ success: false, message: 'Query inválida' })
    const asset = await ImageAsset.findOne({ normalizedQuery: q }).lean()
    if (!asset) {
      return res.json({
        success: true,
        found: false,
        status: 'missing',
        normalizedQuery: q
      })
    }

    const url = buildAssetUrl(asset)
    const status = asset.status || (url ? 'ready' : 'failed')
    if (status === 'generating' && asset.lockUntil && new Date(asset.lockUntil) > nowIsoSafe()) {
      const now = nowIsoSafe()
      return res.status(202).json({
        success: true,
        found: false,
        status: 'generating',
        normalizedQuery: q,
        retryAfterMs: computeRetryAfterMs(asset, now)
      })
    }

    if (!url) {
      return res.json({
        success: true,
        found: false,
        status: status === 'generating' ? 'generating' : 'failed',
        normalizedQuery: q
      })
    }

    return res.json({
      success: true,
      found: true,
      status: 'ready',
      url,
      publicId: asset.cloudinaryPublicId,
      storage: asset.storage || (asset.inlineBase64 ? 'inline' : 'cloudinary'),
      normalizedQuery: q
    })
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Erro ao consultar imagem' })
  }
}

export const generateImage = async (req, res) => {
  try {
    const baseQuery = String(req.body.query || '').trim()
    const q = normalize(baseQuery)
    console.log('[images/generate] start', { q })
    if (!q) return res.status(400).json({ success: false, message: 'Query inválida' })

    const now = nowIsoSafe()

    const existing = await ImageAsset.findOne({ normalizedQuery: q }).lean()
    if (existing) {
      const url = buildAssetUrl(existing)
      const status = existing.status || (url ? 'ready' : 'failed')
      if (url) {
        console.log('[images/generate] cache hit', { storage: existing.storage, status })
        return res.json({
          success: true,
          status: 'ready',
          url,
          publicId: existing.cloudinaryPublicId,
          cached: true,
          storage: existing.storage,
          normalizedQuery: q
        })
      }

      if (status === 'generating' && existing.lockUntil && new Date(existing.lockUntil) > now) {
        return res.status(202).json({
          success: true,
          status: 'generating',
          found: false,
          cached: false,
          normalizedQuery: q,
          retryAfterMs: computeRetryAfterMs(existing, now)
        })
      }
    }

    const email = String(req.userEmail || '').toLowerCase()
    const user = await User.findOne({ email })
    if (!user) return res.status(401).json({ success: false, message: 'Usuário não autenticado' })
    if (user?.ban?.banned) return res.status(403).json({ success: false, message: 'Usuário banido' })
    if (user?.planInfos?.status === 'inativo' && user?.planInfos?.planType !== 'free') return res.status(403).json({ success: false, message: 'Plano inativo' })

    console.log('[images/generate] user ok', { email, plan: user?.planInfos?.planType })

    const lockId = (crypto.randomUUID && crypto.randomUUID()) || crypto.randomBytes(16).toString('hex')
    const lockMs = Number(process.env.IMAGE_GEN_LOCK_MS || 120000)

    let locked = null
    try {
      locked = await ImageAsset.findOneAndUpdate(
        {
          normalizedQuery: q,
          $or: [
            { status: { $ne: 'generating' } },
            { lockUntil: { $lte: now } },
            { lockUntil: null }
          ]
        },
        {
          $setOnInsert: {
            originalQuery: baseQuery,
            normalizedQuery: q,
            storage: 'inline',
            createdAt: now
          },
          $set: {
            status: 'generating',
            lockId,
            lockUntil: new Date(now.getTime() + lockMs),
            lastError: null,
            updatedAt: now
          }
        },
        { upsert: true, new: true }
      ).lean()
    } catch (err) {
      if (err && err.code === 11000) {
        const current = await ImageAsset.findOne({ normalizedQuery: q }).lean()
        if (current) {
          const url = buildAssetUrl(current)
          if (url) {
            return res.json({
              success: true,
              status: 'ready',
              url,
              publicId: current.cloudinaryPublicId,
              cached: true,
              storage: current.storage,
              normalizedQuery: q
            })
          }
          return res.status(202).json({
            success: true,
            status: 'generating',
            found: false,
            cached: false,
            normalizedQuery: q,
            retryAfterMs: computeRetryAfterMs(current, now)
          })
        }
      }
      throw err
    }

    if (!locked || locked.lockId !== lockId) {
      const current = await ImageAsset.findOne({ normalizedQuery: q }).lean()
      const retryAfterMs = current ? computeRetryAfterMs(current, now) : 2000
      return res.status(202).json({
        success: true,
        status: 'generating',
        found: false,
        cached: false,
        normalizedQuery: q,
        retryAfterMs
      })
    }

    const prompt = `${baseQuery}${PROMPT_SUFFIX}`

    const ai = await openai.images.generate({ model: 'gpt-image-1', prompt, size: '512x512', quality: 'medium' })
    console.log('[images/generate] openai done', { items: Array.isArray(ai?.data) ? ai.data.length : 0 })
    const b64 = ai?.data?.[0]?.b64_json
    if (!b64) {
      await ImageAsset.deleteOne({ normalizedQuery: q, lockId, inlineBase64: null, cloudinaryUrl: null })
      return res.status(502).json({
        success: false,
        status: 'failed',
        message: 'Falha na geração de imagem',
        normalizedQuery: q
      })
    }
    const returnedCost = parseInt(
      (ai?.usage && (ai.usage.image_tokens || ai.usage.total_tokens)) ||
      (ai?.data?.[0]?.cost) ||
      (process.env.IMAGE_TOKEN_COST || '50')
    )
    console.log('[images/generate] cost', { returnedCost })

    const updated = await ImageAsset.findOneAndUpdate(
      { normalizedQuery: q, lockId },
      {
        $set: {
          originalQuery: baseQuery,
          inlineBase64: b64,
          inlineMimeType: 'image/png',
          storage: 'inline',
          status: 'ready',
          lockId: null,
          lockUntil: null,
          updatedAt: nowIsoSafe()
        }
      },
      { new: true }
    ).lean()

    if (!updated) {
      return res.status(500).json({
        success: false,
        status: 'failed',
        message: 'Falha ao finalizar persistência da imagem',
        normalizedQuery: q
      })
    }
    console.log('[images/generate] db saved', { id: updated?._id })

    const regOk = await registerTokenUsage(email, returnedCost, req.body?.profissionalId || null)
    console.log('[images/generate] registerTokenUsage', { ok: regOk, returnedCost })
    try { if (redisCache?.isConnected) await redisCache.delete(`imggen:lock:${q}`) } catch (_) { }
    const url = buildAssetUrl(updated)
    return res.json({
      success: true,
      status: 'ready',
      url,
      publicId: updated.cloudinaryPublicId,
      storage: updated.storage,
      normalizedQuery: q
    })
  } catch (e) {
    console.error('[images/generate] error', e?.response?.data || e?.message || e)
    try {
      const q = normalize(req.body.query || '')
      if (q && redisCache?.isConnected) await redisCache.delete(`imggen:lock:${q}`)
    } catch (_) { }

    try {
      const baseQuery = String(req.body.query || '').trim()
      const q = normalize(baseQuery)
      if (q) {
        const lockId = String(req.body?.lockId || '')
        if (lockId) {
          await ImageAsset.updateOne(
            { normalizedQuery: q, lockId },
            { $set: { status: 'failed', lastError: String(e?.message || 'Erro ao gerar imagem').slice(0, 300), lockUntil: null, lockId: null, updatedAt: nowIsoSafe() } }
          )
        }
      }
    } catch (_) { }

    return res.status(500).json({ success: false, status: 'failed', message: 'Erro ao gerar imagem' })
  }
}
