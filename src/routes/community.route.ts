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
  addGalleryImages,
  removeGalleryImages,
  getGalleryImages,
} from '@/controllers/community.controller';
import { validate } from '@/middleware/validate.middleware';
import {
  createCommunitySchema,
  updateCommunitySchema,
  getCommunitiesQuerySchema,
  addGalleryImagesSchema,
  removeGalleryImagesSchema,
} from '@/validators/community.validator';
import { authenticate } from '@/middleware/auth.middleware';
import { isAdmin } from '@/middleware/role.middleware';

const router = express.Router();

// Public routes
router.get('/', validate(getCommunitiesQuerySchema, 'query'), getAllCommunities);
router.get('/:id', getCommunityById);
router.get('/:id/gallery', getGalleryImages);


// Authenticated routes
router.get('/:id/communityMembers',  getCommunityMembers);
router.post('/:id/join', authenticate, joinCommunity);
router.post('/:id/leave', authenticate, leaveCommunity);
router.get('/:id/bannedMembers',authenticate, getBannedUsersInCommunity);
router.post('/:id/isMemberOfCommunity', authenticate, isMemberOfCommunity);

// Admin only routes
router.post('/', authenticate, isAdmin, validate(createCommunitySchema), createCommunity);
router.patch('/:id', authenticate, isAdmin, validate(updateCommunitySchema), updateCommunity);
router.delete('/:id', authenticate, isAdmin, deleteCommunity);
router.post('/:id/gallery', authenticate, isAdmin, validate(addGalleryImagesSchema), addGalleryImages);
router.delete('/:id/gallery', authenticate, isAdmin, validate(removeGalleryImagesSchema), removeGalleryImages);
// router.patch('/:id/members/:userId/role', authenticate, updateMemberRole);
// router.patch('/:id/members/:userId/ban', authenticate, banMember);

export default router;

