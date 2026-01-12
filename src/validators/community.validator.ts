import { z } from 'zod';

export const createCommunitySchema = z
  .object({
    title: z.string().min(1, 'Community title is required'),
    description: z.string().min(1, 'Community description is required'),
    type: z.enum(['city', 'group', 'awareness'], {
      message: 'Type must be city, group, or awareness',
    }),
    category: z.enum(['Social', 'Race', 'Family', 'Awareness', 'Partner', 'Other'], {
      message: 'Invalid category',
    }),
    location: z.enum(['Abu Dhabi', 'Al Ain', 'Western Region']).optional(),
    image: z.string().optional(),
    trackName: z.string().optional(),
    distance: z.number().min(0, 'Distance cannot be negative').optional(),
    terrain: z.string().optional(),
    isActive: z.boolean().default(true),
  })
  .strict();

export const updateCommunitySchema = z
  .object({
    title: z.string().min(1, 'Community title is required').optional(),
    description: z.string().min(1, 'Community description is required').optional(),
    type: z.enum(['city', 'group', 'awareness']).optional(),
    category: z.enum(['Social', 'Race', 'Family', 'Awareness', 'Partner', 'Other']).optional(),
    location: z.enum(['Abu Dhabi', 'Al Ain', 'Western Region']).optional(),
    image: z.string().optional(),
    trackName: z.string().optional(),
    distance: z.number().min(0, 'Distance cannot be negative').optional(),
    terrain: z.string().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const getCommunitiesQuerySchema = z.object({
  type: z.enum(['city', 'group', 'awareness']).optional(),
  location: z.enum(['Abu Dhabi', 'Al Ain', 'Western Region']).optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  isActive: z.string().transform((val) => val === 'true').optional(),
});

export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;
export type UpdateCommunityInput = z.infer<typeof updateCommunitySchema>;
export type GetCommunitiesQueryInput = z.infer<typeof getCommunitiesQuerySchema>;

