import User from '../models/User.js'
import { isCourtesyUser } from '../helpers/planAccess.js'

export const imageAuthGuard = async (req, res, next) => {
  try {
    const cookieToken = req.cookies?.authToken || req.cookies?.auth_token
    if (!cookieToken) {
      return res.status(401).json({ success: false, message: 'Usuário não autenticado (cookie ausente)' })
    }

    const email = String(req.userEmail || '').toLowerCase()
    if (!email) {
      return res.status(401).json({ success: false, message: 'Token inválido ou ausente' })
    }

    const user = await User.findOne({ email }).lean()
    if (!user) {
      return res.status(401).json({ success: false, message: 'Usuário não encontrado' })
    }
    if (user?.ban?.banned) {
      return res.status(403).json({ success: false, message: 'Usuário banido' })
    }
    if (user?.planInfos?.status === 'inativo' && !isCourtesyUser(user)) {
      return res.status(403).json({ success: false, message: 'Plano inativo' })
    }

    req.userRecord = user
    next()
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Erro na validação de acesso' })
  }
}
