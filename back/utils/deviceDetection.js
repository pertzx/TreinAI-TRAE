// utils/deviceDetection.js
import crypto from 'crypto';
import DeviceDetector from 'node-device-detector';
import { v4 as uuidv4 } from 'uuid';

/**
 * Utilitário para captura e análise de informações de dispositivo
 * Inclui detecção de dispositivo, geolocalização por IP e geração de fingerprint
 */

const detector = new DeviceDetector({
  clientIndexes: true,
  deviceIndexes: true,
  osIndexes: true,
  deviceAliasCode: false,
  deviceTrusted: false,
  deviceInfo: false,
  maxUserAgentSize: 500,
});

/**
 * Extrai o IP real do cliente considerando proxies e load balancers
 * @param {Object} req - Request object do Express
 * @returns {string} IP do cliente
 */
export function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown';
}

/**
 * Obtém informações de geolocalização por IP usando serviço gratuito
 * @param {string} ip - Endereço IP
 * @returns {Promise<Object>} Dados de localização
 */
export async function getLocationByIP(ip) {
  try {
    // Usar ip-api.com (gratuito, sem necessidade de API key)
    // Limite: 1000 requests/hora para uso não comercial
    if (ip === 'unknown' || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return {
        country: 'Brasil',
        countryCode: 'BR',
        region: 'Local',
        regionCode: 'LOCAL',
        city: 'Localhost',
        latitude: null,
        longitude: null,
        timezone: 'America/Sao_Paulo',
        isp: 'Local Network'
      };
    }

    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp,query`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'fail') {
      throw new Error(data.message || 'Failed to get location data');
    }

    return {
      country: data.country || null,
      countryCode: data.countryCode || null,
      region: data.regionName || null,
      regionCode: data.region || null,
      city: data.city || null,
      latitude: data.lat || null,
      longitude: data.lon || null,
      timezone: data.timezone || null,
      isp: data.isp || null
    };
  } catch (error) {
    console.error('Error getting location by IP:', error);
    return {
      country: null,
      countryCode: null,
      region: null,
      regionCode: null,
      city: null,
      latitude: null,
      longitude: null,
      timezone: null,
      isp: null
    };
  }
}

/**
 * Gera um fingerprint único baseado nas características do dispositivo
 * @param {Object} deviceInfo - Informações do dispositivo
 * @param {string} ip - IP do cliente
 * @param {string} userAgent - User Agent string
 * @returns {string} Hash único do dispositivo
 */
export function generateDeviceFingerprint(deviceInfo, ip, userAgent) {
  const fingerprintData = {
    userAgent: userAgent || '',
    browser: deviceInfo.client?.name || '',
    browserVersion: deviceInfo.client?.version || '',
    os: deviceInfo.os?.name || '',
    osVersion: deviceInfo.os?.version || '',
    device: deviceInfo.device?.brand || '',
    deviceModel: deviceInfo.device?.model || '',
    deviceType: deviceInfo.device?.type || '',
    ip: ip || ''
  };

  const fingerprintString = JSON.stringify(fingerprintData);
  return crypto.createHash('sha256').update(fingerprintString).digest('hex');
}

/**
 * Analisa informações completas do dispositivo a partir do request
 * @param {Object} req - Request object do Express
 * @param {Array} existingDeviceHistory - Histórico de dispositivos existente para verificar se já existe
 * @returns {Promise<Object>} Informações completas do dispositivo
 */
export async function analyzeDeviceFromRequest(req, existingDeviceHistory = []) {
  try {
    const userAgent = req.headers['user-agent'] || '';
    const ip = getClientIP(req);
    
    // Detectar informações do dispositivo
    const deviceInfo = detector.detect(userAgent);
    
    // Obter localização por IP
    const location = await getLocationByIP(ip);
    
    // Buscar dispositivo existente baseado nas características (não no fingerprint)
    const existingDevice = findDeviceByCharacteristics(existingDeviceHistory, deviceInfo, ip, userAgent);
    
    // Se existe, usar o deviceId existente; senão, gerar um novo deviceId único
    const deviceId = existingDevice ? existingDevice.deviceId : uuidv4();
    
    // Gerar fingerprint para referência (mas não para identificação)
    const fingerprint = generateDeviceFingerprint(deviceInfo, ip, userAgent);
    
    // Extrair informações adicionais dos headers
    const acceptLanguage = req.headers['accept-language'] || '';
    const languages = acceptLanguage.split(',').map(lang => lang.split(';')[0].trim()).filter(Boolean);
    
    return {
      deviceId: deviceId, // Usar deviceId consistente
      bloqueado: false,
      
      // Informações do dispositivo
      userAgent: userAgent,
      browser: {
        name: deviceInfo.client?.name || null,
        version: deviceInfo.client?.version || null,
        engine: deviceInfo.client?.engine || null
      },
      os: {
        name: deviceInfo.os?.name || null,
        version: deviceInfo.os?.version || null,
        platform: deviceInfo.os?.platform || null
      },
      device: {
        type: deviceInfo.device?.type || null,
        vendor: deviceInfo.device?.brand || null,
        model: deviceInfo.device?.model || null
      },
      
      // Informações de rede e localização
      ip: ip,
      location: location,
      
      // Informações de segurança (fingerprint básico)
      fingerprint: {
        screen: {
          width: null, // Será preenchido pelo frontend se disponível
          height: null,
          colorDepth: null
        },
        language: languages[0] || null,
        languages: languages,
        cookieEnabled: null, // Será preenchido pelo frontend se disponível
        doNotTrack: req.headers['dnt'] || null,
        plugins: [], // Será preenchido pelo frontend se disponível
        fonts: [] // Será preenchido pelo frontend se disponível
      },
      
      // Datas e controle
      firstLoginDate: new Date(),
      loginDate: new Date(),
      lastActivity: new Date(),
      loginCount: 1,
      
      // Controle de segurança
      suspicious: false,
      suspiciousReasons: [],
      blockedAt: null,
      blockedReason: null
    };
  } catch (error) {
    console.error('Error analyzing device from request:', error);
    
    // Retornar dados básicos em caso de erro
    const ip = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    
    // Buscar dispositivo existente mesmo em caso de erro
    const existingDevice = findDeviceByCharacteristics(existingDeviceHistory, {}, ip, userAgent);
    const deviceId = existingDevice ? existingDevice.deviceId : uuidv4();
    
    // Gerar fingerprint básico para referência
    const basicFingerprint = generateDeviceFingerprint({}, ip, userAgent);
    
    return {
      deviceId: deviceId,
      bloqueado: false,
      userAgent: userAgent,
      browser: { name: null, version: null, engine: null },
      os: { name: null, version: null, platform: null },
      device: { type: null, vendor: null, model: null },
      ip: ip,
      location: {
        country: null, countryCode: null, region: null, regionCode: null,
        city: null, latitude: null, longitude: null, timezone: null, isp: null
      },
      fingerprint: {
        screen: { width: null, height: null, colorDepth: null },
        language: null, languages: [], cookieEnabled: null,
        doNotTrack: null, plugins: [], fonts: []
      },
      firstLoginDate: new Date(),
      loginDate: new Date(),
      lastActivity: new Date(),
      loginCount: 1,
      suspicious: false,
      suspiciousReasons: [],
      blockedAt: null,
      blockedReason: null
    };
  }
}

/**
 * Verifica se um dispositivo já existe no histórico do usuário
 * @param {Array} deviceHistory - Histórico de dispositivos do usuário
 * @param {string} deviceId - ID do dispositivo a verificar
 * @returns {Object|null} Dispositivo encontrado ou null
 */
export function findExistingDevice(deviceHistory, deviceId) {
  if (!Array.isArray(deviceHistory) || !deviceId) {
    return null;
  }
  
  return deviceHistory.find(device => device.deviceId === deviceId) || null;
}

/**
 * Busca dispositivo existente baseado nas características do dispositivo (não no fingerprint)
 * @param {Array} deviceHistory - Histórico de dispositivos do usuário
 * @param {Object} deviceInfo - Informações do dispositivo detectadas
 * @param {string} ip - IP do dispositivo
 * @param {string} userAgent - User agent do dispositivo
 * @returns {Object|null} Dispositivo encontrado ou null
 */
export function findDeviceByCharacteristics(deviceHistory, deviceInfo, ip, userAgent) {
  if (!Array.isArray(deviceHistory) || deviceHistory.length === 0) {
    return null;
  }

  // Verificar se deviceInfo existe e tem as propriedades necessárias
  if (!deviceInfo) {
    return null;
  }

  // Buscar por combinação de características únicas do dispositivo
  return deviceHistory.find(device => {
    // Verificar se o user agent é exatamente o mesmo
    if (device.userAgent === userAgent) {
      return true;
    }

    // Verificar combinação de browser, OS e device type com verificações de segurança
    const browserMatch = device.browser?.name === deviceInfo.client?.name &&
                        device.browser?.version === deviceInfo.client?.version;
    
    const osMatch = device.os?.name === deviceInfo.os?.name &&
                   device.os?.version === deviceInfo.os?.version &&
                   device.os?.platform === deviceInfo.os?.platform;
    
    const deviceMatch = device.device?.type === deviceInfo.device?.type &&
                       device.device?.vendor === deviceInfo.device?.brand &&
                       device.device?.model === deviceInfo.device?.model;

    // Se temos informações suficientes e elas coincidem
    if (browserMatch && osMatch && deviceMatch) {
      return true;
    }

    // Verificar se é o mesmo IP com características similares (fallback)
    if (device.ip === ip && browserMatch && osMatch) {
      return true;
    }

    return false;
  }) || null;
}

/**
 * Atualiza informações de um dispositivo existente
 * @param {Object} existingDevice - Dispositivo existente
 * @param {Object} newDeviceInfo - Novas informações do dispositivo
 * @returns {Object} Dispositivo atualizado
 */
export function updateExistingDevice(existingDevice, newDeviceInfo) {
  return {
    ...existingDevice,
    loginDate: new Date(),
    lastActivity: new Date(),
    loginCount: (existingDevice.loginCount || 0) + 1,
    // Atualizar informações que podem mudar
    ip: newDeviceInfo.ip,
    location: newDeviceInfo.location,
    userAgent: newDeviceInfo.userAgent
  };
}

/**
 * Detecta comportamento suspeito baseado em padrões de login
 * @param {Object} deviceInfo - Informações do dispositivo
 * @param {Array} deviceHistory - Histórico de dispositivos
 * @returns {Object} Análise de suspeição
 */
export function detectSuspiciousBehavior(deviceInfo, deviceHistory = []) {
  const suspiciousReasons = [];
  let suspicious = false;

  // Verificar múltiplos dispositivos em pouco tempo
  const recentDevices = deviceHistory.filter(device => {
    const timeDiff = Date.now() - new Date(device.firstLoginDate).getTime();
    return timeDiff < 24 * 60 * 60 * 1000; // Últimas 24 horas
  });

  if (recentDevices.length > 5) {
    suspicious = true;
    suspiciousReasons.push('Múltiplos dispositivos em 24h');
  }

  // Verificar mudança drástica de localização
  if (deviceHistory.length > 0) {
    const lastDevice = deviceHistory[deviceHistory.length - 1];
    if (lastDevice.location?.country && deviceInfo.location?.country) {
      if (lastDevice.location.country !== deviceInfo.location.country) {
        const timeDiff = Date.now() - new Date(lastDevice.loginDate).getTime();
        if (timeDiff < 2 * 60 * 60 * 1000) { // Menos de 2 horas
          suspicious = true;
          suspiciousReasons.push('Mudança rápida de país');
        }
      }
    }
  }

  // Verificar User Agent suspeito
  if (!deviceInfo.userAgent || deviceInfo.userAgent.length < 50) {
    suspicious = true;
    suspiciousReasons.push('User Agent suspeito');
  }

  return {
    suspicious,
    suspiciousReasons
  };
}

export default {
  getClientIP,
  getLocationByIP,
  generateDeviceFingerprint,
  analyzeDeviceFromRequest,
  findExistingDevice,
  findDeviceByCharacteristics,
  updateExistingDevice,
  detectSuspiciousBehavior
};