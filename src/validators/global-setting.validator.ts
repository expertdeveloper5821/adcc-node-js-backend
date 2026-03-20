import { z } from 'zod';

const firstValue = (val: unknown) => (Array.isArray(val) ? val[0] : val);

const booleanFromString = z.preprocess(
  (val) => {
    const value = firstValue(val);
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  },
  z.boolean()
);

const parseOptionalJson = (value: unknown): any => {
  const normalized = firstValue(value);
  if (normalized === undefined || normalized === null || normalized === '') return undefined;
  if (typeof normalized === 'string') {
    const trimmed = normalized.trim();
    if (!trimmed) return undefined;
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return normalized;
      }
    }
  }
  return normalized;
};

const keyField = z.preprocess(firstValue, z.string().min(1, 'Key is required'));

export const createGlobalSettingSchema = z
  .object({
    key: keyField,
    value: z.preprocess(parseOptionalJson, z.any()),
    group: z.preprocess(firstValue, z.string().min(1, 'Group is required')).optional(),
    label: z.preprocess(firstValue, z.string().min(1, 'Label is required')).optional(),
    description: z.preprocess(firstValue, z.string().min(1, 'Description is required')).optional(),
    active: booleanFromString.default(true),
  })
  .strict();

export const updateGlobalSettingSchema = z
  .object({
    key: keyField.optional(),
    value: z.preprocess(parseOptionalJson, z.any()).optional(),
    group: z.preprocess(firstValue, z.string().min(1, 'Group is required')).optional(),
    label: z.preprocess(firstValue, z.string().min(1, 'Label is required')).optional(),
    description: z.preprocess(firstValue, z.string().min(1, 'Description is required')).optional(),
    active: booleanFromString.optional(),
  })
  .strict();

export const getGlobalSettingsQuerySchema = z.object({
  group: z.string().optional(),
  key: z.string().optional(),
  keys: z.string().optional(),
  active: z.string().transform((val) => val === 'true').optional(),
  q: z.string().optional(),
  page: z.string().regex(/^\\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\\d+$/).transform(Number).optional(),
});

export const globalSettingKeySchema = z.object({
  key: z.string().min(1, 'Setting key is required'),
});

const bulkItemSchema = z
  .object({
    key: keyField,
    value: z.preprocess(parseOptionalJson, z.any()),
    group: z.preprocess(firstValue, z.string().min(1, 'Group is required')).optional(),
    label: z.preprocess(firstValue, z.string().min(1, 'Label is required')).optional(),
    description: z.preprocess(firstValue, z.string().min(1, 'Description is required')).optional(),
    active: booleanFromString.optional(),
  })
  .strict();

export const bulkGlobalSettingsSchema = z
  .object({
    items: z.array(bulkItemSchema).min(1, 'Items are required'),
  })
  .strict();

export type CreateGlobalSettingInput = z.infer<typeof createGlobalSettingSchema>;
export type UpdateGlobalSettingInput = z.infer<typeof updateGlobalSettingSchema>;
