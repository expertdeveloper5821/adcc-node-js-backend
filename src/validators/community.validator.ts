import { z } from 'zod';

export const createCommunitySchema = z
  .object({
    title: z.string().min(1, 'Community title is required'),
    description: z.string().min(1, 'Community description is required'),
    type: z.enum(['Club', 'Shop', 'Women', 'Youth', 'Family', 'Corporate'], {
      message: 'Type must be one of: Club, Shop, Women, Youth, Family, Corporate',
    }),
    category: z.array(z.string().trim()).min(1, 'At least one category is required'),
    location: z.enum(['Abu Dhabi', 'Dubai', 'Al Ain', 'Sharjah']).optional(),
    image: z.string().optional(),
    trackName: z.string().optional(),
    distance: z.number().min(0, 'Distance cannot be negative').optional(),
    terrain: z.string().optional(),
    isActive: z.boolean().default(true),
    isPublic: z.boolean().default(false),
    isFeatured: z.boolean().default(false),
  })
  .strict();

export const updateCommunitySchema = z
  .object({
    title: z.string().min(1, 'Community title is required').optional(),
    description: z.string().min(1, 'Community description is required').optional(),
    type: z.enum(['Club', 'Shop', 'Women', 'Youth', 'Family', 'Corporate']).optional(),
    category: z.array(z.string().trim()).optional(),
    location: z.enum(['Abu Dhabi', 'Dubai', 'Al Ain', 'Sharjah']).optional(),
    image: z.string().optional(),
    trackName: z.string().optional(),
    distance: z.number().min(0, 'Distance cannot be negative').optional(),
    terrain: z.string().optional(),
    isActive: z.boolean().optional(),
    isPublic: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
  })
  .strict();

export const getCommunitiesQuerySchema = z.object({
  type: z.enum(['Club', 'Shop', 'Women', 'Youth', 'Family', 'Corporate']).optional(),
  location: z.enum(['Abu Dhabi', 'Dubai', 'Al Ain', 'Sharjah']).optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  isActive: z.string().transform((val) => val === 'true').optional(),
  isPublic: z.string().transform((val) => val === 'true').optional(),
  isFeatured: z.string().transform((val) => val === 'true').optional(),
});

export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;
export type UpdateCommunityInput = z.infer<typeof updateCommunitySchema>;
export type GetCommunitiesQueryInput = z.infer<typeof getCommunitiesQuerySchema>;

