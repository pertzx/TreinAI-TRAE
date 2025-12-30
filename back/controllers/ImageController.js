import redisCache from '../config/redis.js'
import ImageAsset from '../models/ImageAsset.js'
import User from '../models/User.js'
import { registerTokenUsage } from '../middlewares/tokenLimitMiddleware.js'
import { uploadToCloudinary } from '../config/cloudinaryConfig.js'
import OpenAI from 'openai'
import crypto from 'crypto'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const normalize = (s) => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ')

const PROMPT_SUFFIX = ': Realistico, Demonstrativo com destaque no musculo, sem sensualizar, homem ou mulher usando roupa de academia com o nome TreinAI'

// Lista de termos proibidos para evitar bloqueios óbvios e economizar tokens
const FORBIDDEN_WORDS = [
  'nu', 'nua', 'nude', 'sexual', 'sexo', 'porn', 'erotico', 'erotica',
  'genital', 'pênis', 'vagina', 'seios', 'mamilo', 'bunda', 'ânus',
  'pelado', 'pelada', 'sensual', 'fetish', 'fetiche'
]

const isPotentiallyUnsafe = (query) => {
  const q = normalize(query)
  return FORBIDDEN_WORDS.some(word => q.includes(word))
}

const buildAssetUrl = (asset) => {
  if (!asset) return null
  if (asset.cloudinaryUrl) return asset.cloudinaryUrl
  if (asset.inlineBase64) return `data:${asset.inlineMimeType || 'image/png'};base64,${asset.inlineBase64}`
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

    // 1. Verificação rápida local
    if (isPotentiallyUnsafe(baseQuery)) {
      console.log('[images/generate] local moderation block', { q })
      return res.status(400).json({
        success: false,
        status: 'failed',
        message: 'O termo utilizado viola nossas políticas de segurança. Por favor, tente um termo mais técnico ou voltado a exercícios.',
        normalizedQuery: q
      })
    }

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

    // 2. Moderação via OpenAI API antes de gerar
    let moderationTokens = 0
    try {
      const moderation = await openai.moderations.create({ input: prompt })
      
      // Estimar tokens de moderação (OpenAI não retorna usage em moderation, 
      // mas consome cota. Usamos aproximação 1 token ~= 4 caracteres para o input)
      moderationTokens = Math.ceil(prompt.length / 4)

      if (moderation.results[0].flagged) {
        console.log('[images/generate] openai moderation block', { q, categories: moderation.results[0].categories })
        
        // Registrar tokens gastos na moderação mesmo em caso de bloqueio
        if (moderationTokens > 0) {
          await registerTokenUsage(email, moderationTokens, req.body?.profissionalId || null)
        }

        await ImageAsset.updateOne({ normalizedQuery: q, lockId }, {
          $set: { status: 'failed', lastError: 'Moderation block: ' + JSON.stringify(moderation.results[0].categories), lockId: null, lockUntil: null }
        })
        return res.status(400).json({
          success: false,
          status: 'failed',
          message: 'O conteúdo solicitado foi sinalizado pelo sistema de segurança. Por favor, reformule sua busca.',
          normalizedQuery: q
        })
      }
    } catch (modErr) {
      console.error('[images/generate] moderation api error', modErr)
    }

    const ai = await openai.images.generate({ model: 'gpt-image-1', prompt, size: '1024x1024', quality: 'medium' })
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

    // Upload para o Cloudinary (otimizado para WebP pela config)
    let cloudinaryResult = null
    try {
      const buffer = Buffer.from(b64, 'base64')
      cloudinaryResult = await uploadToCloudinary(buffer, 'generated-assets')
      console.log('[images/generate] cloudinary upload success', { publicId: cloudinaryResult.public_id })
    } catch (uploadErr) {
      console.error('[images/generate] cloudinary upload failed', uploadErr)
      // Se falhar o upload, ainda tentamos salvar o b64 como fallback temporário ou falhamos?
      // O usuário quer PARAR de guardar base64, então vamos falhar se o upload falhar.
      await ImageAsset.updateOne({ normalizedQuery: q, lockId }, {
        $set: { status: 'failed', lastError: 'Cloudinary upload failed', lockId: null, lockUntil: null }
      })
      return res.status(502).json({
        success: false,
        status: 'failed',
        message: 'Falha ao salvar imagem no Cloudinary',
        normalizedQuery: q
      })
    }

    const returnedCost = parseInt(
      (ai?.usage && (ai.usage.image_tokens || ai.usage.total_tokens)) ||
      (ai?.data?.[0]?.cost) ||
      (process.env.IMAGE_TOKEN_COST || '50')
    )
    
    // Somar tokens da moderação ao custo total da geração
    const totalTokensUsed = returnedCost + moderationTokens
    console.log('[images/generate] cost', { imageCost: returnedCost, moderationTokens, total: totalTokensUsed })

    const updated = await ImageAsset.findOneAndUpdate(
      { normalizedQuery: q, lockId },
      {
        $set: {
          originalQuery: baseQuery,
          cloudinaryUrl: cloudinaryResult.secure_url,
          cloudinaryPublicId: cloudinaryResult.public_id,
          inlineBase64: null, // Garantir que não salva base64
          storage: 'cloudinary',
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

    const regOk = await registerTokenUsage(email, totalTokensUsed, req.body?.profissionalId || null)
    console.log('[images/generate] registerTokenUsage', { ok: regOk, totalTokensUsed })
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
    const errorMsg = e?.response?.data?.error?.message || e?.message || ''
    console.error('[images/generate] error', errorMsg)

    // Se for erro de segurança da própria API do DALL-E (que às vezes passa na moderação mas falha na geração)
    const isSafetyError = errorMsg.toLowerCase().includes('safety system') || 
                         errorMsg.toLowerCase().includes('rejected by the safety') ||
                         errorMsg.toLowerCase().includes('safety_violations')

    try {
      const q = normalize(req.body.query || '')
      if (q && redisCache?.isConnected) await redisCache.delete(`imggen:lock:${q}`)
    } catch (_) { }

    try {
      const baseQuery = String(req.body.query || '').trim()
      const q = normalize(baseQuery)
      if (q) {
        const lockId = String(req.body?.lockId || '')
        const finalError = isSafetyError 
          ? 'Conteúdo rejeitado pelo sistema de segurança da IA' 
          : String(errorMsg || 'Erro ao gerar imagem').slice(0, 300)

        await ImageAsset.updateOne(
          { normalizedQuery: q },
          { $set: { status: 'failed', lastError: finalError, lockUntil: null, lockId: null, updatedAt: nowIsoSafe() } }
        )
      }
    } catch (_) { }

    if (isSafetyError) {
      return res.status(400).json({ 
        success: false, 
        status: 'failed', 
        message: 'A IA recusou gerar esta imagem por motivos de segurança. Tente usar termos mais técnicos e profissionais.' 
      })
    }

    return res.status(500).json({ success: false, status: 'failed', message: 'Erro ao gerar imagem' })
  }
}
