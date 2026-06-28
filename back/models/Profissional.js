import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { getBrazilDate } from '../helpers/getBrazilDate.js';

const { Schema } = mongoose;

const profissionalSchema = new Schema({
  profissionalId: { type: String, required: true, unique: true, index: true, default: () => uuidv4() },
  profissionalName: { type: String, required: true },
  biografia: { type: String, required: true, default: 'Profissional dedicado.' },
  imageUrl: { type: String, default: '/avatar_base_z5ucwb.jpg' }, // Path da imagem (Cloudinary ou local)
  userId: { type: String, required: true, unique: true, index: true },
  especialidade: { type: String, enum: ['personal-trainner', 'fisioterapeuta', 'nutricionista'], required: true },
  criadoEm: { type: Date, default: getBrazilDate },
  estatisticas: {
    impressoes: { type: Number, default: 0 },
    cliques: { type: Number, default: 0 },
  },
  saldoDeImpressoes: { type: Number, default: 0 },

  // localização humana (país/estado/cidade) — strings simples
  country: { type: String, default: null },
  countryCode: { type: String, default: null },
  state: { type: String, default: null },
  city: { type: String, default: null },

  // localização geoespacial opcional — somente presente se houver coords válidas
  location: {
    type: {
      type: String,
      enum: ['Point'],
      // **Não** definir default aqui que insira { type: 'Point' } sem coordinates.
    },
    coordinates: {
      type: [Number], // [lng, lat]
    }
  },

  alunos: [
    {
      userId: { type: String, required: true },
      aceito: { type: Boolean, default: false },
      mensagem: { type: String, default: null },
      // Notas privadas do profissional sobre o aluno — nunca expostas ao aluno.
      notasPrivadas: { type: String, default: '' },
      ultimoUpdate: { type: Date, default: null }
    }
  ],

  // Modelos reutilizáveis de treino/dieta criados pelo profissional.
  templates: [
    {
      templateId: { type: String, default: () => uuidv4() },
      tipo: { type: String, enum: ['treino', 'dieta'], required: true },
      nome: { type: String, required: true },
      descricao: { type: String, default: '' },
      conteudo: { type: Schema.Types.Mixed, default: null }, // estrutura livre (exercícios ou refeições)
      criadoEm: { type: Date, default: getBrazilDate },
      atualizadoEm: { type: Date, default: getBrazilDate },
    }
  ],
  reports: [
    {
      userId: { type: String, required: true },
      username: { type: String, required: true },
      explanation: { type: String, required: true },
      criadoEm: { type: Date, default: getBrazilDate },
    }
  ]
}, {
  timestamps: true,
  versionKey: false
});

// Create 2dsphere index only if not already present
// Avoid calling schema.index(...) twice in different files.
if (!profissionalSchema._indexes || !profissionalSchema._indexes.find(i => i[0] && i[0].location)) {
  profissionalSchema.index({ location: '2dsphere' });
}

const Profissional = mongoose.models.Profissional || mongoose.model('Profissional', profissionalSchema, 'Profissionais');

export default Profissional;
