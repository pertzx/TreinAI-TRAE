// utils/ticketManager.js
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const SECRET_JWT = process.env.SECRET_JWT;
const TICKET_EXPIRY = 24 * 60 * 60 * 1000; // 24 horas em millisegundos

/**
 * Utilitário para gerenciamento de tickets de segurança
 * Usado para validar ações de bloqueio de dispositivos
 */

/**
 * Gera um ticket seguro para bloqueio de dispositivo
 * @param {string} userId - ID do usuário
 * @param {string} deviceId - ID do dispositivo
 * @param {Object} deviceInfo - Informações do dispositivo
 * @returns {string} Ticket JWT assinado
 */
export function generateSecurityTicket(userId, deviceId, deviceInfo = {}) {
  try {
    if (!SECRET_JWT) {
      throw new Error('SECRET_JWT not configured');
    }

    const payload = {
      type: 'device_block',
      userId: userId,
      deviceId: deviceId,
      deviceInfo: {
        userAgent: deviceInfo.userAgent || '',
        ip: deviceInfo.ip || '',
        browser: deviceInfo.browser?.name || '',
        os: deviceInfo.os?.name || '',
        location: {
          country: deviceInfo.location?.country || '',
          city: deviceInfo.location?.city || ''
        }
      },
      timestamp: Date.now(),
      expiresAt: Date.now() + TICKET_EXPIRY
    };

    return jwt.sign(payload, SECRET_JWT, { 
      expiresIn: '24h',
      issuer: 'TreinAI-Security',
      subject: 'device-block'
    });
  } catch (error) {
    console.error('Error generating security ticket:', error);
    throw new Error('Failed to generate security ticket');
  }
}

/**
 * Valida um ticket de segurança
 * @param {string} ticket - Ticket JWT a ser validado
 * @returns {Object} Dados do ticket decodificado ou null se inválido
 */
export function validateSecurityTicket(ticket) {
  try {
    if (!ticket || !SECRET_JWT) {
      return null;
    }

    const decoded = jwt.verify(ticket, SECRET_JWT, {
      issuer: 'TreinAI-Security',
      subject: 'device-block'
    });

    // Verificar se o ticket não expirou
    if (decoded.expiresAt && Date.now() > decoded.expiresAt) {
      return null;
    }

    // Verificar se é um ticket de bloqueio de dispositivo
    if (decoded.type !== 'device_block') {
      return null;
    }

    return {
      userId: decoded.userId,
      deviceId: decoded.deviceId,
      deviceInfo: decoded.deviceInfo,
      timestamp: decoded.timestamp,
      expiresAt: decoded.expiresAt
    };
  } catch (error) {
    console.error('Error validating security ticket:', error);
    return null;
  }
}

/**
 * Gera um hash único para identificar um ticket
 * @param {string} userId - ID do usuário
 * @param {string} deviceId - ID do dispositivo
 * @param {number} timestamp - Timestamp de criação
 * @returns {string} Hash único do ticket
 */
export function generateTicketHash(userId, deviceId, timestamp) {
  const data = `${userId}-${deviceId}-${timestamp}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

/**
 * Verifica se um ticket ainda é válido baseado no tempo
 * @param {number} timestamp - Timestamp de criação do ticket
 * @returns {boolean} True se ainda válido
 */
export function isTicketValid(timestamp) {
  if (!timestamp) return false;
  return (Date.now() - timestamp) < TICKET_EXPIRY;
}

/**
 * Gera dados completos para um ticket de segurança
 * @param {string} userId - ID do usuário
 * @param {string} deviceId - ID do dispositivo
 * @param {Object} deviceInfo - Informações do dispositivo
 * @returns {Object} Dados completos do ticket
 */
export function createSecurityTicketData(userId, deviceId, deviceInfo = {}) {
  try {
    const timestamp = Date.now();
    const ticket = generateSecurityTicket(userId, deviceId, deviceInfo);
    const ticketHash = generateTicketHash(userId, deviceId, timestamp);

    return {
      ticket: ticket,
      ticketHash: ticketHash,
      userId: userId,
      deviceId: deviceId,
      timestamp: timestamp,
      expiresAt: timestamp + TICKET_EXPIRY,
      deviceInfo: {
        userAgent: deviceInfo.userAgent || '',
        ip: deviceInfo.ip || '',
        browser: deviceInfo.browser?.name || '',
        os: deviceInfo.os?.name || '',
        location: {
          country: deviceInfo.location?.country || '',
          city: deviceInfo.location?.city || ''
        }
      }
    };
  } catch (error) {
    console.error('Error creating security ticket data:', error);
    throw new Error('Failed to create security ticket data');
  }
}

/**
 * Formata informações do dispositivo para exibição no email
 * @param {Object} deviceInfo - Informações do dispositivo
 * @returns {string} Texto formatado para email
 */
export function formatDeviceInfoForEmail(deviceInfo) {
  const parts = [];
  
  if (deviceInfo.browser?.name) {
    parts.push(`Navegador: ${deviceInfo.browser.name}`);
  }
  
  if (deviceInfo.os?.name) {
    parts.push(`Sistema: ${deviceInfo.os.name}`);
  }
  
  if (deviceInfo.device?.type) {
    parts.push(`Tipo: ${deviceInfo.device.type}`);
  }
  
  if (deviceInfo.location?.city && deviceInfo.location?.country) {
    parts.push(`Localização: ${deviceInfo.location.city}, ${deviceInfo.location.country}`);
  }
  
  if (deviceInfo.ip) {
    parts.push(`IP: ${deviceInfo.ip}`);
  }

  return parts.length > 0 ? parts.join('\n') : 'Informações não disponíveis';
}

export default {
  generateSecurityTicket,
  validateSecurityTicket,
  generateTicketHash,
  isTicketValid,
  createSecurityTicketData,
  formatDeviceInfoForEmail
};