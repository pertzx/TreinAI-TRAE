import Profissional from '../models/Profissional.js';
import Local from '../models/Local.js';
import InteractionLog from '../models/InteractionLog.js';
import Ticket from '../models/Ticket.js';
import crypto from 'crypto';

export const registerInteraction = async (req, res) => {
  try {
    const { targetId, type, targetModel } = req.body;
    
    // Validação básica
    if (!targetId || !type || !['impression', 'click'].includes(type) || !['Profissional', 'Local'].includes(targetModel)) {
      return res.status(400).json({ success: false, msg: "Dados inválidos." });
    }

    const userId = req.authUser?.userId || 'anonymous';
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    
    // Gerar Hash de Idempotência (Anti-Exploit)
    // Limita 1 interação do mesmo tipo por usuário/IP para o mesmo alvo a cada 1 hora
    const currentHour = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
    const hashString = `${userId}-${ip}-${targetId}-${type}-${currentHour}`;
    const hash = crypto.createHash('md5').update(hashString).digest('hex');

    // Tentar criar Ticket de controle
    try {
      await Ticket.create({
        valor: hash,
        type: type,
        targetId: targetId,
        userId: userId !== 'anonymous' ? userId : null,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hora de retenção para o bloqueio
      });
    } catch (err) {
      if (err.code === 11000) {
        // Duplicado = Já contou nesta hora
        return res.status(200).json({ success: true, msg: "Interação já registrada recentemente." });
      }
      throw err;
    }

    // Se passou, incrementa no model principal
    const updateField = type === 'impression' ? 'estatisticas.impressoes' : 'estatisticas.cliques';
    
    if (targetModel === 'Profissional') {
      // Tenta buscar por _id, userId ou profissionalId
      await Profissional.findOneAndUpdate(
        { $or: [{ _id: targetId }, { userId: targetId }, { profissionalId: targetId }] },
        { $inc: { [updateField]: 1 } }
      );
    } else if (targetModel === 'Local') {
      await Local.findOneAndUpdate(
        { $or: [{ _id: targetId }, { localId: targetId }] },
        { $inc: { [updateField]: 1 } }
      );
    }

    // Registra Log detalhado para histórico (sem restrição de unique, mas controlado pelo Ticket acima)
    await InteractionLog.create({
      type,
      targetId,
      targetModel,
      userId: userId !== 'anonymous' ? userId : null,
      ip: ip, // Atenção com GDPR/LGPD: em produção real, anonimizar
      metadata: {
        userAgent: req.headers['user-agent']
      }
    });

    return res.status(200).json({ success: true, msg: "Interação registrada." });

  } catch (error) {
    console.error("Erro ao registrar interação:", error);
    // Não retornar erro 500 para não quebrar o client, apenas logar
    return res.status(200).json({ success: false, msg: "Erro interno (ignorado)." });
  }
};
