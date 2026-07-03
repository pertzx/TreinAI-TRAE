import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Plano comercial exibido na landing (`/planos`) e editável no admin.
 *
 * A `key` (free/pro/max/coach) é o vínculo funcional com o resto do sistema
 * (Stripe `priceMap`, gating do coach, orçamento de IA). Este documento é a
 * fonte de verdade apenas do que é EXIBIDO/EDITÁVEL — preço de display,
 * textos, features e ordenação. O preço realmente cobrado continua vindo do
 * Stripe (env `STRIPE_PRICEID_*`).
 */
const PlanFeatureSchema = new Schema({
  text: { type: String, required: true },
  // false => feature que o plano NÃO tem (renderiza com ícone de X).
  included: { type: Boolean, default: true },
  // destaque visual (ex.: verde) para o principal benefício do plano.
  highlight: { type: Boolean, default: false },
}, { _id: false });

const PlanSchema = new Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    enum: ['free', 'pro', 'max', 'coach'],
  },
  name: { type: String, required: true },
  subtitle: { type: String, default: '' },
  description: { type: String, default: '' },

  // Preço de EXIBIÇÃO (o checkout usa o priceId do Stripe, não este valor).
  priceBRL: { type: Number, default: 0 },        // 0 => "Grátis"
  originalPriceBRL: { type: Number, default: null }, // riscado (opcional)
  periodLabel: { type: String, default: '/mês' },    // ex.: "/mês", "Para sempre"

  features: { type: [PlanFeatureSchema], default: [] },

  buttonText: { type: String, default: 'Assinar' },
  // Cor de acento; o front mapeia para classes tailwind (não guardamos classe).
  accent: { type: String, default: 'blue' }, // gray | blue | purple | emerald
  popular: { type: Boolean, default: false },
  isProfessional: { type: Boolean, default: false },

  active: { type: Boolean, default: true },   // false => oculto na landing
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true, versionKey: false });

PlanSchema.index({ active: 1, sortOrder: 1 });

const Plan = mongoose.models.Plan || mongoose.model('Plan', PlanSchema, 'Plans');

export default Plan;
