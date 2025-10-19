import nativeEmailValidator from './nativeEmailValidation.js';
import { createTransport } from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

/**
 * Configuração do transporter de email usando variáveis de ambiente
 * Suporta Gmail com autenticação segura via App Password
 */
const createEmailTransporter = () => {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!emailUser || !emailPass) {
        throw new Error('Configurações de email não encontradas. Verifique EMAIL_USER e EMAIL_PASS no arquivo .env');
    }

    return createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true para 465, false para outras portas
        auth: {
            user: emailUser,
            pass: emailPass // Use App Password para Gmail
        },
        // Configurações de segurança adicionais
        tls: {
            rejectUnauthorized: true,
            minVersion: 'TLSv1.2'
        },
        // Timeout configurations
        connectionTimeout: 60000, // 60 segundos
        greetingTimeout: 30000,   // 30 segundos
        socketTimeout: 60000      // 60 segundos
    });
};

/**
 * Valida o formato e segurança do email
 * @param {string} email - Email a ser validado
 * @returns {Object} - Resultado da validação
 */
const validateEmail = (email) => {
    const result = {
        isValid: false,
        error: null,
        sanitizedEmail: null
    };

    // Verificar se email foi fornecido
    if (!email) {
        result.error = 'Email é obrigatório';
        return result;
    }

    // Verificar tipo
    if (typeof email !== 'string') {
        result.error = 'Email deve ser uma string';
        return result;
    }

    // Sanitizar email (remover espaços e converter para lowercase)
    const sanitizedEmail = email.trim().toLowerCase();

    // Verificar comprimento
    if (sanitizedEmail.length === 0) {
        result.error = 'Email não pode estar vazio';
        return result;
    }

    if (sanitizedEmail.length > 254) {
        result.error = 'Email muito longo (máximo 254 caracteres)';
        return result;
    }

    // Validar formato usando biblioteca confiável
    if (!nativeEmailValidator.validate(sanitizedEmail)) {
        result.error = 'Formato de email inválido';
        return result;
    }

    // Verificar caracteres perigosos (prevenção XSS)
    const dangerousChars = /<|>|"|'|&|script|javascript|onclick|onerror/i;
    if (dangerousChars.test(sanitizedEmail)) {
        result.error = 'Email contém caracteres não permitidos';
        return result;
    }

    // Verificar domínios temporários conhecidos
    const disposableEmailDomains = [
        '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
        'throwaway.email', 'tempmail.org', 'pokemail.net'
    ];

    const domain = sanitizedEmail.split('@')[1];
    if (disposableEmailDomains.includes(domain)) {
        result.error = 'Emails temporários não são permitidos';
        return result;
    }

    result.isValid = true;
    result.sanitizedEmail = sanitizedEmail;
    return result;
};

/**
 * Valida e sanitiza a mensagem de email
 * @param {string} msg - Mensagem a ser validada
 * @returns {Object} - Resultado da validação
 */
const validateMessage = (msg) => {
    const result = {
        isValid: false,
        error: null,
        sanitizedMessage: null
    };

    // Verificar se mensagem foi fornecida
    if (!msg) {
        result.error = 'Mensagem é obrigatória';
        return result;
    }

    // Verificar tipo
    if (typeof msg !== 'string') {
        result.error = 'Mensagem deve ser uma string';
        return result;
    }

    // Sanitizar mensagem (remover espaços extras)
    const sanitizedMessage = msg.trim();

    // Verificar comprimento
    if (sanitizedMessage.length === 0) {
        result.error = 'Mensagem não pode estar vazia';
        return result;
    }

    if (sanitizedMessage.length > 10000) {
        result.error = 'Mensagem muito longa (máximo 10.000 caracteres)';
        return result;
    }

    // Escape básico para HTML (prevenção XSS)
    const escapedMessage = sanitizedMessage
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    result.isValid = true;
    result.sanitizedMessage = escapedMessage;
    return result;
};

/**
 * Função principal para envio de emails
 * @param {string} email - Endereço de email do destinatário
 * @param {string} msg - Mensagem a ser enviada
 * @param {Object} options - Opções adicionais (assunto, remetente, etc.)
 * @returns {Promise<Object>} - Resultado do envio
 */
export const sendEmail = async (email, msg, options = {}) => {
    const startTime = Date.now();
    const logPrefix = '[sendEmail]';

    try {
        console.log(`${logPrefix} Iniciando envio de email para: ${email?.substring(0, 3)}***`);

        // Validar email
        const emailValidation = validateEmail(email);
        if (!emailValidation.isValid) {
            const error = new Error(`Erro de validação de email: ${emailValidation.error}`);
            error.code = 'VALIDATION_ERROR';
            error.field = 'email';
            console.error(`${logPrefix} ${error.message}`);
            throw error;
        }

        // Validar mensagem
        const messageValidation = validateMessage(msg);
        if (!messageValidation.isValid) {
            const error = new Error(`Erro de validação de mensagem: ${messageValidation.error}`);
            error.code = 'VALIDATION_ERROR';
            error.field = 'message';
            console.error(`${logPrefix} ${error.message}`);
            throw error;
        }

        // Criar transporter
        let transporter;
        try {
            transporter = createEmailTransporter();
        } catch (transporterError) {
            const error = new Error(`Erro na configuração do email: ${transporterError.message}`);
            error.code = 'CONFIG_ERROR';
            console.error(`${logPrefix} ${error.message}`);
            throw error;
        }

        // Verificar conexão com o servidor SMTP
        try {
            await transporter.verify();
            console.log(`${logPrefix} Conexão SMTP verificada com sucesso`);
        } catch (verifyError) {
            const error = new Error(`Erro na conexão SMTP: ${verifyError.message}`);
            error.code = 'SMTP_CONNECTION_ERROR';
            console.error(`${logPrefix} ${error.message}`);
            throw error;
        }

        // Configurar opções do email
        const emailOptions = {
            from: options.from || process.env.EMAIL_USER || 'noreply@treinai.com',
            to: emailValidation.sanitizedEmail,
            subject: options.subject || 'Mensagem do TreinAI',
            text: messageValidation.sanitizedMessage,
            html: options.html || `<p>${messageValidation.sanitizedMessage}</p>`,
            // Configurações de segurança
            headers: {
                'X-Mailer': 'TreinAI-NodeMailer',
                'X-Priority': '3',
                'X-MSMail-Priority': 'Normal'
            }
        };

        // Adicionar anexos se fornecidos
        if (options.attachments && Array.isArray(options.attachments)) {
            emailOptions.attachments = options.attachments;
        }

        // Enviar email
        console.log(`${logPrefix} Enviando email...`);
        const info = await transporter.sendMail(emailOptions);

        const duration = Date.now() - startTime;
        console.log(`${logPrefix} Email enviado com sucesso em ${duration}ms. MessageId: ${info.messageId}`);

        // Retornar resultado de sucesso
        return {
            success: true,
            messageId: info.messageId,
            response: info.response,
            envelope: info.envelope,
            duration: duration,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        const duration = Date.now() - startTime;

        // Log detalhado do erro
        console.error(`${logPrefix} Erro no envio de email após ${duration}ms:`, {
            message: error.message,
            code: error.code,
            field: error.field,
            stack: error.stack
        });

        // Retornar resultado de erro estruturado
        return {
            success: false,
            error: {
                message: error.message,
                code: error.code || 'UNKNOWN_ERROR',
                field: error.field || null,
                timestamp: new Date().toISOString(),
                duration: duration
            }
        };
    }
};

/**
 * Função auxiliar para envio de emails de notificação do sistema
 * @param {string} email - Email do destinatário
 * @param {string} subject - Assunto do email
 * @param {string} message - Mensagem do email
 * @returns {Promise<Object>} - Resultado do envio
 */
export const sendNotificationEmail = async (email, subject, message) => {
    return await sendEmail(email, message, {
        subject: subject,
        from: `TreinAI Sistema <${process.env.EMAIL_USER}>`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
          ${subject}
        </h2>
        <div style="padding: 20px; background-color: #f8f9fa; border-radius: 5px;">
          <p style="color: #555; line-height: 1.6;">${message}</p>
        </div>
        <footer style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #888; font-size: 12px;">
          <p>Esta é uma mensagem automática do sistema TreinAI.</p>
          <p>Por favor, não responda a este email.</p>
        </footer>
      </div>
    `
    });
};

/**
 * Função para testar a configuração de email
 * @returns {Promise<Object>} - Resultado do teste
 */
export const testEmailConfiguration = async () => {
    const logPrefix = '[testEmailConfiguration]';

    try {
        console.log(`${logPrefix} Testando configuração de email...`);

        const transporter = createEmailTransporter();
        await transporter.verify();

        console.log(`${logPrefix} Configuração de email válida`);
        return {
            success: true,
            message: 'Configuração de email válida',
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error(`${logPrefix} Erro na configuração:`, error.message);
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
};

export default sendEmail;