import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { getBrazilDate } from '../helpers/getBrazilDate.js';

const { Schema } = mongoose;

const LocalTokenSchema = new Schema({
  // Token único para uso único
  token: { 
    type: String, 
    required: true, 
    unique: true,
    default: () => uuidv4()
  },
  
  // ID do usuário que possui o token
  userId: { 
    type: String, 
    required: true,
    index: true
  },
  
  // ID da subscription do Stripe que gerou este token
  subscriptionId: { 
    type: String, 
    required: true,
    index: true
  },
  
  // Status do token
  status: { 
    type: String, 
    enum: ['active', 'used', 'expired'], 
    default: 'active',
    index: true
  },
  
  // Tipo de local que pode ser criado com este token
  localType: { 
    type: String, 
    enum: ['clinica-de-fisioterapia', 'academia', 'consultorio-do-nutricionista', 'loja', 'outro'], 
    required: true 
  },
  
  // Metadados do pagamento/sessão
  metadata: {
    stripeSessionId: { type: String },
    stripeCustomerId: { type: String },
    paymentIntentId: { type: String },
    amount: { type: Number },
    currency: { type: String, default: 'brl' }
  },
  
  // Controle de tempo
  createdAt: { 
    type: Date, 
    default: getBrazilDate,
    index: true
  },
  
  usedAt: { 
    type: Date, 
    default: null 
  },
  
  expiresAt: { 
    type: Date, 
    required: true,
    index: true,
    // Token expira em 30 dias por padrão
    default: () => {
      const date = new Date(getBrazilDate());
      date.setDate(date.getDate() + 30);
      return date;
    }
  },
  
  // ID do local criado com este token (quando usado)
  localId: { 
    type: String, 
    default: null 
  }
}, {
  timestamps: true,
  versionKey: false
});

// Índices compostos para performance
LocalTokenSchema.index({ userId: 1, status: 1 });
LocalTokenSchema.index({ subscriptionId: 1, status: 1 });
LocalTokenSchema.index({ expiresAt: 1, status: 1 });

// Método estático para verificar se token é válido
LocalTokenSchema.statics.isValidToken = async function(token, userId) {
  const tokenDoc = await this.findOne({
    token,
    userId,
    status: 'active',
    expiresAt: { $gt: new Date(getBrazilDate()) }
  });
  
  return !!tokenDoc;
};

// Método estático para usar um token
LocalTokenSchema.statics.useToken = async function(token, userId, localId) {
  const result = await this.findOneAndUpdate(
    {
      token,
      userId,
      status: 'active',
      expiresAt: { $gt: new Date(getBrazilDate()) }
    },
    {
      status: 'used',
      usedAt: new Date(getBrazilDate()),
      localId
    },
    { new: true }
  );
  
  return result;
};

// Método estático para limpar tokens expirados
LocalTokenSchema.statics.cleanExpiredTokens = async function() {
  const result = await this.updateMany(
    {
      status: 'active',
      expiresAt: { $lte: new Date(getBrazilDate()) }
    },
    {
      status: 'expired'
    }
  );
  
  return result;
};

// Método estático para contar tokens ativos de um usuário
LocalTokenSchema.statics.countActiveTokens = async function(userId) {
  return await this.countDocuments({
    userId,
    status: 'active',
    expiresAt: { $gt: new Date(getBrazilDate()) }
  });
};

const LocalToken = mongoose.model('LocalToken', LocalTokenSchema, 'LocalTokens');

export default LocalToken;
