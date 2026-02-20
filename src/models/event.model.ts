import mongoose, { Schema, Document } from 'mongoose';

export interface IEventEligibility {
  helmetRequired: boolean;
  roadBikeOnly: boolean;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'all';
  gender?: 'male' | 'female' | 'other' | 'all';
}

export interface IEventSchedule {
  time: string;
  title: string;
  description?: string;
  order?: number;
}

export type IEventAmenity =
  | 'water'
  | 'parking'
  | 'toilets'
  | 'lighting'
  | 'medical support'
  | 'bike service';

export interface IEvent {
  amenities?: IEventAmenity[];
}


export interface IEvent extends Document {
  communityId: mongoose.Types.ObjectId;
  trackId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  mainImage?: string;
  eventImage?: string;
  eventDate: Date;
  eventTime: string;
  address: string;
  city?: string;
  zipCode?: string;
  maxParticipants?: number; // 0 means unlimited
  minAge?: number;
  maxAge?: number;
  distance?: number; // in kilometers
  amenities?: IEventAmenity[];
  schedule?: IEventSchedule[];
  categories?: 'Race' | 'Community Ride' | 'Training & Clinics' | 'Awareness Rides' | 'Family & Kids' | 'Corporate Events' | 'National Events';
  eligibility?: IEventEligibility;
  youtubeLink?: string;
  category?: string;
  currentParticipants: number;
  status: 'Open' | 'Draft' | 'Full' | 'Completed' | 'Archived';
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  rewards: {
    points: number;
    badgeName: string;
    badgeImage?: string;
  };
  slug?: string;
  endTime?: string;
  difficulty?: string;
}

const EventSchema = new Schema(
  {
    communityId: {
      type: Schema.Types.ObjectId,
      ref: 'communities',
      default: null,
      // required: [true, 'Community ID is required'],
    },
    trackId: {
      type: Schema.Types.ObjectId,
      ref: 'track',
      default: null,
      // required: [true, 'Track ID is required'],
    },
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
    mainImage: {
      type: String,
      trim: true,
    },
    eventImage: {
      type: String,
      trim: true,
    },
    eventDate: {
      type: Date,
      required: [true, 'Event date is required'],
    },
    eventTime: {
      type: String,
      required: [true, 'Event time is required'],
    },
    address: {
      type: String,
      required: [true, 'Event address is required'],
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    zipCode: {
      type: String,
      trim: true,
    },
    distance: {
      type: Number,
      min: [0, 'Distance cannot be negative'],
    },
    amenities: [
      {
        type: String,
        enum: ['water', 'parking', 'toilets', 'lighting', 'medical support', 'bike service' ],
      },
    ],
    schedule: [
      {
        time: { type: String, required: true },
        title: { type: String, required: true },
        description: { type: String },
        order: { type: Number },
      },
    ],
    eligibility: [
      {
        helmetRequired: { type: Boolean, default: false },
        roadBikeOnly: { type: Boolean, default: false },
        experienceLevel: {
          type: String,
          enum: ['beginner', 'intermediate', 'advanced', 'all'],
          default: 'all',
        },
        gender: {
          type: String,
          enum: ['male', 'female', 'other', 'all'],
          default: 'all',
        },
      },
    ],
    maxParticipants: {
      type: Number,
      min: [0, 'Max participants cannot be negative'],
      // 0 means unlimited
    },
    minAge: {
      type: Number,
      min: [0, 'Min age cannot be negative'],
    },
    maxAge: {
      type: Number,
      min: [0, 'Max age cannot be negative'],
    },
    youtubeLink: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    currentParticipants: {
      type: Number,
      default: 0,
      min: [0, 'Current participants cannot be negative'],
    },
    status: {
      type: String,
      enum: ['Draft', 'Open', 'Full', 'Completed', 'Archived'],
      default: 'upcoming',
    },
    difficulty: {
      type: String,
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
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

export default mongoose.model<IEvent>('events', EventSchema);
