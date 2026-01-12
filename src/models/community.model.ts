import mongoose, { Schema, Document } from 'mongoose';

export interface ICommunity extends Document {
  title: string;
  description: string;
  type: 'city' | 'group' | 'awareness';
  category: 'Social' | 'Race' | 'Family' | 'Awareness' | 'Partner' | 'Other';
  location?: 'Abu Dhabi' | 'Al Ain' | 'Western Region';
  image?: string;
  members: mongoose.Types.ObjectId[];
  memberCount: number;
  trackName?: string; // For search functionality
  distance?: number; // For search functionality (in km)
  terrain?: string; // For search functionality
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CommunitySchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Community title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Community description is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['city', 'group', 'awareness'],
      required: [true, 'Community type is required'],
    },
    category: {
      type: String,
      enum: ['Social', 'Race', 'Family', 'Awareness', 'Partner', 'Other'],
      required: [true, 'Community category is required'],
    },
    location: {
      type: String,
      enum: ['Abu Dhabi', 'Al Ain', 'Western Region'],
    },
    image: {
      type: String,
      trim: true,
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
    trackName: {
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
CommunitySchema.index({ title: 'text', description: 'text', trackName: 'text', terrain: 'text' });

// Update memberCount when members array changes
CommunitySchema.pre('save', async function () {
  this.memberCount = this.members.length;
});

export default mongoose.model<ICommunity>('communities', CommunitySchema);

