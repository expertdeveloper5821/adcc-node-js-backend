import express from 'express';
import {
  createCommunityPost,
  getCommunityPosts,
  getCommunityPostById,
  updateCommunityPost,
  deleteCommunityPost,
} from '@/controllers/community-post.controller';
import { validate } from '@/middleware/validate.middleware';
import {
  createCommunityPostSchema,
  updateCommunityPostSchema,
  getCommunityPostsQuerySchema,
} from '@/validators/community-post.validator';
import { authenticate } from '@/middleware/auth.middleware';
import { isAdmin } from '@/middleware/role.middleware';
import {
  uploadCommunityPostImageIfMultipart,
  requireParsedMultipartBody,
} from '@/middleware/upload.middleware';

const router = express.Router({ mergeParams: true });

router.get('/', authenticate, validate(getCommunityPostsQuerySchema), getCommunityPosts);
router.get('/:id', authenticate, getCommunityPostById);

router.post(
  '/',
  authenticate,
  isAdmin,
  uploadCommunityPostImageIfMultipart,
  requireParsedMultipartBody,
  validate(createCommunityPostSchema),
  createCommunityPost
);

router.patch(
  '/:id',
  authenticate,
  isAdmin,
  uploadCommunityPostImageIfMultipart,
  validate(updateCommunityPostSchema),
  updateCommunityPost
);

router.delete('/:id', authenticate, isAdmin, deleteCommunityPost);

export default router;
