import express from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { isAdmin, authenticatedOnly } from '@/middleware/role.middleware';
import { validate } from '@/middleware/validate.middleware';
import { registerFcmToken, unregisterFcmToken, updateUserVerified } from '@/controllers/user.controller';
import { getAllUsers, getUserById, deleteUser } from '@/controllers/user.controller';
import {
  registerFcmTokenSchema,
  unregisterFcmTokenSchema,
  updateUserVerifiedSchema,
} from '@/validators/user.validator';

const router = express.Router();

router.get('/', authenticate, isAdmin, getAllUsers);
router.get('/:userId', authenticate, getUserById);
router.delete('/:userId', authenticate, isAdmin, deleteUser);
router.patch(
  '/:userId/verified',
  authenticate,
  isAdmin,
  validate(updateUserVerifiedSchema),
  updateUserVerified
);

// FCM token registration for authenticated users
router.post(
  '/fcm-token',
  authenticate,
  authenticatedOnly,
  validate(registerFcmTokenSchema),
  registerFcmToken
);

router.post(
  '/fcm-token/unregister',
  authenticate,
  authenticatedOnly,
  validate(unregisterFcmTokenSchema),
  unregisterFcmToken
);

export default router;
