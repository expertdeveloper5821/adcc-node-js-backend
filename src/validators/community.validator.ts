import { z } from 'zod';
import mongoose from 'mongoose';

export const objectIdSchema = z.string().refine(
  (val) => mongoose.Types.ObjectId.isValid(val),
  { message: 'Invalid MongoDB ObjectId' }
);

// Maximum image size: 2MB (original image size before base64 encoding)
// Base64 encoding increases size by ~33% (4/3 ratio), so 2MB image ≈ 2.67MB in base64
// 2MB = 2 * 1024 * 1024 = 2,097,152 bytes
// Max base64 string size ≈ 2,097,152 * 4/3 ≈ 2,796,203 bytes/characters
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB in bytes (original image)
const MAX_BASE64_SIZE = Math.ceil(MAX_IMAGE_SIZE_BYTES * (4 / 3)); // ~2.67MB for base64 encoded string

// Custom validation for image strings (accepts URLs or base64 data URIs)
const imageStringSchema = z.string().refine(
  (val) => {
    // Check if it's a valid URL
    try {
      new URL(val);
      return true; // URLs don't have size restrictions
    } catch {
      // Check if it's a base64 data URI (data:image/...;base64,...)
      if (val.startsWith('data:image/')) {
        // Extract the base64 part (after the comma)
        const base64Part = val.split(',')[1] || '';
        if (!base64Part) return false;
        
        // Calculate size: base64 uses ASCII (1 byte = 1 character)
        // Check if the base64 string size exceeds the limit
        const sizeInBytes = Buffer.byteLength(base64Part, 'utf8');
        return sizeInBytes <= MAX_BASE64_SIZE;
      }
      // Check if it's a plain base64 string
      const base64Regex = /^[A-Za-z0-9+/=]+$/;
      if (base64Regex.test(val) && val.length > 100) {
        // Calculate size for plain base64 string
        const sizeInBytes = Buffer.byteLength(val, 'utf8');
        return sizeInBytes <= MAX_BASE64_SIZE;
      }
      return false;
    }
  },
  {
    message: `Each image must be a valid URL or base64 data URI (data:image/...). Base64 images must be less than 2MB in original size.`,
  }
);

export const createCommunitySchema = z
  .object({
    title: z.string().min(1, 'Community title is required'),
    description: z.string().min(1, 'Community description is required'),
    type: z.array(z.string().trim()).optional(),
    category: z.string().optional(),
    location: z.enum(['Abu Dhabi', 'Dubai', 'Al Ain', 'Sharjah']).optional(),
    image: z.string().optional(),
    logo: z.string().optional(),
    gallery: z.array(imageStringSchema).optional(),
    trackName: z.string().optional(),
    distance: z.number().min(0, 'Distance cannot be negative').optional(),
    terrain: z.string().optional(),
    isActive: z.boolean().default(true),
    isPublic: z.boolean().default(false),
    isFeatured: z.boolean().default(false),
    foundedYear: z.number().optional(),
    members: z.string().optional(),
    memberCount: z.number().optional(),
    slug: z.string().optional(),
    manager: z.string().optional(),
    area: z.string().optional(),
    city: z.string().optional(),
    trackId: objectIdSchema.optional(),
  })
  .strict();

export const updateCommunitySchema = z
  .object({
    title: z.string().min(1, 'Community title is required').optional(),
    description: z.string().min(1, 'Community description is required').optional(),
    type: z.array(z.string().trim()).optional(),
    category: z.string().optional(),
    location: z.enum(['Abu Dhabi', 'Dubai', 'Al Ain', 'Sharjah']).optional(),
    image: z.string().optional(),
    logo: z.string().optional(),
    gallery: z.array(imageStringSchema).optional(),
    trackName: z.string().optional(),
    distance: z.number().min(0, 'Distance cannot be negative').optional(),
    terrain: z.string().optional(),
    isActive: z.boolean().optional(),
    isPublic: z.boolean().optional(),
    isFeatured: z.boolean().default(false),
    foundedYear: z.number().optional(),
    members: z.string().optional(),
    memberCount: z.number().optional(),
    slug: z.string().optional(),
    manager: z.string().optional(),
    area: z.string().optional(),
    city: z.string().optional(),
    trackId: objectIdSchema.optional(),
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

export const addGalleryImagesSchema = z
  .union([
    // Accept "images" array
    z.object({
      images: z.array(imageStringSchema).min(1, 'At least one image is required'),
    }),
    // Accept "image" as single string
    z.object({
      image: imageStringSchema,
    }),
    // Accept "image" as array
    z.object({
      image: z.array(imageStringSchema).min(1, 'At least one image is required'),
    }),
  ])
  .transform((data) => {
    // Normalize: always return { images: [...] }
    if ('images' in data && Array.isArray(data.images)) {
      return { images: data.images };
    }
    if ('image' in data) {
      return { images: Array.isArray(data.image) ? data.image : [data.image] };
    }
    return { images: [] };
  });

export const removeGalleryImagesSchema = z
  .object({
    imageUrls: z.array(imageStringSchema).min(1, 'At least one image URL is required'),
  })
  .strict();

export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;
export type UpdateCommunityInput = z.infer<typeof updateCommunitySchema>;
export type GetCommunitiesQueryInput = z.infer<typeof getCommunitiesQuerySchema>;
export type AddGalleryImagesInput = z.infer<typeof addGalleryImagesSchema>;
export type RemoveGalleryImagesInput = z.infer<typeof removeGalleryImagesSchema>;
