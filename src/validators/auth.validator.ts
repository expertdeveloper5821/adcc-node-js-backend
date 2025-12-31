import { z } from 'zod';

export const verifyFirebaseAuthSchema = z.object({
  idToken: z.string().min(1, 'Firebase ID token is required'),
});

export const registerUserSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  gender: z.enum(['Male', 'Female'], {
    message: 'Gender must be either Male or Female',
  }),
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

