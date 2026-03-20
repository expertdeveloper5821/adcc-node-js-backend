import { z } from 'zod';

const firstValue = (val: unknown) => (Array.isArray(val) ? val[0] : val);

const coerceBoolean = (val: unknown) => {
  const raw = firstValue(val);
  if (typeof raw === 'boolean') return raw;

  if (typeof raw === 'number') {
    if (raw === 1) return true;
    if (raw === 0) return false;
    return raw;
  }

  if (typeof raw !== 'string') return raw;

  const normalized = raw.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;

  return raw;
};

export const updateUserVerifiedSchema = z
  .object({
    isVerified: z.preprocess(
      coerceBoolean,
      // `required_error` is not supported by the installed Zod typings for `z.boolean()`.
      // The field itself is required because it's not marked `.optional()`.
      z.boolean()
    ),
  })
  .strict();

export type UpdateUserVerifiedInput = z.infer<typeof updateUserVerifiedSchema>;

