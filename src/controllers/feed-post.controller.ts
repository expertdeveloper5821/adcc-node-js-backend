import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '@/middleware/auth.middleware';
import { sendSuccess } from '@/utils/response';
import { asyncHandler } from '@/utils/async-handler';
import { AppError } from '@/utils/app-error';
import { t } from '@/utils/i18n';
import FeedPost from '@/models/feed-post.model';
import User from '@/models/user.model';
import { uploadImageBufferToS3 } from '@/services/s3-upload.service';

const getLang = (req: Request) => (((req as any).lang || 'en') as string) ?? 'en';

const getParamString = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const ensureObjectId = (id: string | string[] | undefined, message: string) => {
  const raw = getParamString(id) || '';
  if (!mongoose.Types.ObjectId.isValid(raw)) {
    throw new AppError(message, 400);
  }
  return new mongoose.Types.ObjectId(raw);
};

const attachRequiredImage = async (req: AuthRequest, data: Record<string, any>, folderKey: string) => {
  const fileFromSingle = (req as any).file as Express.Multer.File | undefined;
  const filesFromAny = (req as any).files as
    | Express.Multer.File[]
    | Record<string, Express.Multer.File[]>
    | undefined;

  const fileFromAnyKey =
    fileFromSingle ||
    (Array.isArray(filesFromAny)
      ? filesFromAny.find((f) => Boolean(f))
      : filesFromAny
        ? Object.values(filesFromAny).flat().find((f) => Boolean(f))
        : undefined);

  if (!fileFromAnyKey) {
    throw new AppError(
      'Image file is required. Send it as form-data with key "image" (or "postImage", "feedImage", "photo", "file", "imageFile").',
      400
    );
  }

  const upload = await uploadImageBufferToS3(
    fileFromAnyKey.buffer,
    fileFromAnyKey.mimetype,
    fileFromAnyKey.originalname,
    folderKey
  );
  data.image = upload.url;
  return data;
};

/**
 * Create feed post (user submits to moderation queue)
 * POST /v1/feed-posts
 */
export const createFeedPost = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = getLang(req);
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError(t(lang, 'auth.unauthorized'), 401);
  }

  const user = await User.findById(userId).select('banFeedPost').lean();
  if (!user) {
    throw new AppError(t(lang, 'user.not_found'), 404);
  }
  if (user.banFeedPost) {
    throw new AppError(t(lang, 'feedPost.user_banned'), 403);
  }

  const data: Record<string, any> = {
    ...req.body,
    createdBy: userId,
  };

  // Frontend can send `status`, but the reported flag should start as false.
  data.reported = false;

  await attachRequiredImage(req, data, 'feed-posts');

  const created = await FeedPost.create(data);
  const populated = await FeedPost.findById(created._id)
    .populate('createdBy', 'fullName profileImage')
    .lean();

  sendSuccess(res, populated, t(lang, 'feedPost.created'), 201);
});

/**
 * Get feed posts with filtering for moderation tabs.
 * GET /v1/feed-posts?status=pending|approved&reported=true|false
 */
export const getFeedPosts = asyncHandler(async (req: Request, res: Response) => {
  const lang = getLang(req);
  const { status, reported, q, page, limit } = req.query as any;

  const filter: any = {};
  if (status) filter.status = status;
  if (reported !== undefined) filter.reported = reported;

  if (q) {
    const qStr = String(q);
    filter.$or = [
      { title: { $regex: qStr, $options: 'i' } },
      { description: { $regex: qStr, $options: 'i' } },
    ];
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  const [posts, total] = await Promise.all([
    FeedPost.find(filter)
      .populate('createdBy', 'fullName profileImage banFeedPost' )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    FeedPost.countDocuments(filter),
  ]);

  sendSuccess(
    res,
    {
      posts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 1,
      },
    },
    t(lang, 'feedPost.list')
  );
});

/**
 * Get feed post by ID
 * GET /v1/feed-posts/:id
 */
export const getFeedPostById = asyncHandler(async (req: Request, res: Response) => {
  const lang = getLang(req);
  const { id } = req.params;

  const post = await FeedPost.findOne({ _id: ensureObjectId(id, 'Invalid post ID') })
    .populate('createdBy', 'fullName profileImage')
    .lean();

  if (!post) {
    throw new AppError(t(lang, 'feedPost.not_found'), 404);
  }

  sendSuccess(res, post, t(lang, 'feedPost.retrieved'));
});

/**
 * Admin moderation endpoint (change status and/or mark as reported)
 * PATCH /v1/feed-posts/:id/moderation
 *
 * - if `reported=true`, the `reported` field becomes true
 * - if `status` is provided, `status` is updated
 */
export const updateFeedPostModeration = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = getLang(req);
  const { id } = req.params;

  const updates: Record<string, any> = {};
  if (req.body.status !== undefined) updates.status = req.body.status;
  if (req.body.reported !== undefined) updates.reported = req.body.reported;

  if (Object.keys(updates).length === 0) {
    throw new AppError('Either "status" or "reported" must be provided', 400);
  }

  const updated = await FeedPost.findOneAndUpdate(
    { _id: ensureObjectId(id, 'Invalid post ID') },
    updates,
    { new: true, runValidators: true }
  )
    .populate('createdBy', 'fullName profileImage')
    .lean();

  if (!updated) {
    throw new AppError(t(lang, 'feedPost.not_found'), 404);
  }

  sendSuccess(res, updated, t(lang, 'feedPost.updated'));
});

/**
 * Admin endpoint to ban/unban user from creating feed posts.
 * PATCH /v1/feed-posts/moderation/users/:userId/ban-feed-post
 */
export const updateUserFeedPostBan = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = getLang(req);
  const { userId } = req.params;
  const parsedUserId = ensureObjectId(userId, 'Invalid user ID');
  const { banFeedPost } = req.body as { banFeedPost: boolean };

  const user = await User.findByIdAndUpdate(
    parsedUserId,
    { banFeedPost },
    { new: true, runValidators: true }
  )
    .select('fullName email phone role banFeedPost')
    .lean();

  if (!user) {
    throw new AppError(t(lang, 'user.not_found'), 404);
  }

  sendSuccess(res, user, t(lang, 'feedPost.user_ban_updated'));
});

