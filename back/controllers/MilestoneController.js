import MilestoneTrigger from '../models/MilestoneTrigger.js';
import User from '../models/User.js';

const ensureAdmin = async (adminId) => {
  if (!adminId) return null;
  const u = await User.findById(adminId);
  return (u && u.role === 'admin') ? u : null;
};

/** Público: gatilhos ativos (para exibição, se necessário). */
export const getPublicMilestones = async (_req, res) => {
  try {
    const milestones = await MilestoneTrigger.find({ active: true })
      .select('key type value title message emoji sortOrder -_id')
      .sort({ sortOrder: 1 })
      .lean();
    return res.status(200).json({ success: true, milestones });
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Erro ao buscar conquistas.', error: error.message });
  }
};

/** Admin: lista todos os gatilhos. */
export const getAdminMilestones = async (req, res) => {
  try {
    const admin = await ensureAdmin(req.body.adminId);
    if (!admin) return res.status(403).json({ success: false, message: 'Acesso negado.' });
    const milestones = await MilestoneTrigger.find({}).sort({ sortOrder: 1 }).lean();
    return res.status(200).json({ success: true, milestones });
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Erro ao buscar conquistas.', error: error.message });
  }
};

const applyFields = (doc, b) => {
  if (b.type != null) doc.type = String(b.type);
  if (b.value != null) doc.value = Number(b.value) || 0;
  if (b.title != null) doc.title = String(b.title);
  if (b.message != null) doc.message = String(b.message);
  if (b.emoji != null) doc.emoji = String(b.emoji);
  if (b.active != null) doc.active = !!b.active;
  if (b.sortOrder != null) doc.sortOrder = Number(b.sortOrder) || 0;
};

/** Admin: cria um gatilho. */
export const createMilestone = async (req, res) => {
  try {
    const admin = await ensureAdmin(req.body.adminId);
    if (!admin) return res.status(403).json({ success: false, message: 'Acesso negado.' });
    const { key, type, title } = req.body;
    if (!key || !type || !title) return res.status(400).json({ success: false, msg: 'key, type e title são obrigatórios.' });
    const exists = await MilestoneTrigger.findOne({ key });
    if (exists) return res.status(409).json({ success: false, msg: 'Já existe um gatilho com essa key.' });
    const doc = new MilestoneTrigger({ key: String(key), type: String(type), title: String(title) });
    applyFields(doc, req.body);
    await doc.save();
    return res.status(201).json({ success: true, milestone: doc, msg: 'Conquista criada.' });
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Erro ao criar conquista.', error: error.message });
  }
};

/** Admin: atualiza um gatilho por key. */
export const updateMilestone = async (req, res) => {
  try {
    const admin = await ensureAdmin(req.body.adminId);
    if (!admin) return res.status(403).json({ success: false, message: 'Acesso negado.' });
    const { key } = req.body;
    if (!key) return res.status(400).json({ success: false, msg: 'key é obrigatória.' });
    const doc = await MilestoneTrigger.findOne({ key });
    if (!doc) return res.status(404).json({ success: false, msg: 'Conquista não encontrada.' });
    applyFields(doc, req.body);
    await doc.save();
    return res.status(200).json({ success: true, milestone: doc, msg: 'Conquista atualizada.' });
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Erro ao atualizar conquista.', error: error.message });
  }
};

/** Admin: remove um gatilho por key. */
export const deleteMilestone = async (req, res) => {
  try {
    const admin = await ensureAdmin(req.body.adminId);
    if (!admin) return res.status(403).json({ success: false, message: 'Acesso negado.' });
    const { key } = req.body;
    if (!key) return res.status(400).json({ success: false, msg: 'key é obrigatória.' });
    await MilestoneTrigger.deleteOne({ key });
    return res.status(200).json({ success: true, msg: 'Conquista removida.' });
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Erro ao remover conquista.', error: error.message });
  }
};
