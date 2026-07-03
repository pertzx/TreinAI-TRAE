import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Plano comercial 100% administrável — criado/editado no admin e exibido na
 * Dashboard → Configurações (não mais na landing).
 *
 * A `key` é um slug livre e único, usado como `planInfos.planType` do usuário e
 * como vínculo com o Stripe (via `priceId` deste doc). As flags de `access`
 * controlam DE FATO o acesso (nutriAI, painel Coach, anúncios, editar treinos).
 */
const PlanFeatureSchema = new Schema({
  text: { type: String, required: true },
  // false => feature que o plano NÃO tem (renderiza com ícone de X).
  included: { type: Boolean, default: true },
  // destaque visual (ex.: verde) para o principal benefício do plano.
  highlight: { type: Boolean, default: false },
}, { _id: false });

// Flags de acesso — fonte de verdade do gating (ver helpers/planAccess.js).
const PlanAccessSchema = new Schema({
  nutriAI: { type: Boolean, default: false },       // acesso ao NutriAI
  coachPanel: { type: Boolean, default: false },    // painel profissional (Coach)
  semAnuncios: { type: Boolean, default: false },   // remove anúncios
  editarTreinos: { type: Boolean, default: false }, // criar/editar/excluir treinos
}, { _id: false });

const PlanSchema = new Schema({
  key: { type: String, required: true, unique: true }, // slug livre (= planType)
  name: { type: String, required: true },
  subtitle: { type: String, default: '' },
  description: { type: String, default: '' },

  // Cobrança
  priceId: { type: String, default: null },       // Stripe price id (NUNCA exposto ao público)
  precoText: { type: String, default: '' },        // texto de exibição (ex.: "R$ 30/mês")
  tipo: { type: String, enum: ['recorrente', 'unico', 'cortesia'], default: 'recorrente' },
  courtesyBudgetBRL: { type: Number, default: 0 }, // só p/ tipo 'cortesia' (saldo único de IA)

  // Preço numérico opcional (comparações internas / display legado)
  priceBRL: { type: Number, default: 0 },
  originalPriceBRL: { type: Number, default: null },
  periodLabel: { type: String, default: '/mês' },

  // Acesso (gating real) + bullets extras de exibição
  access: { type: PlanAccessSchema, default: () => ({}) },
  features: { type: [PlanFeatureSchema], default: [] },

  buttonText: { type: String, default: 'Assinar' },
  accent: { type: String, default: 'blue' }, // gray | blue | purple | emerald
  popular: { type: Boolean, default: false },
  isProfessional: { type: Boolean, default: false },

  active: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true, versionKey: false });

PlanSchema.index({ active: 1, sortOrder: 1 });

const Plan = mongoose.models.Plan || mongoose.model('Plan', PlanSchema, 'Plans');

export default Plan;
