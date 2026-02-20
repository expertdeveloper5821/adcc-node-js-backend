import mongoose, { Schema, Document } from 'mongoose';

export interface ICommunity extends Document {
  title: string;
  slug: string;
  description: string;
  type: string[];
  category: string;
  location?: 'Abu Dhabi' | 'Dubai' | 'Al Ain' | 'Sharjah';
  area?: string;
  city?: string;
  image?: string;
  logo?: string;
  gallery?: string[];
  members?: mongoose.Types.ObjectId[];
  memberCount?: number;
  trackName?: string; // For search functionality
  distance?: number; // For search functionality (in km)
  terrain?: string; // For search functionality
  isActive: boolean;
  isPublic: boolean;
  isFeatured: boolean;
  foundedYear: number;
  trackId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  manager?: string;
}

const CommunitySchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Community title is required'],
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Community description is required'],
      trim: true,
    },
    type: {
      type: [String],
      default: [],
      required: [true, 'Community-type is required'],
    },
    category: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      enum: ['Abu Dhabi', 'Dubai', 'Al Ain', 'Sharjah'],
    },
    area: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      trim: true,
    },
    logo: {
      type: String,
      trim: true,
    },
    gallery: {
      type: [String],
      default: [],
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: 'users',
      },
    ],
    memberCount: {
      type: Number,
      default: 0,
      min: [0, 'Member count cannot be negative'],
    },
    tackId: {
      type: String,
      trim: true,
    },
    manager: {
      type: String,
      trim: true,
    },
    distance: {
      type: Number,
      min: [0, 'Distance cannot be negative'],
    },
    terrain: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    trackId: {
      type: Schema.Types.ObjectId,
      ref: 'tracks',
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    foundedYear: {
      type: Number,
      default: false,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'users',
      required: [true, 'Community creator is required'],
    },
  },
  {
    timestamps: true,
  }
  
);

// Indexes for search and filtering
CommunitySchema.index({ type: 1, location: 1 });
CommunitySchema.index({ category: 1 });
CommunitySchema.index({ isActive: 1 });
CommunitySchema.index({ isPublic: 1 });
CommunitySchema.index({ isFeatured: 1 });
CommunitySchema.index({ title: 'text', description: 'text', trackName: 'text', terrain: 'text' });

// Update memberCount when members array changes
CommunitySchema.pre('save', async function () {
  this.memberCount = this.members.length;
});

export default mongoose.model<ICommunity>('communities', CommunitySchema);

