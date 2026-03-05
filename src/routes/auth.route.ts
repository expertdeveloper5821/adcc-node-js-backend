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
  createGuestSession,
} from '@/controllers/auth.controller';
import { validate } from '@/middleware/validate.middleware';
import {
  verifyFirebaseAuthSchema,
  registerUserSchema,
  refreshTokenSchema,
  logoutSchema,
  createGuestSchema,
} from '@/validators/auth.validator';
import { authenticate } from '@/middleware/auth.middleware';
import { requireMember } from '@/middleware/role.middleware';

const router = express.Router();

// Public routes
router.post('/verify', validate(verifyFirebaseAuthSchema), verifyFirebaseAuth);
router.post('/guest', validate(createGuestSchema), createGuestSession);
router.post(
  '/register',
  authenticate,
  validate(registerUserSchema),
  registerUser
);
router.post('/refresh', validate(refreshTokenSchema), refreshAccessToken);

// Protected routes
router.post('/logout', authenticate, validate(logoutSchema), logout);
router.get('/me/stats', authenticate, requireMember, getCurrentUserStats);
router.get('/me/joined-communities', authenticate, requireMember, getMyJoinedCommunities);
router.get('/me/joined-events', authenticate, requireMember, getMyJoinedEvents);
router.get('/me/active-participations', authenticate, requireMember, getMyActiveParticipations);
router.get('/me', authenticate, getCurrentUser);

export default router;

