import { z } from 'zod';
import mongoose from 'mongoose';

const objectIdSchema = z.string().refine(
  (val) => mongoose.Types.ObjectId.isValid(val),
  { message: 'Invalid MongoDB ObjectId' }
);

const optionalObjectIdSchema = z.preprocess(
  (val) => {
    if (val === null || val === undefined) return undefined;
    if (typeof val === 'string') {
      const normalized = val.trim().toLowerCase();
      if (!normalized || normalized === 'null' || normalized === 'undefined') {
        return undefined;
      }
      return val;
    }
    return val;
  },
  objectIdSchema.optional()
);

export const createEventSchema = z
  .object({
    title: z.string().min(1, 'Event title is required'),
    titleAr: z.string().min(1, 'Arabic event title is required').optional(),
    description: z.string().min(1, 'Event description is required'),
    descriptionAr: z.string().min(1, 'Arabic event description is required').optional(),
    mainImage: z.string().optional(),
    eventImage: z.string().optional(),
    eventDate: z.string().or(z.date()).refine(
      (val) => {
        const date = val instanceof Date ? val : new Date(val);
        return !isNaN(date.getTime());
      },
      { message: 'Invalid event date' }
    ),
    eventTime: z.string().min(1, 'Event time is required'),
    address: z.string().min(1, 'Event address is required'),
    addressAr: z.string().min(1, 'Arabic event address is required').optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    zipCode: z.string().optional(),
    maxParticipants: z.number().int().min(0, 'Max participants cannot be negative').optional(),
    minAge: z.number().int().min(0, 'Min age cannot be negative').optional(),
    maxAge: z.number().int().min(0, 'Max age cannot be negative').optional(),
    youtubeLink: z.string().url('Invalid YouTube URL').optional().or(z.literal('')),
    distance: z.number().min(0, 'Distance cannot be negative').optional(),
    communityId: optionalObjectIdSchema,
    trackId: optionalObjectIdSchema,
    amenities: z
      .array(
        z.enum({
          'water': 'water',
          'toilets': 'toilets',
          'parking': 'parking',
          'lighting': 'lighting',
          'medical support': 'medical support',
          'bike service': 'bike service',
        })
      )
      .optional(),
    schedule: z
      .array(
        z.object({
          time: z.string(),
          title:z.string(),
          titleAr: z.string().optional(),
          description: z.string().optional(),
          descriptionAr: z.string().optional(),
          order: z.number().optional(),
        })
      )
      .optional(),
    eligibility: z
      .object({
        helmetRequired: z.boolean().optional(),
        roadBikeOnly: z.boolean().optional(),
        experinceLevel: z.enum(['beginner', 'intermediate', 'advanced', 'all']).optional(),
        gender: z.enum(['male', 'female', 'other', 'all']).optional()
      })
      .optional(),

    status: z.enum(['Draft', 'Open', 'Full', 'Completed', 'Archived']).default('Draft'),
    slug: z.string().optional(),
    difficulty: z.string().optional(),
    endTime: z.string().optional(),
    category: z.string().optional(),
    isFeatured: z.boolean().default(false),
    allowCancellation: z.boolean().default(false),
    galleryImages: z.array(z.string()).optional().default([])
  })
  .strict();

export const updateEventSchema = z
  .object({
    title: z.string().min(1, 'Event title is required').optional(),
    titleAr: z.string().min(1, 'Arabic event title is required').optional(),
    description: z.string().min(1, 'Event description is required').optional(),
    descriptionAr: z.string().min(1, 'Arabic event description is required').optional(),
    mainImage: z.string().optional(),
    eventImage: z.string().optional(),
    eventDate: z
      .string()
      .or(z.date())
      .refine(
        (val) => {
          const date = val instanceof Date ? val : new Date(val);
          return !isNaN(date.getTime());
        },
        { message: 'Invalid event date' }
      )
      .optional(),
    eventTime: z.string().min(1, 'Event time is required').optional(),
    address: z.string().min(1, 'Event address is required').optional(),
    addressAr: z.string().min(1, 'Arabic event address is required').optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    zipCode: z.string().optional(),
    maxParticipants: z.number().int().min(0, 'Max participants cannot be negative').optional(),
    minAge: z.number().int().min(0, 'Min age cannot be negative').optional(),
    maxAge: z.number().int().min(0, 'Max age cannot be negative').optional(),
    youtubeLink: z.string().url('Invalid YouTube URL').optional().or(z.literal('')),
    status: z.enum(['Draft', 'Open', 'Full', 'Completed', 'Archived']).optional(),
    distance: z.number().min(0, 'Distance cannot be negative').optional(),
    communityId: optionalObjectIdSchema,
    trackId: optionalObjectIdSchema,
    amenities: z
      .array(
        z.enum({
          'water': 'water',
          'parking': 'parking',
          'toilets': 'toilets',
          'medical': 'medical',
          'lighting': 'lighting',
          'medical support': 'medical support',
          'bike service': 'bike service',
        })
      )
      .optional(),
    schedule: z
      .array(
        z.object({
          time: z.string(),
          title:z.string(),
          titleAr: z.string().optional(),
          description: z.string().optional(),
          descriptionAr: z.string().optional(),
          order: z.number().optional(),
        })
      )
      .optional(),
    eligibility: z
      .object({
        helmetRequired: z.boolean().optional(),
        roadBikeOnly: z.boolean().optional(),
        experinceLevel: z.enum(['beginner', 'intermediate', 'advanced', 'all']).optional(),
        gender: z.enum(['male', 'female', 'other', 'all']).optional()
      })
      .optional(),
    slug: z.string().optional(),
    difficulty: z.string().optional(),
    endTime: z.string().optional(),
    category: z.string().optional(),
    isFeatured: z.boolean().default(false),
    allowCancellation: z.boolean().default(false),
    galleryImages: z.array(z.string()).optional()

  })
  .strict();

export const getEventsQuerySchema = z.object({
  status: z.enum(['Draft', 'Open', 'Full', 'Completed', 'Archived']).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type GetEventsQueryInput = z.infer<typeof getEventsQuerySchema>;
