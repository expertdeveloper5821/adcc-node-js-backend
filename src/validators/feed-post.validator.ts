import { z } from 'zod';

const firstValue = (val: unknown) => (Array.isArray(val) ? val[0] : val);

const feedPostStatusEnum = z.enum(['pending', 'approved']);

export const createFeedPostSchema = z
  .object({
    title: z.preprocess(firstValue, z.string().min(1, 'Post title is required')),
    description: z.preprocess(firstValue, z.string().min(1, 'Post description is required')),
    status: z.preprocess(firstValue, feedPostStatusEnum).optional().default('pending'),
    reported: z.preprocess(firstValue, z.coerce.boolean()).optional().default(false),
  })
  .strict();

export const updateFeedPostModerationSchema = z
  .object({
    status: z.preprocess(firstValue, feedPostStatusEnum).optional(),
    reported: z.preprocess(firstValue, z.coerce.boolean()).optional(),
  })
  .refine((data) => data.status !== undefined || data.reported !== undefined, {
    message: 'Either "status" or "reported" must be provided',
  })
  .strict();

export const getFeedPostsQuerySchema = z.object({
  status: z.preprocess(firstValue, feedPostStatusEnum).optional(),
  reported: z.preprocess(firstValue, z.coerce.boolean()).optional(),
  q: z.string().optional(),
  page: z
    .preprocess(firstValue, z.string().regex(/^\d+$/).transform(Number))
    .optional()
    .default(1),
  limit: z
    .preprocess(firstValue, z.string().regex(/^\d+$/).transform(Number))
    .optional()
    .default(10),
});

export type CreateFeedPostInput = z.infer<typeof createFeedPostSchema>;
export type UpdateFeedPostModerationInput = z.infer<typeof updateFeedPostModerationSchema>;
export type GetFeedPostsQueryInput = z.infer<typeof getFeedPostsQuerySchema>;

