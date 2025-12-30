import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { getBrazilDate } from '../helpers/getBrazilDate.js';

const { Schema } = mongoose;

const ChatSchema = new Schema({
    ChatName: { type: String, required: true },
    ChatId: { type: String, default: uuidv4 },
    criadoEm: { type: Date, default: getBrazilDate },
    ChatDesc: { type: String, required: true },
    pairId: { type: String, default: null },
    membros: [
        {
            userId: { type: String, required: true },
            username: { type: String, required: true },
            membroDesde: { type: Date, default: getBrazilDate },
        },
    ],
    mensagens: [
        {
            userId: { type: String, required: true },
            mensagemId: { type: String, default: uuidv4},
            conteudo: { type: String, required: true },
            tipo: { type: String, enum: ['texto', 'imagem', 'arquivo', 'audio', 'video'], default: 'texto' },
            anexos: [{
                nome: String,
                url: String,
                tipo: String,
                tamanho: Number
            }],
            vistos: [{
                userId: { type: String, required: true },
                vistoEm: { type: Date, default: getBrazilDate }
            }],
            editado: { type: Boolean, default: false },
            editadoEm: Date,
            historicoEdicoes: [{
                conteudo: { type: String, required: true },
                editadoEm: { type: Date, default: getBrazilDate },
                userId: { type: String, required: true }
            }],
            respondendoA: {
                mensagemId: String,
                conteudo: String,
                userId: String
            },
            publicadoEm: {type: Date, default: getBrazilDate}
        }
    ],
    reports: [
        {
            userId: { type: String, required: true },
            username: { type: String, required: true },
            explanation: { type: String, required: true },
            criadoEm: { type: Date, default: getBrazilDate },
        }
    ],
    configuracoes: {
        notificacoes: { type: Boolean, default: true },
        arquivado: { type: Boolean, default: false },
        fixado: { type: Boolean, default: false }
    },
    typingStatus: [
        {
            userId: { type: String, required: true },
            username: { type: String },
            startedAt: { type: Date, default: getBrazilDate }
        }
    ]
});

// índice único parcial para pairId (só aplica quando pairId existe)
ChatSchema.index(
  { pairId: 1 },
  { unique: true, partialFilterExpression: { pairId: { $exists: true, $ne: null } } }
);

// Índices para performance
ChatSchema.index({ 'membros.userId': 1 });
ChatSchema.index({ 'mensagens.mensagemId': 1 });
ChatSchema.index({ criadoEm: -1 });

const Chat = mongoose.model('Chat', ChatSchema, 'Chats');

export default Chat;
