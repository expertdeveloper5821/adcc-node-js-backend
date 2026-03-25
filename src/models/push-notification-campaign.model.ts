import mongoose, { Schema, Document, Types } from 'mongoose';

export type PushCampaignStatus =
  | 'scheduled'
  | 'sending'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface IPushNotificationCampaign extends Document {
  title: string;
  body: string;
  url?: string;
  audienceType: string;
  /** When the push should be sent; null means send immediately on create */
  scheduledAt?: Date | null;
  status: PushCampaignStatus;
  sentAt?: Date;
  successCount?: number;
  failureCount?: number;
  invalidTokensRemoved?: number;
  lastError?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PushNotificationCampaignSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    url: { type: String, trim: true },
    audienceType: { type: String, required: true, trim: true },
    scheduledAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['scheduled', 'sending', 'completed', 'failed', 'cancelled'],
      required: true,
    },
    sentAt: { type: Date },
    successCount: { type: Number },
    failureCount: { type: Number },
    invalidTokensRemoved: { type: Number },
    lastError: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

PushNotificationCampaignSchema.index({ status: 1, scheduledAt: 1 });

export default mongoose.model<IPushNotificationCampaign>(
  'PushNotificationCampaign',
  PushNotificationCampaignSchema
);
