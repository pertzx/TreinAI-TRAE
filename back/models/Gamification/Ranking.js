import mongoose from 'mongoose';
import { getBrazilDate } from '../../helpers/getBrazilDate.js';

const RankingSchema = new mongoose.Schema({
    startDate: { type: Date, default: getBrazilDate },
    endDate: { type: Date, default: null },
    rankingName: { type: String, required: true },
    competitors: [{
        userId: { type: String, required: true },
        username: { type: String, required: true },
        avatar: { type: String, default: null },
        points: { type: Number, required: true },
        workouts: { type: Number, default: 0 },
        location: {
            country: { type: String, required: true },
            state: { type: String, required: true },
            city: { type: String, required: true },
        },
    }],
}, { timestamps: true });

const Ranking = mongoose.model('Ranking', RankingSchema);
export default Ranking;