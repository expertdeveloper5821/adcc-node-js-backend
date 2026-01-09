import { z } from 'zod';

export const createEventSchema = z
  .object({
    title: z.string().min(1, 'Event title is required'),
    description: z.string().min(1, 'Event description is required'),
    category: z.enum(['Community Rides', 'Family & Kids', 'She Rides', 'Special Rides & Campaigns', 'Activities', 'Tracks'], {
      message: 'Invalid event category',
    }),
    eventType: z.enum(['Community Ride', 'Special Ride', 'Campaign', 'Activity', 'Track'], {
      message: 'Invalid event type',
    }),
    eventDate: z.string().or(z.date()).refine(
      (val) => {
        const date = val instanceof Date ? val : new Date(val);
        return !isNaN(date.getTime());
      },
      { message: 'Invalid event date' }
    ),
    eventTime: z.string().min(1, 'Event time is required'),
    location: z.string().min(1, 'Event location is required'),
    distance: z.string().optional(),
    surface: z.string().optional(),
    pace: z.string().optional(),
    amenities: z.array(z.string()).default([]),
    eligibility: z.string().min(1, 'Eligibility information is required'),
    maxParticipants: z.number().int().min(1, 'Max participants must be at least 1').optional(),
    status: z.enum(['upcoming', 'ongoing', 'completed', 'cancelled']).default('upcoming'),
    isFree: z.boolean().default(true),
  })
  .strict();

export const updateEventSchema = z
  .object({
    title: z.string().min(1, 'Event title is required').optional(),
    description: z.string().min(1, 'Event description is required').optional(),
    category: z
      .enum(['Community Rides', 'Family & Kids', 'She Rides', 'Special Rides & Campaigns', 'Activities', 'Tracks'])
      .optional(),
    eventType: z.enum(['Community Ride', 'Special Ride', 'Campaign', 'Activity', 'Track']).optional(),
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
    location: z.string().min(1, 'Event location is required').optional(),
    distance: z.string().optional(),
    surface: z.string().optional(),
    pace: z.string().optional(),
    amenities: z.array(z.string()).optional(),
    eligibility: z.string().min(1, 'Eligibility information is required').optional(),
    maxParticipants: z.number().int().min(1, 'Max participants must be at least 1').optional(),
    status: z.enum(['upcoming', 'ongoing', 'completed', 'cancelled']).optional(),
    isFree: z.boolean().optional(),
  })
  .strict();

export const getEventsQuerySchema = z.object({
  category: z
    .enum(['Community Rides', 'Family & Kids', 'She Rides', 'Special Rides & Campaigns', 'Activities', 'Tracks'])
    .optional(),
  eventType: z.enum(['Community Ride', 'Special Ride', 'Campaign', 'Activity', 'Track']).optional(),
  status: z.enum(['upcoming', 'ongoing', 'completed', 'cancelled']).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type GetEventsQueryInput = z.infer<typeof getEventsQuerySchema>;

