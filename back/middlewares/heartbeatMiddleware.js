import { getBrazilDate } from '../helpers/getBrazilDate.js';
import User from '../models/User.js';

const HEARTBEAT_ROUTES = [
  '/dashboard',
  '/atualizar-perfil',
  '/complete-onboarding',
  '/criar-meusTreinos',
  '/atualizar-meusTreinos',
  '/pegar-user',
  '/pegarChats',
  '/pegarChat',
  '/enviar-mensagem',
  '/conversar',
  '/conversar-nutri',
  '/gerar-exercicio-ia',
  '/gerar-treino-ia',
  '/anamnese/salvar',
  '/anamnese',
  '/aluno/anamnese',
  '/aluno/salvar-nota',
  '/aluno/get-nota',
];

const isHeartbeatRoute = (path) => {
  return HEARTBEAT_ROUTES.some(route => path.startsWith(route));
};

export const heartbeatMiddleware = async (req, res, next) => {
  if (!req.userEmail || !isHeartbeatRoute(req.path)) {
    return next();
  }

  try {
    await User.findOneAndUpdate(
      { email: req.userEmail },
      {
        $set: {
          isOnline: true,
          lastActive: getBrazilDate()
        }
      }
    );
  } catch (error) {
    console.error('Heartbeat middleware error:', error);
  }

  next();
};

export const getUserHeartbeat = async (userId) => {
  const user = await User.findById(userId).select('isOnline lastActive username email role').lean();
  if (!user) return null;
  
  const now = getBrazilDate();
  const lastActive = user.lastActive ? new Date(user.lastActive) : null;
  const secondsSinceActive = lastActive ? Math.floor((now - lastActive) / 1000) : null;
  const isOnline = secondsSinceActive !== null && secondsSinceActive <= 15;
  
  return {
    userId: String(user._id),
    username: user.username,
    email: user.email,
    role: user.role,
    isOnline,
    lastActive: user.lastActive,
    secondsSinceActive
  };
};

export const getAllUsersHeartbeat = async () => {
  const users = await User.find({}, 'isOnline lastActive username email role').lean();
  const now = getBrazilDate();
  
  return users.map(user => {
    const lastActive = user.lastActive ? new Date(user.lastActive) : null;
    const secondsSinceActive = lastActive ? Math.floor((now - lastActive) / 1000) : null;
    const isOnline = secondsSinceActive !== null && secondsSinceActive <= 15;
    
    return {
      userId: String(user._id),
      username: user.username,
      email: user.email,
      role: user.role,
      isOnline,
      lastActive: user.lastActive,
      secondsSinceActive
    };
  });
};