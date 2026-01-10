import mongoose from 'mongoose';

const GlobalEventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  code: {
    type: String, // HTML/JS content
    required: true
  },
  active: {
    type: Boolean,
    default: false
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

const GlobalEvent = mongoose.model('GlobalEvent', GlobalEventSchema);

export default GlobalEvent;
