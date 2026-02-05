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
        status: {
            type: String,
            enum: ['joined', 'cancelled', 'completed'],
            default: 'joined',
        },
    },
    { timestamps: true }
);

// Index for filtering
EventResultSchema.index({ eventDate: 1, status: 1 });

export default mongoose.model<IEventResult>('eventResult', EventResultSchema);
