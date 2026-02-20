import { z } from 'zod';

export const evenResultSchema = z
  .object({
    eventId: z.string().min(1, 'Event ID is required'),
    userId: z.string().min(1, 'User ID is required'),
    distance: z.number().min(0, 'Distance cannot be negative').optional(),
    time: z.string().optional(),
    rank: z.number().min(1, 'Rank must be at least 1').optional(),
    pointsEarned: z.number().min(0, 'Points earned cannot be negative').optional(),
    badge: z.string().optional(),
    status: z.enum(['joined', 'cancelled', 'completed']),
  })
  .strict();

  export const updateEventResultSchema = z
  .object({
    distance: z.number().min(0, 'Distance cannot be negative').optional(),
    time: z.string().optional(),
    rank: z.number().min(1, 'Rank must be at least 1').optional(),
    pointsEarned: z.number().min(0, 'Points earned cannot be negative').optional(),
    badge: z.string().optional(),
    status: z.enum(['joined', 'cancelled', 'completed']).optional(),
  })
  .strict();

  export const joinEventSchema = z.object({
  eventId: z.string().min(1),
});


export type CreateEventResultInput = z.infer<typeof evenResultSchema>;
export type UpdateEventResultInput = z.infer<typeof updateEventResultSchema>;
export type JoinEventSchemaInput = z.infer<typeof joinEventSchema>;