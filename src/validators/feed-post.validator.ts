import { z } from 'zod';

const firstValue = (val: unknown) => (Array.isArray(val) ? val[0] : val);
const normalizedString = (val: unknown) => {
  const first = firstValue(val);
  return typeof first === 'string' ? first.trim().toLowerCase() : first;
};
const parseBooleanFromFormData = (val: unknown) => {
  const first = firstValue(val);
  if (typeof first === 'boolean') return first;
  if (typeof first === 'number') return first === 1;
  if (typeof first === 'string') {
    const normalized = first.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }
  return first;
};

const feedPostStatusEnum = z.enum(['pending', 'approved', 'rejected']);

export const createFeedPostSchema = z
  .object({
    title: z.preprocess(firstValue, z.string().min(1, 'Post title is required')),
    description: z.preprocess(firstValue, z.string().min(1, 'Post description is required')),
    status: z.preprocess(normalizedString, feedPostStatusEnum).optional().default('pending'),
    reported: z.preprocess(parseBooleanFromFormData, z.boolean()).optional().default(false),
  })
  .strict();

export const updateFeedPostModerationSchema = z
  .object({
    status: z.preprocess(normalizedString, feedPostStatusEnum).optional(),
    reported: z.preprocess(parseBooleanFromFormData, z.boolean()).optional(),
  })
  .refine((data) => data.status !== undefined || data.reported !== undefined, {
    message: 'Either "status" or "reported" must be provided',
  })
  .strict();

export const getFeedPostsQuerySchema = z.object({
  status: z.preprocess(normalizedString, feedPostStatusEnum).optional(),
  reported: z.preprocess(parseBooleanFromFormData, z.boolean()).optional(),
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

