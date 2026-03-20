import express from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { isAdmin } from '@/middleware/role.middleware';
import { validate } from '@/middleware/validate.middleware';
import { updateUserVerified } from '@/controllers/user.controller';
import { getAllUsers, getUserById, deleteUser } from '@/controllers/user.controller';
import { updateUserVerifiedSchema } from '@/validators/user.validator';

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

export default router;
