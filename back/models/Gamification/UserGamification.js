import mongoose from 'mongoose';
import { getBrazilDate } from '../helpers/getBrazilDate';

const UserGamificationSchema = new mongoose.Schema({
    streak: { type: Number, default: 0 },
    workouts: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    userId: { type: String, required: true },
    location: {
        country: { type: String, required: true },
        state: { type: String, required: true },
        city: { type: String, required: true },
    },
    lastWorkoutDate: [{ type: Date, default: null }]
}, { timestamps: true });

const UserGamification = mongoose.model('UserGamification', UserGamificationSchema);
export default UserGamification;