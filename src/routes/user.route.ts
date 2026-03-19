import express from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { isAdmin } from '@/middleware/role.middleware';
import { getAllUsers, getUserById, deleteUser } from '@/controllers/user.controller';

const router = express.Router();

router.get('/', authenticate, isAdmin, getAllUsers);
router.get('/:userId', authenticate, getUserById);
router.delete('/:userId', authenticate, isAdmin, deleteUser);

export default router;
