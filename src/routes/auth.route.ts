import express from 'express';
import {
  verifyFirebaseAuth,
  registerUser,
  refreshAccessToken,
  logout,
  getCurrentUser,
} from '@/controllers/auth.controller';
import { validate } from '@/middleware/validate.middleware';
import {
  verifyFirebaseAuthSchema,
  registerUserSchema,
  refreshTokenSchema,
  logoutSchema,
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

// Protected routes
router.post('/logout', authenticate, validate(logoutSchema), logout);
router.get('/me', authenticate, getCurrentUser);

export default router;

