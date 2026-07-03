/**
 * Seed idempotente dos 4 planos comerciais (free/pro/max/coach).
 * Usa $setOnInsert: só cria o que falta, NUNCA sobrescreve edições feitas
 * pelo admin em execuções seguintes.
 *
 * Uso: node scripts/seedPlans.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Plan from '../models/Plan.js';

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    subtitle: 'Experimente a plataforma com o essencial',
    description: 'Perfeito para começar sua jornada fitness',
    priceBRL: 0,
    originalPriceBRL: null,
    periodLabel: 'Para sempre',
    accent: 'gray',
    popular: false,
    isProfessional: false,
    active: true,
    sortOrder: 1,
    buttonText: 'Começar Grátis',
    features: [
      { text: 'Treinos gerados por IA', included: true, highlight: true },
      { text: 'Cortesia única de IA para testar', included: true },
      { text: 'Edição de treinos', included: false },
      { text: 'NutriAI (nutricionista IA)', included: false },
      { text: 'Sem anúncios', included: false },
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    subtitle: 'Todos os benefícios do Free, com mais poder',
    description: 'Treino inteligente e personalizado',
    priceBRL: 39.99,
    originalPriceBRL: 89.99,
    periodLabel: '/mês',
    accent: 'blue',
    popular: true,
    isProfessional: false,
    active: true,
    sortOrder: 2,
    buttonText: 'Assinar Pro',
    features: [
      { text: 'Tudo do Free', included: true },
      { text: 'Uso de IA ampliado', included: true, highlight: true },
      { text: 'Gerenciamento completo de treinos (criar, editar, excluir)', included: true },
      { text: 'Sem anúncios', included: true },
      { text: 'NutriAI (nutricionista IA)', included: false },
    ],
  },
  {
    key: 'max',
    name: 'Max',
    subtitle: 'Todos os benefícios do Pro + NutriAI',
    description: 'Corpo e mente em harmonia',
    priceBRL: 79.99,
    originalPriceBRL: 199.99,
    periodLabel: '/mês',
    accent: 'purple',
    popular: false,
    isProfessional: false,
    active: true,
    sortOrder: 3,
    buttonText: 'Assinar Max',
    features: [
      { text: 'Tudo do Pro', included: true },
      { text: 'NutriAI — nutricionista virtual', included: true, highlight: true },
      { text: 'Uso de IA ainda maior', included: true },
      { text: 'Integração completa treino + nutrição', included: true },
    ],
  },
  {
    key: 'coach',
    name: 'Coach',
    subtitle: 'Todos os benefícios do Max + ferramentas profissionais',
    description: 'Para Personal Trainers e profissionais',
    priceBRL: 149.99,
    originalPriceBRL: 799.99,
    periodLabel: '/mês',
    accent: 'emerald',
    popular: false,
    isProfessional: true,
    active: true,
    sortOrder: 4,
    buttonText: 'Assinar Coach',
    features: [
      { text: 'Tudo do Max', included: true },
      { text: 'Painel profissional exclusivo', included: true, highlight: true },
      { text: 'Gerenciamento de múltiplos alunos (aceitar/recusar)', included: true },
      { text: 'Edição de treinos dos alunos', included: true },
      { text: 'Comunicação em tempo real com alunos', included: true },
      { text: 'Perfil profissional público na seção "Encontrar"', included: true },
      { text: 'Uso de IA dimensionado para vários alunos', included: true },
    ],
  },
];

const run = async () => {
  const uri = (process.env.DB_USER && process.env.DB_PASSWORD)
    ? `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.vcxrbu2.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`
    : (process.env.MONGO_URI || process.env.DATABASE_URL);
  if (!uri) { console.error('Variáveis de conexão do Mongo (DB_USER/DB_PASSWORD/DB_NAME) não definidas no .env'); process.exit(1); }

  await mongoose.connect(uri);
  console.log('Conectado ao MongoDB.');

  let criados = 0;
  for (const plan of PLANS) {
    const { key, ...rest } = plan;
    const res = await Plan.updateOne(
      { key },
      { $setOnInsert: { key, ...rest } },
      { upsert: true }
    );
    if (res.upsertedCount) { criados++; console.log(`+ plano criado: ${key}`); }
    else console.log(`= plano já existe (mantido): ${key}`);
  }

  console.log(`Seed concluído. ${criados} plano(s) criado(s); existentes preservados.`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch(err => { console.error('Erro no seed de planos:', err); process.exit(1); });
