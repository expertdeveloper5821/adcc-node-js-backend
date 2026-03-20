import mongoose, { Schema, Document } from 'mongoose';

export type FeedPostStatus = 'pending' | 'approved';

export interface IFeedPost extends Document {
  title: string;
  description: string;
  status: FeedPostStatus;
  image?: string;
  reported: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FeedPostSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Post title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Post description is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved'],
      required: [true, 'Post status is required'],
      default: 'pending',
      index: true,
    },
    image: {
      type: String,
      trim: true,
    },
    reported: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'users',
      required: [true, 'Creator is required'],
      index: true,
    },
  },
  { timestamps: true }
);

FeedPostSchema.index({ status: 1, reported: 1, createdAt: -1 });

export default mongoose.model<IFeedPost>('feedPosts', FeedPostSchema);

