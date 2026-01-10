import GlobalEvent from '../models/GlobalEvent.js';
import User from '../models/User.js';

// Helper to check admin
const checkAdminRole = async (adminId) => {
  if (!adminId) return false;
  const user = await User.findById(adminId);
  return user && user.role === 'admin';
};

// Admin Methods

export const createEvent = async (req, res) => {
  try {
    const { title, code, active, startDate, endDate, adminId } = req.body;
    
    if (!await checkAdminRole(adminId)) {
      return res.status(403).json({ message: 'Acesso negado. Apenas administradores.' });
    }

    const event = new GlobalEvent({
      title,
      code,
      active: active || false,
      startDate,
      endDate,
      createdBy: adminId
    });

    await event.save();
    res.status(201).json({ message: 'Evento criado com sucesso', event });
  } catch (error) {
    console.error('Erro ao criar evento:', error);
    res.status(500).json({ message: 'Erro ao criar evento', error: error.message });
  }
};

export const getEvents = async (req, res) => {
  try {
    const { adminId } = req.query;
    if (!await checkAdminRole(adminId)) {
      return res.status(403).json({ message: 'Acesso negado.' });
    }

    const events = await GlobalEvent.find().sort({ createdAt: -1 });
    res.status(200).json(events);
  } catch (error) {
    console.error('Erro ao buscar eventos:', error);
    res.status(500).json({ message: 'Erro ao buscar eventos', error: error.message });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, code, active, startDate, endDate, adminId } = req.body;

    if (!await checkAdminRole(adminId)) {
      return res.status(403).json({ message: 'Acesso negado.' });
    }

    const event = await GlobalEvent.findByIdAndUpdate(
      id,
      { title, code, active, startDate, endDate },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ message: 'Evento não encontrado' });
    }

    res.status(200).json({ message: 'Evento atualizado', event });
  } catch (error) {
    console.error('Erro ao atualizar evento:', error);
    res.status(500).json({ message: 'Erro ao atualizar evento', error: error.message });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.query; // Delete usually uses query or body? Express supports body in delete but typically query.
    
    // Check adminId from query or body
    const admId = adminId || req.body.adminId;

    if (!await checkAdminRole(admId)) {
      return res.status(403).json({ message: 'Acesso negado.' });
    }

    await GlobalEvent.findByIdAndDelete(id);
    res.status(200).json({ message: 'Evento removido com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar evento:', error);
    res.status(500).json({ message: 'Erro ao deletar evento', error: error.message });
  }
};

// Public/User Method
export const getActiveEvent = async (req, res) => {
  try {
    const now = new Date();
    // Find active event where now is between start and end (if they exist)
    // Or just active if dates are null
    const event = await GlobalEvent.findOne({
      active: true,
      $or: [
        { startDate: { $exists: false } },
        { startDate: { $lte: now } }
      ],
      $and: [
        { $or: [{ endDate: { $exists: false } }, { endDate: { $gte: now } }] }
      ]
    }).sort({ updatedAt: -1 }); // Get the most recently updated active event

    res.status(200).json(event);
  } catch (error) {
    console.error('Erro ao buscar evento ativo:', error);
    res.status(500).json({ message: 'Erro ao buscar evento ativo', error: error.message });
  }
};
