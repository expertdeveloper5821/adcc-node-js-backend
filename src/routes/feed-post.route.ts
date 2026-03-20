import express from 'express';
import { validate } from '@/middleware/validate.middleware';
import { authenticate } from '@/middleware/auth.middleware';
import { isAdmin, authenticatedOnly } from '@/middleware/role.middleware';
import {
  uploadFeedPostImageIfMultipart,
  uploadBodyIfMultipart,
  requireMultipartFormData,
  requireParsedMultipartBody,
} from '@/middleware/upload.middleware';
import {
  createFeedPostSchema,
  getFeedPostsQuerySchema,
  updateFeedPostModerationSchema,
} from '@/validators/feed-post.validator';
import {
  createFeedPost,
  getFeedPostById,
  getFeedPosts,
  updateFeedPostModeration,
} from '@/controllers/feed-post.controller';

const router = express.Router();

router.get('/', authenticate, validate(getFeedPostsQuerySchema), getFeedPosts);
router.get('/:id', authenticate, getFeedPostById);

router.post(
  '/',
  authenticate,
  authenticatedOnly,
  uploadFeedPostImageIfMultipart,
  requireParsedMultipartBody,
  validate(createFeedPostSchema),
  createFeedPost
);

router.patch(
  '/:id/moderation',
  authenticate,
  isAdmin,
  requireMultipartFormData,
  uploadBodyIfMultipart,
  requireParsedMultipartBody,
  validate(updateFeedPostModerationSchema),
  updateFeedPostModeration
);

export default router;

