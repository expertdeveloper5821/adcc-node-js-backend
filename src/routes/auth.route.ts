import express from 'express';
import {
  verifyFirebaseAuth,
  registerUser,
  refreshAccessToken,
  logout,
  getCurrentUser,
  getCurrentUserStats,
  getMyJoinedCommunities,
  getMyJoinedEvents,
  getMyActiveParticipations,
  guestLogin
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
router.post('/guestLogin', guestLogin);

// Protected routes
router.post('/logout', authenticate, validate(logoutSchema), logout);
router.get('/me/stats', authenticate, getCurrentUserStats);
router.get('/me/joined-communities', authenticate, getMyJoinedCommunities);
router.get('/me/joined-events', authenticate, getMyJoinedEvents);
router.get('/me/active-participations', authenticate,getMyActiveParticipations);
router.get('/me', authenticate, getCurrentUser);

export default router;

