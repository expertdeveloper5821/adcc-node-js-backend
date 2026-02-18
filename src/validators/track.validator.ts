import { z } from 'zod';

export const facilityEnum = z.enum([
  'water',
  'toilets',
  'parking',
  'lights',
  'cafes',
  'bikeRental',
  'firstAid',
  'changingRooms',
]);

export const createTrackSchema = z
    .object({
        title: z.string().min(1, 'Track title is required'),
        description: z.string().min(1, 'Track description is required'),
        image: z.string().optional(),
        city: z.string().optional(),
        address: z.string().optional(),
        zipcode: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        distance: z.number().min(0, 'Track distance is required'),
        elevation: z.string().min(0, 'Elevation gain is required'),
        trackType: z.enum(['circuit', 'road', 'costal', 'desert', 'urban'], 'Invalid track type'),
        avgtime: z.string().min(0, 'Average time is required'),
        pace: z.string().min(1, 'Pace is required'),
        facilities: z.array(facilityEnum).optional(),
        status: z.enum(['open', 'limited', 'closed'], 'Invalid status type'),
        difficulty: z.string().optional(),
        category: z.string().optional(),
        surfaceType: z.string().optional(),
        nightRidingAllowed: z.boolean().optional(),
        helmetRequired: z.boolean().optional(),
        mapPreview: z.string().optional(),
        estimatedTime: z.string().optional(),
        loopOptions: z.array(z.number()).optional(),
        displayPriority: z.number('Priority type required').optional(),
        area: z.string().optional(),
        slug: z.string().optional(),
        country: z.string().optional(),
        safetyNotes: z.string().optional(),

    })
    .strict();

export const updateTrackSchema = z
    .object({
        title: z.string().min(1, 'Track title is required').optional(),
        description: z.string().min(1, 'Track description is required').optional(),
        image: z.string().optional(),
        city: z.string().optional(),
        address: z.string().optional(),
        zipcode: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        distance: z.number().min(0, 'Track distance is required').optional(),
        elevation: z.string().min(0, 'Elevation gain is required').optional(),
        trackType: z.enum(['circuit', 'road', 'costal', 'desert', 'urban'], 'Invalid track type').optional(),
        avgtime: z.string().min(0, 'Average time is required').optional(),
        pace: z.string().min(1, 'Pace is required').optional(),
        facilities: z.array(facilityEnum).optional(),
        status: z.enum(['open', 'limited', 'closed'], 'Invalid status type'),
        difficulty: z.string().optional(),
        category: z.string().optional(),
        surfaceType: z.string().optional(),
        nightRidingAllowed: z.boolean().optional(),
        mapPreview: z.string().optional(),
        estimatedTime: z.string().optional(),
        loopOptions: z.array(z.number()).optional(),
        displayPriority: z.number('Priority type required').optional(),
        area: z.string().optional(),
        slug: z.string().optional(),
        country: z.string().optional(),
        safetyNotes: z.string().optional(),
        helmetRequired: z.boolean().optional(),
        visibility: z.string().optional(),
    })
    .strict();

export type CreateTrackInput = z.infer<typeof createTrackSchema>;
export type UpdateTrackInput = z.infer<typeof updateTrackSchema>;
