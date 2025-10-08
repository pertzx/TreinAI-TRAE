import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { getBrazilDate } from '../helpers/getBrazilDate.js';

const { Schema } = mongoose;

const TicketSchema = new Schema({
  valor: { type: String, default: uuidv4 },
  criadoEm: { type: Date, default: getBrazilDate }
});


const Ticket = mongoose.model('Ticket', TicketSchema, 'Tickets');

export default Ticket;