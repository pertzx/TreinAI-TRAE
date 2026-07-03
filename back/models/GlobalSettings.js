import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Configurações globais do sistema (documento único / singleton).
 * Controla o modelo de cobrança de IA por custo (R$): margem de lucro,
 * cortesia do plano free, preços por modelo e custo de imagem.
 *
 * Use sempre o helper getSettings() para ler/garantir o documento.
 */
const GlobalSettingsSchema = new Schema({
  // Multiplicador de margem aplicado sobre o custo real (lucro). Ex.: 2 => +100%.
  marginMultiplier: { type: Number, default: 2, min: 1 },

  // Cortesia ÚNICA (não renovável) em R$ para usuários do plano free.
  freeCourtesyBudgetBRL: { type: Number, default: 1.0, min: 0 },

  // Rede de segurança: orçamento por plano caso aiBudgetBRL esteja ausente.
  planBudgetFallbackBRL: {
    pro: { type: Number, default: 19.9 },
    max: { type: Number, default: 39.9 },
    coach: { type: Number, default: 199.9 },
  },

  // Preço REAL em R$ por 1.000.000 de tokens, por modelo (entrada/saída).
  // Defaults para gpt-4o-mini (preço OpenAI já convertido com FX + buffer).
  modelPricingBRL: {
    type: Map,
    of: new Schema({
      inputPer1M: { type: Number, required: true },
      outputPer1M: { type: Number, required: true },
    }, { _id: false }),
    default: () => ({
      'gpt-4o-mini': { inputPer1M: 0.83, outputPer1M: 3.30 },
      'gpt-4o': { inputPer1M: 13.75, outputPer1M: 55.0 },
    }),
  },

  // Custo REAL em R$ por imagem gerada (gpt-image-1).
  imageCostBRL: { type: Number, default: 0.30, min: 0 },

  // Defaults do trial "Profissional Fundador" (acesso coach grátis por tempo limitado).
  founderTrial: {
    defaultDays: { type: Number, default: 90, min: 1 },
    aiBudgetBRL: { type: Number, default: 30, min: 0 }, // teto de IA durante o trial
  },

  updatedBy: { type: String, default: null },
}, { timestamps: true, versionKey: false });

const GlobalSettings = mongoose.models.GlobalSettings
  || mongoose.model('GlobalSettings', GlobalSettingsSchema, 'GlobalSettings');

/**
 * Retorna o documento de configuração (criando com defaults se não existir).
 * Nunca retorna null.
 */
export const getSettings = async () => {
  let settings = await GlobalSettings.findOne();
  if (!settings) settings = await GlobalSettings.create({});
  return settings;
};

export default GlobalSettings;
