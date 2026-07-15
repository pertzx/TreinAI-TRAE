import jwt from 'jsonwebtoken';

const SECRET_JWT = process.env.SECRET_JWT;

// Validação obrigatória da chave JWT
if (!SECRET_JWT) {
    throw new Error('SECRET_JWT environment variable is required and must be set');
}

export const verificarToken = (req, res, next) => {

    // Primeiro tenta pegar do cookie httpOnly
    let token = req.cookies?.authToken || req.cookies?.auth_token;
    
    // Fallback para header Authorization (compatibilidade temporária)
    if (!token) {
        const authHeader = req.headers['authorization'];
        token = authHeader && authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        msg: "Token não fornecido!",
        code: 'AUTH_INVALID'
      });
    }

    jwt.verify(token, SECRET_JWT, (err, decoded) => {
        if (err) {
            console.error('Token verification error:', err);
            return res.status(403).json({
                msg: "Token inválido ou expirado!",
                code: 'AUTH_INVALID',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
        
        req.userEmail = decoded.email;
        // Popula req.user a partir do payload do JWT ({ email, userId }).
        // Vários consumidores (tokenRoutes, authRoutes, AdminController, middlewares
        // de autorização) dependem de req.user — sem isto eles quebram.
        req.user = {
            id: decoded.userId ? String(decoded.userId) : undefined,
            _id: decoded.userId,
            email: decoded.email,
        };
        next();
    });
};

// Alias para compatibilidade
export const authenticateToken = verificarToken;
