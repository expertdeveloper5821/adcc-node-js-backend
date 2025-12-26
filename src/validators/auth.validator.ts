import { z } from 'zod';

export const verifyFirebaseAuthSchema = z.object({
  idToken: z.string().min(1, 'Firebase ID token is required'),
  deviceId: z.string().optional(),
});

export const registerUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  age: z.number().int().min(1, 'Age must be at least 1').max(120, 'Age must be at most 120'),
  deviceId: z.string().optional(),
}).strict();

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type VerifyFirebaseAuthInput = z.infer<typeof verifyFirebaseAuthSchema>;
export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;

