import mongoose from 'mongoose';

const ReportSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['progress', 'performance', 'body_composition', 'nutrition', 'custom'],
    required: true
  },
  professionalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profissional',
    required: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dateRange: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  data: {
    // Dados de progresso
    workoutMetrics: [{
      date: Date,
      workoutType: String,
      duration: Number,
      intensity: Number,
      caloriesBurned: Number,
      exercises: [{
        name: String,
        sets: Number,
        reps: Number,
        weight: Number,
        restTime: Number
      }]
    }],
    
    // Métricas corporais
    bodyMetrics: [{
      date: Date,
      weight: Number,
      bodyFat: Number,
      muscleMass: Number,
      measurements: {
        chest: Number,
        waist: Number,
        hips: Number,
        arms: Number,
        thighs: Number
      }
    }],
    
    // Métricas de performance
    performanceMetrics: [{
      date: Date,
      strength: Number,
      endurance: Number,
      flexibility: Number,
      personalRecords: [{
        exercise: String,
        value: Number,
        unit: String,
        date: Date
      }]
    }],
    
    // Dados nutricionais
    nutritionData: [{
      date: Date,
      calories: Number,
      protein: Number,
      carbs: Number,
      fat: Number,
      water: Number
    }],
    
    // Análises e insights
    insights: [{
      category: String,
      title: String,
      description: String,
      recommendation: String,
      priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
      }
    }],
    
    // Estatísticas calculadas
    statistics: {
      totalWorkouts: Number,
      averageIntensity: Number,
      totalCaloriesBurned: Number,
      weightChange: Number,
      bodyFatChange: Number,
      strengthImprovement: Number,
      consistencyScore: Number,
      adherenceRate: Number
    }
  },
  
  // Configurações do relatório
  settings: {
    includeCharts: {
      type: Boolean,
      default: true
    },
    includePhotos: {
      type: Boolean,
      default: false
    },
    includeNutrition: {
      type: Boolean,
      default: true
    },
    includeRecommendations: {
      type: Boolean,
      default: true
    },
    format: {
      type: String,
      enum: ['pdf', 'html', 'json'],
      default: 'pdf'
    }
  },
  
  // Status e metadados
  status: {
    type: String,
    enum: ['generating', 'completed', 'failed', 'archived'],
    default: 'generating'
  },
  
  generatedAt: {
    type: Date,
    default: Date.now
  },
  
  fileUrl: String,
  
  notes: {
    type: String,
    trim: true
  },
  
  sharedWith: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sharedAt: {
      type: Date,
      default: Date.now
    },
    permissions: {
      type: String,
      enum: ['view', 'download'],
      default: 'view'
    }
  }]
}, {
  timestamps: true
});

// Índices para otimização
ReportSchema.index({ professionalId: 1, clientId: 1 });
ReportSchema.index({ type: 1, status: 1 });
ReportSchema.index({ 'dateRange.startDate': 1, 'dateRange.endDate': 1 });

// Template de relatório
const ReportTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  type: {
    type: String,
    enum: ['progress', 'performance', 'body_composition', 'nutrition', 'custom'],
    required: true
  },
  professionalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profissional',
    required: true
  },
  
  // Configuração do template
  config: {
    sections: [{
      name: String,
      type: String,
      enabled: Boolean,
      order: Number,
      settings: mongoose.Schema.Types.Mixed
    }],
    
    styling: {
      primaryColor: String,
      secondaryColor: String,
      font: String,
      logo: String
    },
    
    defaultSettings: {
      includeCharts: Boolean,
      includePhotos: Boolean,
      includeNutrition: Boolean,
      includeRecommendations: Boolean,
      format: String
    }
  },
  
  isDefault: {
    type: Boolean,
    default: false
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

ReportTemplateSchema.index({ professionalId: 1, type: 1 });

export const Report = mongoose.model('Report', ReportSchema);
export const ReportTemplate = mongoose.model('ReportTemplate', ReportTemplateSchema);