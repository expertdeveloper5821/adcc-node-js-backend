import { Response } from 'express';
import mongoose from 'mongoose';
import { t } from '@/utils/i18n';
import User from '@/models/user.model';
import { sendSuccess } from '@/utils/response';
import { asyncHandler } from '@/utils/async-handler';
import { AppError } from '@/utils/app-error';
import { AuthRequest } from '@/middleware/auth.middleware';
import { upsertUserFcmToken } from '@/services/push-token.service';

/** Fields to exclude from user response (sensitive data) */
const USER_PROJECTION = '-refreshTokens';

/**
 * Get all users (paginated)
 * GET /user?page=1&limit=10&role=Member
 * Admin only recommended; uses pagination for large sets.
 */
export const getAllUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as AuthRequest & { lang?: string }).lang || 'en') as string;
  const { page = 1, limit = 10, role } = req.query;

  const filter: Record<string, unknown> = {};
  if (role && ['Admin', 'Vendor', 'Member'].includes(role as string)) {
    filter.role = role;
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  const [users, total] = await Promise.all([
    User.find(filter).select(USER_PROJECTION).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    User.countDocuments(filter),
  ]);

  sendSuccess(
    res,
    {
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    },
    t(lang, 'user.list_retrieved'),
    200
  );
});

/**
 * Get user by ID
 * GET /user/:userId
 * Authenticated users can fetch a user; typically own profile or admin fetches any.
 */
export const getUserById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as AuthRequest & { lang?: string }).lang || 'en') as string;
  const userId = typeof req.params.userId === 'string' ? req.params.userId : req.params.userId?.[0] ?? '';

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError(t(lang, 'user.not_found'), 404);
  }

  const user = await User.findById(userId).select(USER_PROJECTION).lean();

  if (!user) {
    throw new AppError(t(lang, 'user.not_found'), 404);
  }

  sendSuccess(res, user, t(lang, 'user.retrieved'), 200);
});

/**
 * Delete user by ID
 * DELETE /user/:userId
 * Admin only.
 */
export const deleteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as AuthRequest & { lang?: string }).lang || 'en') as string;
  const userId = typeof req.params.userId === 'string' ? req.params.userId : req.params.userId?.[0] ?? '';

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError(t(lang, 'user.not_found'), 404);
  }

  const user = await User.findByIdAndDelete(userId);

  if (!user) {
    throw new AppError(t(lang, 'user.not_found'), 404);
  }

  sendSuccess(res, null, t(lang, 'user.deleted'), 200);
});

/**
 * Update user's verification status
 * PATCH /user/:userId/verified
 * Admin only.
 */
export const updateUserVerified = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as AuthRequest & { lang?: string }).lang || 'en') as string;
  const userId =
    typeof req.params.userId === 'string' ? req.params.userId : req.params.userId?.[0] ?? '';

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError(t(lang, 'user.not_found'), 404);
  }

  const { isVerified } = req.body as { isVerified: boolean };

  const user = await User.findByIdAndUpdate(
    userId,
    { isVerified },
    { new: true, runValidators: true }
  )
    .select(USER_PROJECTION)
    .lean();

  if (!user) {
    throw new AppError(t(lang, 'user.not found'), 404);
  }

  sendSuccess(res, user, t(lang, 'user.verified_updated'), 200);
});

/**
 * Register/refresh FCM token for current user (Member/Vendor/Admin)
 * POST /user/fcm-token
 */
export const registerFcmToken = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as AuthRequest & { lang?: string }).lang || 'en') as string;
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(t(lang, 'auth.unauthorized'), 401);
  }

  const {
    token,
    userAgent,
    platform,
    deviceId,
    deviceModel,
    osVersion,
    appVersion,
    appBuild,
  } = req.body as {
    token: string;
    userAgent?: string;
    platform?: 'web' | 'android' | 'ios';
    deviceId?: string;
    deviceModel?: string;
    osVersion?: string;
    appVersion?: string;
    appBuild?: string;
  };
  await upsertUserFcmToken(userId, {
    token,
    userAgent,
    platform,
    deviceId,
    deviceModel,
    osVersion,
    appVersion,
    appBuild,
  });

  sendSuccess(res, { token }, 'FCM token registered', 201);
});

/**
 * Unregister FCM token for current user
 * POST /user/fcm-token/unregister
 */
export const unregisterFcmToken = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as AuthRequest & { lang?: string }).lang || 'en') as string;
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(t(lang, 'auth.unauthorized'), 401);
  }

  const { token } = req.body as { token: string };

  await User.findByIdAndUpdate(userId, {
    $pull: { fcmTokens: { token } },
  });

  sendSuccess(res, { token }, 'FCM token unregistered');
});
