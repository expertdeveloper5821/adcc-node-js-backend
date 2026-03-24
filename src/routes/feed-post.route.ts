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
  updateUserFeedPostBanSchema,
} from '@/validators/feed-post.validator';
import {
  createFeedPost,
  getFeedPostById,
  getFeedPosts,
  updateFeedPostModeration,
  updateUserFeedPostBan,
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

router.patch(
  '/moderation/users/:userId/ban-feed-post',
  authenticate,
  isAdmin,
  requireMultipartFormData,
  uploadBodyIfMultipart,
  requireParsedMultipartBody,
  validate(updateUserFeedPostBanSchema),
  updateUserFeedPostBan
);

export default router;

