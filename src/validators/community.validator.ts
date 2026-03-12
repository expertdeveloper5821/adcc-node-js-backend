import { z } from 'zod';
import mongoose from 'mongoose';

export const objectIdSchema = z.string().refine(
  (val) => mongoose.Types.ObjectId.isValid(val),
  { message: 'Invalid MongoDB ObjectId' }
);

const firstValue = (val: unknown) => (Array.isArray(val) ? val[0] : val);

const arrayFromStringOrJson = (val: unknown) => {
  const raw = firstValue(val);
  if (typeof raw !== 'string') return raw;
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return [trimmed];
    }
  }
  return [trimmed];
};

const booleanFromString = z.preprocess(
  (val) => {
    const value = firstValue(val);
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  },
  z.boolean()
);

const numberFromString = z.preprocess(firstValue, z.coerce.number());
const numberFromStringMin = (min: number, message: string) =>
  z.preprocess(firstValue, z.coerce.number().min(min, message));

const optionalObjectIdSchema = z.preprocess(
  (val) => {
    const value = firstValue(val);
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (!normalized || normalized === 'null' || normalized === 'undefined') {
        return undefined;
      }
      return value;
    }
    return value;
  },
  objectIdSchema.optional()
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
    title: z.preprocess(firstValue, z.string().min(1, 'Community title is required')),
    titleAr: z.preprocess(firstValue, z.string().min(1, 'Arabic community title is required')).optional(),
    description: z.preprocess(firstValue, z.string().min(1, 'Community description is required')),
    descriptionAr: z.preprocess(firstValue, z.string().min(1, 'Arabic community description is required')).optional(),
    type: z.preprocess(arrayFromStringOrJson, z.array(z.string().trim())).optional(),
    category: z.preprocess(firstValue, z.string()).optional(),
    purposeType: z.preprocess(firstValue, z.string()).optional(),
    ridesThisMonth: z.preprocess(firstValue, z.string()).optional(),
    weeklyRides: z.preprocess(firstValue, z.string()).optional(),
    fundsRaised: z.preprocess(firstValue, z.string()).optional(),
    joinMode: z.preprocess(firstValue, z.string()).optional(),
    location: z.preprocess(firstValue, z.enum(['Abu Dhabi', 'Dubai', 'Al Ain', 'Sharjah'])).optional(),
    country: z.preprocess(firstValue, z.string()).optional(),
    image: z.preprocess(firstValue, imageStringSchema).optional(),
    coverImage: z.preprocess(firstValue, imageStringSchema).optional(),
    logo: z.preprocess(firstValue, imageStringSchema).optional(),
    gallery: z.preprocess(arrayFromStringOrJson, z.array(imageStringSchema)).optional(),
    trackName: z.preprocess(firstValue, z.string()).optional(),
    distance: numberFromStringMin(0, 'Distance cannot be negative').optional(),
    terrain: z.preprocess(firstValue, z.string()).optional(),
    isActive: booleanFromString.default(true),
    isPublic: booleanFromString.default(false),
    status: booleanFromString.default(false),
    allowPosts: booleanFromString.default(false),
    allowGallery: booleanFromString.default(false),
    isFeatured: booleanFromString.default(false),
    foundedYear: numberFromString.optional(),
    members: z.preprocess(firstValue, z.string()).optional(),
    memberCount: numberFromString.optional(),
    slug: z.preprocess(firstValue, z.string()).optional(),
    manager: z.preprocess(firstValue, z.string()).optional(),
    area: z.preprocess(firstValue, z.string()).optional(),
    city: z.preprocess(firstValue, z.string()).optional(),
    trackId: optionalObjectIdSchema,
  })
  .strict();

export const updateCommunitySchema = z
  .object({
    title: z.preprocess(firstValue, z.string().min(1, 'Community title is required')).optional(),
    titleAr: z.preprocess(firstValue, z.string().min(1, 'Arabic community title is required')).optional(),
    description: z.preprocess(firstValue, z.string().min(1, 'Community description is required')).optional(),
    descriptionAr: z.preprocess(firstValue, z.string().min(1, 'Arabic community description is required')).optional(),
    type: z.preprocess(arrayFromStringOrJson, z.array(z.string().trim())).optional(),
    category: z.preprocess(firstValue, z.string()).optional(),
    purposeType: z.preprocess(firstValue, z.string()).optional(),
    ridesThisMonth: z.preprocess(firstValue, z.string()).optional(),
    weeklyRides: z.preprocess(firstValue, z.string()).optional(),
    fundsRaised: z.preprocess(firstValue, z.string()).optional(),
    joinMode: z.preprocess(firstValue, z.string()).optional(),
    location: z.preprocess(firstValue, z.enum(['Abu Dhabi', 'Dubai', 'Al Ain', 'Sharjah'])).optional(),
    country: z.preprocess(firstValue, z.string()).optional(),
    image: z.preprocess(firstValue, imageStringSchema).optional(),
    coverImage: z.preprocess(firstValue, imageStringSchema).optional(),
    logo: z.preprocess(firstValue, imageStringSchema).optional(),
    gallery: z.preprocess(arrayFromStringOrJson, z.array(imageStringSchema)).optional(),
    trackName: z.preprocess(firstValue, z.string()).optional(),
    distance: numberFromStringMin(0, 'Distance cannot be negative').optional(),
    terrain: z.preprocess(firstValue, z.string()).optional(),
    isActive: booleanFromString.optional(),
    isPublic: booleanFromString.optional(),
    status: booleanFromString.optional(),
    allowPosts: booleanFromString.optional(),
    allowGallery: booleanFromString.optional(),
    isFeatured: booleanFromString.default(false),
    foundedYear: numberFromString.optional(),
    members: z.preprocess(firstValue, z.string()).optional(),
    memberCount: numberFromString.optional(),
    slug: z.preprocess(firstValue, z.string()).optional(),
    manager: z.preprocess(firstValue, z.string()).optional(),
    area: z.preprocess(firstValue, z.string()).optional(),
    city: z.preprocess(firstValue, z.string()).optional(),
    trackId: optionalObjectIdSchema,
  })
  .strict();

export const featureCommunitySchema = z
  .object({
    isFeatured: z.preprocess(firstValue, z.boolean()),
  })
  .strict();

export const getCommunitiesQuerySchema = z.object({
  type: z.enum(['Family Rides', 'Racing & Performance', 'Women (SheRides)', 'Youth Cycling', 'Weekend Social', 'Night Riders', 'MTB/Trail', 'Training & Clinics']).optional(),
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
      images: z.preprocess(arrayFromStringOrJson, z.array(imageStringSchema).min(1, 'At least one image is required')),
    }),
    // Accept "image" as single string
    z.object({
      image: z.preprocess(firstValue, imageStringSchema),
    }),
    // Accept "image" as array
    z.object({
      image: z.preprocess(arrayFromStringOrJson, z.array(imageStringSchema).min(1, 'At least one image is required')),
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
    imageUrls: z.preprocess(arrayFromStringOrJson, z.array(imageStringSchema).min(1, 'At least one image URL is required')),
  })
  .strict();

export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;
export type UpdateCommunityInput = z.infer<typeof updateCommunitySchema>;
export type GetCommunitiesQueryInput = z.infer<typeof getCommunitiesQuerySchema>;
export type AddGalleryImagesInput = z.infer<typeof addGalleryImagesSchema>;
export type RemoveGalleryImagesInput = z.infer<typeof removeGalleryImagesSchema>;
export type FeatureCommunityInput = z.infer<typeof featureCommunitySchema>;

