// models/ProcessedWebhookEvent.js
import mongoose from 'mongoose';

const ProcessedWebhookEventSchema = new mongoose.Schema({
  eventId: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  eventType: { 
    type: String, 
    required: true,
    index: true 
  },
  processedAt: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  metadata: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {} 
  }
}, {
  timestamps: true
});

// TTL index para limpar eventos antigos após 90 dias
ProcessedWebhookEventSchema.index({ processedAt: 1 }, { expireAfterSeconds: 7776000 });

export default mongoose.model('ProcessedWebhookEvent', ProcessedWebhookEventSchema);