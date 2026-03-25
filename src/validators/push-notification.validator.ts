import { z } from 'zod';

const firstValue = (val: unknown) => (Array.isArray(val) ? val[0] : val);

const stringField = (message: string) =>
  z.preprocess(firstValue, z.string().min(1, message));

const optionalStringField = (message: string) =>
  z.preprocess(firstValue, z.string().min(1, message)).optional();

const optionalPlatformField = z.preprocess(
  firstValue,
  z.enum(['web', 'android', 'ios'])
).optional();

export const registerWebPushTokenSchema = z
  .object({
    token: stringField('Web push token is required'),
    userAgent: optionalStringField('Invalid user agent'),
    platform: optionalPlatformField,
    deviceId: optionalStringField('Invalid device id'),
    deviceModel: optionalStringField('Invalid device model'),
    osVersion: optionalStringField('Invalid OS version'),
    appVersion: optionalStringField('Invalid app version'),
    appBuild: optionalStringField('Invalid app build'),
  })
  .strict();

export const unregisterWebPushTokenSchema = z
  .object({
    token: stringField('Web push token is required'),
  })
  .strict();

const optionalScheduleDate = z.preprocess(firstValue, z.string().optional());
const optionalScheduleTime = z.preprocess(firstValue, z.string().optional());

const urlField = optionalStringField('Invalid URL').refine(
  (val) => {
    if (!val) return true;
    try {
      new URL(val, 'https://example.com');
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Invalid URL' }
);

export const sendStaffWebPushSchema = z
  .object({
    title: stringField('Notification title is required'),
    body: stringField('Notification message is required'),
    audienceType: stringField('Audience type is required'),
    scheduleDate: optionalScheduleDate,
    scheduleTime: optionalScheduleTime,
    url: urlField,
  })
  .strict()
  .refine(
    (data) => {
      const d = data.scheduleDate?.trim();
      const t = data.scheduleTime?.trim();
      return Boolean((d && t) || (!d && !t));
    },
    { message: 'Provide both schedule date and time, or omit both for immediate send' }
  );

/** Same payload as send-to-staff: creates a campaign (scheduled or immediate). */
export const createCampaignSchema = sendStaffWebPushSchema;

export const listCampaignsQuerySchema = z
  .object({
    status: z
      .enum(['all', 'active', 'scheduled', 'sending', 'completed', 'failed', 'cancelled'])
      .optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

export const mongoIdParamSchema = z
  .object({
    id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id'),
  })
  .strict();

export const listInboxQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    unreadOnly: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
  })
  .strict();

export type RegisterWebPushTokenInput = z.infer<typeof registerWebPushTokenSchema>;
export type UnregisterWebPushTokenInput = z.infer<typeof unregisterWebPushTokenSchema>;
export type SendStaffWebPushInput = z.infer<typeof sendStaffWebPushSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type ListCampaignsQuery = z.infer<typeof listCampaignsQuerySchema>;
export type ListInboxQuery = z.infer<typeof listInboxQuerySchema>;
