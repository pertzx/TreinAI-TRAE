import nativeEmailValidator from '../utils/nativeEmailValidation.js';
import dns from 'dns';
import { promisify } from 'util';
import { getBrazilDate } from '../helpers/getBrazilDate.js';

const resolveMx = promisify(dns.resolveMx);

// Lista de domínios temporários/descartáveis conhecidos
const disposableEmailDomains = [
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'tempmail.org',
  'yopmail.com',
  'temp-mail.org',
  'throwaway.email',
  'maildrop.cc',
  'sharklasers.com',
  'guerrillamailblock.com',
  'pokemail.net',
  'spam4.me',
  'bccto.me',
  'chacuo.net',
  'dispostable.com',
  'fake-mail.ml',
  'fakeinbox.com',
  'getnada.com',
  'harakirimail.com',
  'incognitomail.org',
  'jetable.org',
  'koszmail.pl',
  'kurzepost.de',
  'lroid.com',
  'mytrashmail.com',
  'no-spam.ws',
  'noclickemail.com',
  'nogmailspam.info',
  'nomail.xl.cx',
  'notmailinator.com',
  'nowmymail.com',
  'objectmail.com',
  'obobbo.com',
  'onewaymail.com',
  'pookmail.com',
  'proxymail.eu',
  'rcpt.at',
  'safe-mail.net',
  'selfdestructingmail.com',
  'sendspamhere.com',
  'shieldedmail.com',
  'soodonims.com',
  'spambog.com',
  'spambog.de',
  'spambog.ru',
  'spamex.com',
  'spamfree24.org',
  'spamherelots.com',
  'spamhereplease.com',
  'spamthisplease.com',
  'superrito.com',
  'tempemail.com',
  'tempinbox.com',
  'tempymail.com',
  'thankyou2010.com',
  'trash-amil.com',
  'trashmail.at',
  'trashmail.com',
  'trashmail.io',
  'trashmail.me',
  'trashmail.net',
  'trashymail.com',
  'trbvm.com',
  'wegwerfmail.de',
  'wegwerfmail.net',
  'wegwerfmail.org',
  'wh4f.org',
  'whyspam.me',
  'willselfdestruct.com',
  'xoxy.net',
  'yuurok.com',
  'zoemail.org'
];

// Cache para resultados de validação DNS (evita múltiplas consultas)
const dnsCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos

export const validateEmailReal = async (req, res, next) => {
  try {
    const { email } = req.body;
    // Log removido para evitar exposição de emails nos logs
    
    if (!email) {
      return res.status(400).json({
        message: 'Email é obrigatório',
        field: 'email'
      });
    }

    // 1. Validação básica de formato
    if (!nativeEmailValidator.validate(email)) {
      // Log removido para evitar exposição de emails nos logs
      return res.status(400).json({
        message: 'Formato de email inválido',
        field: 'email'
      });
    }

    const emailLower = email.toLowerCase();
    const domain = emailLower.split('@')[1];

    // 2. Verificar se é um domínio descartável
    if (disposableEmailDomains.includes(domain)) {
      return res.status(400).json({
        message: 'Emails temporários ou descartáveis não são permitidos',
        field: 'email'
      });
    }

    // 3. Verificar se o domínio tem registros MX (DNS)
    const cacheKey = `mx_${domain}`;
    const cached = dnsCache.get(cacheKey);

    if (cached && (getBrazilDate() - cached.timestamp) < CACHE_DURATION) {
      if (!cached.valid) {
        return res.status(400).json({
          message: 'Domínio de email inválido ou inexistente',
          field: 'email'
        });
      }
    } else {
      try {
        const mxRecords = await resolveMx(domain);
        
        if (!mxRecords || mxRecords.length === 0) {
          dnsCache.set(cacheKey, { valid: false, timestamp: getBrazilDate() });
          return res.status(400).json({
            message: 'Domínio de email não possui servidor de email válido',
            field: 'email'
          });
        }

        // Cache resultado positivo
        dnsCache.set(cacheKey, { valid: true, timestamp: getBrazilDate() });

      } catch (dnsError) {
        // Se houver erro na consulta DNS, assumir que o domínio é inválido
        dnsCache.set(cacheKey, { valid: false, timestamp: getBrazilDate() });
        return res.status(400).json({
          message: 'Não foi possível verificar o domínio do email',
          field: 'email'
        });
      }
    }

    // 4. Validações adicionais de segurança
    
    // Verificar caracteres suspeitos
    const suspiciousPatterns = [
      /\+.*\+/, // Múltiplos sinais de +
      /\.{2,}/, // Múltiplos pontos consecutivos
      /^\./, // Começa com ponto
      /\.$/, // Termina com ponto
      /@.*@/, // Múltiplos @
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(emailLower)) {
        return res.status(400).json({
          message: 'Email contém caracteres ou padrões inválidos',
          field: 'email'
        });
      }
    }

    // Verificar comprimento
    if (email.length > 254) {
      return res.status(400).json({
        message: 'Email muito longo (máximo 254 caracteres)',
        field: 'email'
      });
    }

    const localPart = emailLower.split('@')[0];
    if (localPart.length > 64) {
      return res.status(400).json({
        message: 'Parte local do email muito longa (máximo 64 caracteres)',
        field: 'email'
      });
    }

    // Se chegou até aqui, o email é válido
    req.validatedEmail = emailLower;
    next();

  } catch (error) {
    console.error('Erro na validação de email:', error);
    return res.status(500).json({
      message: 'Erro interno na validação de email'
    });
  }
};

// Middleware mais leve para validação básica (sem DNS)
export const validateEmailBasic = (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'Email é obrigatório',
        field: 'email'
      });
    }

    if (!nativeEmailValidator.validate(email)) {
      // Log removido para evitar exposição de emails nos logs
      
      return res.status(400).json({
        message: 'Formato de email inválido',
        field: 'email'
      });
    }

    const emailLower = email.toLowerCase();
    const domain = emailLower.split('@')[1];

    // Verificar domínios descartáveis
    if (disposableEmailDomains.includes(domain)) {
      return res.status(400).json({
        message: 'Emails temporários ou descartáveis não são permitidos',
        field: 'email'
      });
    }

    req.validatedEmail = emailLower;
    next();

  } catch (error) {
    console.error('Erro na validação básica de email:', error);
    return res.status(500).json({
      message: 'Erro interno na validação de email'
    });
  }
};

// Função para limpar cache periodicamente
export const clearEmailCache = () => {
  const now = getBrazilDate();
  for (const [key, value] of dnsCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      dnsCache.delete(key);
    }
  }
};

// Limpar cache a cada hora
setInterval(clearEmailCache, 60 * 60 * 1000);