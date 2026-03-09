import express from 'express';
import {
  verifyFirebaseAuth,
  registerUser,
  refreshAccessToken,
  logout,
  getCurrentUser,
  guestLogin,
  updateProfileImage,
} from '@/controllers/auth.controller';
import { validate } from '@/middleware/validate.middleware';
import {
  verifyFirebaseAuthSchema,
  registerUserSchema,
  refreshTokenSchema,
  logoutSchema,
  updateProfileImageSchema,
} from '@/validators/auth.validator';
import { authenticate } from '@/middleware/auth.middleware';

const router = express.Router();

// Public routes
router.post('/verify', validate(verifyFirebaseAuthSchema), verifyFirebaseAuth);
router.post(
  '/register',
  authenticate,
  validate(registerUserSchema),
  registerUser
);
router.post('/refresh', validate(refreshTokenSchema), refreshAccessToken);
router.post('/guestLogin', guestLogin);

// Protected routes
router.post('/logout', authenticate, validate(logoutSchema), logout);
router.get('/me', authenticate, getCurrentUser);
router.patch('/me/profile-image', authenticate, validate(updateProfileImageSchema), updateProfileImage);

export default router;

