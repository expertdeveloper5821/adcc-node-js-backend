import mongoose, { Schema, Document } from 'mongoose';

export interface IRefreshToken {
  token: string;
  expiresAt: Date;
  deviceId?: string;
  createdAt: Date;
}

export interface IUser extends Document {
  name: string;
  phone: string;
  age: number;
  isVerified: boolean;
  refreshTokens: IRefreshToken[];
  createdAt: Date;
  updatedAt: Date;
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
  deviceId: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
    },
    age: {
      type: Number,
      required: [true, 'Age is required'],
      min: [1, 'Age must be at least 1'],
      max: [120, 'Age must be at most 120'],
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

