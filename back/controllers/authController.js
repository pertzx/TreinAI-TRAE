// controllers/authController.js
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isSameDay as isSameDayFn } from 'date-fns';
import * as dateFnsTz from 'date-fns-tz';
import { getBrazilDate } from '../helpers/getBrazilDate.js';
import Profissional from '../models/Profissional.js';
import mongoose from 'mongoose';
import { registerTokenUsage } from '../middlewares/tokenLimitMiddleware.js';
import { sendNotificationEmail } from '../utils/sendEmail.js';
import { validateSecurityTicket, createSecurityTicketData, formatDeviceInfoForEmail } from '../utils/ticketManager.js';

dotenv.config();

const SECRET_JWT = process.env.SECRET_JWT;

// Validação obrigatória da chave JWT
if (!SECRET_JWT) {
  throw new Error('SECRET_JWT environment variable is required and must be set');
}

const SALT_ROUNDS = 10;

// Função utilitária para configurações de cookies baseadas no ambiente
const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: false, // Permitir acesso via JavaScript para WebSocket
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    secure: true, // Sempre true para HTTPS obrigatório no Vercel
    sameSite: 'None' // Necessário para cross-origin HTTPS
  };
};

/**
 * Calcula a distância entre duas coordenadas geográficas usando a fórmula de Haversine
 * @param {number} lat1 - Latitude do primeiro ponto
 * @param {number} lon1 - Longitude do primeiro ponto
 * @param {number} lat2 - Latitude do segundo ponto
 * @param {number} lon2 - Longitude do segundo ponto
 * @param {number} radiusKm - Raio em quilômetros para verificar proximidade
 * @returns {boolean} - True se a distância for menor ou igual ao raio especificado
 */
function isWithinRadius(lat1, lon1, lat2, lon2, radiusKm) {
  // Converter graus para radianos
  const toRad = (deg) => deg * (Math.PI / 180);

  const R = 6371; // Raio da Terra em km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distância em km

  return distance <= radiusKm;
}

// cria __filename e __dirname em ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// agora você pode usar __dirname normalmente
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads/image-perfil');

// garante que exista
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Config OpenAI
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const openai = OPENAI_KEY ? new OpenAI({ apiKey: OPENAI_KEY }) : null;

/**
 * Mapear texto/resumo para um objetivo suportado pelo schema
 * Retorna uma das chaves: 'hipertrofia', 'emagrecimento', 'condicionamento', 'saude', 'forca', 'resistencia' ou null
 */
function mapSummaryToObjective(text) {
  if (!text) return null;
  const s = text.toLowerCase();
  if (s.match(/massa|hipertrof/)) return 'hipertrofia';
  if (s.match(/perda de peso|perder peso|emagrec|definição/)) return 'emagrecimento';
  if (s.match(/condicion|cardio|cardiovascul|resist(en|ência)/)) return 'condicionamento';
  if (s.match(/\bsaú|saud/)) return 'saude';
  if (s.match(/forç|forca/)) return 'forca';
  if (s.match(/resist|resistência/)) return 'resistencia';
  return null;
}

/**
 * Summarize answers via OpenAI Chat API.
 * Returns { summary: string|null, objective_hint: string|null, raw: string|null }
 */
async function summarizeWithOpenAI(answers, userEmail = null) {
  if (!openai) throw new Error('OpenAI client not configured.');
  const systemPrompt = `Você é um assistente que recebe respostas de um questionário sobre treino físico.
  se o usuario praticar algum esporte deixe o resumo mais focado neste esporte.
Descreva o objetivo da pessoa com base nas respostas e deixe as bem entendiveis e em português e retorne UM JSON com os campos:
- "summary": string (resumo curto),
- "objective_hint": string (uma palavra sugerindo objetivo: hipertrofia, emagrecimento, condicionamento, saude, forca, resistencia).
Retorne apenas o JSON.`;

  const userContent = `Respostas do usuário: ${answers}`;

  const resp = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ],
    max_tokens: 300,
    temperature: 0.2
  });

  // Registrar uso de tokens usando o novo sistema
  const tokensUsed = Number(resp?.usage?.total_tokens || 0);
  if (tokensUsed > 0 && userEmail) {
    await registerTokenUsage(userEmail, tokensUsed);
  }

  const text = resp?.choices?.[0]?.message?.content || null;
  if (!text) return { summary: null, objective_hint: null, raw: null };

  try {
    const begin = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (begin !== -1 && end !== -1) {
      const jsonText = text.slice(begin, end + 1);
      const parsed = JSON.parse(jsonText);
      return {
        summary: parsed.summary || null,
        objective_hint: parsed.objective_hint || parsed.objective || null,
        raw: text
      };
    }
  } catch { }
  return { summary: text.trim(), objective_hint: null, raw: text };
}

// =======================
// LOGIN
// =======================
export const login = async (req, res) => {
  try {
    const {
      email,
      password,
      identificador,
      systemInfo,
      location
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({ msg: "Email e senha são obrigatórios!" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "Usuário não encontrado!" });

    // Comparar senha
    const senhaCorreta = await bcrypt.compare(password, user.password);
    if (!senhaCorreta) {
      // Atualiza falhas de login
      user.stats = user.stats || {};
      user.stats.failedLoginAttempts = (user.stats.failedLoginAttempts || 0) + 1;
      await user.save();
      return res.status(401).json({ msg: "Senha incorreta!" });
    }

    // Logica de analise de device aqui abaixo..
    // Só executa se o usuário permitiu a localização (location.lat e location.lon não são null)
    if (user && user.stats && user.stats.loginSeguro) {
      console.log("Login seguro inicializando...")

      // Inicializar histórico de dispositivos se não existir
      if (!user.stats) user.stats = {};
      if (!user.stats.deviceHistory) user.stats.deviceHistory = [];

      // Verificar se estamos em ambiente de desenvolvimento ou se a localização é inválida
      const isDevelopment = process.env.NODE_ENV === 'development';
      if (location && (location.lat == null || location.lon == null)) {
        location.lat = -14.1993055;
        location.lon = -57.068226;
      }
      const hasValidLocation = location && typeof location.lat === 'number' && typeof location.lon === 'number';

      // 1) PRIMEIRO: Filtrar todos os devices relacionados (por deviceId OU systemInfo)
      const relatedDevices = user.stats.deviceHistory.filter(device => {
        // Buscar por deviceId exato
        if (device.deviceId === identificador) {
          return true;
        }
        // Buscar por systemInfo similar (mesmo sistema/browser)
        if (systemInfo && device.systemInfo === systemInfo) {
          return true;
        }
        return false;
      });

      console.log(`Encontrados ${relatedDevices.length} devices relacionados para análise`);

      // 2) SEGUNDO: Verificar se ALGUM dos devices relacionados está bloqueado E próximo (2km)
      const blockedRelatedDevices = relatedDevices.filter(device => device.bloqueado === true);

      if (blockedRelatedDevices.length > 0 && hasValidLocation) {
        console.log(`Encontrados ${blockedRelatedDevices.length} devices bloqueados relacionados`);

        // Verificar se algum dispositivo bloqueado está dentro do raio de 2km
        const blockedDevicesInRadius = blockedRelatedDevices.filter(blockedDevice => {
          if (!blockedDevice.location || !blockedDevice.location.lat || !blockedDevice.location.lon) {
            return false; // Ignorar dispositivos sem localização
          }
          return isWithinRadius(location.lat, location.lon, blockedDevice.location.lat, blockedDevice.location.lon, 2);
        });

        if (blockedDevicesInRadius.length > 0) {
          console.log(`Encontrados ${blockedDevicesInRadius.length} devices bloqueados próximos (2km)`);
          // Incrementar tentativas de login falhadas
          user.stats.failedLoginAttempts = (user.stats.failedLoginAttempts || 0) + 1;
          await user.save();
          return res.status(403).json({
            msg: "Acesso negado. Dispositivo bloqueado detectado na sua região.",
            bloqueado: true,
            detalhes: `${blockedDevicesInRadius.length} dispositivo(s) bloqueado(s) encontrado(s) próximo(s)`
          });
        }
      }

      // 3) TERCEIRO: Buscar dispositivo específico por identificador para atualização
      let existingDevice = relatedDevices.find(device => device.deviceId === identificador);

      // Se não encontrou por deviceId exato, buscar por systemInfo para evitar duplicatas
      if (!existingDevice && systemInfo) {
        existingDevice = relatedDevices.find(device =>
          device.systemInfo === systemInfo &&
          (!device.deviceId || device.deviceId === identificador)
        );

        // Se encontrou um dispositivo com mesmo systemInfo, atualizar o deviceId
        if (existingDevice && !existingDevice.deviceId) {
          existingDevice.deviceId = identificador;
        }
      }

      // 4) QUARTO: Checar bloqueio por proximidade geográfica (raio = 2 km)
      const blockedDevicesInRadius = user.stats.deviceHistory.filter(device => {
        if (!device.bloqueado || !device.location || !device.location.lat || !device.location.lon) {
          return false;
        }
        // Não verificar o próprio dispositivo
        if (device.deviceId === identificador) {
          return false;
        }
        return hasValidLocation && isWithinRadius(location.lat, location.lon, device.location.lat, device.location.lon, 2);
      });

      if (blockedDevicesInRadius.length > 0) {
        // Incrementar tentativas de login falhadas
        user.stats.failedLoginAttempts = (user.stats.failedLoginAttempts || 0) + 1;
        await user.save();
        return res.status(403).json({
          msg: "Acesso negado. Dispositivo bloqueado detectado na região.",
          bloqueado: true
        });
      }

      // 5) QUINTO: Atualizar ou criar registro de device
      if (existingDevice) {
        // NOTA: Verificação de bloqueio já foi feita anteriormente no passo 2
        // Atualizar dispositivo existente
        existingDevice.loginDate = getBrazilDate();
        existingDevice.lastActivity = getBrazilDate();
        existingDevice.loginCount = (existingDevice.loginCount || 0) + 1;

        // Atualizar localização se válida
        if (hasValidLocation) {
          existingDevice.location = {
            lat: location.lat,
            lon: location.lon
          };
        }

        // Atualizar systemInfo se fornecido
        if (systemInfo) {
          existingDevice.systemInfo = systemInfo;
        }
      } else {
        // Criar novo dispositivo (já verificamos que não há duplicatas nos relatedDevices)
        const newDevice = {
          deviceId: identificador,
          bloqueado: false,
          systemInfo: systemInfo || null,
          location: hasValidLocation ? { lat: location.lat, lon: location.lon } : { lat: null, lon: null },
          firstLoginDate: getBrazilDate(),
          loginDate: getBrazilDate(),
          lastActivity: getBrazilDate(),
          loginCount: 1,
        };

        user.stats.deviceHistory.push(newDevice);
      }

      // 6) SEXTO: Enviar alerta de segurança
      try {
        // Gerar dados do ticket de segurança
        const ticketData = createSecurityTicketData(user._id, identificador, {
          systemInfo,
          location: hasValidLocation ? location : null,
          userAgent: req.headers['user-agent'] || '',
          ip: req.ip || req.connection.remoteAddress,
          timestamp: getBrazilDate(),
          isNewDevice: !existingDevice
        });

        // Formatar informações do dispositivo para o e-mail
        const deviceInfo = formatDeviceInfoForEmail({
          deviceId: identificador,
          systemInfo,
          location: hasValidLocation ? location : null,
          userAgent: req.headers['user-agent'] || '',
          loginDate: getBrazilDate(),
          isNewDevice: !existingDevice
        });

        // Criar link para bloqueio do dispositivo
        const blockLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login-nao-autorizado?ticket=${ticketData.ticket}`;

        try {
          // Enviar e-mail de notificação
          sendNotificationEmail(
            user.email,
            '🔐 TreinAI - Novo acesso detectado em sua conta',
            `
          <!DOCTYPE html>
          <html lang="pt-BR">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Novo Acesso Detectado - TreinAI</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; margin: 0; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, rgba(0.55,0.21, 263.02, 0), #764ba2); padding: 30px 20px; text-align: center; color: white; }
              .logo { display: inline-flex; align-items: center; gap: 10px; background: rgba(0.55,0.21, 263.02, 0); padding: 10px 20px; border-radius: 25px; color: #333; margin-bottom: 15px; }
              .logo-icon { width: 28px; height: 28px; background: #ffffff; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; }
              .badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(239,68,68,0.1); color: #dc2626; padding: 6px 12px; border-radius: 15px; font-size: 14px; font-weight: 600; border: 1px solid rgba(239,68,68,0.2); }
              .content { padding: 30px 20px; }
              .title { font-size: 24px; font-weight: bold; color: #1f2937; margin-bottom: 15px; text-align: center; }
              .description { font-size: 16px; color: #6b7280; text-align: center; margin-bottom: 25px; }
              .device-card { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; position: relative; }
              .device-card::before { content: '🖥️'; position: absolute; top: -8px; left: 15px; background: #fff; padding: 5px; border-radius: 50%; font-size: 16px; }
              .device-title { font-size: 16px; font-weight: 600; color: #1f2937; margin: 5px 0 10px 0; }
              .action { text-align: center; margin: 25px 0; }
              .warning { font-size: 15px; color: #dc2626; font-weight: 500; margin-bottom: 20px; padding: 15px; background: #fef2f2; border-left: 3px solid #dc2626; border-radius: 5px; }
              .btn { display: inline-block; background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; }
              .btn:hover { background: #b91c1c; }
              .safe { font-size: 14px; color: #6b7280; margin-top: 20px; padding: 15px; background: #f0fdf4; border-left: 3px solid #22c55e; border-radius: 5px; }
              .footer { background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
              .trust { display: flex; justify-content: center; gap: 15px; margin-top: 10px; flex-wrap: wrap; }
              .trust span { display: flex; align-items: center; gap: 3px; }
              @media (max-width: 600px) { .container { margin: 0; border-radius: 0; } .header, .content, .footer { padding: 20px 15px; } .trust { flex-direction: column; gap: 5px; } }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">
                  <div class="logo-icon"></div>
                </div>
                <div class="badge">
                  <span>🛡️</span>
                  Alerta de Segurança
                </div>
              </div>
              
              <div class="content">
                <h1 class="title">Novo acesso detectado</h1>
                <p class="description">
                  Detectamos um novo acesso em sua conta TreinAI. Por segurança, estamos notificando você sobre esta atividade.
                </p>
                
                <div class="device-card">
                  <h3 class="device-title">Detalhes do Acesso</h3>
                  ${deviceInfo}
                </div>
                
                <div class="action">
                  <div class="warning">
                    ⚠️ <strong>Ação necessária:</strong> Se este acesso não foi autorizado por você, clique no botão abaixo imediatamente para bloquear este dispositivo.
                  </div>
                  
                  <a href="${blockLink}" class="btn">
                    🔒 Bloquear Dispositivo Agora
                  </a>
                  
                  <div class="safe">
                    ✅ <strong>Acesso reconhecido?</strong> Se você reconhece este acesso, pode ignorar este e-mail com segurança. Sua conta permanece protegida.
                  </div>
                </div>
              </div>
              
              <div class="footer">
                <p>Este é um e-mail automático de segurança da TreinAI. Não responda a este e-mail.</p>
                <p><strong>TreinAI</strong> - Sua plataforma de treinos com IA</p>
                
                <div class="trust">
                  <span>🔐 Criptografia SSL</span>
                  <span>🛡️ Monitoramento 24/7</span>
                  <span>✅ LGPD Compliance</span>
                </div>
              </div>
            </div>
          </body>
          </html>
          `
          );
        } catch (error) {
          console.log(error)
        }
      } catch (emailError) {
        console.error('Erro ao enviar e-mail de alerta de segurança:', emailError);
        // Não interromper o fluxo de login por falha no e-mail
      }
    }

    // 6) Persistir mudanças
    await user.save();
    /*

    Schemma > deviceHistory: [{
      deviceId: { type: String, unique: true, required: true },
      bloqueado: { type: Boolean, default: false },
      
      // Informações do sistema (substituindo campos individuais de browser/os/device)
      systemInfo: { type: String, default: null },
      
      // Informações de rede e localização
      location: {
        lat: { type: Number, default: null },
        lon: { type: Number, default: null },
      },
      
      // Datas e controle
      firstLoginDate: { type: Date, required: true, default: getBrazilDate },
      loginDate: { type: Date, required: true, default: getBrazilDate },
      lastActivity: { type: Date, default: getBrazilDate },
      loginCount: { type: Number, default: 1 },  
    }],

1) Buscar dispositivo por identificador
   - Procurar em user.stats.deviceHistory um device com deviceId === identificador.

2) Por systemInfo
   - filtrar deviceHistory por igualdade de systemInfo (serializado).
   - Usar isso para identificar dispositivos similares.

3) Checar bloqueio por proximidade (raio = 2 km)
   - Se houver devices bloqueados entre os encontrados:
     a) Para cada device bloqueado com localização registrada:
        - Calcular isWithinRadius(location.lat, location.lon, d.location.lat, d.location.lon, 2)
        - Se true: negar acesso, incrementar user.stats.failedLoginAttempts, salvar e retornar 403.
     b) Se nenhum bloqueado estiver dentro do raio, seguir.

4) Atualizar ou criar registro de device
   - Se device encontrado por deviceId:
     - Se bloqueado: negar acesso (salvar tentativa) e retornar 403.
     - Se não bloqueado: atualizar loginDate, lastActivity, loginCount, userAgent e location (se válida).
   - Se não encontrado por deviceId:
     - Criar novo objeto em deviceHistory com:
       { deviceId: identificador, bloqueado:false, systemInfo, location?, firstLoginDate, loginDate, lastActivity, loginCount:1 }

5) Enviar alerta de segurança
   - Gerar ticket com createSecurityTicketData(userId, deviceId, meta).
   - Montar mensagem com formatDeviceInfoForEmail(...) e link para /login-nao-autorizado?ticket=...
   - Enviar email ao usuário. Logar falhas no envio sem interromper o fluxo.

6) Persistir mudanças
   - Executar await user.save() após criar/atualizar device ou registrar tentativa falha.

7) Exceções e ambiente
   - Se NODE_ENV === 'development' ou location inválida (lat/lon ausentes), pular checagem geográfica e executar apenas atualização/registro básico do device e envio de alerta.
   - Garantir operações atômicas em produção (findOneAndUpdate/upsert ou transações) para evitar race conditions.

Observações:
- Não salvar coordenadas em texto claro sem necessidade. Hashear identifier no servidor antes de armazenar se for sensível.
- Auditar IP e user-agent para investigações.
- Limitar taxa de emails/alertas para evitar spam.
*/


    // Gera token
    const token = jwt.sign({ email: user.email, userId: user._id }, SECRET_JWT, { expiresIn: "7d" });

    // Define cookie acessível via JavaScript para WebSocket
    res.cookie('auth_token', token, getCookieOptions());

    return res.json({
      msg: "Login realizado com sucesso!",
      userId: user._id,
      token: token // Adicionando o token na resposta para o frontend
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ msg: "Erro no login", error: err.message });
  }
};

// =======================
// SIGNUP
// =======================
export const signup = async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // Usar 'name' se disponível, senão usar 'username' para compatibilidade
    const userName = username;

    if (!email || !password || !userName) {
      return res.status(400).json({ msg: 'Email, senha e nome são obrigatórios.' });
    }

    const userExistente = await User.findOne({ email });
    if (userExistente) {
      return res.status(400).json({ msg: "Este usuário já existe." });
    }

    // Hash da senha
    const hashSenha = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = await User.create({
      username: userName,
      email,
      password: hashSenha,
      planInfos: { status: 'ativo', planType: 'free' } // Definindo como ativo por padrão para free
    });

    // Gera token
    const token = jwt.sign({ email, userId: newUser._id }, SECRET_JWT, { expiresIn: "10s" });

    // Define cookie httpOnly seguro baseado no ambiente
    res.cookie('auth_token', token, getCookieOptions());

    try {
      sendNotificationEmail(email, 'Boas-vindas', 'Seja bem-vindo ao TreinAI!');
      sendNotificationEmail(process.env.EMAIL_USER, 'Novo usuário registrado', `Um novo usuário, ${userName}, foi registrado. especificações: email: ${email}, username: ${userName}, _id: ${newUser?._id}`);
    } catch (error) {
      console.log(error);
    }

    return res.status(201).json({
      msg: 'Usurio criado com scesso!',
      newUser,
      token
    });

  } catch (err) {
    return res.status(500).json({ msg: "Erro ao criar usuário", error: err.message });
  }
};

// =======================
// DASHBOARD (rota protegida)
// =======================
export const dashboard = async (req, res) => {
  try {
    // Extrair parâmetros do corpo da requisição
    const {
      identificador,
      systemInfo,
      location
    } = req.body;

    const user = await User.findOne({ email: req.userEmail }).select('-password -salt -tokens -__v');
    if (!user) {
      return res.status(404).json({ msg: "Usuário não encontrado no dashboard." });
    }

    let bloqueado = false;
    let currentDeviceInfo = null;

    // Coletar dados do acesso atual
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Dispositivo desconhecido';

    // Só executa lógica de dispositivos se o usuário permitiu a localização (location.lat e location.lon não são null)
    if (user && user.stats && user.stats.loginSeguro) {
      console.log("Login seguro inicializando...")
      // Inicializar histórico de dispositivos se não existir
      if (!user.stats) user.stats = {};
      if (!user.stats.deviceHistory) user.stats.deviceHistory = [];

      // Verificar se estamos em ambiente de desenvolvimento ou se a localização é inválida
      const isDevelopment = process.env.NODE_ENV === 'development';
      if (location && (location.lat == null || location.lon == null)) {
        location.lat = -14.1993055;
        location.lon = -57.068226;
      }
      console.log(location)
      const hasValidLocation = location && typeof location.lat === 'number' && typeof location.lon === 'number';

      // 1) PRIMEIRO: Filtrar todos os devices relacionados (por deviceId OU systemInfo)
      const relatedDevices = user.stats.deviceHistory.filter(device => {
        // Buscar por deviceId exato
        if (device.deviceId === identificador) {
          return true;
        }
        // Buscar por systemInfo similar (mesmo sistema/browser)
        if (systemInfo && device.systemInfo === systemInfo) {
          return true;
        }
        return false;
      });

      console.log(`Dashboard - Encontrados ${relatedDevices.length} devices relacionados para análise`);

      // 2) SEGUNDO: Verificar se ALGUM dos devices relacionados está bloqueado E próximo (2km)
      const blockedRelatedDevices = relatedDevices.filter(device => device.bloqueado === true);

      if (blockedRelatedDevices.length > 0 && hasValidLocation) {
        console.log(`Dashboard - Encontrados ${blockedRelatedDevices.length} devices bloqueados relacionados`);

        // Verificar se algum dispositivo bloqueado está dentro do raio de 2km
        const blockedDevicesInRadius = blockedRelatedDevices.filter(blockedDevice => {
          if (!blockedDevice.location || !blockedDevice.location.lat || !blockedDevice.location.lon) {
            return false; // Ignorar dispositivos sem localização
          }
          return isWithinRadius(location.lat, location.lon, blockedDevice.location.lat, blockedDevice.location.lon, 2);
        });

        if (blockedDevicesInRadius.length > 0) {
          console.log(`Dashboard - Encontrados ${blockedDevicesInRadius.length} devices bloqueados próximos (2km)`);
          return res.status(403).json({
            msg: "Acesso negado. Dispositivo bloqueado detectado na sua região.",
            bloqueado: true,
            detalhes: `${blockedDevicesInRadius.length} dispositivo(s) bloqueado(s) encontrado(s) próximo(s)`
          });
        }
      }

      // 3) TERCEIRO: Buscar dispositivo específico por identificador para atualização
      let existingDevice = relatedDevices.find(device => device.deviceId === identificador);

      // Se não encontrou por deviceId exato, buscar por systemInfo para evitar duplicatas
      if (!existingDevice && systemInfo) {
        existingDevice = relatedDevices.find(device =>
          device.systemInfo === systemInfo &&
          (!device.deviceId || device.deviceId === identificador)
        );

        // Se encontrou um dispositivo com mesmo systemInfo, atualizar o deviceId
        if (existingDevice && !existingDevice.deviceId) {
          existingDevice.deviceId = identificador;
        }
      }

      // 4) QUARTO: Atualizar ou criar registro de device
      if (existingDevice) {
        // NOTA: Verificação de bloqueio já foi feita anteriormente no passo 2
        // Atualizar dispositivo existente
        existingDevice.loginDate = getBrazilDate();
        existingDevice.lastActivity = getBrazilDate();
        existingDevice.loginCount = (existingDevice.loginCount || 0) + 1;

        // Atualizar localização se válida
        if (hasValidLocation) {
          existingDevice.location = {
            lat: location.lat,
            lon: location.lon
          };
        }

        // Atualizar systemInfo se fornecido
        if (systemInfo) {
          existingDevice.systemInfo = systemInfo;
        }

        currentDeviceInfo = existingDevice;
      } else {
        // Criar novo dispositivo (já verificamos que não há duplicatas nos relatedDevices)
        const newDevice = {
          deviceId: identificador,
          bloqueado: false,
          systemInfo: systemInfo || null,
          location: hasValidLocation ? { lat: location.lat, lon: location.lon } : { lat: null, lon: null },
          firstLoginDate: getBrazilDate(),
          loginDate: getBrazilDate(),
          lastActivity: getBrazilDate(),
          loginCount: 1,
        };

        user.stats.deviceHistory.push(newDevice);
        currentDeviceInfo = newDevice;
      }

      // Atualizar estatísticas (apenas se não estiver bloqueado)
    }

    if (!bloqueado) {
      user.stats.lastLogin = new Date(getBrazilDate());

      // Manter compatibilidade com ipHistory
      user.stats.ipHistory = user.stats.ipHistory || [];
      if (!user.stats.ipHistory.includes(ip)) {
        user.stats.ipHistory.push(ip);
      }

      await user.save();
    }

    // Preparar resposta com informações do dispositivo atual
    const response = {
      msg: `Bem-vindo ao dashboard, ${user.username}!`,
      user,
      bloqueado
    };

    // Adicionar informações do dispositivo atual se disponível
    if (currentDeviceInfo) {
      response.currentDevice = {
        deviceId: currentDeviceInfo.deviceId,
        systemInfo: currentDeviceInfo.systemInfo,
        location: currentDeviceInfo.location,
        lastAccess: currentDeviceInfo.lastActivity,
        loginCount: currentDeviceInfo.loginCount
      };
    }

    return res.json(response);
  } catch (err) {
    return res.status(500).json({ msg: "Erro ao acessar dashboard", error: err.message });
  }
};

// =======================
// changeTheme
// =======================
export const changeTheme = async (req, res) => {
  try {
    const { email, novoTema } = req.body;

    if (!email || !novoTema) {
      return res.json({ msg: 'Você precisa nos informar email e novoTema.' });
    }

    const usr = await User.findOne({ email });

    if (!usr) {
      return res.json({ msg: 'Nao foi possivel encontrar o seu usuario.' });
    }

    if (usr.preferences?.theme === novoTema) {
      return res.json({ msg: 'Voce esta tentando alterar usando o mesmo valor para o novo tema.' });
    }

    usr.preferences = usr.preferences || {};
    usr.preferences.theme = novoTema;

    await usr.save();

    return res.json({ msg: 'Theme alterado com sucesso.', user: usr });
  } catch (err) {
    console.error('changeTheme error:', err);
    return res.status(500).json({
      msg: 'Erro interno do servidor ao alterar tema',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// =======================
// changeLoginSeguro
// =======================
export const changeLoginSeguro = async (req, res) => {
  try {
    const { email, novoLoginSeguro } = req.body;

    // Validação de entrada mais rigorosa
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        msg: 'Email é obrigatório e deve ser uma string válida.'
      });
    }

    if (typeof novoLoginSeguro !== 'boolean') {
      return res.status(400).json({
        success: false,
        msg: 'novoLoginSeguro deve ser um valor booleano (true ou false).'
      });
    }

    // Buscar usuário
    const usr = await User.findOne({ email });

    if (!usr) {
      return res.status(404).json({
        success: false,
        msg: 'Usuário não encontrado.'
      });
    }

    // Verificar se o valor já é o mesmo
    const currentLoginSeguro = usr.stats?.loginSeguro || false;
    if (currentLoginSeguro === novoLoginSeguro) {
      return res.status(400).json({
        success: false,
        msg: 'O valor do login seguro já está configurado para este estado.'
      });
    }

    // Atualizar configuração
    usr.stats = usr.stats || {};
    usr.stats.loginSeguro = novoLoginSeguro;

    await usr.save();

    return res.json({
      success: true,
      msg: 'Configuração de login seguro alterada com sucesso.',
      loginSeguro: novoLoginSeguro
    });
  } catch (err) {
    console.error('changeLoginSeguro error:', err);
    return res.status(500).json({
      success: false,
      msg: 'Erro interno do servidor ao alterar a configuração de login seguro',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// =======================
// completeOnboarding (usa OpenAI para resumir/resposta de objetivo)
// =======================
export const completeOnboarding = async (req, res) => {
  try {
    const { email, answers, completed, completedAt, startedAt } = req.body;
    if (!email) return res.status(401).json({ msg: 'Usuário não autenticado.' });

    // Log removido para evitar exposição de dados sensíveis do usuário
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: 'Usuário não encontrado' });

    if (!answers) return res.json({ msg: 'Você não passou as respostas.' });
    if (!completed || !completedAt || !startedAt) return res.json({ msg: '!completed || !completedAt || !startedAt' });

    // Filtra respostas para salvar apenas responseAnswer
    const sanitizedAnswers = Object.keys(answers).map(key => ({
      responseAnswer: answers[key]?.responseAnswer || ''
    }));

    user.onboarding.startedAt = startedAt;
    user.onboarding.completed = completed;
    user.onboarding.completedAt = completedAt;

    // OpenAI resumindo respostas
    if (sanitizedAnswers.length > 0 && openai) {
      try {
        const aiResult = await summarizeWithOpenAI(answers, email);
        const candidate = aiResult.objective_hint || null;
        const mapped = mapSummaryToObjective(candidate || aiResult.summary || '');

        if (mapped) {
          user.perfil = user.perfil || {};
          user.perfil.objetivo = mapped + ' - ' + aiResult.summary;
        } else {
          user.perfil.objetivo = aiResult.summary;
        }
      } catch (err) {
        console.error('OpenAI summarization failed:', err?.message || err);
        // Continuar sem resumo se a IA falhar
      }
    }

    await user.save();
    return res.json({ msg: 'Tudo certo!', user });

  } catch (err) {
    console.error('completeOnboarding error:', err);
    return res.status(500).json({
      msg: 'Erro interno do servidor durante onboarding',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

const isSameDayWithTZ = (d1, d2, timezone = 'UTC') => {
  try {
    const date1 = d1 ? new Date(d1) : null;
    const date2 = d2 ? new Date(d2) : null;
    if (!date1 || !date2) return false;
    // converte para o timezone escolhido (não altera o instante, apenas a interpretação por fuso)
    const zoned1 = utcToZonedTime(date1, timezone);
    const zoned2 = utcToZonedTime(date2, timezone);
    return isSameDayFn(zoned1, zoned2);
  } catch (err) {
    // fallback: compara por ano/mês/dia em UTC
    const a = new Date(d1);
    const b = new Date(d2);
    return a.getUTCFullYear() === b.getUTCFullYear() &&
      a.getUTCMonth() === b.getUTCMonth() &&
      a.getUTCDate() === b.getUTCDate();
  }
};

// normaliza arrays de histórico: transforma entradas primitivas em { valor, publicadoEm }
const normalizeHistoryArray = (arr) => {
  if (!arr) return [];
  return arr.map(item => {
    if (item && typeof item === 'object' && ('valor' in item || 'publicadoEm' in item)) {
      return {
        valor: Number(item.valor ?? 0),
        publicadoEm: item.publicadoEm ? new Date(item.publicadoEm).toISOString() : new Date().toISOString()
      };
    }
    const n = Number(item);
    return { valor: Number.isNaN(n) ? 0 : n, publicadoEm: new Date().toISOString() };
  });
};

export const atualizarPerfil = async (req, res) => {
  try {
    const body = req.body || {};
    const email = body.email || req.headers['x-email'];
    if (!email) return res.status(400).json({ msg: 'O email é obrigatório.' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: 'Usuário não encontrado para o email fornecido.' });

    // opcional: timezone do cliente (por ex. 'America/Sao_Paulo')
    const timezone = body.timezone || user.perfil?.timezone || 'UTC';

    const { username, objetivo, pesoAtual, altura, idade, genero } = body;

    if (username !== undefined) user.username = String(username).trim();
    if (objetivo !== undefined) {
      user.perfil = user.perfil || {};
      user.perfil.objetivo = String(objetivo);
    }

    // normaliza arrays (garante formato consistente) — armazenamos ISO strings
    user.perfil = user.perfil || {};
    user.perfil.pesoAtual = normalizeHistoryArray(user.perfil.pesoAtual);
    user.perfil.altura = normalizeHistoryArray(user.perfil.altura);

    // ===== Peso: se fornecido, atualiza ou insere dependendo do dia (no timezone do usuário) =====
    if (pesoAtual !== undefined && pesoAtual !== '') {
      const pesoNum = Number(pesoAtual);
      if (!Number.isNaN(pesoNum)) {
        const nowISO = new Date().toISOString();
        const last = user.perfil.pesoAtual.length ? user.perfil.pesoAtual[user.perfil.pesoAtual.length - 1] : null;
        if (last && isSameDayWithTZ(last.publicadoEm, nowISO, timezone)) {
          // mesmo dia -> atualiza
          last.valor = pesoNum;
          last.publicadoEm = nowISO;
        } else {
          // novo dia -> push
          user.perfil.pesoAtual.push({ valor: pesoNum, publicadoEm: nowISO });
        }
      }
    }

    // ===== Altura: mesma lógica =====
    if (altura !== undefined && altura !== '') {
      const altNum = Number(altura);
      if (!Number.isNaN(altNum)) {
        const nowISO = new Date().toISOString();
        const lastA = user.perfil.altura.length ? user.perfil.altura[user.perfil.altura.length - 1] : null;
        if (lastA && isSameDayWithTZ(lastA.publicadoEm, nowISO, timezone)) {
          lastA.valor = altNum;
          lastA.publicadoEm = nowISO;
        } else {
          user.perfil.altura.push({ valor: altNum, publicadoEm: nowISO });
        }
      }
    }

    if (idade !== undefined && idade !== '') {
      const idadeNum = Number(idade);
      if (!Number.isNaN(idadeNum)) user.perfil.idade = idadeNum;
    }

    if (genero !== undefined) user.perfil.genero = String(genero);

    // ===== NOVO: localização (country, countryCode, state, city) =====
    // Se um campo for enviado (mesmo vazio), atualiza; se omitido, mantém o valor anterior.
    const { country, countryCode, state, city, lat, lng } = body;

    // garante existência do perfil
    user.perfil = user.perfil || {};

    if (country !== undefined) {
      const c = country ? String(country).trim() : '';
      user.perfil.country = c;
    }
    if (countryCode !== undefined) {
      const cc = countryCode ? String(countryCode).trim() : '';
      user.perfil.countryCode = cc;
    }
    if (state !== undefined) {
      const s = state ? String(state).trim() : '';
      user.perfil.state = s;
    }
    if (city !== undefined) {
      const ci = city ? String(city).trim() : '';
      user.perfil.city = ci;
    }

    // opcional: aceitar coordenadas geoespaciais (lat, lng) e popular perfil.location
    // espera lat/lng como números ou strings que podem ser convertidas
    if (lat !== undefined || lng !== undefined) {
      const maybeLat = lat !== undefined && lat !== '' ? Number(lat) : null;
      const maybeLng = lng !== undefined && lng !== '' ? Number(lng) : null;
      if (Number.isFinite(maybeLat) && Number.isFinite(maybeLng)) {
        user.perfil.location = { type: 'Point', coordinates: [maybeLng, maybeLat] };
      } else {
        // se quiser limpar location quando enviar vazio, descomente:
        // if (lat === '' || lng === '') user.perfil.location = undefined;
        // aqui optamos por não tocar se valores inválidos
      }
    }

    // === avatar (req.file) ===
    if (req.file) {
      // Em produção, usar path do Cloudinary; em desenvolvimento, usar URL local
      const avatarUrl = req.file.url || `/uploads/image-perfil/${req.file.filename}`;

      // tenta remover avatar antigo se for local em /uploads/ ou do Cloudinary
      try {
        if (user.avatar && typeof user.avatar === 'string') {
          // Se é URL do Cloudinary, deletar do Cloudinary
          if (user.avatar.includes('cloudinary.com')) {
            try {
              const { deleteFromCloudinary } = await import('../config/cloudinaryConfig.js');
              await deleteFromCloudinary(user.avatar);
              console.log('[authController] Avatar antigo removido do Cloudinary');
            } catch (cloudinaryError) {
              console.warn('[authController] Falha ao remover avatar antigo do Cloudinary:', cloudinaryError);
            }
          } else {
            // Se é URL local, deletar do sistema de arquivos
            const parsed = new URL(user.avatar, `${req.protocol}://${req.get('host')}`).pathname;
            if (parsed && parsed.startsWith('/uploads/')) {
              const oldFilename = path.basename(parsed);

              // Não deletar a imagem base avatar_base_z5ucwb.jpg
              if (oldFilename !== 'avatar_base_z5ucwb.jpg') {
                const oldPath = path.join(UPLOAD_DIR, oldFilename);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Falha ao remover avatar antigo (não crítico):', err.message || err);
        // Continuar com a atualização mesmo se falhar ao remover arquivo antigo
      }

      user.avatar = avatarUrl;
    }

    await user.save();

    const safeUser = user.toObject ? user.toObject() : user;
    if (safeUser.password) delete safeUser.password;

    return res.json({ msg: 'Perfil atualizado com sucesso!', user: safeUser, avatarUrl: user.avatar || null });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return res.status(500).json({
      msg: 'Erro interno do servidor ao atualizar perfil',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};



const criarTreinos = async (objetivo, userEmail = null) => {
  // Verificar se OpenAI está configurado
  if (!openai) {
    console.error('OpenAI client não configurado na função criarTreinos');
    return { treinos: [], raw: null, error: 'OpenAI não configurado' };
  }

  if (!objetivo) {
    console.error('Objetivo não fornecido para criarTreinos');
    return { treinos: [], raw: null, error: 'Objetivo não fornecido' };
  }

  console.log('Iniciando criação de treinos para objetivo:', objetivo);

  const systemPrompt = `Você é um profissional responsável por criar treinos ultramente específicos com base no objetivo do cliente
  sempre buscando os exercicios mais especificos para conquistar o objetivo do cliente.
  
  Crie treinos baseados em exercícios científicamente comprovados e técnicas modernas de treinamento.
  
  Procure a quantidade de vezes que o cliente deseja treinar na semana e faça um treino ULTRA ESPECIFICO para cada dia de acordo com o OBJETIVO repassado e retorne **apenas JSON válido** com o formato:
  {
    "treinos": [
      {
        "treinoName": "String",
        "ordem": Number, 
        "descricao": "String",
        "exercicios": [
          {
            "ordem": Number,
            "musculo": "String",
            "nome": "String",
            "instrucoes": "String",
            "series": Number,
            "repeticoes": Number,
            "pse": Number
          }
        ]
      }
    ]
  }
  
  PSE: Percepção subjetiva de esforço, é a escala de esforço que você deve realizar em cada exercício (1-10, sendo 1 muito fácil e 10 extremamente difícil).`;

  const userPrompt = `Objetivo >> ${objetivo}

Crie um plano de treino completo e específico para este objetivo. Considere:
- Exercícios baseados em evidências científicas
- Técnicas modernas de treinamento
- Progressão adequada
- Variações de exercícios eficazes
- Métodos de treinamento atuais

Retorne APENAS o JSON válido sem texto adicional.`;

  try {
    const resp = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    // Registrar uso de tokens usando o novo sistema
    const tokensUsed = Number(resp?.usage?.total_tokens || 0);
    if (tokensUsed > 0 && userEmail) {
      await registerTokenUsage(userEmail, tokensUsed);
    }

    console.log('Resposta OpenAI recebida:', resp?.choices?.[0]?.message?.content?.substring(0, 200) + '...');

    const text = resp?.choices?.[0]?.message?.content || null;
    if (!text) {
      console.error('OpenAI retornou resposta vazia');
      return { treinos: [], raw: null, error: 'Resposta vazia da OpenAI' };
    }

    try {
      // Tentar parsear diretamente primeiro
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (directParseError) {
        // Se falhar, tentar extrair JSON com regex
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        } else {
          throw new Error('Nenhum JSON válido encontrado na resposta');
        }
      }

      console.log('JSON parseado com sucesso. Treinos encontrados:', parsed?.treinos?.length || 0);

      return {
        treinos: parsed.treinos || [],
        raw: text,
        total_tokens: resp?.usage?.total_tokens || 0
      };
    } catch (parseError) {
      console.error('Erro ao parsear JSON:', parseError);
      console.error('Texto recebido:', text);
      return { treinos: [], raw: text, error: 'Erro ao parsear JSON', total_tokens: resp?.usage?.total_tokens || 0 };
    }
  } catch (apiError) {
    console.error('Erro na chamada da OpenAI:', apiError);
    return { treinos: [], raw: null, error: 'Erro na API OpenAI: ' + apiError.message };
  }
}

export const carregarTreinos = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ msg: "!email" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "Email invalido. Usuario nao encontrado." });

    if (user.planInfos && user.planInfos.status === 'inativo' && user.planInfos.planType !== 'free') {
      return res.status(400).json({ msg: 'O seu plano está inativo!' });
    }

    // Caso já tenha treinos
    if (Array.isArray(user.meusTreinos) && user.meusTreinos.length > 0) {
      return res.json({ msg: 'Você já tem treinos criados', user, total_tokens: 0 });
    }

    // Sem treinos: gerar via IA
    const meusTreinosResp = await criarTreinos(user.perfil?.objetivo, email);
    console.log('meusTreinosResp', meusTreinosResp);
    const treinosGPT = meusTreinosResp?.treinos || meusTreinosResp || [];
    const totalTokens = Number(meusTreinosResp?.total_tokens) || 0;

    const meusTreinos = (treinosGPT || []).map((treino, idx) => ({
      treinoId: uuidv4(),
      treinoName: treino.treinoName || `Treino ${idx + 1}`,
      ordem: treino.ordem ?? (idx + 1),
      descricao: treino.descricao || '',
      criadoEm: new Date(),
      exercicios: (treino.exercicios || []).map((ex, exIdx) => ({
        exercicioId: uuidv4(),
        ordem: ex.ordem ?? (exIdx + 1),
        musculo: ex.musculo,
        nome: ex.nome,
        instrucoes: ex.instrucoes,
        series: ex.series,
        repeticoes: ex.repeticoes,
        pse: ex.pse || 0
      }))
    }));

    // se existir o profissionalId entao atualizar
    try {
      if (req?.body?.profissionalId) {
        const profissional = await Profissional.findOne({
          $or: [
            { profissionalId: req?.body?.profissionalId },
            { userId: req?.body?.profissionalId }
          ]
        });

        if (!profissional) console.log('Não encontrei o profissional com o profissionalId repassado.');
        if (profissional) {
          const aluno = profissional.alunos.find(a => String(a.userId) === String(user._id));
          if (!aluno) console.log('nao existe esse aluno em profissional: ' + profissional.profissionalName);
          if (aluno) {
            aluno.ultimoUpdate = getBrazilDate();
            await profissional.save();
          }
        }
      }
    } catch (error) {
      console.log('Não foi o profissional que fez update! ou aconteceu algum erro > ', error);
    }

    console.log(meusTreinos)

    // Atualiza o user com findByIdAndUpdate (evita VersionError)
    await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          meusTreinos
        }
      },
      { new: true }
    );

    return res.json({
      msg: 'Treinos criados com sucesso!',
      meusTreinos,
      total_tokens: totalTokens
    });
  } catch (error) {
    console.error('carregarTreinos error:', error);
    return res.status(500).json({
      msg: 'Erro interno do servidor ao carregar treinos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const atualizarMeusTreinos = async (req, res) => {
  const { email, updated } = req.body;

  if (!email) return res.json({ msg: '!email' });
  if (!updated) return res.json({ msg: 'Voce nao passou o valor novo de user.meusTreinos' });

  try {
    const user = await User.findOne({ email });

    if (!user) return res.json({ msg: 'Nao conseguimos encontrar o seu usuario.' });

    user.meusTreinos = updated

    // se existir o profissionalId entao atualizar
    try {
      if (req?.body?.profissionalId) {
        const profissional = await Profissional.findOne({
          $or: [
            { profissionalId: req?.body?.profissionalId },
            { userId: req?.body?.profissionalId }
          ]
        });

        if (!profissional) console.log('Não encontrei o profissional com o profissionalId repassado.');
        if (profissional) {
          const aluno = profissional.alunos.find(a => String(a.userId) === String(user._id));

          if (!aluno) console.log('nao existe esse aluno em profissional: ' + profissional.profissionalName)
          if (aluno) {
            aluno.ultimoUpdate = getBrazilDate();

            await profissional.save()
          }
        }
      }
    } catch (error) {
      console.log('Não foi o profissional que fez update! ou aconteceu algum erro > ', error);
    }

    await user.save();

    return res.json({ msg: 'Tudo certo!', user })
  } catch (error) {
    return res.json({ msg: error })
  }
};

export const pegarUser = async (req, res) => {
  const { userId, profissionalId } = req.query;

  if (!userId || !profissionalId) {
    return res.status(400).json({ success: false, msg: 'Parâmetros obrigatórios: userId e profissionalId.' });
  }

  try {
    // 1) Buscar usuário: userId -> esperado ser o _id (ObjectId)
    let user = null;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId)
        .select('-password -salt -tokens -__v') // remova campos sensíveis conforme seu schema
        .lean();
    } else {
      // fallback: caso você também armazene um campo userId/string diferente do _id
      user = await User.findOne({ userId: String(userId) })
        .select('-password -salt -tokens -__v')
        .lean();
    }

    if (!user) {
      return res.status(404).json({ success: false, msg: 'Usuário não encontrado.' });
    }

    // 2) Buscar profissional: aceite profissionalId como UUID (campo profissionalId) OU um _id (ObjectId)
    let profissional = null;
    if (mongoose.Types.ObjectId.isValid(profissionalId)) {
      profissional = await Profissional.findById(profissionalId).lean();
    }
    if (!profissional) {
      profissional = await Profissional.findOne({ profissionalId: String(profissionalId) }).lean();
    }

    if (!profissional) {
      return res.status(404).json({ success: false, msg: 'Profissional não encontrado.' });
    }

    // 3) Construa versão segura do user (somente campos necessários)
    const safeUser = {
      _id: user._id,
      userId: user.userId || null,
      username: user.username || user.name || null,
      email: user.email || null,
      perfil: user.perfil || null,
      planInfos: user.planInfos || null,
      avatar: user.avatar || null,
      // adicione outros campos não-sensíveis que o front precisar
    };

    // 4) Construa versão segura do profissional (se quiser)
    const safeProfissional = {
      _id: profissional._id,
      profissionalId: profissional.profissionalId || null,
      profissionalName: profissional.profissionalName || null,
      biografia: profissional.biografia || null,
      imageUrl: profissional.imageUrl || null,
      especialidade: profissional.especialidade || null,
      city: profissional.city || null,
      state: profissional.state || null,
      country: profissional.country || null,
      alunos: Array.isArray(profissional.alunos) ? profissional.alunos : [],
    };

    return res.status(200).json({
      success: true,
      msg: 'tudo ok!',
      user,
      profissional: safeProfissional
    });
  } catch (err) {
    console.error('Erro em pegarUser:', err);
    return res.status(500).json({ success: false, msg: 'Erro interno ao processar a requisição.' });
  }
};

// Nova rota para bloquear dispositivos não autorizados
export const loginNaoAutorizado = async (req, res) => {
  try {
    const { ticket } = req.body;

    // Validar parâmetros obrigatórios
    if (!ticket) {
      return res.status(400).json({
        success: false,
        message: 'Ticket é obrigatório'
      });
    }

    // Validar o ticket de segurança e extrair dados
    const ticketData = validateSecurityTicket(ticket);
    if (!ticketData) {
      return res.status(400).json({
        success: false,
        message: 'Ticket inválido ou expirado'
      });
    }

    // Extrair userId e deviceId do ticket
    const { userId, deviceId } = ticketData;

    // Buscar o usuário
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Inicializar deviceHistory se não existir
    if (!user.stats) user.stats = {};
    if (!user.stats.deviceHistory) user.stats.deviceHistory = [];

    // Encontrar o dispositivo específico no histórico por deviceId
    let deviceIndex = user.stats.deviceHistory.findIndex(
      device => device.deviceId === deviceId
    );

    // Se não encontrou por deviceId, tentar buscar por systemInfo do ticket
    if (deviceIndex === -1 && ticketData.deviceInfo && ticketData.deviceInfo.location && ticketData.deviceInfo.systemInfo) {
      deviceIndex = user.stats.deviceHistory.findIndex(
        device => device.location === ticketData.deviceInfo.location && device.systemInfo === ticketData.deviceInfo.systemInfo
      );
    }

    if (deviceIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo não encontrado no histórico'
      });
    }

    // Atualizar o campo bloqueado para true
    user.stats.deviceHistory[deviceIndex].bloqueado = true;
    user.stats.deviceHistory[deviceIndex].blockedAt = getBrazilDate();

    // Salvar as alterações
    await user.save();

    // Log de segurança
    console.log(`[SECURITY] Dispositivo ${deviceId} bloqueado para usuário ${userId} em ${new Date(getBrazilDate()).toISOString()}`);

    return res.status(200).json({
      success: true,
      message: 'Dispositivo bloqueado com sucesso',
      data: {
        deviceId,
        blockedAt: user.stats.deviceHistory[deviceIndex].blockedAt,
        deviceInfo: {
          systemInfo: user.stats.deviceHistory[deviceIndex].systemInfo,
          location: user.stats.deviceHistory[deviceIndex].location,
          loginCount: user.stats.deviceHistory[deviceIndex].loginCount,
          lastActivity: user.stats.deviceHistory[deviceIndex].lastActivity,
          firstLoginDate: user.stats.deviceHistory[deviceIndex].firstLoginDate,
          loginDate: user.stats.deviceHistory[deviceIndex].loginDate,
          userAgent: user.stats.deviceHistory[deviceIndex].userAgent
        }
      }
    });

  } catch (error) {
    console.error('[ERROR] Erro ao bloquear dispositivo:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
