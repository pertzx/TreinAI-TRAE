import mongoose from 'mongoose'

const ImageAssetSchema = new mongoose.Schema({
  originalQuery: { type: String, required: true },
  normalizedQuery: { type: String, required: true, index: true, unique: true },
  cloudinaryUrl: { type: String, required: true },
  cloudinaryPublicId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, index: true }
})

export default mongoose.model('ImageAsset', ImageAssetSchema)