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
    status: z.enum(['joined', 'checked_in', 'no_show', 'cancelled', 'completed']),
  })
  .strict();

  export const updateEventResultSchema = z
  .object({
    distance: z.number().min(0, 'Distance cannot be negative').optional(),
    time: z.string().optional(),
    rank: z.number().min(1, 'Rank must be at least 1').optional(),
    pointsEarned: z.number().min(0, 'Points earned cannot be negative').optional(),
    badge: z.string().optional(),
    status: z.enum(['joined', 'checked_in', 'no_show', 'cancelled', 'completed']).optional(),
  })
  .strict();

export const joinEventSchema = z.object({
  eventId: z.string().min(1),
});

export const participantStatusSchema = z
  .object({
    status: z.enum(['joined', 'checked_in', 'no_show', 'completed']),
    distance: z.number().min(0, 'Distance cannot be negative').optional(),
    time: z.string().trim().min(1, 'Time is required').optional(),
    rank: z.number().min(1, 'Rank must be at least 1').optional(),
    pointsEarned: z.number().min(0, 'Points earned cannot be negative').optional(),
    badge: z.string().optional(),
    reason: z.string().trim().optional(),
  })
  .strict();

export const participantListQuerySchema = z
  .object({
    search: z.string().trim().optional(),
    status: z.enum(['joined', 'checked_in', 'no_show', 'cancelled', 'completed']).optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  })
  .strict();

export const bulkParticipantActionSchema = z
  .object({
    userIds: z.array(z.string().min(1)).optional(),
  })
  .strict();

const timePattern = /^(?:\d{1,2}:)?[0-5]\d:[0-5]\d$/;

export const adminSaveResultsSchema = z
  .object({
    results: z
      .array(
        z
          .object({
            userId: z.string().min(1, 'User ID is required'),
            time: z
              .string()
              .trim()
              .regex(timePattern, 'Time must be in mm:ss or hh:mm:ss format'),
            distance: z.number().min(0, 'Distance cannot be negative').optional(),
          })
          .strict()
      )
      .min(1, 'At least one result is required'),
  })
  .strict();


export type CreateEventResultInput = z.infer<typeof evenResultSchema>;
export type UpdateEventResultInput = z.infer<typeof updateEventResultSchema>;
export type JoinEventSchemaInput = z.infer<typeof joinEventSchema>;
export type ParticipantStatusInput = z.infer<typeof participantStatusSchema>;
export type ParticipantListQueryInput = z.infer<typeof participantListQuerySchema>;
export type BulkParticipantActionInput = z.infer<typeof bulkParticipantActionSchema>;
export type AdminSaveResultsInput = z.infer<typeof adminSaveResultsSchema>;
