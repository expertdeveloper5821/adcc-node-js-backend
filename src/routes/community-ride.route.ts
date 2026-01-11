import express from 'express';
import {
  createCommunityRide,
  getAllCommunityRides,
  getCommunityRideById,
  updateCommunityRide,
  deleteCommunityRide,
} from '@/controllers/community-ride.controller';
import { validate } from '@/middleware/validate.middleware';
import {
  createCommunityRideSchema,
  updateCommunityRideSchema,
  getCommunityRidesQuerySchema,
} from '@/validators/community-ride.validator';
import { authenticate } from '@/middleware/auth.middleware';
import { isAdmin } from '@/middleware/role.middleware';

const router = express.Router();

// Public routes
router.get('/', validate(getCommunityRidesQuerySchema, 'query'), getAllCommunityRides);
router.get('/:id', getCommunityRideById);

// Admin only routes
router.post(
  '/',
  authenticate,
  isAdmin,
  validate(createCommunityRideSchema),
  createCommunityRide
);
router.patch(
  '/:id',
  authenticate,
  isAdmin,
  validate(updateCommunityRideSchema),
  updateCommunityRide
);
router.delete('/:id', authenticate, isAdmin, deleteCommunityRide);

export default router;

