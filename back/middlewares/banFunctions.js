import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Profissional from '../models/Profissional.js';
import { getBrazilDate } from '../helpers/getBrazilDate.js';

// Aplica banimento ao usuário com validações, idempotência e logging
// - Valida userId
// - Se usuário já estiver banido, atualiza apenas o motivo (se necessário)
// - Define blockedAt na primeira aplicação de ban
// - Retorna objeto estruturado com status
const applyBan = async (userId, motivo) => {
    try {
        const idStr = String(userId || '').trim();
        if (!idStr || !mongoose.Types.ObjectId.isValid(idStr)) {
            console.warn('[applyBan] userId inválido ou ausente');
            return { ok: false, code: 'INVALID_USER_ID', user: null };
        }

        const reason = typeof motivo === 'string' ? motivo.trim() : '';
        const normalizedReason = reason || 'Violação de termos';

        // Buscar usuário (consulta leve)
        const user = await User.findById(idStr).select('ban blockedAt email username');
        if (!user) {
            console.warn('[applyBan] Usuário não encontrado');
            return { ok: false, code: 'USER_NOT_FOUND', user: null };
        }

        const alreadyBanned = !!user?.ban?.banned;

        if (alreadyBanned) {
            // Atualiza motivo se diferente; mantém blockedAt original
            const currentMotivo = String(user?.ban?.motivo || '');
            if (normalizedReason && normalizedReason !== currentMotivo) {
                user.ban.motivo = normalizedReason;
            }
            await user.save();
            console.info('[applyBan] Usuário já estava banido — motivo atualizado quando necessário');
            return { ok: true, code: 'ALREADY_BANNED', user };
        }

        // Primeiro ban: define flags e data de bloqueio
        user.ban = { banned: true, motivo: normalizedReason };
        user.blockedAt = getBrazilDate();
        await user.save();

        console.info(`[applyBan] Ban aplicado ao usuário ${user.username || user.email || user._id}`);
        return { ok: true, code: 'BAN_APPLIED', user };
    } catch (err) {
        console.error('[applyBan] Erro ao aplicar ban:', err?.message);
        return { ok: false, code: 'ERROR', error: err?.message };
    }
}

// Middleware verifyBan
// Verifica se o usuário tem permissão para acessar a API comparando
// os identificadores presentes no body (email/id) com os valores do token JWT
export const verifyBan = async (req, res, next) => {
    const SECRET_JWT = process.env.SECRET_JWT;

    // Logs básicos para depuração (sem vazar dados sensíveis)
    console.info(`[verifyBan] Método=${req.method} Rota=${req.originalUrl}`);

    // Coleta de identificadores de usuário na fonte adequada (body para POST/PUT, query para GET), com scan seguro e leve
    const collectUserIdentifiers = (obj, depth = 0) => {
        const emails = [];
        const ids = [];
        const profissionalIds = [];

        if (!obj || typeof obj !== 'object' || depth > 3) {
            return { emails, ids };
        }

        for (const [key, value] of Object.entries(obj)) {
            const k = String(key).toLowerCase();

            // Recursão limitada para objetos/arrays
            if (value && typeof value === 'object') {
                const nested = collectUserIdentifiers(value, depth + 1);
                emails.push(...nested.emails);
                ids.push(...nested.ids);
                profissionalIds.push(...nested.profissionalIds);
                continue;
            }

            // Normalização de valores possíveis
            const val = value != null ? String(value) : '';
            if (!val) continue;

            // Heurística para capturar emails relacionados a usuário
            // Ex.: email, userEmail, usuarioEmail
            if (k.includes('email')) {
                emails.push(val);
            }

            // Heurística para capturar ids relacionados a usuário
            // Ex.: userId, usuarioId, uid, _id, user_id
            const isUserIdKey = (
                k.includes('userid') ||
                k === 'uid' ||
                k === '_id' ||
                k === 'user_id' ||
                k.includes('usuarioid') ||
                (k === 'id' /* id genérico: só aceita se o contexto do caminho indicar usuário */)
            );

            if (isUserIdKey || (k.includes('user') && k.includes('id'))) {
                ids.push(val);
            }

            // Captura de profissionalId (id do documento na coleção de profissionais)
            const isProfIdKey = (
                k === 'profissionalid' ||
                k === 'professionalid' ||
                k === 'idprofissional' ||
                k === 'prof_id' ||
                k === 'professional_id' ||
                (k.includes('profissional') && k.includes('id')) ||
                (k.includes('professional') && k.includes('id'))
            );

            if (isProfIdKey) {
                profissionalIds.push(val);
            }
        }

        return { emails, ids, profissionalIds };
    };

    const sourceObj = req.method === 'GET' ? req.query : req.body;
    const sourceLabel = req.method === 'GET' ? 'query' : 'body';
    const { emails: bodyEmails, ids: bodyIds, profissionalIds } = collectUserIdentifiers(sourceObj);
    console.info(`[verifyBan] Fonte de identificadores: ${sourceLabel}`);

    // Extrair token de cookie httpOnly ou header Authorization
    let token = req.cookies?.authToken || req.cookies?.auth_token;
    if (!token) {
        const authHeader = req.headers['authorization'];
        token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
    }

    // Regra 1: Se faltar token → 401
    if (!token) {
        console.warn('[verifyBan] Falta de credenciais: body ou token ausente');
        return res.status(401).json({
            msg: 'Por favor, faça login no sistema primeiro',
            code: 'AUTH_REQUIRED'
        });
    }

    if (!SECRET_JWT) {
        console.error('[verifyBan] SECRET_JWT não configurado');
        return res.status(500).json({
            msg: 'Erro de configuração do servidor',
            code: 'SERVER_CONFIG_ERROR'
        });
    }

    try {
        const decoded = jwt.verify(token, SECRET_JWT);

        // Normalização de campos possíveis no token
        const tokenEmail = decoded?.email || decoded?.userEmail || '';
        const tokenId = String(decoded?.userId || decoded?.id || decoded?._id || '');

        const norm = (v) => String(v || '').trim().toLowerCase();

        // Etapa 1: match padrão usando userEmail/userId do body (exige presença para considerar match)
        const emailMatch = (bodyEmails.length > 0) && bodyEmails.every((e) => norm(e) === norm(tokenEmail));
        const idMatch = (bodyIds.length > 0) && bodyIds.every((i) => String(i).trim() === String(tokenId).trim());

        console.info(`[verifyBan] Etapa 1 (${sourceLabel}) - emailMatch=${emailMatch} idMatch=${idMatch} (emails=${bodyEmails.length} ids=${bodyIds.length})`);

        if (emailMatch || idMatch) {
            // Sucesso na etapa 1
            req.authUser = { email: tokenEmail || null, userId: tokenId || null };
            console.info('[verifyBan] Validação concluída na etapa 1 (body x token)');
            return next();
        }

        // Etapa 2: usar profissionalId do body para resolver userId e comparar com token
        let professionalMatch = false;
        if (profissionalIds && profissionalIds.length > 0) {
            try {
                // Buscar userId(s) associados aos profissionalId(s) informados (consulta enxuta)
                const uniqueProfIds = Array.from(new Set(profissionalIds.map((p) => String(p).trim())));

                // Executa em paralelo com lean e seleção de campo para eficiência
                const results = await Promise.all(uniqueProfIds.map((pid) =>
                    Profissional.findById(pid).select('userId').lean()
                ));

                const resolvedUserIds = results
                    .filter((doc) => doc && doc.userId)
                    .map((doc) => String(doc.userId).trim());

                // Se algum profissionalId não existir ou não tiver userId, considerar mismatch
                if (resolvedUserIds.length !== uniqueProfIds.length) {
                    professionalMatch = false;
                } else {
                    // Qualquer userId resolvido que corresponda ao tokenId é suficiente
                    professionalMatch = resolvedUserIds.some((u) => String(u).trim() === String(tokenId).trim());
                }
            } catch (e) {
                console.warn('[verifyBan] Erro ao resolver profissionalId -> userId:', e?.message);
                professionalMatch = false;
            }
        }

        console.info(`[verifyBan] Resultado etapa 2 - professionalMatch=${professionalMatch}`);

        if (professionalMatch) {
            req.authUser = { email: tokenEmail || null, userId: tokenId || null };
            console.info('[verifyBan] Validação concluída na etapa 2 (profissionalId x token)');
            return next();
        }

        // Não houve match em nenhuma etapa → proteção contra exploração
        console.warn('[verifyBan] Mismatch após todas as verificações: possíveis dados de exploração');

        applyBan(tokenId, 'Mismatch após todas as verificações: possíveis dados de exploração');
        return res.status(403).json({
            msg: 'Acesso não autorizado - possível tentativa de exploração',
            code: 'FORBIDDEN_MISMATCH',
            // Detalhes apenas em desenvolvimento para depuração
            details: process.env.NODE_ENV === 'development' ? {
                bodyEmails,
                bodyIds,
                profissionalIds,
                tokenEmail,
                tokenId
            } : undefined
        });

    } catch (err) {
        console.error('[verifyBan] Erro na verificação do token:', err?.message);
        return res.status(403).json({
            msg: 'Token inválido ou expirado',
            code: 'TOKEN_INVALID',
            error: process.env.NODE_ENV === 'development' ? err?.message : undefined
        });
    }
};
