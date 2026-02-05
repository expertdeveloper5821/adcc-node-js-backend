import { z } from 'zod';

export const facilityEnum = z.enum([
  'water',
  'toilets',
  'parking',
  'lights',
]);

export const createTrackSchema = z
    .object({
        title: z.string().min(1, 'Track title is required'),
        description: z.string().min(1, 'Track description is required'),
        image: z.string().url('Invalid image URL'),
        city: z.string().optional(),
        address: z.string().optional(),
        zipcode: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        distance: z.number().min(0, 'Track distance is required'),
        elevation: z.string().min(0, 'Elevation gain is required'),
        type: z.enum(['loop', 'road', 'mixed', 'out-and-back', 'point-to-point'], 'Invalid track type'),
        avgtime: z.string().min(0, 'Average time is required'),
        pace: z.string().min(1, 'Pace is required'),
        facilities: z.array(facilityEnum).optional(),

    })
    .strict();

export const updateTrackSchema = z
    .object({
        title: z.string().min(1, 'Track title is required').optional(),
        description: z.string().min(1, 'Track description is required').optional(),
        image: z.string().url('Invalid image URL').optional(),
        city: z.string().optional(),
        address: z.string().optional(),
        zipcode: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        distance: z.number().min(0, 'Track distance is required').optional(),
        elevation: z.string().min(0, 'Elevation gain is required').optional(),
        type: z.enum(['loop', 'road', 'mixed', 'out-and-back', 'point-to-point'], 'Invalid track type').optional(),
        avgtime: z.string().min(0, 'Average time is required').optional(),
        pace: z.string().min(1, 'Pace is required').optional(),
        facilities: z.array(facilityEnum).optional(),
    })
    .strict();

export type CreateTrackInput = z.infer<typeof createTrackSchema>;
export type UpdateTrackInput = z.infer<typeof updateTrackSchema>;
