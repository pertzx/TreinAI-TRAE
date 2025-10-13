import Joi from 'joi';

// Esquemas de validação
const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Email deve ter um formato válido',
        'any.required': 'Email é obrigatório'
    }),
    password: Joi.string().min(6).required().messages({
        'string.min': 'Senha deve ter pelo menos 6 caracteres',
        'any.required': 'Senha é obrigatória'
    }),
    identificador: Joi.string().min(2).max(100).required().messages({
        'string.min': 'Identificador deve ter pelo menos 2 caracteres',
        'string.max': 'Identificador deve ter no máximo 100 caracteres',
        'any.required': 'Identificador é obrigatório'
    }),
    systemInfo: Joi.string().required().messages({
        'any.required': 'systemInfo é obrigatório'
    }),
    location: Joi.object({
        lat: Joi.number().allow(null),
        lon: Joi.number().allow(null),
    }),
});

const signupSchema = Joi.object({
    username: Joi.string().min(2).max(50).required().messages({
        'string.min': 'Nome deve ter pelo menos 2 caracteres',
        'string.max': 'Nome deve ter no máximo 50 caracteres',
        'any.required': 'Nome é obrigatório'
    }),
    email: Joi.string().email().required().messages({
        'string.email': 'Email deve ter um formato válido',
        'any.required': 'Email é obrigatório'
    }),
    password: Joi.string()
        .min(8)
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
        .required()
        .messages({
            'string.min': 'Senha deve ter pelo menos 8 caracteres',
            'string.pattern.base': 'Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número',
            'any.required': 'Senha é obrigatória'
        }),
    plano: Joi.string().min(1).max(50).messages({
        'string.min': 'Nome deve ter pelo menos 1 caracteres',
        'string.max': 'Nome deve ter no máximo 50 caracteres',
    }),
});

const dashboardSchema = Joi.object({
    identificador: Joi.string().min(2).max(100).required().messages({
        'string.min': 'Identificador deve ter pelo menos 2 caracteres',
        'string.max': 'Identificador deve ter no máximo 100 caracteres',
        'any.required': 'Identificador é obrigatório'
    }),
    systemInfo: Joi.string().required().messages({
        'any.required': 'systemInfo é obrigatório'
    }),
    location: Joi.object({
        lat: Joi.number().allow(null),
        lon: Joi.number().allow(null),
    }).required().messages({
        'any.required': 'location é obrigatório'
    }),
});

const updateProfileSchema = Joi.object({
    name: Joi.string().min(2).max(50).optional(),
    username: Joi.string().min(2).max(50).optional(),
    email: Joi.string().email().optional(),
    age: Joi.number().integer().min(18).max(120).optional(),
    idade: Joi.number().integer().min(18).max(120).optional(),
    weight: Joi.number().positive().max(500).optional(),
    height: Joi.number().positive().max(300).optional(),
    objective: Joi.string().valid('hipertrofia', 'emagrecimento', 'condicionamento', 'saude', 'forca', 'resistencia').optional(),
    theme: Joi.string().valid('light', 'dark').optional(),
    city: Joi.string().min(2).max(100).optional(),
    state: Joi.string().min(2).max(100).optional(),
    country: Joi.string().min(2).max(100).optional(),
    genero: Joi.string().valid('masculino', 'feminino', 'outro').optional()
});

// Middleware de validação genérico
const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, { abortEarly: false });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                success: false,
                message: 'Dados de entrada inválidos',
                errors: errors
            });
        }

        next();
    };
};

// Sanitização de entrada
const sanitizeInput = (req, res, next) => {
    if (req && req.body) {
        for (const key in req.body) {
            if (typeof req.body[key] === 'string') {
                console.log(req.body[key])
                // Remove caracteres perigosos
                req.body[key] = req.body[key]
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/javascript:/gi, '')
                    .replace(/on\w+\s*=/gi, '')
                    .trim();
            }
        }
    }
    next();
};

// Middlewares específicos
export const validateLogin = validate(loginSchema);
export const validateSignup = validate(signupSchema);
export const validateDashboard = validate(dashboardSchema);
export const validateUpdateProfile = validate(updateProfileSchema);
export { sanitizeInput };