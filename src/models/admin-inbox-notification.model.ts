import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Per-admin inbox items (header notification list), persisted server-side.
 */
export interface IAdminInboxNotification extends Document {
  recipientUserId: Types.ObjectId;
  title: string;
  body: string;
  url?: string;
  read: boolean;
  relatedCampaignId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AdminInboxNotificationSchema = new Schema(
  {
    recipientUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    url: { type: String, trim: true },
    read: { type: Boolean, default: false, index: true },
    relatedCampaignId: {
      type: Schema.Types.ObjectId,
      ref: 'PushNotificationCampaign',
      default: null,
    },
  },
  { timestamps: true }
);

AdminInboxNotificationSchema.index({ recipientUserId: 1, createdAt: -1 });

export default mongoose.model<IAdminInboxNotification>(
  'AdminInboxNotification',
  AdminInboxNotificationSchema
);
