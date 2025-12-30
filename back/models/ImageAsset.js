import mongoose from 'mongoose'

const ImageAssetSchema = new mongoose.Schema({
  originalQuery: { type: String, required: true },
  normalizedQuery: { type: String, required: true, index: true, unique: true },
  cloudinaryUrl: { type: String, default: null },
  cloudinaryPublicId: { type: String, default: null },
  // Deprecated: inlineBase64 e inlineMimeType serão removidos após migração
  inlineBase64: { type: String, default: null },
  inlineMimeType: { type: String, default: 'image/webp' },
  storage: { type: String, enum: ['cloudinary', 'inline'], default: 'cloudinary', index: true },
  status: { type: String, enum: ['ready', 'generating', 'failed'], default: 'ready', index: true },
  lockId: { type: String, default: null },
  lockUntil: { type: Date, default: null, index: true },
  lastError: { type: String, default: null },
  updatedAt: { type: Date, default: Date.now, index: true },
  createdAt: { type: Date, default: Date.now, index: true }
})

export default mongoose.model('ImageAsset', ImageAssetSchema)
