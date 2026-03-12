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
  // getGalleryImages,
  featureCommunity,
  // getFeaturedCommunities,
} from '@/controllers/community.controller';
import { validate } from '@/middleware/validate.middleware';
import {
  createCommunitySchema,
  updateCommunitySchema,
  getCommunitiesQuerySchema,
  featureCommunitySchema,
  removeGalleryImagesSchema,
} from '@/validators/community.validator';
import { authenticate } from '@/middleware/auth.middleware';
import { isAdmin } from '@/middleware/role.middleware';
import { uploadMultipleImages, requireMultipartFormData, uploadCommunityImages, requireParsedMultipartBody } from '@/middleware/upload.middleware';
import { debugRequestBasics } from '@/middleware/request-debug.middleware';

const router = express.Router();



// Authenticated routes

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
router.post(
  '/',
  authenticate,
  isAdmin,
  uploadCommunityImages,
  requireParsedMultipartBody,
  debugRequestBasics,
  validate(createCommunitySchema),
  createCommunity
);
router.patch('/:id', authenticate, isAdmin, uploadCommunityImages, validate(updateCommunitySchema), updateCommunity);
router.delete('/:id', authenticate, isAdmin, deleteCommunity);
router.post('/:id/gallery', authenticate, isAdmin, requireMultipartFormData, uploadMultipleImages, addGalleryImages);
router.delete('/:id/gallery', authenticate, isAdmin, validate(removeGalleryImagesSchema), removeGalleryImages);

// admin controls for featuring
router.patch('/:id/feature', authenticate, isAdmin, validate(featureCommunitySchema), featureCommunity);
// router.patch('/:id/members/:userId/role', authenticate, updateMemberRole);
// router.patch('/:id/members/:userId/ban', authenticate, banMember);

export default router;

