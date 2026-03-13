import mongoose, { Schema, Document } from 'mongoose';

export interface IRefreshToken {
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface IUserStats {
  totalDistanceKm: number;
  totalRides: number;
  totalEventsParticipated: number;
  totalPoints: number;
  completedCount: number;
}

export interface IUser extends Document {
  fullName: string;
  firebaseUid: string;
  phone?: string;
  email?: string;
  profileImage?: string;
  gender: 'Male' | 'Female';
  age?: number;
  dob?: Date;
  country?: string;
  provider: string;
  role: 'Admin' | 'Vendor' | 'Member' | 'Guest';
  isVerified: boolean;
  refreshTokens: IRefreshToken[];
  stats?: IUserStats;
  createdAt: Date;
  updatedAt: Date;
}

// Add to user.model.ts
export interface IGuestSession extends Document {
  sessionId: string;
  actions: string[]; // Track what guest did
  expiresAt: Date;
}

const RefreshTokenSchema = new Schema({
  token: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const UserSchema = new Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    firebaseUid: {
      type: String,
      required: [true, 'Firebase UID is required'],
      unique: true,
      index: true,
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    profileImage: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      required: [true, 'Gender is required'],
      enum: ['Male', 'Female'],
    },
    age: {
      type: Number,
      min: [0, 'Age cannot be negative'],
      max: [150, 'Age must be realistic'],
    },
    dob: {
      type: Date,
    },
    country: {
      type: String,
      trim: true,
    },
    provider: {
      type: String,
      required: [true, 'Provider is required'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['Admin', 'Vendor', 'Member'],
      default: 'Member',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    refreshTokens: [RefreshTokenSchema],
    stats: {
      totalDistanceKm: { type: Number, default: 0 },
      totalRides: { type: Number, default: 0 },
      totalEventsParticipated: { type: Number, default: 0 },
      totalPoints: { type: Number, default: 0 },
      completedCount: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUser>('users', UserSchema);

