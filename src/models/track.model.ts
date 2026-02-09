import mongoose, { Schema, Document } from 'mongoose';


export interface ITrackFacility {
  facilities?: ('Water' | 'Toilets' | 'Parking' | 'Lights')[];
}

export interface ITrack extends Document {
  title: string;
  description: string;
  image?: string;
  city: string;
  address?: string;
  zipcode?: string;
  latitude?: number;
  longitude?: number;
  distance: number;
  elevation: string;
  type: 'loop' | 'road' | 'mixed' | 'out-and-back' | 'point-to-point';
  avgtime: string; // in minutes
  pace: string;
  facilities?: ITrackFacility[];
  createdAt?: Date;
  updatedAt?: Date;
}

const TrackSchema = new Schema(
  {
    title: { type: String, required: [true, 'Track title is required'], trim: true },
    description: { type: String, required: [true, 'Track description is required'], trim: true },
    image: { type: String, trim: true },
    city: { type: String, trim: true },
    address: { type: String, trim: true },
    zipcode: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
    trackFile: { type: String, trim: true },
    distance: { type: Number, required: [true, 'Track distance is required'], min: 0 },
    elevation: { type: String, required: [true, 'Elevation gain is required'], min: 0 },
    type: {
      type: String,
        enum: ['loop', 'road', 'out-and-back', 'point-to-point'],
        required: [true, 'Track type is required'],
    },
    avgtime: { type: String, required: [true, 'Average time is required'], min: 0 },
    pace: { type: String, required: [true, 'Pace is required'], trim: true },
    facilities: {
        type: [String],
        enum: [ 'water', 'toilets', 'parking', 'lights' ],
        default: [],
      },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'users',
      required: [true, 'Event creator is required'],
    },
  },
  { timestamps: true }
);


export default mongoose.model<ITrack>('track', TrackSchema);
