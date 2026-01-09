import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
  title: string;
  description: string;
  category: 'Community Rides' | 'Family & Kids' | 'She Rides' | 'Special Rides & Campaigns' | 'Activities' | 'Tracks';
  eventType: 'Community Ride' | 'Special Ride' | 'Campaign' | 'Activity' | 'Track';
  eventDate: Date;
  eventTime: string;
  location: string;
  distance?: string;
  surface?: string;
  pace?: string;
  amenities: string[];
  eligibility: string;
  maxParticipants?: number;
  currentParticipants: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  isFree: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Event category is required'],
      enum: ['Community Rides', 'Family & Kids', 'She Rides', 'Special Rides & Campaigns', 'Activities', 'Tracks'],
    },
    eventType: {
      type: String,
      required: [true, 'Event type is required'],
      enum: ['Community Ride', 'Special Ride', 'Campaign', 'Activity', 'Track'],
    },
    eventDate: {
      type: Date,
      required: [true, 'Event date is required'],
    },
    eventTime: {
      type: String,
      required: [true, 'Event time is required'],
    },
    location: {
      type: String,
      required: [true, 'Event location is required'],
      trim: true,
    },
    distance: {
      type: String,
      trim: true,
    },
    surface: {
      type: String,
      trim: true,
    },
    pace: {
      type: String,
      trim: true,
    },
    amenities: {
      type: [String],
      default: [],
    },
    eligibility: {
      type: String,
      required: [true, 'Eligibility information is required'],
      trim: true,
    },
    maxParticipants: {
      type: Number,
      min: [1, 'Max participants must be at least 1'],
    },
    currentParticipants: {
      type: Number,
      default: 0,
      min: [0, 'Current participants cannot be negative'],
    },
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
      default: 'upcoming',
    },
    isFree: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'users',
      required: [true, 'Event creator is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Index for filtering
EventSchema.index({ eventDate: 1, status: 1 });
EventSchema.index({ category: 1 });
EventSchema.index({ eventType: 1 });

export default mongoose.model<IEvent>('events', EventSchema);

