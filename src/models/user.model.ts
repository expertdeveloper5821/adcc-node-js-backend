import mongoose, { Schema, Document } from 'mongoose';

export interface IRefreshToken {
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface IUser extends Document {
  fullName: string;
  firebaseUid: string;
  phone?: string;
  email?: string;
  gender: 'Male' | 'Female';
  age: number;
  role: 'Admin' | 'Vendor' | 'Member' | 'Guest';
  isVerified: boolean;
  refreshTokens: IRefreshToken[];
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
    gender: {
      type: String,
      required: [true, 'Gender is required'],
      enum: ['Male', 'Female'],
    },
    age: {
      type: Number,
      required: [true, 'Age is required'],
      min: [0, 'Age cannot be negative'],
      max: [150, 'Age must be realistic'],
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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUser>('users', UserSchema);

