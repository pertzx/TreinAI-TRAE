import mongoose from 'mongoose'

const ImageAssetSchema = new mongoose.Schema({
  originalQuery: { type: String, required: true },
  normalizedQuery: { type: String, required: true, index: true, unique: true },
  cloudinaryUrl: { type: String, default: null },
  cloudinaryPublicId: { type: String, default: null },
  inlineBase64: { type: String, default: null },
  inlineMimeType: { type: String, default: 'image/png' },
  storage: { type: String, enum: ['cloudinary', 'inline'], default: 'inline', index: true },
  createdAt: { type: Date, default: Date.now, index: true }
})

export default mongoose.model('ImageAsset', ImageAssetSchema)
