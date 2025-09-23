// Middleware para automaticamente excluir campos sensíveis das consultas
import mongoose from 'mongoose';

// Campos sensíveis que devem ser sempre excluídos
const SENSITIVE_FIELDS = [
    'password',
    'senha', 
    'salt',
    'tokens',
    'secretKey',
    'apiKey',
    '__v'
];

// Função para criar seletor de exclusão
const createSecureSelect = (additionalFields = []) => {
    const fieldsToExclude = [...SENSITIVE_FIELDS, ...additionalFields];
    return fieldsToExclude.map(field => `-${field}`).join(' ');
};

// Middleware para interceptar consultas do Mongoose
const setupSecureQueries = () => {
    // Intercepta findOne
    mongoose.Query.prototype.secureSelect = function(additionalFields = []) {
        return this.select(createSecureSelect(additionalFields));
    };

    // Intercepta find
    mongoose.Query.prototype.secureFindOne = function(filter, additionalFields = []) {
        return this.findOne(filter).select(createSecureSelect(additionalFields));
    };

    // Intercepta findById
    mongoose.Query.prototype.secureFindById = function(id, additionalFields = []) {
        return this.findById(id).select(createSecureSelect(additionalFields));
    };
};

// Função helper para uso direto
export const secureUserQuery = (query, additionalFields = []) => {
    return query.select(createSecureSelect(additionalFields));
};

// Função para sanitizar objeto de usuário já carregado
export const sanitizeUser = (user, additionalFields = []) => {
    if (!user) return null;
    
    const userObj = user.toObject ? user.toObject() : user;
    const fieldsToRemove = [...SENSITIVE_FIELDS, ...additionalFields];
    
    fieldsToRemove.forEach(field => {
        delete userObj[field];
    });
    
    return userObj;
};

export { createSecureSelect, setupSecureQueries };