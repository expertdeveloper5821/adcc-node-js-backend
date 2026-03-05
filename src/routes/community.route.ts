import express from 'express';
import {
  createCommunity,
  getAllCommunities,
  getCommunityById,
  updateCommunity,
  deleteCommunity,
  joinCommunity,
  leaveCommunity,
  getCommunityMembers,
  getBannedUsersInCommunity,
  isMemberOfCommunity,
} from '@/controllers/community.controller';
import { validate } from '@/middleware/validate.middleware';
import {
  createCommunitySchema,
  updateCommunitySchema,
  getCommunitiesQuerySchema,
} from '@/validators/community.validator';
import { authenticate } from '@/middleware/auth.middleware';
import { isAdmin } from '@/middleware/role.middleware';

const router = express.Router();

// Public routes
router.get('/', authenticate, validate(getCommunitiesQuerySchema), getAllCommunities);
router.get('/:id', authenticate, getCommunityById);


// Authenticated routes
router.get('/:id/communityMembers',  authenticate, getCommunityMembers);
router.post('/:id/join', authenticate, joinCommunity);
router.post('/:id/leave', authenticate, leaveCommunity);
router.get('/:id/bannedMembers',authenticate, getBannedUsersInCommunity);
router.post('/:id/isMemberOfCommunity', authenticate, isMemberOfCommunity);

// Admin only routes
router.post('/', authenticate, isAdmin, validate(createCommunitySchema), createCommunity);
router.patch('/:id', authenticate, isAdmin, validate(updateCommunitySchema), updateCommunity);
router.delete('/:id', authenticate, isAdmin, deleteCommunity);
// router.patch('/:id/members/:userId/role', authenticate, updateMemberRole);
// router.patch('/:id/members/:userId/ban', authenticate, banMember);

export default router;

