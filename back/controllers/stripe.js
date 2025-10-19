// controllers/Stripe.js
import dotenv from 'dotenv';
import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';
import User from '../models/User.js';
import bcrypt from 'bcrypt';
import Local from '../models/Local.js';
import ProcessedStripeEvent from '../models/ProcessedStripeEvent.js';
import ProcessedWebhookEvent from '../models/ProcessedWebhookEvent.js';
import mongoose from 'mongoose';
import Profissional from '../models/Profissional.js';
import { getBrazilDate } from '../helpers/getBrazilDate.js';
import { sendNotificationEmail } from '../utils/sendEmail.js';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { 
  apiVersion: '2024-06-20',
  maxNetworkRetries: 3,
  timeout: 30000
});

// Helper: grava logs
const log = (...args) => console.log('[StripeController]', ...args);

// ---------------------------
// PendingUpload model (novo)
// Armazena uploads temporários que só viram Local após confirmação de pagamento
// ---------------------------
const PendingUploadSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String },
  userId: { type: String },
  localName: { type: String },
  localDescricao: { type: String },
  localType: { type: String },
  link: { type: String },
  country: { type: String },
  countryCode: { type: String },
  state: { type: String },
  city: { type: String },
  createdAt: { type: Date, default: () => new Date() },
  subscriptionId: { type: String, default: null }, // atualizado no checkout.session.completed
  metadata: { type: Object, default: {} },
});
const PendingUpload = mongoose.models.PendingUpload || mongoose.model('PendingUpload', PendingUploadSchema);

// ---------------------------
// Paths helpers
// ---------------------------
const TMP_DIR = path.join(process.cwd(), 'uploads', 'tmp');
const FINAL_DIR = path.join(process.cwd(), 'uploads', 'image-local');

async function ensureDir(dir) {
  try { await fs.promises.mkdir(dir, { recursive: true }); } catch (e) { /* ignore */ }
}
async function moveFile(src, dest) {
  await ensureDir(path.dirname(dest));
  return fs.promises.rename(src, dest);
}
async function unlinkIfExists(fp) {
  try {
    const exists = await fs.promises.stat(fp).then(() => true).catch(() => false);
    if (exists) await fs.promises.unlink(fp);
  } catch (e) {
    console.warn('unlinkIfExists error:', e?.message || e);
  }
}

/**
 * Remove pending upload: apaga arquivo tmp e documento PendingUpload
 */
async function removePendingUpload(pendingId) {
  if (!pendingId) return;
  const p = await PendingUpload.findById(pendingId);
  if (!p) return;
  try {
    const tmpPath = path.join(TMP_DIR, p.filename);
    await unlinkIfExists(tmpPath);
  } catch (e) {
    console.warn('removePendingUpload: falha ao apagar arquivo tmp:', e?.message || e);
  }
  try {
    await PendingUpload.findByIdAndDelete(pendingId);
  } catch (e) {
    console.warn('removePendingUpload: falha ao apagar documento PendingUpload:', e?.message || e);
  }
}


// =====================================================================================
// cancelSubscriptionWithRefund (mantive, removi calls inválidos: use cancel not del)
// =====================================================================================
async function cancelSubscriptionWithRefund(subscriptionId) {
  try {
    let canceledSubscription = null;
    try {
      // tentar cancelar (API: cancel)
      canceledSubscription = await stripe.subscriptions.cancel(subscriptionId);
      log('[cancelSubscriptionWithRefund] subscription.cancel OK:', subscriptionId);
    } catch (errCancel) {
      console.warn('[cancelSubscriptionWithRefund] Falha ao cancelar subscription:', errCancel?.message || errCancel);
      return { success: false, error: errCancel?.message || String(errCancel) };
    }

    // buscar a última invoice da subscription (se houver) e reembolsar a charge se aplicável
    let refund = null;
    try {
      const invoices = await stripe.invoices.list({ subscription: subscriptionId, limit: 1 });
      if (invoices && Array.isArray(invoices.data) && invoices.data.length > 0) {
        const latestInvoice = invoices.data[0];
        if (latestInvoice.charge) {
          try {
            const charge = await stripe.charges.retrieve(latestInvoice.charge);
            const refundable = Math.max(0, (charge.amount || 0) - (charge.amount_refunded || 0));
            if (refundable > 0) {
              refund = await stripe.refunds.create({ charge: latestInvoice.charge, amount: refundable });
              log('[cancelSubscriptionWithRefund] Refund criado:', refund.id, 'amount:', refund.amount);
            } else {
              log('[cancelSubscriptionWithRefund] Nenhum valor reembolsável na charge:', latestInvoice.charge);
            }
          } catch (errCharge) {
            console.warn('[cancelSubscriptionWithRefund] Falha ao recuperar charge ou criar refund:', errCharge?.message || errCharge);
          }
        } else {
          log('[cancelSubscriptionWithRefund] latestInvoice não tem charge:', latestInvoice.id);
        }
      }
    } catch (errInvoices) {
      console.warn('[cancelSubscriptionWithRefund] Falha ao listar invoices:', errInvoices?.message || errInvoices);
    }

    return { success: true, subscription: canceledSubscription, refund };
  } catch (error) {
    console.error('[cancelSubscriptionWithRefund] Erro ao cancelar assinatura:', error);
    return { success: false, error: error?.message || String(error) };
  }
}

// adicionarSaldoDeImpressoes
export const SessionPaymentSaldoDeImpressoes = async (req, res) => {
  try {
    const { quantidade, userId } = req.body || {};
    
    // Validação de entrada mais robusta
    if (!userId || !quantidade || isNaN(quantidade) || quantidade <= 0) {
      return res.status(400).json({ 
        success: false, 
        msg: 'userId e quantidade (>0) são obrigatórios',
        code: 'INVALID_PARAMETERS'
      });
    }

    // quantidade = valor em R$ que o cliente quer adicionar
    // 1 real = 175 impressoes (ajustado para melhor conversão)
    const valorEmReais = Number(quantidade);
    const impressoesPorReal = 175;
    const saldoDeImpressoes = Math.floor(valorEmReais * impressoesPorReal);
    const totalAmount = Math.floor(valorEmReais * 100); // Stripe espera centavos

    // Buscar usuário com validação
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        msg: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Buscar ou criar customer no Stripe com melhor tratamento de erro
    let customerId = user.planInfos?.stripeCustomerId || null;
    if (!customerId) {
      try {
        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        customerId = customers.data[0]?.id || null;
        
        if (!customerId) {
          const customer = await stripe.customers.create({ 
            email: user.email, 
            name: user.name || user.username,
            metadata: { 
              app_user_id: String(user._id),
              app: 'treinai',
              created_at: new Date().toISOString()
            }
          });
          customerId = customer.id;
          
          // Salvar customer ID no usuário
          user.planInfos = user.planInfos || {};
          user.planInfos.stripeCustomerId = customerId;
          await user.save();
        }
      } catch (customerError) {
        log('Erro ao criar/buscar customer:', customerError?.message);
        return res.status(500).json({
          success: false,
          msg: 'Erro ao processar dados do cliente',
          code: 'CUSTOMER_ERROR'
        });
      }
    }

    // Gerar chave de idempotência única
    const idempotencyKey = `saldo_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Criar sessão de pagamento única com configurações melhoradas
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [{
        price_data: {
          currency: 'brl',
          unit_amount: 100, // R$1.00 em centavos
          product_data: {
            name: `Saldo de Impressões TreinAI`,
            description: `Adicionar R$${valorEmReais.toFixed(2)} em saldo (${saldoDeImpressoes} impressões)`,
            metadata: { 
              userId,
              impressoes: saldoDeImpressoes.toString()
            }
          },
        },
        quantity: valorEmReais,
      }],
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}&type=saldo`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel?type=saldo`,
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutos
      metadata: {
        app: 'treinai',
        flow: 'saldo_impressoes',
        userId,
        quantidade: saldoDeImpressoes.toString(),
        valorEmReais: valorEmReais.toString(),
        idempotency_key: idempotencyKey
      },
      payment_intent_data: {
        metadata: {
          app: 'treinai',
          flow: 'saldo_impressoes',
          userId,
          impressoes: saldoDeImpressoes.toString()
        }
      }
    });

    log(`Checkout session criada para saldo: ${session.id} - User: ${userId} - Valor: R$${valorEmReais}`);

    return res.status(201).json({
      success: true,
      msg: 'Checkout session criada para saldo de impressões.',
      sessionId: session.id,
      url: session.url,
      amount: totalAmount,
      saldoDeImpressoes,
      userId,
      expiresAt: session.expires_at
    });
  } catch (error) {
    console.error('SessionPaymentSaldoDeImpressoes error:', error);
    return res.status(500).json({ 
      success: false, 
      msg: 'Erro interno ao criar sessão de pagamento', 
      code: 'INTERNAL_ERROR',
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
};

// =====================================================================================
// Criar Assinatura / Checkout Session (Subscription)
// - NÃO cria Local definitivo. salva upload em tmp + PendingUpload e envia pendingUploadId na metadata
// =====================================================================================
export const CriarAssinaturaProLocal = async (req, res) => {
  try {
    const {
      tipo,
      userId,
      description = '',
      paymentMethod = 'card',
      link,
      localName,
      localDescricao,
      country,
      countryCode,
      state,
      city,
    } = req.body || {};

    // Validação robusta de entrada
    if (!tipo || !userId) {
      return res.status(400).json({ 
        success: false, 
        msg: 'tipo e userId são obrigatórios',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Validação de imagem obrigatória
    const incomingField = req.file?.fieldname || 'image';
    if (!req.file || !req.file.path) {
      return res.status(400).json({
        success: false,
        msg: `A imagem é obrigatória para a criação do local. Envie um arquivo de imagem no campo "${incomingField}".`,
        code: 'MISSING_IMAGE'
      });
    }

    const tipoNorm = String(tipo).trim().toLowerCase();
    const priceMap = {
      'clinica-de-fisioterapia': process.env.STRIPE_PRICEID_100,
      'consultorio-de-nutricionista': process.env.STRIPE_PRICEID_100,
      'academia': process.env.STRIPE_PRICEID_180,
      'loja': process.env.STRIPE_PRICEID_180,
      'outros': process.env.STRIPE_PRICEID_50
    };
    
    const unitPrice = priceMap[tipoNorm];
    if (!unitPrice) {
      return res.status(400).json({ 
        success: false, 
        msg: `Tipo de local inválido: ${tipo}. Tipos aceitos: ${Object.keys(priceMap).join(', ')}`,
        code: 'INVALID_LOCAL_TYPE'
      });
    }

    const pm = String(paymentMethod || 'card').toLowerCase();
    if (!['card', 'pix'].includes(pm)) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Método de pagamento inválido. Aceitos: card, pix',
        code: 'INVALID_PAYMENT_METHOD'
      });
    }

    // Buscar usuário com validação
    let user = null;
    try {
      user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          msg: 'Usuário não encontrado',
          code: 'USER_NOT_FOUND'
        });
      }
    } catch (err) {
      return res.status(400).json({
        success: false,
        msg: 'ID de usuário inválido',
        code: 'INVALID_USER_ID'
      });
    }

    // Buscar ou criar customer no Stripe com melhor tratamento
    let customerId = user?.planInfos?.stripeCustomerId || null;
    if (!customerId) {
      try {
        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        customerId = customers.data[0]?.id || null;
        
        if (!customerId) {
          const customer = await stripe.customers.create({ 
            email: user.email,
            name: user.name || user.username,
            metadata: { 
              app_user_id: String(user._id),
              app: 'treinai',
              created_at: new Date().toISOString()
            }
          });
          customerId = customer.id;
          
          // Salvar customer ID
          user.planInfos = user.planInfos || {};
          user.planInfos.stripeCustomerId = customerId;
          await user.save();
        }
      } catch (err) {
        log('Erro ao criar/buscar customer:', err?.message || err);
        return res.status(500).json({
          success: false,
          msg: 'Erro ao processar dados do cliente no Stripe',
          code: 'STRIPE_CUSTOMER_ERROR'
        });
      }
    }

    // Processar upload com validação melhorada
    let pendingUpload = null;
    if (req.file) {
      try {
        // Em ambiente serverless, o arquivo já está no Cloudinary
        // req.file.path contém o path do Cloudinary (ex: 'treinai/images/filename.jpg')
        const isServerless = !!(process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
        
        let filename, tmpPath;
        
        if (isServerless) {
          // Em ambiente serverless, usar o path do Cloudinary diretamente
          filename = req.file.filename || path.basename(req.file.path || req.file.originalname);
          // Não precisamos mover arquivo em ambiente serverless
          tmpPath = req.file.path; // Path do Cloudinary
        } else {
          // Em ambiente local, mover arquivo para diretório temporário
          await ensureDir(TMP_DIR);
          const origPath = req.file.path;
          filename = req.file.filename || path.basename(origPath);
          tmpPath = path.join(TMP_DIR, filename);
          
          // Mover arquivo para diretório temporário
          await moveFile(origPath, tmpPath);
        }

        pendingUpload = await PendingUpload.create({
          filename,
          originalName: req.file.originalname || filename,
          userId: String(userId),
          localName: localName || '',
          localDescricao: localDescricao || '',
          localType: tipoNorm,
          link: link || '',
          country: country || '',
          countryCode: countryCode || '',
          state: state || '',
          city: city || '',
          createdAt: new Date(),
          metadata: { 
            app: 'treinai',
            fileSize: req.file.size,
            mimeType: req.file.mimetype
          }
        });
        
        log(`PendingUpload criado: ${pendingUpload._id} para usuário ${userId}`);
      } catch (err) {
        console.error('CriarAssinaturaProLocal: falha ao processar upload:', err);
        
        // Limpar arquivo em caso de erro apenas em ambiente local
        const isServerless = !!(process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
        if (!isServerless && req.file?.path) {
          await unlinkIfExists(req.file.path);
        }
        
        return res.status(500).json({ 
          success: false, 
          msg: 'Erro ao processar upload da imagem',
          code: 'UPLOAD_ERROR'
        });
      }
    }

    // Gerar chave de idempotência
    const idempotencyKey = `local_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Metadata da subscription
    const subscriptionMetadata = {
      app: 'treinai',
      flow: 'publish_local',
      pendingUploadId: pendingUpload ? String(pendingUpload._id) : null,
      userId: String(userId),
      link: link || '',
      localType: tipoNorm,
      localName: localName || '',
      localDescricao: localDescricao || '',
      imageTmpFilename: pendingUpload ? pendingUpload.filename : '',
      country: country || '',
      countryCode: countryCode || '',
      state: state || '',
      city: city || '',
      price_id: unitPrice,
      idempotency_key: idempotencyKey
    };

    // Configuração da sessão melhorada
    const sessionParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: unitPrice, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}&type=local`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel?type=local`,
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutos
      metadata: { 
        app: 'treinai', 
        pendingUploadId: pendingUpload ? String(pendingUpload._id) : null, 
        flow: 'publish_local',
        idempotency_key: idempotencyKey
      },
      subscription_data: {
        metadata: subscriptionMetadata,
      },
      customer: customerId,
      allow_promotion_codes: true, // Permitir códigos promocionais
      billing_address_collection: 'auto'
    };

    const session = await stripe.checkout.sessions.create(sessionParams);
    
    log(`Checkout session criada para local: ${session.id} - User: ${userId} - Tipo: ${tipoNorm}`);

    return res.status(201).json({
      success: true,
      msg: `Checkout session criada para ${tipoNorm} (${pm}).`,
      sessionId: session.id,
      url: session.url,
      priceId: unitPrice,
      tipo: tipoNorm,
      userId: String(userId),
      customerId: customerId || null,
      paymentMethodTypes: session.payment_method_types || [pm],
      pendingUploadId: pendingUpload ? String(pendingUpload._id) : null,
      expiresAt: session.expires_at
    });

  } catch (error) {
    console.error('CriarAssinaturaProLocal fatal error:', error?.message || error);
    
    // Limpar pending upload em caso de erro
    if (req.body?.pendingUploadId) {
      await removePendingUpload(req.body.pendingUploadId).catch(() => {});
    }
    
    return res.status(500).json({ 
      success: false, 
      msg: 'Erro interno ao criar sessão de assinatura', 
      code: 'INTERNAL_ERROR',
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
};

// Webhook handler modernizado com segurança aprimorada
export const webhookHandler = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error('STRIPE_WEBHOOK_SECRET não configurado');
    return res.status(500).json({ 
      success: false, 
      msg: 'Configuração de webhook ausente',
      code: 'WEBHOOK_CONFIG_ERROR'
    });
  }

  let event;
  try {
    // Verificação de assinatura com tolerância de tempo
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ 
      success: false, 
      msg: 'Assinatura do webhook inválida',
      code: 'INVALID_SIGNATURE'
    });
  }

  // Log do evento para auditoria
  log(`Webhook recebido: ${event.type} - ID: ${event.id}`);

  try {
    // Implementar idempotência para evitar processamento duplicado
    const eventId = event.id;
    const existingEvent = await ProcessedWebhookEvent.findOne({ eventId });
    
    if (existingEvent) {
      log(`Evento já processado: ${eventId}`);
      return res.status(200).json({ 
        success: true, 
        msg: 'Evento já processado',
        code: 'ALREADY_PROCESSED'
      });
    }

    // Processar diferentes tipos de eventos
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      default:
        log(`Tipo de evento não tratado: ${event.type}`);
    }

    // Marcar evento como processado
    await ProcessedWebhookEvent.create({
      eventId,
      eventType: event.type,
      processedAt: new Date(),
      metadata: {
        app: 'treinai',
        objectId: event.data.object.id
      }
    });

    return res.status(200).json({ 
      success: true, 
      msg: 'Webhook processado com sucesso',
      eventType: event.type,
      eventId: event.id
    });

  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    
    // Log detalhado para debugging
    console.error('Event data:', JSON.stringify(event.data.object, null, 2));
    
    return res.status(500).json({ 
      success: false, 
      msg: 'Erro interno ao processar webhook',
      code: 'WEBHOOK_PROCESSING_ERROR',
      eventType: event.type,
      eventId: event.id
    });
  }
};

// Modernizar CreateCheckoutSession com práticas 2024
export const CreateCheckoutSession = async (req, res) => {
  try {
    const { plan, userId } = req.body;
    
    // Validação robusta
    if (!plan || !userId) {
      return res.status(400).json({ 
        success: false,
        msg: 'plan e userId são obrigatórios',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    const priceMap = {
      pro: process.env.STRIPE_PRICEID_PRO,
      max: process.env.STRIPE_PRICEID_MAX,
      coach: process.env.STRIPE_PRICEID_COACH,
    };

    const priceId = priceMap[plan];
    if (!priceId) {
      return res.status(400).json({ 
        success: false,
        msg: `Plano inválido: ${plan}. Planos aceitos: ${Object.keys(priceMap).join(', ')}`,
        code: 'INVALID_PLAN'
      });
    }

    // Buscar usuário com validação
    let user = null;
    try {
      user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          msg: 'Usuário não encontrado',
          code: 'USER_NOT_FOUND'
        });
      }
    } catch (err) {
      return res.status(400).json({
        success: false,
        msg: 'ID de usuário inválido',
        code: 'INVALID_USER_ID'
      });
    }

    // Buscar ou criar customer no Stripe
    let customerId = user.planInfos?.stripeCustomerId || null;
    if (!customerId) {
      try {
        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        customerId = customers.data[0]?.id || null;
        
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: user.email,
            name: user.name || user.username,
            metadata: { 
              app_user_id: String(user._id),
              app: 'treinai',
              created_at: new Date().toISOString()
            }
          });
          customerId = customer.id;
          
          // Salvar customer ID
          user.planInfos = user.planInfos || {};
          user.planInfos.stripeCustomerId = customerId;
          await user.save();
        }
      } catch (err) {
        console.error('Erro ao criar/buscar customer:', err);
        return res.status(500).json({
          success: false,
          msg: 'Erro ao processar dados do cliente no Stripe',
          code: 'STRIPE_CUSTOMER_ERROR'
        });
      }
    }

    // Gerar chave de idempotência
    const idempotencyKey = `plan_${userId}_${plan}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Configuração da sessão melhorada
    const sessionParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}&type=plan`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel?type=plan`,
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutos
      metadata: {
        user_id: String(user._id),
        plan_type: plan,
        app: 'treinai',
        idempotency_key: idempotencyKey
      },
      subscription_data: {
        metadata: {
          user_id: String(user._id),
          plan_type: plan,
          app: 'treinai',
          idempotency_key: idempotencyKey
        },
      },
      customer: customerId,
      allow_promotion_codes: true, // Permitir códigos promocionais
      billing_address_collection: 'auto'
    };

    const session = await stripe.checkout.sessions.create(sessionParams);
    
    log(`Checkout session criada para plano: ${session.id} - User: ${userId} - Plano: ${plan}`);

    return res.status(201).json({ 
      success: true,
      msg: `Checkout session criada para plano ${plan}`,
      url: session.url, 
      id: session.id,
      sessionId: session.id,
      priceId,
      plan,
      userId: String(userId),
      customerId,
      expiresAt: session.expires_at
    });

  } catch (error) {
    console.error('CreateCheckoutSession error:', error);
    return res.status(500).json({ 
      success: false,
      msg: 'Erro interno ao criar sessão de checkout',
      code: 'INTERNAL_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =====================================================================================
// Webhook Handler (idempotente) - atualizado para lidar com PendingUpload lifecycle
// =====================================================================================
export const StripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  // Verificações de segurança robustas para debugging
  console.log('🔍 Webhook Debug Info:');
  console.log('- Content-Type:', req.headers['content-type']);
  console.log('- Body type:', typeof req.body);
  console.log('- Body is Buffer:', Buffer.isBuffer(req.body));
  console.log('- Body length:', req.body?.length || 'undefined');
  console.log('- Signature present:', !!sig);
  console.log('- Webhook secret configured:', !!process.env.STRIPE_WEBHOOK_SECRET);

  // Validar se o cabeçalho de assinatura está presente
  if (!sig) {
    console.error('❌ Stripe-Signature header ausente');
    return res.status(400).send('Stripe-Signature header ausente');
  }

  // Validar se o corpo da requisição está em formato correto
  if (!req.body) {
    console.error('❌ Request body está vazio ou undefined');
    return res.status(400).send('Request body vazio');
  }

  if (!Buffer.isBuffer(req.body) && typeof req.body !== 'string') {
    console.error('❌ Request body não é Buffer nem string:', typeof req.body);
    console.error('❌ Body content preview:', JSON.stringify(req.body).substring(0, 200));
    return res.status(400).send('Request body deve ser Buffer ou string raw');
  }

  // Verificar se o webhook secret está configurado
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('❌ STRIPE_WEBHOOK_SECRET não configurado no .env');
    return res.status(500).send('Webhook secret não configurado');
  }

  // Verificar formato da assinatura
  if (!sig.includes('t=') || !sig.includes('v1=')) {
    console.error('❌ Formato de assinatura inválido:', sig.substring(0, 50) + '...');
    return res.status(400).send('Formato de assinatura Stripe inválido');
  }

  let event;
  try {
    // Tentar construir o evento com verificação de assinatura
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log('✅ Webhook signature verificada com sucesso');
  } catch (err) {
    console.error('❌ Webhook constructEvent error:', err.message || err);
    console.error('❌ Error details:', {
      name: err.name,
      type: err.type,
      code: err.code,
      statusCode: err.statusCode
    });
    
    // Log adicional para debugging <mcreference link="https://docs.stripe.com/webhooks/signature" index="2">2</mcreference>
    if (err.message?.includes('No signatures found')) {
      console.error('🔍 Debugging signature verification:');
      console.error('- Raw body preview:', req.body.toString().substring(0, 100));
      console.error('- Signature header:', sig.substring(0, 100) + '...');
      console.error('- Secret prefix:', process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 10) + '...');
    }
    
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  const evtType = event.type;
  log('Evento recebido:', evtType, event.id);

  // Idempotência: gravar esse event.id em coleção dedicada
  try {
    await ProcessedStripeEvent.create({ eventId: event.id, meta: { type: evtType, receivedAt: new Date() } });
  } catch (err) {
    if (err && err.code === 11000) {
      log(`Evento ${event.id} já processado - ignorando.`);
      return res.json({ received: true });
    }
    console.error('Erro ao gravar ProcessedStripeEvent:', err);
    return res.status(500).send('Erro interno de webhook (idempotency).');
  }

  const data = event.data.object || {};
  const evtCreatedMs = (typeof event.created === 'number') ? (event.created * 1000) : getBrazilDate();

  // helpers locais (mantive os seus ensureUserByCustomer/findUserBySubscription/applyManualUpdate)
  const ensureUserByCustomer = async (customerId) => {
    if (!customerId) return null;
    let user = await User.findOne({ 'planInfos.stripeCustomerId': customerId });
    if (user) return user;
    try {
      const customer = await stripe.customers.retrieve(customerId);
      const appUserId = customer?.metadata?.app_user_id || customer?.metadata?.user_id;
      if (appUserId) {
        const byId = await User.findById(appUserId);
        if (byId) { byId.planInfos = byId.planInfos || {}; byId.planInfos.stripeCustomerId = customerId; await byId.save(); return byId; }
      }
      if (customer?.email) {
        const byEmail = await User.findOne({ email: customer.email });
        if (byEmail) { byEmail.planInfos = byEmail.planInfos || {}; byEmail.planInfos.stripeCustomerId = customerId; await byEmail.save(); return byEmail; }
      }
    } catch (err) {
      console.warn('ensureUserByCustomer erro:', err?.message || err);
    }
    return null;
  };

  const findUserBySubscription = async (subscriptionId) => {
    if (!subscriptionId) return null;
    return await User.findOne({ 'planInfos.subscriptionId': subscriptionId });
  };

  const applyManualUpdate = async (userId, updates = {}, eventTs = evtCreatedMs) => {
    if (!userId) return null;
    const user = await User.findById(userId);
    if (!user) return null;
    user.planInfos = user.planInfos || {};
    for (const [k, v] of Object.entries(updates)) user.planInfos[k] = v;
    user.planInfos.lastStripeEventTimestamp = eventTs;
    await user.save();
    log(`Usuário ${userId} atualizado com:`, updates);
    return user;
  };

  try {
    switch (evtType) {
      // checkout.session.completed: vincular subscriptionId ao PendingUpload (se houver)
      case 'checkout.session.completed': {
        log('checkout.session.completed');
        const session = data;
        if (!session.metadata || session.metadata.app !== 'treinai') { log('session: origem diferente -> ignorando'); break; }
        const subscriptionId = session.subscription || null;
        const customerId = session.customer || null;

        // atualização de usuário (se aplicável) - mantive sua lógica
        if (session.metadata.plan_type) {
          if (session.metadata.user_id) {
            await applyManualUpdate(session.metadata.user_id, {
              subscriptionId,
              stripeCustomerId: customerId,
              status: 'inativo',
              planType: session.metadata.plan_type,
              nextPaymentValue: null,
              nextPaymentDate: null
            }, evtCreatedMs);
          } else if (customerId) {
            const user = await ensureUserByCustomer(customerId);
            if (user) await applyManualUpdate(user._id, { subscriptionId, stripeCustomerId: customerId, status: 'inativo', planType: session.metadata.plan_type, }, evtCreatedMs);
            else log('checkout.session.completed: usuário não encontrado para customer', customerId);
          }
        }

        // se for fluxo publish_local: vincular subscriptionId ao PendingUpload
        try {
          if (session.metadata.flow && session.metadata.flow === 'publish_local' && session.metadata.pendingUploadId) {
            const pendingId = session.metadata.pendingUploadId;
            const p = await PendingUpload.findById(pendingId);
            if (p) {
              p.subscriptionId = subscriptionId || p.subscriptionId;
              await p.save();
              log('checkout.session.completed: PendingUpload atualizado com subscriptionId:', pendingId);
            } else {
              log('checkout.session.completed: pendingUploadId não encontrado:', pendingId);
            }
          }
        } catch (errLocal) {
          console.warn('checkout.session.completed: erro ao vincular pending upload:', errLocal?.message || errLocal);
        }

        // --- adicionarSaldoDeImpressoes ---
        // Se for fluxo saldo_impressoes, creditar saldo no usuário
        if (
          (session.metadata && session.metadata.flow === 'saldo_impressoes' && session.metadata.userId && session.metadata.quantidade) ||
          (md && md.flow === 'saldo_impressoes' && md.userId && md.quantidade)
        ) {
          try {
            const userId = (session.metadata && session.metadata.userId) || (md && md.userId);
            const quantidade = parseInt((session.metadata && session.metadata.quantidade) || (md && md.quantidade), 10);
            if (!isNaN(quantidade) && quantidade > 0) {
              const userSaldo = await User.findById(userId);
              if (userSaldo) {
                userSaldo.saldoDeImpressoes = (userSaldo.saldoDeImpressoes || 0) + quantidade;
                // Enviar email de confirmação
                await userSaldo.save();
                sendNotificationEmail(userSaldo.email, 'Saldo de Impressões Adicionado', `Seu saldo foi adicionado com sucesso. Quantidade adicionada: +${quantidade}. Total atual: ${userSaldo.saldoDeImpressoes}`);
                log(`Saldo de impressões adicionado ao user ${userId}: +${quantidade} (total: ${userSaldo.saldoDeImpressoes})`);
              } else {
                log('saldo_impressoes: usuário não encontrado para userId:', userId);
              }
            }
          } catch (errSaldo) {
            console.error('Erro ao adicionar saldo de impressões:', errSaldo);
          }
        }

        break;
      }

      // invoice.paid -> mover tmp -> final e criar Local definitivo (se houver pendingUploadId)
      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        log('invoice.paid handler');
        const invoice = data;
        const invoiceId = invoice.id;
        const subscriptionId = invoice.subscription || null;
        const customerId = invoice.customer || null;
        const invoicePaidFlag = invoice.paid === true || invoice.status === 'paid' || (typeof invoice.amount_paid === 'number' && invoice.amount_paid > 0);
        if (!invoicePaidFlag) { log('invoice não está paga -> ignorando'); break; }

        // Atualizar user (se aplicável) - mantive sua lógica
        let user = null;
        if (invoice.metadata?.user_id) user = await User.findById(invoice.metadata.user_id);
        if (!user && customerId) user = await User.findOne({ 'planInfos.stripeCustomerId': customerId });
        if (!user && subscriptionId) user = await User.findOne({ 'planInfos.subscriptionId': subscriptionId });

        if (user) {
          user.planInfos = user.planInfos || {};
          if (String(user.planInfos.lastProcessedInvoiceId) === String(invoiceId)) {
            log('invoice já processada anteriormente -> ignorando');
          } else {
            user.planInfos.subscriptionId = subscriptionId || user.planInfos.subscriptionId;
            user.planInfos.stripeCustomerId = customerId || user.planInfos.stripeCustomerId;
            user.planInfos.nextPaymentValue = (invoice.amount_paid != null) ? (invoice.amount_paid / 100) : user.planInfos.nextPaymentValue;
            // tentar pegar next date via subscription
            let nextPaymentDate = null;
            if (subscriptionId) {
              try {
                const sub = await stripe.subscriptions.retrieve(subscriptionId);
                if (sub && sub.current_period_end) nextPaymentDate = new Date(sub.current_period_end * 1000);
              } catch (err) { /* ignore */ }
            }
            user.planInfos.nextPaymentDate = nextPaymentDate || user.planInfos.nextPaymentDate;
            user.planInfos.status = 'ativo';
            user.planInfos.lastProcessedInvoiceId = invoiceId;

            await user.save();
            // Enviar email de confirmação
            sendNotificationEmail(user.email, 'Plano Ativado', 'Seu plano foi ativado com sucesso!');
            log('Usuario ativado via invoice.paid:', user._id);
          }
        } else {
          log('invoice.paid: usuário não encontrado (customer/subscription/metadata).');
        }


        // --- lifecycle do PendingUpload -> criação do Local definitivo ---
        let md = invoice.metadata || {};
        let pendingUploadId = md.pendingUploadId || null;

        // se não vier na invoice, tentar buscar na subscription metadata
        if (!pendingUploadId && subscriptionId) {
          try {
            const subFull = await stripe.subscriptions.retrieve(subscriptionId);
            md = { ...md, ...(subFull?.metadata || {}) };
            pendingUploadId = subFull?.metadata?.pendingUploadId || null;
          } catch (err) {
            log('invoice.paid: falha ao recuperar subscription para metadata (não crítico):', err?.message || err);
          }
        }

        if (pendingUploadId) {
          try {
            const pending = await PendingUpload.findById(pendingUploadId);
            if (!pending) {
              log('invoice.paid: pendingUploadId informado, mas não encontrado:', pendingUploadId);
            } else {
              // Detectar ambiente serverless
              const isServerless = !!(process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
              
              let imageUrl;
              
              if (isServerless) {
                // Em ambiente serverless, usar o path do Cloudinary diretamente
                imageUrl = pending.filename ? pending.filename : null;
              } else {
                // Em ambiente local, mover arquivo tmp -> final
                const src = path.join(TMP_DIR, pending.filename);
                const dest = path.join(FINAL_DIR, pending.filename);
                try {
                  await ensureDir(FINAL_DIR);
                  await moveFile(src, dest);
                } catch (e) {
                  console.error('invoice.paid: falha ao mover arquivo tmp->final:', e?.message || e);
                  // mesmo se mover falhar, podemos tentar criar local com imageUrl null ou registrar para revisão
                }
                
                // montar imageUrl apenas com path relativo
                imageUrl = pending.filename ? `/uploads/image-local/${pending.filename}` : null;
              }

              // checar duplicidade (por userId+localName+localType)
              let exists = null;
              if (pending.userId && pending.localName && pending.localType) {
                exists = await Local.findOne({ userId: pending.userId, localName: pending.localName, localType: pending.localType });
              }
              if (exists) {
                // atualizar subscriptionId/status se necessário
                if (subscriptionId && !exists.subscriptionId) exists.subscriptionId = subscriptionId;
                if (exists.status !== 'ativo') exists.status = 'ativo';
                exists.atualizadoEm = new Date();
                if (imageUrl && !exists.imageUrl) exists.imageUrl = imageUrl;
                await exists.save();
                log('invoice.paid: Local já existia, atualizado a partir do PendingUpload:', exists._id);
              } else {
                // criar Local definitivo
                const payload = {
                  userId: pending.userId,
                  link: pending.link || '',
                  localName: pending.localName,
                  localDescricao: pending.localDescricao || '',
                  localType: pending.localType,
                  imageUrl: imageUrl || null,
                  country: pending.country || null,
                  countryCode: pending.countryCode || null,
                  state: pending.state || null,
                  city: pending.city || null,
                  subscriptionId: subscriptionId || pending.subscriptionId || null,
                  status: 'ativo',
                  criadoEm: new Date(),
                  criadoVia: 'invoice.paid'
                };

                console.log(payload)

                try {
                  const createdLocal = await Local.create(payload);
                  log('invoice.paid: Local criado a partir do PendingUpload:', createdLocal._id);
                } catch (errCreateLocal) {
                  console.error('invoice.paid: erro ao criar Local a partir do PendingUpload:', errCreateLocal);
                }
              }

              // remover PendingUpload (arquivo já movido)
              try {
                await PendingUpload.findByIdAndDelete(pendingUploadId);
              } catch (e) {
                console.warn('invoice.paid: falha ao remover PendingUpload (não crítico):', e?.message || e);
              }
            }
          } catch (err) {
            console.error('invoice.paid: erro ao processar pendingUploadId:', err);
          }
          break;
        }

        // Se não houver pendingUploadId, usar seus fallbacks originais (por subscriptionId etc.)
        // (aqui mantenho sua lógica anterior para subscriptionId/metadata sem pendingUpload)
        // 2) fallback: procurar local por subscriptionId no DB
        if (subscriptionId) {
          try {
            const bySub = await Local.findOne({ subscriptionId });
            if (bySub) {
              bySub.status = 'ativo';
              bySub.atualizadoEm = new Date(getBrazilDate());
              await bySub.save();
              // Enviar email de confirmação
              const user = await User.findById(bySub.userId);
              if (user) sendNotificationEmail(user.email, 'Plano de local ativado', 'Seu plano de local foi ativado com sucesso!');
              log('Local atualizado por subscriptionId:', bySub._id);
              break;
            }
          } catch (err) {
            console.warn('Erro ao procurar Local por subscriptionId (não crítico):', err);
          }
        }

        // 3) fallback final: criar a partir da metadata se completa
        if (md.userId && md.localName && md.localType) {
          try {
            const exists = await Local.findOne({ userId: md.userId, localName: md.localName, localType: md.localType });
            if (exists) {
              if (subscriptionId && !exists.subscriptionId) {
                exists.subscriptionId = subscriptionId;
                exists.status = 'ativo';
                exists.atualizadoEm = new Date(getBrazilDate());
                await exists.save();
                // Enviar email de confirmação
                const user = await User.findById(exists.userId);
                if (user) sendNotificationEmail(user.email, 'Plano de local ativado', 'Seu plano de local foi ativado com sucesso!');
                log('Local existente atualizado com subscriptionId:', exists._id);
              } else {
                log('Local já existe, nada a fazer.');
              }
            } else {
              const payloadForLocal = {
                userId: md.userId,
                localName: md.localName,
                localDescricao: md.localDescricao || '',
                localType: md.localType,
                imageUrl: md.imageUrl || null,
                country: md.country || null,
                countryCode: md.countryCode || null,
                state: md.state || null,
                city: md.city || null,
                subscriptionId: subscriptionId || null,
                status: 'ativo',
                criadoEm: new Date(),
                criadoVia: 'invoice.paid'
              };
              const created = await Local.create(payloadForLocal);

              // Enviar email de confirmação
              const user = await User.findById(created.userId);
              if (user) sendNotificationEmail(user.email, 'Plano de local ativado', 'Seu plano de local foi ativado com sucesso!');
              log('Local criado a partir de metadata do invoice.paid:', created._id);
            }
          } catch (err) {
            console.error('Erro ao criar/atualizar Local a partir de metadata:', err);
          }
        } else {
          log('invoice.paid: metadata insuficiente para criar local automaticamente; gravado para revisão manual.', md);
        }

        break;
      }

      // payment failed -> remover PendingUpload (se existir) e marcar local inativo (se já existia), NÃO criar Local
      case 'invoice.payment_failed': {
        log('invoice.payment_failed');
        const invoice = data;
        const subscriptionId = invoice.subscription || null;
        const customerId = invoice.customer || null;

        // tentar obter metadata da invoice; se vazio, puxar da subscription
        let md = invoice.metadata && Object.keys(invoice.metadata).length ? invoice.metadata : {};
        if ((!md || Object.keys(md).length === 0) && subscriptionId) {
          try {
            const subFull = await stripe.subscriptions.retrieve(subscriptionId);
            md = { ...(subFull?.metadata || {}) };
          } catch (err) {
            log('invoice.payment_failed: falha ao recuperar subscription metadata (não crítico):', err?.message || err);
            md = md || {};
          }
        }

        const flow = md.flow || null;
        const pendingUploadId = md.pendingUploadId || null;

        // fluxo publish_local: se houver pendingUploadId -> remover tmp + PendingUpload
        if (flow === 'publish_local' && pendingUploadId) {
          try {
            await removePendingUpload(pendingUploadId);
            log('invoice.payment_failed: pendingUpload removido (checkout abandonado ou pagamento falhou):', pendingUploadId);
          } catch (e) {
            console.warn('invoice.payment_failed: falha ao remover pendingUpload:', e?.message || e);
          }
        }

        // além disso, se já existe Local vinculado a essa subscription, marcar inativo (mantive sua lógica segura)
        try {
          if (subscriptionId) {
            const local = await Local.findOne({ subscriptionId });
            if (local) {
              local.status = 'inativo';
              local.paymentFailureInvoiceId = invoice.id;
              local.lastPaymentFailedAt = new Date(evtCreatedMs);
              local.updatedAt = new Date();
              await local.save();

              // Enviar email de confirmação
              const user = await User.findById(local.userId);
              if (user) sendNotificationEmail(user.email, 'Plano de local cancelado', 'Seu plano de local foi cancelado com sucesso!');
              log('Local existente marcado inativo por invoice.payment_failed:', local._id);
            }
          }
        } catch (e) {
          console.warn('invoice.payment_failed: erro ao marcar local existente inativo (não crítico):', e?.message || e);
        }

        // usuário: marca inativo conforme sua lógica original
        try {
          let user = null;
          if (md.user_id) user = await User.findById(md.user_id);
          if (!user && customerId) user = await User.findOne({ 'planInfos.stripeCustomerId': customerId });
          if (!user && subscriptionId) user = await User.findOne({ 'planInfos.subscriptionId': subscriptionId });
          if (user) {
            user.planInfos = user.planInfos || {};
            user.planInfos.status = 'inativo';
            user.planInfos.lastPaymentFailed = invoice.id;
            user.planInfos.lastStripeEventTimestamp = evtCreatedMs;
            await user.save();

            // Enviar email de confirmação
            if (user) sendNotificationEmail(user.email, 'Plano cancelado', 'Seu plano foi cancelado com sucesso!');

            log('Usuário marcado inativo por invoice.payment_failed:', user._id);
          }
        } catch (errUser) {
          console.error('invoice.payment_failed: erro ao marcar usuário inativo:', errUser);
        }

        break;
      }

      // checkout.session.expired -> usuário abandonou checkout: remover pendingUpload (se existir)
      case 'checkout.session.expired': {
        log('checkout.session.expired');
        const session = data;
        // session.metadata.pendingUploadId é o que criamos
        const pendingUploadId = session.metadata?.pendingUploadId || null;
        if (pendingUploadId) {
          try {
            await removePendingUpload(pendingUploadId);
            log('checkout.session.expired: PendingUpload removido (abandonado):', pendingUploadId);
          } catch (e) {
            console.warn('checkout.session.expired: falha ao remover pendingUpload:', e?.message || e);
          }
        }
        break;
      }

      // customer.subscription.deleted -> manter sua lógica, mas não criar/excluir pending uploads
      case 'customer.subscription.deleted': {
        log('customer.subscription.deleted');
        const subscription = data;
        const subscriptionId = subscription.id;
        const customerId = subscription.customer || null;
        const md = subscription.metadata || {};

        // detectar fluxo local
        const metadataIndicatesLocal = (md && (String(md.flow || '').toLowerCase() === 'publish_local' || !!md.pendingUploadId || !!md.pendingLocalId));

        let local = null;
        try {
          local = await Local.findOne({ subscriptionId });
        } catch (err) {
          console.warn('customer.subscription.deleted: erro ao procurar local por subscriptionId:', err);
        }

        if (metadataIndicatesLocal || local) {
          try {
            if (local) {
              local.status = 'inativo';
              local.atualizadoEm = new Date();
              await local.save();

              // Enviar email de confirmação
              const user = await User.findById(local.userId);
              if (user) sendNotificationEmail(user.email, 'Plano de local cancelado', 'Seu plano de local foi cancelado com sucesso!');
              log('Local marcado inativo por subscription.deleted:', local._id);
            } else {
              log('subscription.deleted indica publish_local mas Local não encontrado (provavelmente já removido):', { subscriptionId, metadata: md });
            }
          } catch (err) {
            console.warn('customer.subscription.deleted: erro ao atualizar local:', err);
          }
        } else {
          try {
            let user = null;
            if (md.user_id) user = await User.findById(md.user_id);
            if (!user && customerId) user = await ensureUserByCustomer(customerId);
            if (!user && subscriptionId) user = await findUserBySubscription(subscriptionId);
            if (user) {
              user.planInfos = user.planInfos || {};
              user.planInfos.subscriptionId = null;
              user.planInfos.status = 'inativo';
              user.planInfos.planType = 'free';
              user.planInfos.nextPaymentDate = null;
              user.planInfos.nextPaymentValue = null;
              user.planInfos.lastStripeEventTimestamp = evtCreatedMs;
              await user.save();

              // Enviar email de confirmação
              if (user) sendNotificationEmail(user.email, 'Plano cancelado', 'Seu plano foi cancelado com sucesso!');
              log('Usuário atualizado por subscription.deleted (plano removido):', user._id);
            } else {
              log('customer.subscription.deleted: usuário não encontrado para subscriptionId/customerId.', { subscriptionId, customerId });
            }
          } catch (err) {
            console.warn('customer.subscription.deleted: erro ao atualizar usuário:', err);
          }
        }
        break;
      }

      default:
        log('Evento não tratado:', evtType);
    }

    return res.json({ received: true });
  } catch (err) {
    console.error('Erro ao processar webhook:', err);
    return res.status(500).send('Erro interno');
  }
};

// =====================================================================================
// SessionStatus
// =====================================================================================
export const SessionStatus = async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: '!session_id' });

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.subscription) {
      const sub = await stripe.subscriptions.retrieve(session.subscription);
      return res.json({ status: sub.status, subscriptionId: sub.id });
    }

    const isActive = session.payment_status === 'paid' ? 'ativo' : 'inativo';
    return res.json({ status: isActive, subscriptionId: session.subscription || null });
  } catch (err) {
    console.error('Erro ao consultar sessão:', err);
    return res.status(500).json({ error: 'Erro ao consultar sessão' });
  }
};

// =====================================================================================
// atualizarPlano (mantive sua versão completa - não modifiquei a lógica aqui, apenas deixei como está)
// =====================================================================================
export const atualizarPlano = async (req, res) => {
  try {
    const { email, userId, plan, password } = req.body;
    if (!userId) return res.status(400).json({ msg: '!userId' });
    if (!email) return res.status(400).json({ msg: '!email' });
    if (!plan) return res.status(400).json({ msg: '!plan' });
    if (!password) return res.status(400).json({ msg: '!password' });

    console.log('[atualizarPlano] Iniciando fluxo', { userId, email, requestedPlan: plan });

    const ALLOWED_PLANS = ['free', 'pro', 'max', 'coach'];
    const priceMap = {
      pro: process.env.STRIPE_PRICEID_PRO,
      max: process.env.STRIPE_PRICEID_MAX,
      coach: process.env.STRIPE_PRICEID_COACH,
    };

    const user = await User.findById(userId);
    if (!user) {
      console.warn('[atualizarPlano] Usuário não encontrado', { userId, email });
      return res.status(404).json({ msg: '!usuario' });
    }

    const senhaValida = await bcrypt.compare(password, user.password);
    if (!senhaValida) {
      console.warn('[atualizarPlano] Senha inválida para userId', userId);
      return res.status(403).json({ msg: 'Senha incorreta' });
    }

    const currentPlan = String(user.planInfos?.planType || 'free').toLowerCase();
    const requestedPlan = String(plan).toLowerCase().trim();
    if (!ALLOWED_PLANS.includes(requestedPlan)) {
      console.warn('[atualizarPlano] Plano requisitado inválido', requestedPlan);
      return res.status(400).json({ msg: '!planoInvalido' });
    }
    if (requestedPlan === currentPlan) {
      console.log('[atualizarPlano] Requisição para o mesmo plano atual — nada a fazer', { userId, currentPlan });
      return res.status(400).json({ msg: 'Já está neste plano', planInfos: user.planInfos });
    }

    // localizar/garantir customerId
    let customerId = user.planInfos?.stripeCustomerId || null;
    if (!customerId) {
      console.log('[atualizarPlano] Procurando customer pelo email no Stripe', email);
      const customers = await stripe.customers.list({ email, limit: 1 });
      customerId = customers.data[0]?.id || null;
      console.log('[atualizarPlano] customer encontrado via email:', customerId);
    }

    // helper para listar assinaturas ativas do customer
    const listActiveSubscriptions = async () => {
      if (!customerId) return [];
      console.log('[atualizarPlano] Listando assinaturas ativas para customer:', customerId);
      const subs = await stripe.subscriptions.list({ customer: customerId, status: 'active', limit: 100 });
      console.log('[atualizarPlano] assinaturas ativas retornadas:', subs.data?.length || 0);
      return Array.isArray(subs.data) ? subs.data : [];
    };

    // -------------------- CANCEL (FREE) --------------------
    if (requestedPlan === 'free') {
      console.log('[atualizarPlano] Fluxo de downgrade para FREE iniciado', { userId, customerId });

      if (!customerId) {
        console.log('[atualizarPlano] Nenhum customer no Stripe — atualizando localmente para free');
        user.planInfos = user.planInfos || {};
        user.planInfos.status = 'inativo';
        user.planInfos.planType = 'free';
        user.planInfos.nextPaymentDate = null;
        user.planInfos.nextPaymentValue = null;
        user.planInfos.subscriptionId = null;
        await user.save();
        return res.json({ msg: 'Não havia customer no Stripe. Plano setado para free localmente.', planInfos: user.planInfos });
      }

      const activeSubs = await listActiveSubscriptions();
      if (!activeSubs.length) {
        console.log('[atualizarPlano] Customer não tem assinaturas ativas — atualizando localmente para free', { customerId });
        user.planInfos = user.planInfos || {};
        user.planInfos.status = 'inativo';
        user.planInfos.planType = 'free';
        user.planInfos.nextPaymentDate = null;
        user.planInfos.nextPaymentValue = null;
        user.planInfos.subscriptionId = null;
        await user.save();
        return res.json({ msg: 'Sem assinatura ativa no Stripe. Plano setado para free localmente.', planInfos: user.planInfos });
      }

      // heurística para escolher assinatura a cancelar
      const knownPriceIds = Object.values(priceMap).filter(Boolean);
      let subToCancel = activeSubs.find(s => String(s.id) === String(user.planInfos?.subscriptionId));
      if (!subToCancel) subToCancel = activeSubs.find(s => s.items?.data?.some(it => knownPriceIds.includes(it.price?.id)));
      if (!subToCancel) subToCancel = activeSubs.find(s => s.metadata && String(s.metadata.app_user_id) === String(userId));
      if (!subToCancel) subToCancel = activeSubs[0];

      // usar helper cancel + refund
      let refundResult = null;
      try {
        const result = await cancelSubscriptionWithRefund(subToCancel.id);
        if (!result.success) {
          console.warn('[atualizarPlano] cancelSubscriptionWithRefund retornou erro:', result.error);
        } else {
          refundResult = result.refund || null;
        }
      } catch (errCancelHelper) {
        console.warn('[atualizarPlano] Erro no cancelSubscriptionWithRefund (não crítico):', errCancelHelper?.message || errCancelHelper);
        // fallback: tentar cancelar simples
        try {
          await stripe.subscriptions.del(subToCancel.id);
        } catch (e) { console.warn('[atualizarPlano] fallback cancel falhou:', e?.message || e); }
      }

      // atualizar localmente
      user.planInfos = user.planInfos || {};
      user.planInfos.status = 'inativo';
      user.planInfos.planType = 'free';
      user.planInfos.nextPaymentDate = null;
      user.planInfos.nextPaymentValue = null;
      user.planInfos.subscriptionId = null;
      await user.save();

      sendNotificationEmail(
        user.email,
        'Assinatura downgradada para FREE',
        `Sua assinatura foi downgradada para o plano FREE. Agradecemos por sua preferência. Se você tiver alguma dúvida, por favor, entre em contato conosco.`
      );
      sendNotificationEmail(
        process.env.EMAIL_USER,
        'Assinatura downgradada para FREE',
        `A assinatura de ${user.username} do _id: ${user._id} foi downgradada para o plano FREE.`
      );

      return res.json({
        msg: 'Assinatura cancelada e plano setado para free',
        planInfos: user.planInfos,
        canceledSubscription: subToCancel?.id || null,
        refundId: refundResult?.id || null,
        refundAmount: refundResult?.amount || null
      });
    }

    // -------------------- UPGRADE / DOWNGRADE (proration) --------------------
    const priceId = priceMap[requestedPlan];
    if (!priceId) {
      console.warn('[atualizarPlano] priceId não encontrado para requestedPlan:', requestedPlan);
      return res.status(400).json({ msg: '!planoInvalido' });
    }

    // criar customer se necessário
    if (!customerId) {
      console.log('[atualizarPlano] Criando customer no Stripe (não havia)', { email, userId });
      const c = await stripe.customers.create({
        email,
        metadata: { app_user_id: String(user._id) },
      });
      customerId = c.id;
      user.planInfos = user.planInfos || {};
      user.planInfos.stripeCustomerId = customerId;
      await user.save();
      console.log('[atualizarPlano] Customer criado:', customerId);
    }

    const activeSubs = await listActiveSubscriptions();

    // encontrar assinatura alvo para atualizar
    console.log('[atualizarPlano] Procurando assinatura alvo para update', { customerId, priceId });
    let subscriptionToUpdate = null;
    if (activeSubs.length) {
      subscriptionToUpdate = activeSubs.find(s => String(s.id) === String(user.planInfos?.subscriptionId));
      if (!subscriptionToUpdate) {
        subscriptionToUpdate = activeSubs.find(s => s.items?.data?.some(it => String(it.price?.id) === String(priceId)));
      }
      if (!subscriptionToUpdate) {
        subscriptionToUpdate = activeSubs.find(s => s.metadata && String(s.metadata.app_user_id) === String(userId));
      }
      if (!subscriptionToUpdate) {
        console.log('[atualizarPlano] Não foi encontrada assinatura claramente relacionada — optando por criar checkout (evitar alterar assinatura errada).');
        subscriptionToUpdate = null;
      }
    }

    if (!subscriptionToUpdate) {
      console.log('[atualizarPlano] Chamando CreateCheckoutSession para plano:', requestedPlan);
      req.body.plan = requestedPlan;
      req.body.userId = String(user._id);
      return await CreateCheckoutSession(req, res);
    }

    // atualiza assinatura usando proration automática do Stripe
    const subscriptionFull = await stripe.subscriptions.retrieve(subscriptionToUpdate.id);
    const itemId = subscriptionFull.items?.data?.[0]?.id;
    if (!itemId) {
      console.warn('[atualizarPlano] assinatura sem item id — fallback para checkout', { subscriptionId: subscriptionFull.id });
      req.body.plan = requestedPlan;
      req.body.userId = String(user._id);
      return await CreateCheckoutSession(req, res);
    }

    console.log('[atualizarPlano] Atualizando assinatura com proration automática:', subscriptionFull.id);
    const updated = await stripe.subscriptions.update(subscriptionFull.id, {
      items: [{ id: itemId, price: priceId }],
      proration_behavior: 'create_prorations', // deixe o Stripe criar as linhas de proration
    });

    // obter upcoming invoice para visualização (invoice preview)
    let invoicePreview = null;
    try {
      invoicePreview = await stripe.invoices.retrieveUpcoming({
        customer: customerId,
        subscription: updated.id
      });
      console.log('[atualizarPlano] upcoming invoice obtida', { id: invoicePreview.id, total: invoicePreview.total, amount_due: invoicePreview.amount_due });
    } catch (errUpcoming) {
      console.warn('[atualizarPlano] retrieveUpcoming falhou (não crítico):', errUpcoming?.message || errUpcoming);
    }

    // atualizar dados do user local
    user.planInfos = user.planInfos || {};
    user.planInfos.planType = requestedPlan;
    user.planInfos.subscriptionId = updated.id;
    user.planInfos.stripeCustomerId = customerId;
    user.planInfos.status = 'ativo';

    if (invoicePreview) {
      user.planInfos.nextPaymentValue = typeof invoicePreview.amount_due === 'number' ? invoicePreview.amount_due / 100 : (typeof invoicePreview.total === 'number' ? invoicePreview.total / 100 : null);
      if (invoicePreview.next_payment_attempt) {
        user.planInfos.nextPaymentDate = new Date(invoicePreview.next_payment_attempt * 1000);
      } else if (updated.current_period_end) {
        user.planInfos.nextPaymentDate = new Date(updated.current_period_end * 1000);
      } else {
        user.planInfos.nextPaymentDate = null;
      }
    } else {
      user.planInfos.nextPaymentValue = updated.items?.data?.[0]?.price?.unit_amount ? updated.items.data[0].price.unit_amount / 100 : null;
      user.planInfos.nextPaymentDate = updated.current_period_end ? new Date(updated.current_period_end * 1000) : null;
    }

    await user.save();

    const invoicePreviewResponse = invoicePreview ? {
      id: invoicePreview.id,
      amount_due: typeof invoicePreview.amount_due === 'number' ? invoicePreview.amount_due / 100 : null,
      total: typeof invoicePreview.total === 'number' ? invoicePreview.total / 100 : null,
      lines: invoicePreview.lines?.data?.map(l => ({
        id: l.id,
        description: l.description,
        amount: (typeof l.amount === 'number' ? l.amount / 100 : null),
        proration: Boolean(l.proration),
        period: l.period || null,
      })) || []
    } : null;

    sendNotificationEmail(
      user.email,
      'Assinatura atualizada',
      `Sua assinatura foi atualizada para o plano ${requestedPlan.toUpperCase()}. Aproveite agora mesmo o seu novo plano.`
    );
    sendNotificationEmail(
      process.env.EMAIL_USER,
      'Assinatura atualizada',
      `A assinatura de ${user.username} do _id: ${user._id} foi atualizada para o plano ${requestedPlan.toUpperCase()}.`
    );

    return res.json({
      msg: 'Assinatura atualizada no Stripe (aguardando invoice). Confira invoicePreview.',
      planInfos: user.planInfos,
      subscription: updated,
      invoicePreview: invoicePreviewResponse
    });

  } catch (error) {
    console.error('[atualizarPlano] Erro ao atualizar plano:', error);
    return res.status(500).json({ msg: 'Erro ao atualizar plano', error: error.message || error });
  }
};

// =====================================================================================
// deletarLocal API (checa subscription vinculada, tenta pró-rata + refund, cancela subscription e remove local)
// =====================================================================================
// deletarLocal atualizado para usar cancelSubscriptionWithRefund
export const deletarLocal = async (req, res) => {
  const { subscriptionId, localId, userId } = req.body || {};

  if (!userId || !localId) {
    return res.status(400).json({ msg: 'userId e localId são obrigatórios' });
  }

  try {
    // buscar local e validar dono (tenta achar por localId campo ou por _id)
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: 'Usuário não encontrado' });

    let local = await Local.findOne({ localId }) || await Local.findOne({ localId });
    if (!local) return res.status(404).json({ msg: 'Local não encontrado' });
    if (String(local.userId) !== String(userId)) return res.status(403).json({ msg: 'Não autorizado' });

    // se tiver subscription vinculada (via payload ou via local.subscriptionId), tentar recuperar e cancelar com segurança
    let refundInfo = null;
    let canceledSubscriptionId = null;
    const subId = subscriptionId || local.subscriptionId || null;

    if (subId) {
      try {
        log('deletarLocal: tentando cancelar subscription via cancelSubscriptionWithRefund', subId);
        const result = await cancelSubscriptionWithRefund(subId);

        if (!result) {
          log('deletarLocal: cancelSubscriptionWithRefund retornou vazio para', subId);
        } else if (result.success === false) {
          log('deletarLocal: cancelSubscriptionWithRefund retornou erro (não crítico):', result.error || result);
        } else {
          canceledSubscriptionId = result.subscription?.id || subId;
          if (result.refund) {
            refundInfo = {
              id: result.refund.id,
              amount: result.refund.amount || null,
              status: result.refund.status || null
            };
          }
          log('deletarLocal: cancelSubscriptionWithRefund ok', { canceledSubscriptionId, refundInfo });
        }
      } catch (err) {
        console.warn('deletarLocal: erro ao executar cancelSubscriptionWithRefund (continuando):', err?.message || err);
      }
    } else {
      log('deletarLocal: sem subscription vinculada ao local (ou subscriptionId não fornecido).');
    }

    // apagar local no banco
    try {
      if (local._id) {
        await Local.findByIdAndDelete(local._id);
        log('deletarLocal: Local removido do DB:', local._id);
      } else {
        await Local.findOneAndDelete({ localId });
        log('deletarLocal: Local removido do DB por localId:', localId);
      }
    } catch (errDelete) {
      console.error('deletarLocal: erro ao apagar local do DB:', errDelete);
      return res.status(500).json({ msg: 'Erro ao apagar local do banco', error: errDelete?.message || String(errDelete) });
    }

    sendNotificationEmail(
      user.email,
      'Assinatura cancelada',
      `Sua assinatura foi cancelada. Refund: ${refundInfo?.id || 'Nenhum'}.`
    );
    sendNotificationEmail(
      process.env.EMAIL_USER,
      'Assinatura cancelada',
      `A assinatura de ${user?._id} do _id: ${user._id} foi cancelada. Refund: ${refundInfo?.id || 'Nenhum'}.`
    );

    return res.json({
      msg: 'Local removido. Subscription cancelada quando aplicável.',
      canceledSubscription: canceledSubscriptionId || null,
      refund: refundInfo
    });
  } catch (error) {
    console.error('deletarLocal: erro geral:', error);
    return res.status(500).json({ msg: 'Erro ao deletar local', error: error?.message || String(error) });
  }
};

