import mongoose, { Schema, Document } from 'mongoose';

export interface IEventResult extends Document {
  eventId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    distance?: number;
    time: string;
    rank?: number;
    pointsEarned?: number;
    badge?: string;
    status: 'joined' | 'cancelled' | 'completed';
    reason?: string;  
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date;
    calories?: number;
    elevationGain?: string;
    rating?: number;
    notes?: string;
    photos?: string[];
}

const EventResultSchema = new Schema<IEventResult>(
    {
        eventId: { type: Schema.Types.ObjectId, ref: 'events', required: true },
        userId: { type: Schema.Types.ObjectId, ref: 'users', required: true },
        distance: { type: Number, default: null },
        time: { type: String, default: null },
        rank: { type: Number, default: null },
        pointsEarned: { type: Number, default: null },
        badge: { type: String },
        reason: { type: String, default: null },
        calories: { type: Number, default: null },
        elevationGain: { type: String, default: null },
        rating: { type: Number, default: null, min: 1, max: 5 },
        notes: { type: String, default: null },
        photos: { type: [String], default: [] },
        status: {
            type: String,
            enum: ['joined', 'cancelled', 'completed'],
            default: 'joined',
        },
    },
    { timestamps: true }
);

// Index for filtering and user-stats aggregation
EventResultSchema.index({ eventDate: 1, status: 1 });
EventResultSchema.index({ userId: 1, status: 1 });

export default mongoose.model<IEventResult>('eventResult', EventResultSchema);
