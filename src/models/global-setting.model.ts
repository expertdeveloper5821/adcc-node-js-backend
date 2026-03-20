import mongoose, { Schema, Document } from 'mongoose';

export interface IGlobalSetting extends Document {
  key: string;
  value: any;
  group?: string;
  label?: string;
  description?: string;
  active?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GlobalSettingSchema = new Schema<IGlobalSetting>(
  {
    key: {
      type: String,
      required: [true, 'Key is required'],
      trim: true,
      unique: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: [true, 'Value is required'],
    },
    group: {
      type: String,
      trim: true,
    },
    label: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

GlobalSettingSchema.index({ group: 1, key: 1 });

export default mongoose.model<IGlobalSetting>('global_settings', GlobalSettingSchema);
